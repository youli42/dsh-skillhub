import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import { SkillRegistry, isModelInvocable, isUserInvocable } from '@deepseek-ai/dsh-skill'
import { createScope } from '@deepseek-ai/dsh-scope'
import { SkillHub } from '../lib/types/hub.js'
import { createSkillHubProvider } from '../lib/types/provider.js'
import { attachAgentProvider } from '../lib/types/dsh-skillhub.js'

/**
 * These tests load the real `@deepseek-ai/dsh-skill` registry, so the merge rule
 * they check is the shipped one: inside a layer the lowest rank wins a name, and
 * the nearest layer wins a duplicate outright. `@deepseek-ai/dsh-skill-filesystem`
 * is stood in for by a provider that reports the same roots at the same ranks
 * (100 `.dsh/skills`, 200 `.agents/skills`, 400/500 for the user homes), which
 * is what makes an Off switch observable here instead of only in a DSH process.
 */

const RANK = { projectDsh: 100, projectAgents: 200, userDsh: 400, userAgents: 500 }

async function skillFile(dir, name) {
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${name} from ${dir}\n---\n\nBody.\n`)
}

async function readName(dir) {
  try {
    const text = await readFile(join(dir, 'SKILL.md'), 'utf8')
    const match = /^name:\s*(.+)$/mu.exec(text)
    return match?.[1]?.trim()
  } catch {
    return undefined
  }
}

/** One root's direct entries, at one rank, the way dsh-skill-filesystem reports them. */
async function scanRoot(root, rank, source) {
  let entries = []
  try {
    entries = await (await import('node:fs/promises')).readdir(root, { withFileTypes: true })
  } catch {
    return []
  }
  const out = []
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
    const path = join(root, entry.name)
    const name = await readName(path)
    if (name === undefined) continue
    out.push({
      name,
      description: `${name} from ${source}`,
      invocation: { modelInvocable: true, userInvocable: true },
      source,
      provider: 'filesystem',
      rank,
      locator: { path: join(path, 'SKILL.md') },
    })
  }
  return out
}

function filesystemStandIn({ cwd, agentHome, dshHome }) {
  return rootedStandIn([
    { dir: join(cwd, '.dsh', 'skills'), rank: RANK.projectDsh, source: 'project-dsh' },
    { dir: join(cwd, '.agents', 'skills'), rank: RANK.projectAgents, source: 'project-agents' },
    { dir: dshHome, rank: RANK.userDsh, source: 'user-dsh' },
    { dir: agentHome, rank: RANK.userAgents, source: 'user-agents' },
  ])
}

/** A provider that scans exactly what the real one scans: `<root>/<name>/SKILL.md`. */
function rootedStandIn(roots) {
  return {
    name: 'filesystem',
    async list() {
      const out = []
      for (const { dir, rank, source } of roots) out.push(...await scanRoot(dir, rank, source))
      return out
    },
    async get() {
      return undefined
    },
  }
}

async function fixture(tag) {
  const base = await mkdtemp(join(tmpdir(), `skillhub-reg-${tag}-`))
  const cwd = join(base, 'project')
  const agentHome = join(base, 'agent')
  const dshHome = join(base, 'dsh')
  await mkdir(cwd, { recursive: true })
  await mkdir(agentHome, { recursive: true })
  await mkdir(dshHome, { recursive: true })
  return { base, cwd, agentHome, dshHome, storeDir: join(base, 'store') }
}

async function registry(t) {
  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  await ctx.plugin(SkillRegistry)
  return ctx
}

/**
 * Register the SkillHub provider the way the plugin does and hand back the
 * invalidation hook the HTTP layer calls after every toggle: the registry caches
 * a completed catalog, so a switched value only reaches the next read through
 * that call.
 */
function registerHub(ctx, hub) {
  let invalidate = () => {}
  ctx.skills.registerProvider((control) => {
    invalidate = control.invalidate
    return createSkillHubProvider(hub)
  })
  return () => invalidate()
}

test('a project Skill outranks the filesystem provider and Off cannot be refilled', async (t) => {
  const { cwd, agentHome, dshHome, storeDir } = await fixture('global')
  await skillFile(join(cwd, '.agents', 'skills', 'shared'), 'shared')
  await skillFile(join(agentHome, 'shared'), 'shared')
  await skillFile(join(cwd, '.opencode', 'skills', 'opencode-only'), 'opencode-only')
  const hub = new SkillHub({ agentHome, dshHome, storeDir, projectRoots: ['.agents/skills', '.opencode/skills'] })
  const ctx = await registry(t)
  const invalidate = registerHub(ctx, hub)
  ctx.skills.registerProvider(() => filesystemStandIn({ cwd, agentHome, dshHome }))

  const on = await ctx.skills.list({ cwd })
  const shared = on.find(skill => skill.name === 'shared')
  assert.equal(on.filter(skill => skill.name === 'shared').length, 1)
  assert.equal(shared.provider, 'skillhub')
  assert.equal(shared.source, 'project-agents')
  assert.equal(isModelInvocable(shared), true)
  // `.opencode/skills` is only reachable through SkillHub at all.
  assert.equal(on.find(skill => skill.name === 'opencode-only').provider, 'skillhub')

  hub.toggle({
    layer: 'project',
    folder: cwd,
    target: { kind: 'skill', id: 'project:shared/SKILL.md', on: false },
  })
  invalidate()
  const off = await ctx.skills.list({ cwd })
  const hidden = off.find(skill => skill.name === 'shared')
  // The registry still resolves the name to SkillHub's candidate, so the
  // filesystem provider's rank-200 project copy never resurfaces, and neither
  // does the user copy at rank 500.
  assert.equal(off.filter(skill => skill.name === 'shared').length, 1)
  assert.equal(hidden.provider, 'skillhub')
  assert.equal(isModelInvocable(hidden), false)
  assert.equal(isUserInvocable(hidden), false)
  assert.equal(off.filter(isModelInvocable).some(skill => skill.name === 'shared'), false)
})

test('in the agent layer the scoped SkillHub registration beats the preset roots', async (t) => {
  const { cwd, agentHome, dshHome, storeDir } = await fixture('agent')
  await skillFile(join(cwd, '.agents', 'skills', 'shared'), 'shared')
  await skillFile(join(agentHome, 'shared'), 'shared')
  const hub = new SkillHub({ agentHome, dshHome, storeDir, projectRoots: ['.agents/skills'] })
  const ctx = await registry(t)
  const invalidate = registerHub(ctx, hub)
  const agent = { id: 's1', session: { id: 's1', header: { cwd } } }
  const scope = createScope(ctx, agent)
  t.after(() => scope.dispose())
  agent.ctx = scope.ctx
  // The preset's filesystem row lives in the agent's own layer, exactly as the
  // Web app mounts it, so the nearer layer would win a name without SkillHub's
  // per-agent registration.
  scope.ctx.get('skills').registerProvider(() => filesystemStandIn({ cwd, agentHome, dshHome }))
  attachAgentProvider(ctx, hub, { agent })

  const on = await ctx.skills.list({ cwd, scope: agent })
  const shared = on.find(skill => skill.name === 'shared')
  assert.equal(on.filter(skill => skill.name === 'shared').length, 1)
  assert.equal(shared.provider, 'skillhub-propagation')
  assert.equal(shared.source, 'project-agents')
  assert.equal(isModelInvocable(shared), true)

  hub.toggle({
    layer: 'project',
    folder: cwd,
    target: { kind: 'skill', id: 'project:shared/SKILL.md', on: false },
  })
  invalidate()
  const off = await ctx.skills.list({ cwd, scope: agent })
  const hidden = off.find(skill => skill.name === 'shared')
  assert.equal(off.filter(skill => skill.name === 'shared').length, 1)
  assert.equal(hidden.provider, 'skillhub-propagation')
  assert.equal(isModelInvocable(hidden), false)
  assert.equal(isUserInvocable(hidden), false)
})

test('a user-home Skill stays hideable under the preset filesystem row', async (t) => {
  const { cwd, agentHome, dshHome, storeDir } = await fixture('user')
  await skillFile(join(agentHome, 'ask-matt'), 'ask-matt')
  const hub = new SkillHub({ agentHome, dshHome, storeDir })
  const ctx = await registry(t)
  const invalidate = registerHub(ctx, hub)
  const agent = { id: 's2', session: { id: 's2', header: { cwd } } }
  const scope = createScope(ctx, agent)
  t.after(() => scope.dispose())
  agent.ctx = scope.ctx
  scope.ctx.get('skills').registerProvider(() => rootedStandIn([
    { dir: agentHome, rank: RANK.userAgents, source: 'user-agents' },
  ]))
  attachAgentProvider(ctx, hub, { agent })

  const on = await ctx.skills.list({ cwd, scope: agent })
  assert.equal(on.find(skill => skill.name === 'ask-matt').provider, 'skillhub-propagation')
  assert.equal(isModelInvocable(on.find(skill => skill.name === 'ask-matt')), true)

  hub.toggle({ layer: 'session', sessionId: 's2', folder: cwd, target: { kind: 'skill', id: 'agent:ask-matt/SKILL.md', on: false } })
  invalidate()
  const off = await ctx.skills.list({ cwd, scope: agent })
  const hidden = off.find(skill => skill.name === 'ask-matt')
  // Rank 348 beats the preset's 500, so the Off candidate owns the name with
  // both surfaces denied.
  assert.equal(off.filter(skill => skill.name === 'ask-matt').length, 1)
  assert.equal(hidden.provider, 'skillhub-propagation')
  assert.equal(isModelInvocable(hidden), false)
})
