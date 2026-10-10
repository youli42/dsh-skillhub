import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import vm from 'node:vm'
import test, { after } from 'node:test'
import { createSlashRefresh, SKILL_CLIENT } from '../src/client/slash-refresh.ts'

const root = process.env.DSHX_HARNESS
if (!root) throw new Error('Set DSHX_HARNESS to test the real desktop Loader and autocomplete')
const harnessFile = path => pathToFileURL(join(root, path)).href
const { register } = await import(harnessFile('node_modules/tsx/dist/esm/api/index.mjs'))
const unregister = register({ tsconfig: false })
after(async () => { await unregister() })
const { Context } = await import(harnessFile('vendor/cordis/lib/index.js'))
const { default: Loader } = await import(harnessFile('vendor/loader/lib/index.js'))
const { InputTriggerService } = await import(harnessFile('packages/client/ui-input-trigger/src/client/service.ts'))
const bundle = await readFile(join(root, 'packages/client/ui-skill/lib/client.js'), 'utf8')

function loadClient(code, surface = {}) {
  let plugin
  surface.__ModuleLoader__ = { load({ factory }) {
      plugin = factory(name => {
        if (name === '@deepseek-ai/dsh-client-ui-primitives') return {
          rankByName: (rows, query) => rows.filter(row => row.name.includes(query)),
        }
        if (name === 'react') return { memo: fn => fn }
        if (name === 'react/jsx-runtime' || name === 'react-dom') return {}
        throw new Error(`Unexpected client import: ${name}`)
      })
    } }
  vm.runInNewContext(code, {
    AbortController, console, CustomEvent, window: surface,
  })
  return plugin
}

async function bench(t) {
  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  const bindings = new Map(['s1', 's2'].map(sessionId => [sessionId, {
    sessionId, ctx: ctx.extend(), session: { sessionId, getSnapshot: () => ({ openState: 'open' }) },
  }]))
  ctx.provide('sessions', {
    binding: id => bindings.get(id),
    sessionOf: actx => [...bindings.values()].find(binding => binding.ctx === actx)?.session,
    using: async (id, _options, run) => run({ binding: bindings.get(id) }),
    subagentAddress: () => undefined,
  })
  const catalogs = new Map([['s1', []], ['s2', []]])
  const calls = []
  ctx.provide('remote', { $on: () => () => {}, skills: { list: async ({ sessionId }) => {
    calls.push(sessionId)
    return { ok: true, value: { skills: [...catalogs.get(sessionId)] } }
  } } })
  ctx.provide('remote.skills', ctx.get('remote').skills)
  ctx.provide('sidebarRight', { openResource() {} })
  ctx.provide('locale', { register: () => () => {}, bind: () => key => key })
  ctx.provide('slots', { inject: (_name, run) => run(), register: () => () => {} })
  await ctx.plugin(InputTriggerService)
  await ctx.plugin(Loader)
  let unrelatedMounts = 0
  const plugins = { [SKILL_CLIENT]: loadClient(bundle), unrelated: { apply() { unrelatedMounts++ } } }
  ctx.loader.internal = { import: async name => plugins[name] }
  await ctx.loader.create({ name: SKILL_CLIENT })
  await ctx.loader.create({ name: 'unrelated' })
  await ctx.loader.await()
  const controllers = new Map([...bindings].map(([id, binding]) => [id, ctx.inputTriggers.sessionOf(binding.ctx)]))
  const refresher = createSlashRefresh(ctx.loader)
  t.after(refresher.dispose)
  const settle = async () => { for (let i = 0; i < 6; i++) await new Promise(resolve => setImmediate(resolve)) }
  const names = id => controllers.get(id).menu.getSnapshot().groups.flatMap(group => group.items.map(row => row.name))
  const open = async id => {
    controllers.get(id).track('/', 1, { tier: 'plain' }, 1)
    await settle()
    return names(id)
  }
  return { ctx, plugins, catalogs, calls, controllers, refresher, settle, names, open, unrelatedMounts: () => unrelatedMounts }
}

test('desktop autocomplete reproduces stale cache, then updates the same session on enable and disable', async t => {
  const b = await bench(t)
  assert.deepEqual(await b.open('s1'), [])
  b.catalogs.set('s1', [{ name: 'demo-skill', description: 'Fixture', modelInvocable: true }])
  assert.deepEqual(await b.open('s1'), [], 'baseline: the original UI keeps the cached empty catalog')
  const options = JSON.stringify([...b.ctx.loader.entries()].map(entry => entry.options))
  await b.refresher.refresh()
  await b.settle()
  assert.deepEqual(await b.open('s1'), ['demo-skill'], 'reopening slash uses the new catalog without reloading the page')
  assert.deepEqual([...b.controllers.get('s1').lexicon.getSnapshot().get('/')], ['demo-skill'])
  b.catalogs.set('s1', [])
  await b.refresher.refresh()
  await b.settle()
  assert.deepEqual(await b.open('s1'), [])
  assert.equal(b.unrelatedMounts(), 1, 'unrelated plugins never remount')
  assert.equal(JSON.stringify([...b.ctx.loader.entries()].map(entry => entry.options)), options)
  assert.ok([...b.ctx.loader.entries()].every(entry => entry.fiber.state === 2))
})

test('refresh is scoped by the official session RPC and coalesces repeated notifications', async t => {
  const b = await bench(t)
  await b.open('s1'); await b.open('s2')
  b.catalogs.set('s1', [{ name: 'first-only', description: '', modelInvocable: true }])
  b.catalogs.set('s2', [{ name: 'second-only', description: '', modelInvocable: true }])
  const calls = b.calls.length
  await Promise.all([b.refresher.refresh(), b.refresher.refresh(), b.refresher.refresh()])
  await b.settle()
  assert.deepEqual(await b.open('s1'), ['first-only'])
  assert.deepEqual(await b.open('s2'), ['second-only'])
  assert.equal(b.calls.length - calls, 2, 'one fresh catalog per retained session')
})

test('missing or disabled official plugin fails explicitly and never changes its enablement', async () => {
  let entries = []
  const refresher = createSlashRefresh({ entries: () => entries })
  await assert.rejects(refresher.refresh(), /not active/)
  entries = [{ options: { name: SKILL_CLIENT }, disabled: true }]
  await assert.rejects(refresher.refresh(), /not active/)
  assert.equal(entries[0].disabled, true)
  refresher.dispose()
  await assert.rejects(refresher.refresh(), /disposed/)
})

test('built SkillHub client wires the refresh event through its declared Loader dependency and cleans up on HMR', async t => {
  const b = await bench(t)
  await b.open('s1')
  const surface = new EventTarget()
  const skillhub = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  b.plugins['dsh-skillhub'] = loadClient(skillhub, surface)
  const id = await b.ctx.loader.create({ name: 'dsh-skillhub' })
  await b.ctx.loader.await()
  await b.settle()
  const refresh = async () => {
    const pending = []
    surface.dispatchEvent(new CustomEvent('dsh-skillhub:refresh-autocomplete', {
      detail: { waitUntil: run => { pending.push(run) } },
    }))
    assert.equal(pending.length, 1, 'exactly one listener owns the refresh')
    await Promise.all(pending)
    await b.settle()
  }
  b.catalogs.set('s1', [{ name: 'wired-skill', description: '', modelInvocable: true }])
  await refresh()
  assert.deepEqual(await b.open('s1'), ['wired-skill'])
  await b.ctx.loader.resolve(id).fiber.restart()
  await b.settle()
  b.catalogs.set('s1', [])
  await refresh()
  assert.deepEqual(await b.open('s1'), [])
  await b.ctx.loader.resolve(id).fiber.dispose()
  const pending = []
  surface.dispatchEvent(new CustomEvent('dsh-skillhub:refresh-autocomplete', {
    detail: { waitUntil: run => pending.push(run) },
  }))
  assert.equal(pending.length, 0, 'HMR/disposal never leaves a listener behind')
  assert.equal(b.unrelatedMounts(), 1)
})
