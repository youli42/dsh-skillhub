import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  resolveCatalog,
  skillId,
  VisibilityDocument,
} from '../lib/types/catalog.js'

async function skillFile(dir, name, description = `${name} desc`) {
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n---\n\nBody for ${name}.\n`)
}

test('nested pack and home-root skill', async () => {
  const root = await mkdtemp(join(tmpdir(), 'skillhub-'))
  const agent = join(root, 'agent')
  const dsh = join(root, 'dsh')
  await skillFile(join(agent, 'writing', 'essays'), 'essays')
  await mkdir(agent, { recursive: true })
  await writeFile(join(agent, 'legacy.md'), '---\nname: legacy\ndescription: flat\n---\n\nFlat.\n')
  await mkdir(dsh, { recursive: true })
  const catalog = resolveCatalog({ agentHome: agent, dshHome: dsh })
  const names = catalog.offered.map(skill => skill.name).sort()
  assert.deepEqual(names, ['essays', 'legacy'])
  const agentHome = catalog.tree.find(home => home.home === 'agent')
  assert.ok(agentHome.children.some(node => node.kind === 'pack' && node.name === 'writing'))
  assert.ok(agentHome.children.some(node => node.kind === 'root-skill' && node.name === 'legacy'))
})

test('group off hides descendants from offered and keeps tree rows', async () => {
  const root = await mkdtemp(join(tmpdir(), 'skillhub-'))
  const agent = join(root, 'agent')
  const dsh = join(root, 'dsh')
  await skillFile(join(agent, 'writing', 'essays'), 'essays')
  await skillFile(join(agent, 'writing', 'blog'), 'blog')
  await skillFile(join(agent, 'code', 'tdd'), 'tdd')
  await mkdir(dsh, { recursive: true })
  const essayId = skillId('agent', 'writing/essays/SKILL.md')
  const blogId = skillId('agent', 'writing/blog/SKILL.md')
  const catalog = resolveCatalog({
    agentHome: agent,
    dshHome: dsh,
    session: VisibilityDocument.off([essayId, blogId]),
  })
  assert.deepEqual(catalog.offered.map(skill => skill.name), ['tdd'])
  const writing = catalog.tree[0].children.find(node => node.kind === 'pack' && node.name === 'writing')
  assert.equal(writing.gate, 'off')
  assert.equal(writing.children.length, 2)
  const hidden = catalog.inventory.filter(skill => skill.gate === 'off')
  assert.deepEqual(hidden.map(skill => skill.name).sort(), ['blog', 'essays'])
  assert.ok(hidden.every(skill => skill.invocation.modelInvocable === false && skill.invocation.userInvocable === false))
})

test('leaf off and all on', async () => {
  const root = await mkdtemp(join(tmpdir(), 'skillhub-'))
  const agent = join(root, 'agent')
  const dsh = join(root, 'dsh')
  await skillFile(join(agent, 'writing', 'essays'), 'essays')
  await skillFile(join(agent, 'writing', 'blog'), 'blog')
  await mkdir(dsh, { recursive: true })
  const essayId = skillId('agent', 'writing/essays/SKILL.md')
  const offOne = resolveCatalog({
    agentHome: agent,
    dshHome: dsh,
    project: VisibilityDocument.off([essayId]),
  })
  assert.deepEqual(offOne.offered.map(skill => skill.name).sort(), ['blog'])
  const writing = offOne.tree[0].children.find(node => node.kind === 'pack' && node.name === 'writing')
  assert.equal(writing.gate, 'mixed')
  const allOn = resolveCatalog({ agentHome: agent, dshHome: dsh })
  assert.equal(allOn.offered.length, 2)
})

test('Chat overrides win while untouched Skills inherit Project and Global', async () => {
  const root = await mkdtemp(join(tmpdir(), 'skillhub-'))
  const agent = join(root, 'agent')
  const dsh = join(root, 'dsh')
  await skillFile(join(agent, 'writing', 'essays'), 'essays')
  await skillFile(join(agent, 'code', 'tdd'), 'tdd')
  await mkdir(dsh, { recursive: true })
  const essayId = skillId('agent', 'writing/essays/SKILL.md')
  const chat = VisibilityDocument.off([essayId])
  const resolved = resolveCatalog({
    agentHome: agent,
    dshHome: dsh,
    global: VisibilityDocument.global('off'),
    project: VisibilityDocument.on([essayId]),
    session: chat,
  })
  assert.deepEqual(resolved.offered, [])
  assert.equal(resolved.inventory.find(skill => skill.name === 'essays').source, 'session')
  assert.equal(resolved.inventory.find(skill => skill.name === 'tdd').source, 'global')
})

test('collision lists both homes and keeps both offered', async () => {
  const root = await mkdtemp(join(tmpdir(), 'skillhub-'))
  const agent = join(root, 'agent')
  const dsh = join(root, 'dsh')
  await skillFile(join(agent, 'pack-a', 'tdd'), 'tdd', 'agent tdd')
  await skillFile(join(dsh, 'pack-b', 'tdd'), 'tdd', 'dsh tdd')
  const catalog = resolveCatalog({ agentHome: agent, dshHome: dsh })
  assert.equal(catalog.offered.length, 2)
  assert.equal(catalog.collisions.length, 1)
  assert.equal(catalog.collisions[0].name, 'tdd')
  assert.equal(catalog.collisions[0].skills.length, 2)
})

test('dangling pack symlink is broken', async () => {
  const root = await mkdtemp(join(tmpdir(), 'skillhub-'))
  const agent = join(root, 'agent')
  const dsh = join(root, 'dsh')
  await mkdir(agent, { recursive: true })
  await mkdir(dsh, { recursive: true })
  await symlink(join(root, 'missing-pack'), join(agent, 'gone'))
  const catalog = resolveCatalog({ agentHome: agent, dshHome: dsh })
  assert.equal(catalog.offered.length, 0)
  assert.ok(catalog.broken.some(entry => entry.reason.kind === 'missing-symlink-target'))
})

test('a pack whose SKILL.md name is not kebab-case is broken', async () => {
  const root = await mkdtemp(join(tmpdir(), 'skillhub-'))
  const agent = join(root, 'agent')
  const dsh = join(root, 'dsh')
  await mkdir(join(agent, 'pstack-poteto-mode', 'playbooks'), { recursive: true })
  await writeFile(
    join(agent, 'pstack-poteto-mode', 'SKILL.md'),
    '---\nname: Poteto Mode\ndescription: poteto style\ndisable-model-invocation: true\n---\n\nBody.\n',
  )
  await writeFile(join(agent, 'pstack-poteto-mode', 'playbooks', 'feature.md'), '# feature\n')
  await mkdir(dsh, { recursive: true })
  const catalog = resolveCatalog({ agentHome: agent, dshHome: dsh })
  const pack = catalog.tree[0].children.find(node => node.name === 'pstack-poteto-mode')
  assert.equal(pack.kind, 'broken')
  assert.equal(pack.reason.kind, 'invalid-name')
  assert.equal(pack.reason.raw, 'Poteto Mode')
  assert.equal(catalog.offered.some(skill => skill.name === 'Poteto Mode'), false)
  assert.equal(catalog.inventory.some(skill => skill.name === 'Poteto Mode'), false)
  assert.ok(catalog.broken.some(
    entry => entry.reason.kind === 'invalid-name' && entry.reason.raw === 'Poteto Mode',
  ))
})

test('global explicit default applies to skills added later', async () => {
  const root = await mkdtemp(join(tmpdir(), 'skillhub-'))
  const agent = join(root, 'agent')
  const dsh = join(root, 'dsh')
  await skillFile(join(agent, 'tdd'), 'tdd')
  await mkdir(dsh, { recursive: true })
  const tddId = skillId('agent', 'tdd/SKILL.md')
  await skillFile(join(agent, 'write-natural-chinese'), 'write-natural-chinese')
  const catalog = resolveCatalog({
    agentHome: agent,
    dshHome: dsh,
    global: { version: 2, default: 'on', gates: { [tddId]: 'off' } },
  })
  assert.deepEqual(catalog.offered.map(skill => skill.name), ['write-natural-chinese'])
  const chinese = catalog.inventory.find(skill => skill.name === 'write-natural-chinese')
  assert.equal(chinese.gate, 'on')
  assert.equal(chinese.invocation.modelInvocable, true)
})

test('prunes folders that do not contain a SKILL.md', async () => {
  const root = await mkdtemp(join(tmpdir(), 'skillhub-'))
  const agent = join(root, 'agent')
  const dsh = join(root, 'dsh')
  await skillFile(join(agent, 'ask-matt'), 'ask-matt')
  await mkdir(join(agent, 'ask-matt', 'agents'), { recursive: true })
  await writeFile(join(agent, 'ask-matt', 'agents', 'openai.yaml'), 'model: x\n')
  await mkdir(dsh, { recursive: true })
  const catalog = resolveCatalog({ agentHome: agent, dshHome: dsh })
  const pack = catalog.tree[0].children.find(node => node.kind === 'pack' && node.name === 'ask-matt')
  assert.equal(pack.children.length, 0)
  assert.equal(pack.skill.name, 'ask-matt')
})

test('regroups symlink packs by author skills folders', async () => {
  const root = await mkdtemp(join(tmpdir(), 'skillhub-'))
  const agent = join(root, 'agent')
  const dsh = join(root, 'dsh')
  const vendor = join(root, 'mattpocock-skills', 'skills')
  await skillFile(join(vendor, 'engineering', 'ask-matt'), 'ask-matt')
  await skillFile(join(vendor, 'productivity', 'grill-me'), 'grill-me')
  await skillFile(join(root, 'pstack', 'skills', 'how'), 'how')
  await mkdir(agent, { recursive: true })
  await mkdir(dsh, { recursive: true })
  await symlink(join(vendor, 'engineering', 'ask-matt'), join(agent, 'ask-matt'))
  await symlink(join(vendor, 'productivity', 'grill-me'), join(agent, 'grill-me'))
  await symlink(join(root, 'pstack', 'skills', 'how'), join(agent, 'pstack-how'))
  await skillFile(join(agent, 'orca-cli'), 'orca-cli')
  const catalog = resolveCatalog({ agentHome: agent, dshHome: dsh })
  const names = catalog.tree[0].children.map(node => node.name)
  assert.deepEqual(names, ['mattpocock-skills', 'orca-cli', 'pstack'])
  const matt = catalog.tree[0].children.find(node => node.kind === 'pack' && node.name === 'mattpocock-skills')
  const cats = matt.children.filter(child => child.kind === 'group').map(child => child.name).sort()
  assert.deepEqual(cats, ['engineering', 'productivity'])
  const engineering = matt.children.find(child => child.kind === 'group' && child.name === 'engineering')
  assert.equal(engineering.children[0].name, 'ask-matt')
  assert.equal(engineering.children[0].rel, 'engineering/ask-matt')
  const pstack = catalog.tree[0].children.find(node => node.kind === 'pack' && node.name === 'pstack')
  assert.equal(pstack.children[0].name, 'how')
  const orca = catalog.tree[0].children.find(node => node.kind === 'pack' && node.name === 'orca-cli')
  assert.equal(orca.skill.name, 'orca-cli')
})

test('keeps nested skill folders as groups', async () => {
  const root = await mkdtemp(join(tmpdir(), 'skillhub-'))
  const agent = join(root, 'agent')
  const dsh = join(root, 'dsh')
  await skillFile(join(agent, 'writing', 'essays'), 'essays')
  await skillFile(join(agent, 'writing', 'notes', 'drafts'), 'drafts')
  await mkdir(join(agent, 'writing', 'assets'), { recursive: true })
  await writeFile(join(agent, 'writing', 'assets', 'logo.png'), 'x')
  await mkdir(dsh, { recursive: true })
  const catalog = resolveCatalog({ agentHome: agent, dshHome: dsh })
  const writing = catalog.tree[0].children.find(node => node.kind === 'pack' && node.name === 'writing')
  const names = writing.children.filter(child => child.kind === 'group').map(child => child.name).sort()
  assert.deepEqual(names, ['essays', 'notes'])
  const notes = writing.children.find(child => child.kind === 'group' && child.name === 'notes')
  assert.equal(notes.children[0].name, 'drafts')
})

test('ignores .git and node_modules and does not scan a sibling project skills dir', async () => {
  const root = await mkdtemp(join(tmpdir(), 'skillhub-'))
  const agent = join(root, 'agent')
  const dsh = join(root, 'dsh')
  const project = join(root, 'workspace', '.agents', 'skills', 'sneaky')
  await skillFile(join(agent, 'ok', 'visible'), 'visible')
  await skillFile(join(agent, '.git', 'hidden'), 'hidden-git')
  await skillFile(join(agent, 'node_modules', 'hidden'), 'hidden-nm')
  await skillFile(project, 'sneaky')
  await mkdir(dsh, { recursive: true })
  const catalog = resolveCatalog({ agentHome: agent, dshHome: dsh })
  assert.deepEqual(catalog.offered.map(skill => skill.name), ['visible'])
})

test('symlink self-loop reports symlink-cycle without duplicating the skill', async () => {
  const root = await mkdtemp(join(tmpdir(), 'skillhub-'))
  const agent = join(root, 'agent')
  const dsh = join(root, 'dsh')
  const pack = join(agent, 'pack')
  await skillFile(pack, 'loopy')
  await mkdir(dsh, { recursive: true })
  await symlink(pack, join(pack, 'self'))
  const catalog = resolveCatalog({ agentHome: agent, dshHome: dsh })
  const cycles = catalog.broken.filter(entry => entry.reason.kind === 'symlink-cycle')
  assert.equal(cycles.length, 1)
  assert.equal(cycles[0].path, join(pack, 'self'))
  const ids = catalog.inventory.filter(skill => skill.name === 'loopy').map(skill => skill.id)
  assert.deepEqual(ids, ['agent:pack/SKILL.md'])
  const packNode = catalog.tree[0].children.find(node => node.kind === 'pack' && node.name === 'pack')
  const self = packNode.children.find(child => child.name === 'self')
  assert.equal(self.kind, 'broken')
  assert.equal(self.reason.kind, 'symlink-cycle')
})

test('non-kebab SKILL.md name surfaces as a broken invalid-name row', async () => {
  const root = await mkdtemp(join(tmpdir(), 'skillhub-'))
  const agent = join(root, 'agent')
  const dsh = join(root, 'dsh')
  await skillFile(join(agent, 'badpack'), 'Bad_Name')
  await mkdir(dsh, { recursive: true })
  const catalog = resolveCatalog({ agentHome: agent, dshHome: dsh })
  assert.equal(catalog.inventory.length, 0)
  const entry = catalog.broken.find(item => item.reason.kind === 'invalid-name')
  assert.ok(entry)
  assert.equal(entry.reason.raw, 'Bad_Name')
  assert.equal(entry.path, join(agent, 'badpack', 'SKILL.md'))
  const pack = catalog.tree[0].children.find(node => node.name === 'badpack')
  assert.equal(pack.kind, 'broken')
  assert.equal(pack.reason.kind, 'invalid-name')
})

test('composed catalog uses the actual scoped default and ignores foreign markers', async () => {
  const root = await mkdtemp(join(tmpdir(), 'skillhub-'))
  const agent = join(root, 'agent')
  const dsh = join(root, 'dsh')
  await skillFile(join(agent, 'one'), 'one')
  await skillFile(join(agent, 'two'), 'two')
  await skillFile(join(agent, 'three'), 'three')
  await mkdir(dsh, { recursive: true })
  const twoId = skillId('agent', 'two/SKILL.md')
  const input = {
    agentHome: agent, dshHome: dsh, composeChain: true,
    project: { version: 2, default: 'off', gates: { [twoId]: 'on' } },
    markerDocuments: [{ layer: 'session', document: { version: 2, default: 'off', gates: {} } }],
  }
  const inv = Object.fromEntries(resolveCatalog(input).inventory.map(skill => [skill.name, skill]))
  assert.equal(inv.one.gate, 'off')
  assert.equal(inv.one.source, 'project')
  assert.equal(inv.two.gate, 'on')
  assert.equal(inv.two.source, 'project')
  assert.equal(inv.three.gate, 'off')
  assert.equal(inv.three.source, 'project')
})

test('a CRLF SKILL.md keeps the field that sits last in its frontmatter', async () => {
  const root = await mkdtemp(join(tmpdir(), 'skillhub-crlf-'))
  const agent = join(root, 'agent')
  const dsh = join(root, 'dsh')
  // A Windows-authored file: the slice up to the closing delimiter ends at the
  // `\n` of `\r\n---` and therefore kept the `\r`, so the LAST field never
  // matched its line pattern — with `description` last the whole skill came back
  // as invalid frontmatter instead of being listed.
  await mkdir(join(agent, 'crlf-skill'), { recursive: true })
  await writeFile(
    join(agent, 'crlf-skill', 'SKILL.md'),
    '---\r\nname: crlf-skill\r\nwhenToUse: always\r\ndescription: written on Windows\r\n---\r\n\r\nBody line.\r\n',
  )
  await mkdir(dsh, { recursive: true })
  const catalog = resolveCatalog({ agentHome: agent, dshHome: dsh })
  assert.deepEqual(catalog.broken, [])
  assert.deepEqual(catalog.offered.map(skill => skill.name), ['crlf-skill'])
  const skill = catalog.inventory[0]
  assert.equal(skill.description, 'written on Windows')
  assert.equal(skill.whenToUse, 'always')
  assert.equal(skill.content.trim(), 'Body line.')
})
