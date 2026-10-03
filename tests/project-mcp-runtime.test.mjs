import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { McpHub } from '../lib/types/mcp.js'
import { installMcpVisibility } from '../lib/types/mcp-runtime.js'
import { readMcpTrust } from '../lib/types/project-mcp.js'

/**
 * These tests stub the Cordis context on purpose: the harness service that owns
 * tools and agents only exists inside a real DSH process, and the contract under
 * test here is SkillHub's own — which rows are merged, what a declaration must
 * satisfy before it runs, and the exact config handed to the MCP client plugin.
 */
function stubTools({ toolNames = [], scopedOnly = [] } = {}) {
  const registered = toolNames.map(name => ({ name }))
  return {
    registered,
    schemas: () => registered,
    get: (name, scope) => (scopedOnly.includes(name) && scope === undefined
      ? undefined
      : registered.find(entry => entry.name === name)),
    restrict: () => () => {},
    guard: () => () => {},
  }
}

function stubContext({ agents = [], tools = stubTools() } = {}) {
  return {
    get: (name) => (name === 'tools' ? tools : name === 'agents' ? { list: () => agents } : undefined),
    on: () => () => {},
    effect: () => () => {},
    registry: { values: () => [] },
  }
}

function stubAgent(folder, tools, sessionId = 's1') {
  const mounts = []
  const disposed = []
  const agent = {
    id: sessionId,
    session: { id: sessionId, header: { cwd: folder } },
    mounts,
    ctx: {
      get: (name) => (name === 'tools' ? tools : undefined),
      effect: () => () => {},
      plugin: async (plugin, config) => {
        mounts.push({ plugin, config })
        return { dispose: async () => { disposed.push(config.serverName) } }
      },
      disposed,
    },
  }
  return agent
}

async function project(tag, declarations) {
  const cwd = await mkdtemp(join(tmpdir(), `skillhub-mcprt-${tag}-`))
  await mkdir(join(cwd, '.opencode'), { recursive: true })
  if (declarations !== undefined) {
    await writeFile(join(cwd, '.mcp.json'), `${JSON.stringify({ mcpServers: declarations }, null, 2)}\n`)
  }
  return cwd
}

test('the catalog merges live fibers with declared servers and reports their problems', async () => {
  const cwd = await project('catalog', {
    'live-one': { command: process.execPath, args: ['-e', '0'] },
    'ue-mcp': { command: process.execPath, args: [join('E:', 'gone', 'Test_DreamShader.uproject')] },
  })
  const storeDir = join(cwd, 'store')
  const hub = new McpHub({ storeDir })
  const tools = stubTools({ toolNames: ['mcp__live-one__ping'] })
  const agent = stubAgent(cwd, tools)
  const runtime = installMcpVisibility(stubContext({ agents: [agent], tools }), hub, () => ['live-one'], { storeDir })
  runtime.attach(agent)

  const catalog = runtime.catalog({ layer: 'session', sessionId: 's1', folder: cwd })
  const live = catalog.servers.find(server => server.name === 'live-one')
  assert.equal(live.running, true)
  assert.equal(live.declared, true)
  assert.equal(live.tools, 1)
  assert.equal(live.managed, false)

  const declared = catalog.servers.find(server => server.name === 'ue-mcp')
  assert.equal(declared.running, false)
  assert.equal(declared.tools, 0)
  assert.equal(declared.variants.length, 1)
  assert.equal(declared.variants[0].startable, false)
  assert.ok(declared.problems.some(problem => problem.includes('does not exist')))
  // Nothing has been spawned, so the row reads Off and offers no switch: the
  // stored visibility would otherwise claim a service was on that does not exist.
  assert.equal(declared.gate, 'off')
  assert.equal(declared.startRequired, true)

  // The name stays a legal visibility target for the layers, and the write is
  // what the service will honour once it runs.
  const afterToggle = runtime.mutate({ layer: 'session', sessionId: 's1', folder: cwd }, 'ue-mcp', false)
  assert.equal(afterToggle.servers.find(server => server.name === 'ue-mcp').gate, 'off')
  assert.equal(hub.effectiveGate('ue-mcp', 's1', cwd).gate, 'off')
  // A live service keeps reporting the stored value.
  assert.equal(catalog.servers.find(server => server.name === 'live-one').startRequired, undefined)
  assert.equal(hub.effectiveGate('live-one', 's1', cwd).gate, 'on')
  // An unknown name is not addressable.
  assert.throws(() => runtime.mutate({ layer: 'global' }, 'never-heard-of-it', false), /not registered or declared/)
})

test('start refuses what cannot run and mounts what the user approved', async () => {
  const cwd = await project('start', {
    fixture: { command: process.execPath, args: ['-e', '0'] },
    broken: { command: process.execPath, args: [join(tmpdir(), 'skillhub-missing-ue', 'x.uproject')] },
  })
  const storeDir = join(cwd, 'store')
  const hub = new McpHub({ storeDir })
  const tools = stubTools()
  const agent = stubAgent(cwd, tools)
  const runtime = installMcpVisibility(stubContext({ agents: [agent], tools }), hub, () => ['fixture'], { storeDir })
  runtime.attach(agent)
  const query = { layer: 'session', sessionId: 's1', folder: cwd }

  await assert.rejects(() => runtime.start(query, 'absent'), /not declared in this project/)
  await assert.rejects(() => runtime.start(query, 'broken'), /Cannot start "broken"/)
  // Nothing was written and nothing was mounted by the refusals.
  assert.deepEqual(agent.mounts, [])
  assert.deepEqual(readMcpTrust(storeDir, cwd).servers, {})

  const started = await runtime.start(query, 'fixture')
  assert.equal(started.started, 'fixture')
  assert.equal(agent.mounts.length, 1)
  assert.equal(agent.mounts[0].plugin.name, 'mcp-client')
  assert.equal(agent.mounts[0].config.serverName, 'fixture')
  assert.equal(agent.mounts[0].config.transport, 'stdio')
  assert.equal(agent.mounts[0].config.command, process.execPath)
  assert.deepEqual(agent.mounts[0].config.args, ['-e', '0'])
  assert.equal(agent.mounts[0].config.cwd, cwd)
  assert.equal(agent.mounts[0].config.failOnStartupError, false)
  // The approval is bound to this exact declaration.
  assert.equal(readMcpTrust(storeDir, cwd).servers['fixture'].hash.length, 32)
  assert.equal(started.servers.find(server => server.name === 'fixture').managed, true)

  const stopped = await runtime.stop(query, 'fixture')
  assert.deepEqual(agent.ctx.disposed, ['fixture'])
  assert.equal(stopped.servers.find(server => server.name === 'fixture').managed, false)
  // Stopping keeps the approval so restarting is one click.
  assert.ok(readMcpTrust(storeDir, cwd).servers['fixture'] !== undefined)
})

test('a SkillHub-owned mount is hideable even though its tools are scope-local', async () => {
  const cwd = await project('owned', {
    mine: { command: process.execPath, args: ['-e', '0'] },
  })
  const storeDir = join(cwd, 'store')
  const hub = new McpHub({ storeDir })
  // Both servers register tools only inside an agent scope, which is exactly the
  // shape that normally refuses a full hide.
  const tools = stubTools({
    toolNames: ['mcp__mine__ping', 'mcp__foreign__ping'],
    scopedOnly: ['mcp__mine__ping', 'mcp__foreign__ping'],
  })
  const agent = stubAgent(cwd, tools)
  const runtime = installMcpVisibility(stubContext({ agents: [agent], tools }), hub, () => ['mine', 'foreign'], { storeDir })
  runtime.attach(agent)

  const before = runtime.catalog({ layer: 'global', sessionId: 's1', folder: cwd })
  assert.equal(before.servers.find(server => server.name === 'foreign').supported, false)

  await runtime.start({ layer: 'session', sessionId: 's1', folder: cwd }, 'mine')
  const after = runtime.catalog({ layer: 'global', sessionId: 's1', folder: cwd })
  assert.equal(after.servers.find(server => server.name === 'mine').managed, true)
  assert.equal(after.servers.find(server => server.name === 'mine').supported, true)
  // Hiding a foreign scope-local server is still refused.
  assert.throws(() => runtime.mutate({ layer: 'global' }, 'foreign', false), /Cannot fully hide/)
})
