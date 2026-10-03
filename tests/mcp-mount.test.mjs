import assert from 'node:assert/strict'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import * as McpClient from '@deepseek-ai/dsh-mcp-client'
import { McpHub } from '../lib/types/mcp.js'
import { installMcpVisibility, liveMcpServers } from '../lib/types/mcp-runtime.js'
import { approveMcpServer, readProjectMcp } from '../lib/types/project-mcp.js'

/**
 * Mounts the real `@deepseek-ai/dsh-mcp-client` against a real stdio MCP server,
 * through SkillHub's own start path. The other runtime test stubs the plugin
 * call, so this is the one that proves the config SkillHub builds is accepted and
 * that a running server's tools really appear — and disappear on stop.
 */
const FIXTURE = `
let buffer = ''
const send = (message) => { process.stdout.write(JSON.stringify(message) + '\\n') }
const handle = (message) => {
  if (message.method === 'initialize') {
    send({ jsonrpc: '2.0', id: message.id, result: {
      protocolVersion: message.params?.protocolVersion ?? '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'skillhub-fixture', version: '1.0.0' },
    } })
    return
  }
  if (message.method === 'notifications/initialized' || message.method === 'initialized') return
  if (message.method === 'tools/list') {
    send({ jsonrpc: '2.0', id: message.id, result: { tools: [
      { name: 'ping', description: 'Reply pong', inputSchema: { type: 'object', properties: {} } },
    ] } })
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

/** Records every tool registration, which is all that is visible from the mount. */
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

async function waitFor(check, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (check()) return true
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  return false
}

test('the real mcp-client mounts a SkillHub-started server and unregisters it on stop', async (t) => {
  const base = await mkdtemp(join(tmpdir(), 'skillhub-mount-'))
  const cwd = join(base, 'project')
  await mkdir(cwd, { recursive: true })
  const fixture = join(base, 'fixture-server.mjs')
  await writeFile(fixture, FIXTURE)
  await writeFile(join(cwd, '.mcp.json'), `${JSON.stringify({
    mcpServers: { probe: { command: process.execPath, args: [fixture] } },
  }, null, 2)}\n`)

  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  const tools = recordingTools()
  ctx.provide('tools', tools)
  const agent = { id: 's1', session: { id: 's1', header: { cwd } } }
  agent.ctx = ctx
  ctx.provide('agents', { list: () => [agent] })

  const storeDir = join(base, 'store')
  // The real discovery, so the row's `running` flag and the deny list see the
  // fiber SkillHub itself mounts.
  const runtime = installMcpVisibility(ctx, new McpHub({ storeDir }), () => liveMcpServers(ctx), { storeDir })
  runtime.attach(agent)

  // Before approval the declaration is listed but nothing has been spawned.
  const before = runtime.catalog({ layer: 'session', sessionId: 's1', folder: cwd })
  const declared = before.servers.find(server => server.name === 'probe')
  assert.equal(declared.running, false)
  assert.equal(declared.variants[0].startable, true)
  assert.equal(declared.gate, 'off')
  assert.equal(declared.startRequired, true)
  assert.equal(tools.registered.size, 0)

  await runtime.start({ layer: 'session', sessionId: 's1', folder: cwd }, 'probe')
  assert.ok(
    await waitFor(() => tools.registered.has('mcp__probe__ping')),
    `the server's tool should register; saw ${[...tools.registered.keys()].join(', ') || 'nothing'}`,
  )
  const definition = tools.registered.get('mcp__probe__ping').definition
  assert.equal(typeof definition.execute, 'function')
  assert.equal(definition.description, 'Reply pong')

  const running = runtime.catalog({ layer: 'session', sessionId: 's1', folder: cwd })
  const live = running.servers.find(server => server.name === 'probe')
  assert.equal(live.running, true)
  assert.equal(live.managed, true)
  // Once it runs, the switch reports the stored visibility again.
  assert.equal(live.startRequired, undefined)
  assert.equal(live.gate, 'on')

  // A SkillHub-owned scope-local service is hideable, and hiding it denies the tool.
  const hidden = runtime.mutate({ layer: 'session', sessionId: 's1', folder: cwd }, 'probe', false)
  assert.equal(hidden.servers.find(server => server.name === 'probe').gate, 'off')

  await runtime.stop({ layer: 'session', sessionId: 's1', folder: cwd }, 'probe')
  assert.ok(
    await waitFor(() => tools.registered.size === 0, 10000),
    `stopping should unregister the tool; saw ${[...tools.registered.keys()].join(', ')}`,
  )
})

test('the real mcp-client rejects a config SkillHub would never build', () => {
  // The serverName grammar SkillHub validates its declarations against is the
  // host's own; a name outside it must fail here rather than at start time.
  assert.throws(() => McpClient.Config({ transport: 'stdio', serverName: 'bad name!', command: process.execPath }))
  const accepted = McpClient.Config({ transport: 'stdio', serverName: 'probe', command: process.execPath, args: ['-e', '0'], cwd: tmpdir(), failOnStartupError: false })
  assert.equal(accepted.serverName, 'probe')
  assert.equal(accepted.failOnStartupError, false)
})

test('an approved declaration runs by itself when the session opens', async (t) => {
  const base = await mkdtemp(join(tmpdir(), 'skillhub-autostart-'))
  const cwd = join(base, 'project')
  await mkdir(cwd, { recursive: true })
  const fixture = join(base, 'fixture-server.mjs')
  await writeFile(fixture, FIXTURE)
  await writeFile(join(cwd, '.mcp.json'), `${JSON.stringify({
    mcpServers: {
      auto: { command: process.execPath, args: [fixture] },
      later: { command: process.execPath, args: [fixture, '--other'] },
    },
  }, null, 2)}\n`)

  const storeDir = join(base, 'store')
  const declarations = readProjectMcp(cwd).servers
  const approved = declarations.find(server => server.name === 'auto').variants[0]
  approveMcpServer(storeDir, cwd, 'auto', approved.source, approved.hash)

  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  const tools = recordingTools()
  ctx.provide('tools', tools)
  const agent = { id: 'auto-1', session: { id: 'auto-1', header: { cwd } } }
  agent.ctx = ctx
  ctx.provide('agents', { list: () => [agent] })

  // Only the approved declaration starts, and nothing was clicked.
  const runtime = installMcpVisibility(ctx, new McpHub({ storeDir }), () => liveMcpServers(ctx), { storeDir })
  runtime.attach(agent)
  assert.ok(
    await waitFor(() => tools.registered.has('mcp__auto__ping')),
    `the approved server should start with the session; saw ${[...tools.registered.keys()].join(', ') || 'nothing'}`,
  )
  const row = runtime.catalog({ layer: 'session', sessionId: 'auto-1', folder: cwd })
    .servers.find(server => server.name === 'auto')
  assert.equal(row.running, true)
  assert.equal(row.managed, true)
  assert.equal(tools.registered.size, 1, 'the unapproved declaration must stay down')
})
