import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import { SkillHub } from '../lib/types/hub.js'
import { createSkillHubProvider } from '../lib/types/provider.js'
import { attachAgentProvider } from '../lib/types/dsh-skillhub.js'
const root = process.env.DSHX_HARNESS
if (!root) throw new Error('Set DSHX_HARNESS for real provider reload regression')
const Registry = (await import(pathToFileURL(join(root, 'packages/skill/skill/lib/index.js')).href)).default
const { createScope } = await import(pathToFileURL(join(root, 'packages/core/scope/lib/index.js')).href)

test('existing agents use cascading provider after reload, even with a stale legacy registration', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'skillhub-runtime-propagation-'))
  const ctx = new Context()
  try {
    const agentHome = join(dir, 'skills')
    await mkdir(join(agentHome, 'demo'), { recursive: true })
    await writeFile(join(agentHome, 'demo', 'SKILL.md'), '---\nname: demo\ndescription: Demo\n---\n')
    const hub = new SkillHub({ agentHome, dshHome: join(dir, 'dsh'), storeDir: join(dir, 'store') })
    const session = { id: 'existing', header: { id: 'existing', cwd: dir } }
    await ctx.plugin(Registry)
    const key = { session }
    const scope = createScope(ctx, key)
    const agent = { id: session.id, session, ctx: scope.ctx }
    hub.toggle({ layer: 'session', folder: dir, sessionId: session.id, target: { kind: 'skill', id: 'agent:demo/SKILL.md', on: false } })
    const old = createSkillHubProvider(hub, session.id)
    const frozen = await old.list({ cwd: dir })
    assert.equal(frozen.length, 1, 'fixture provides one disk skill')
    await scope.ctx.plugin({ name: 'legacy-provider', inject: ['skills'], apply(inner) {
      inner.skills.registerProvider(() => ({ ...old, list: async () => frozen }))
    } })
    const visible = async () => (await ctx.skills.list({ cwd: dir, scope: key })).find(row => row.name === 'demo').invocation.modelInvocable
    assert.equal(await visible(), false)
    const plugin = { name: 'new-scoped-provider', inject: ['skills'], apply(owner) { attachAgentProvider(owner, hub, { agent }) } }
    let fork = await ctx.plugin(plugin)
    hub.toggle({ layer: 'global', target: { kind: 'skill', id: 'agent:demo/SKILL.md', on: true } })
    // A normal global control invalidates the registry-wide cache on HTTP writes.
    let control
    const invalidate = await ctx.plugin({ name: 'control', inject: ['skills'], apply(inner) {
      inner.skills.registerProvider(next => { control = next; return createSkillHubProvider(hub) })
    } })
    control.invalidate()
    assert.equal(await visible(), true, 'stale agent provider cannot shadow the new global operation')
    await fork.dispose()
    fork = await ctx.plugin(plugin)
    control.invalidate()
    assert.equal(await visible(), true, 'the scoped provider can mount again without duplicate registrations')
    hub.toggle({ layer: 'project', folder: dir, target: { kind: 'skill', id: 'agent:demo/SKILL.md', on: false } })
    control.invalidate()
    assert.equal(await visible(), false)
    await fork.dispose()
    await invalidate.dispose()
  } finally {
    await ctx.fiber.dispose()
    await rm(dir, { recursive: true, force: true })
  }
})
