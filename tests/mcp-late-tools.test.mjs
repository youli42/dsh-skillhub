import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import * as McpClient from '@deepseek-ai/dsh-mcp-client'

/**
 * A declared project server is typically a bridge: `npx ue-mcp <project>` is up
 * and handshaking long before the editor on the other end publishes a tool. What
 * the host does inside that window decides whether SkillHub needs a reload at
 * all, so these tests pin it against the real client rather than a stub:
 *
 *   - a server that sends `notifications/tools/list_changed` gets its late tools
 *     registered without a re-mount;
 *   - a server that only ever answers `tools/list` never does: the host re-lists
 *     on that notification and on nothing else, so no amount of waiting helps —
 *     only a fresh mount picks the tools up.
 *
 * The second case is why SkillHub offers an in-session reload, and the third
 * test proves a re-mount against a ready server actually closes the gap.
 */
const FIXTURE = `
let tools = []
let buffer = ''
const notify = process.argv[2] === '1'
const ready = process.argv[3] === '1'
if (ready) tools = [{ name: 'ping', description: 'Reply pong', inputSchema: { type: 'object', properties: {} } }]
const send = (message) => { process.stdout.write(JSON.stringify(message) + '\\n') }
const publish = () => {
  tools = [{ name: 'ping', description: 'Reply pong', inputSchema: { type: 'object', properties: {} } }]
  if (notify) send({ jsonrpc: '2.0', method: 'notifications/tools/list_changed' })
}
const handle = (message) => {
  if (message.method === 'initialize') {
    send({ jsonrpc: '2.0', id: message.id, result: {
      protocolVersion: message.params?.protocolVersion ?? '2025-06-18',
      capabilities: { tools: { listChanged: true } },
      serverInfo: { name: 'skillhub-late-fixture', version: '1.0.0' },
    } })
    return
  }
  if (message.method === 'notifications/initialized' || message.method === 'initialized') {
    if (!ready) setTimeout(publish, 600)
    return
  }
  if (message.method === 'tools/list') {
    send({ jsonrpc: '2.0', id: message.id, result: { tools } })
    return
  }
  if (message.method === 'tools/call') {
    send({ jsonrpc: '2.0', id: message.id, result: { content: [{ type: 'text', text: 'pong' }] } })
    return
  }
  if (message.id !== undefined) {
    send({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'unknown method ' + String(message.method) } })
  }
}
process.stdin.on('data', (chunk) => {
  buffer += chunk
  let index
  while ((index = buffer.indexOf('\\n')) >= 0) {
    const line = buffer.slice(0, index).trim()
    buffer = buffer.slice(index + 1)
    if (line !== '') { try { handle(JSON.parse(line)) } catch {} }
  }
})
process.stdin.resume()
`

/** Records every registration and the disposal of every mounted client. */
function recordingTools() {
  const registered = new Map()
  return {
    registered,
    schemas: () => [...registered.values()].map(entry => entry.definition),
    get: name => registered.get(name)?.definition,
    register: (definition) => {
      registered.set(definition.name, { definition })
      return () => { registered.delete(definition.name) }
    },
    restrict: () => () => {},
    guard: () => () => {},
  }
}

async function waitFor(check, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (check()) return true
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  return false
}

/** The config SkillHub builds for one approved declaration. */
function configFor(fixture, cwd, notify, ready) {
  return {
    serverName: 'probe',
    transport: 'stdio',
    command: process.execPath,
    args: [fixture, notify ? '1' : '0', ready ? '1' : '0'],
    cwd,
    failOnStartupError: true,
  }
}

async function mount(cwd, fixture, notify, ready) {
  const ctx = new Context()
  const tools = recordingTools()
  ctx.provide('tools', tools)
  await ctx.plugin(McpClient, configFor(fixture, cwd, notify, ready))
  return { ctx, tools, dispose: () => ctx.fiber.dispose() }
}

test('a server that announces tools/list_changed gets its late tools without a re-mount', async (t) => {
  const base = await mkdtemp(join(tmpdir(), 'skillhub-late-'))
  const fixture = join(base, 'fixture-server.mjs')
  await writeFile(fixture, FIXTURE)

  const mounted = await mount(base, fixture, true, false)
  t.after(() => mounted.dispose())

  // The mount itself succeeds with zero tools: `failOnStartupError` only covers
  // the handshake, so an empty tool list is a healthy start, not a failure.
  assert.equal(mounted.tools.registered.size, 0)

  assert.ok(
    await waitFor(() => mounted.tools.registered.has('mcp__probe__ping')),
    'the announcement should register the tool on the live connection',
  )
})

test('a server that publishes tools silently never reaches the catalog by waiting', async (t) => {
  const base = await mkdtemp(join(tmpdir(), 'skillhub-silent-'))
  const fixture = join(base, 'fixture-server.mjs')
  await writeFile(fixture, FIXTURE)

  const mounted = await mount(base, fixture, false, false)
  t.after(() => mounted.dispose())

  // No notification means no re-list: waiting is not a recovery strategy.
  await new Promise(resolve => setTimeout(resolve, 3000))
  assert.deepEqual([...mounted.tools.registered.keys()], [])
})

test('a re-mount against a ready server picks the tools up', async (t) => {
  const base = await mkdtemp(join(tmpdir(), 'skillhub-remount-'))
  const fixture = join(base, 'fixture-server.mjs')
  await writeFile(fixture, FIXTURE)

  // First mount: the editor was still down, the bridge exposed nothing.
  const first = await mount(base, fixture, false, false)
  await new Promise(resolve => setTimeout(resolve, 1500))
  assert.deepEqual([...first.tools.registered.keys()], [])
  await first.dispose()

  // The editor is up now, so the same declaration mounts a serving server.
  const second = await mount(base, fixture, false, true)
  t.after(() => second.dispose())
  assert.ok(
    await waitFor(() => second.tools.registered.has('mcp__probe__ping')),
    'a fresh mount is what a silent server needs',
  )
})
