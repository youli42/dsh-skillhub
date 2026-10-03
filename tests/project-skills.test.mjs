import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { resolveCatalog, skillId } from '../lib/types/catalog.js'
import { SkillHub } from '../lib/types/hub.js'
import { DEFAULT_PROJECT_SKILL_ROOTS, projectSkillRoots } from '../lib/types/project-roots.js'
import { createSkillHubProvider } from '../lib/types/provider.js'

async function skillFile(dir, name, description = `${name} desc`) {
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n---\n\nBody for ${name}.\n`)
}

async function project(tag) {
  const base = await mkdtemp(join(tmpdir(), `skillhub-${tag}-`))
  return {
    base,
    cwd: join(base, 'project'),
    agentHome: join(base, 'agent'),
    dshHome: join(base, 'dsh'),
    storeDir: join(base, 'store'),
  }
}

test('project roots are the three agent conventions under the working directory', async () => {
  const { cwd } = await project('roots')
  await skillFile(join(cwd, '.agents', 'skills', 'from-agents'), 'from-agents')
  await skillFile(join(cwd, '.opencode', 'skills', 'from-opencode'), 'from-opencode')
  await skillFile(join(cwd, '.claude', 'skills', 'from-claude'), 'from-claude')

  const roots = projectSkillRoots(cwd)
  assert.deepEqual(
    roots.map(root => [root.source, root.rank, root.label]),
    [['project-agents', 90, '.agents'], ['project-opencode', 91, '.opencode'], ['project-claude', 92, '.claude']],
  )
  assert.deepEqual([...DEFAULT_PROJECT_SKILL_ROOTS], ['.agents/skills', '.opencode/skills', '.claude/skills'])
  // A root that does not exist is absent, not an error.
  assert.deepEqual(projectSkillRoots(join(cwd, 'nowhere')), [])
})

test('project discovery is one level deep, skips resource folders, and keeps flat files', async () => {
  const { cwd, agentHome, dshHome } = await project('depth')
  await skillFile(join(cwd, '.agents', 'skills', 'listed'), 'listed')
  // Nested SKILL.md is never discovered by DSH either, so it must not be listed.
  await skillFile(join(cwd, '.agents', 'skills', 'pack', 'inner'), 'inner')
  // A resource folder without SKILL.md is not an empty pack, just not a Skill.
  await mkdir(join(cwd, '.agents', 'skills', 'reference'), { recursive: true })
  await writeFile(join(cwd, '.agents', 'skills', 'reference', 'lang.md'), '# reference\n')
  await writeFile(join(cwd, '.agents', 'skills', 'flat.md'), '---\nname: flat\ndescription: flat skill\n---\n\nFlat body.\n')
  await skillFile(join(cwd, '.claude', 'skills', 'broken'), 'broken')
  await writeFile(join(cwd, '.claude', 'skills', 'broken', 'SKILL.md'), 'no frontmatter here\n')
  await mkdir(agentHome, { recursive: true })
  await mkdir(dshHome, { recursive: true })

  const catalog = resolveCatalog({ agentHome, dshHome, projectRoots: projectSkillRoots(cwd) })
  assert.deepEqual(catalog.offered.map(skill => skill.name).sort(), ['flat', 'listed'])
  assert.equal(catalog.inventory.some(skill => skill.name === 'inner'), false)
  assert.equal(catalog.broken.some(entry => entry.path.includes('reference')), false)
  assert.ok(catalog.broken.some(entry => entry.reason.kind === 'invalid-frontmatter'))

  const homes = catalog.tree.filter(home => home.home === 'project')
  assert.deepEqual(homes.map(home => home.label), ['.agents', '.claude'])
  assert.deepEqual(homes.map(home => home.source), ['project-agents', 'project-claude'])
  const flat = catalog.inventory.find(skill => skill.name === 'flat')
  assert.equal(flat.id, skillId('project', 'flat.md'))
  assert.equal(flat.origin, 'project-agents')
})

test('a Global read has no project home, a folder read does', async () => {
  const { cwd, agentHome, dshHome, storeDir } = await project('layers')
  await skillFile(join(cwd, '.agents', 'skills', 'here'), 'here')
  await mkdir(agentHome, { recursive: true })
  await mkdir(dshHome, { recursive: true })
  const hub = new SkillHub({ agentHome, dshHome, storeDir, projectRoots: ['.agents/skills'] })

  const global = hub.catalog({ layer: 'global' })
  assert.equal(global.tree.some(home => home.home === 'project'), false)
  assert.deepEqual(global.offered, [])

  const scoped = hub.catalog({ layer: 'project', folder: cwd })
  assert.equal(scoped.tree.filter(home => home.home === 'project').length, 1)
  assert.deepEqual(scoped.offered.map(skill => skill.name), ['here'])
})

test('project candidates win the name at project ranks, and Off keeps it hidden', async () => {
  const { cwd, agentHome, dshHome, storeDir } = await project('ranks')
  await skillFile(join(cwd, '.agents', 'skills', 'shared'), 'shared', 'project copy')
  await skillFile(join(cwd, '.claude', 'skills', 'claude-only'), 'claude-only')
  await skillFile(join(agentHome, 'shared'), 'shared', 'user copy')
  const hub = new SkillHub({ agentHome, dshHome, storeDir, projectRoots: ['.agents/skills', '.claude/skills'] })
  const provider = createSkillHubProvider(hub)
  const list = () => provider.list({ cwd, scope: { session: { id: 's1' } } })

  const on = await list()
  const shared = on.find(candidate => candidate.name === 'shared')
  // The project copy owns the name inside its own workspace, exactly as DSH's
  // filesystem provider ranks it below the user homes.
  assert.equal(shared.source, 'project-agents')
  assert.equal(shared.rank, 90)
  assert.deepEqual(shared.invocation, { modelInvocable: true, userInvocable: true })
  const claude = on.find(candidate => candidate.name === 'claude-only')
  assert.equal(claude.source, 'project-claude')
  assert.equal(claude.rank, 92)

  hub.toggle({
    layer: 'project',
    folder: cwd,
    target: { kind: 'skill', id: skillId('project', 'shared/SKILL.md'), on: false },
  })
  const off = await list()
  const hidden = off.find(candidate => candidate.name === 'shared')
  // Still listed, with both surfaces denied, so the built-in provider cannot
  // refill the name from `.agents/skills` at rank 200.
  assert.equal(hidden.source, 'project-agents')
  assert.deepEqual(hidden.invocation, { modelInvocable: false, userInvocable: false })

  // A chat override beats the project document for the same candidate.
  hub.toggle({
    layer: 'session',
    sessionId: 's1',
    folder: cwd,
    target: { kind: 'skill', id: skillId('project', 'shared/SKILL.md'), on: true },
  })
  const restored = await list()
  assert.deepEqual(restored.find(candidate => candidate.name === 'shared').invocation,
    { modelInvocable: true, userInvocable: true })
})

test('a project Skill Off does not fall back to the same name in a user home', async () => {
  const { cwd, agentHome, dshHome, storeDir } = await project('shadow')
  await skillFile(join(cwd, '.agents', 'skills', 'dup'), 'dup', 'project dup')
  await skillFile(join(agentHome, 'dup'), 'dup', 'user dup')
  const hub = new SkillHub({ agentHome, dshHome, storeDir, projectRoots: ['.agents/skills'] })
  hub.toggle({
    layer: 'project',
    folder: cwd,
    target: { kind: 'skill', id: skillId('project', 'dup/SKILL.md'), on: false },
  })
  const listed = await createSkillHubProvider(hub).list({ cwd, scope: { session: { id: 's1' } } })
  assert.equal(listed.length, 1)
  assert.equal(listed[0].source, 'project-agents')
  assert.deepEqual(listed[0].invocation, { modelInvocable: false, userInvocable: false })
})
