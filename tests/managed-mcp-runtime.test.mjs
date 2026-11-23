import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { ManagedMcpRuntime } from '../lib/types/managed-mcp-runtime.js'
import { readAudit, readManagedStore } from '../lib/types/managed-mcp-store.js'

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'skillhub-mcp-runtime-'))
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

class FakeManager {
  registrations = new Map()
  entries = []
  statuses = new Map()
  restarts = []
  list() {
    return [...this.registrations.keys()].map(name => ({
      name,
      configured: true,
      status: this.statuses.get(name) ?? { state: 'connected', toolCount: 2, connectedAt: 1 },
    }))
  }
  register(name, entry) {
    if (this.registrations.has(name)) throw new Error(`server "${name}" is already configured or registered`)
    this.registrations.set(name, entry)
    this.entries.push({ name, entry })
    return () => { this.registrations.delete(name) }
  }
  async restart(name) {
    this.restarts.push(name)
    if (!this.registrations.has(name)) throw new Error('not registered')
  }
}

class FakeCredentials {
  values = new Map()
  async set(ref, value) { this.values.set(ref, value) }
  async unset(ref) { this.values.delete(ref) }
  async describe(ref) {
    return this.values.has(ref)
      ? { configured: true, writable: true, masked: '••••' + String(this.values.get(ref)).slice(-2) }
      : { configured: false, writable: true }
  }
}

const tick = () => new Promise(resolve => setImmediate(resolve))

test('creates, updates, disables, enables, restarts, and removes through the manager', async () => {
  const { dir, cleanup } = tempDir()
  try {
    const manager = new FakeManager()
    const credentials = new FakeCredentials()
    const runtime = new ManagedMcpRuntime(dir)
    runtime.attach(manager, credentials)
    await tick()

    const created = await runtime.create({
      name: 'github', transport: 'stdio', command: 'npx', args: ['-y', 'server'],
      env: [{ key: 'TOKEN', value: 'top-secret' }],
    })
    assert.equal(created.available, true)
    assert.equal(manager.registrations.has('github'), true)
    const ref = readManagedStore(dir).servers['github'].envRefs['TOKEN']
    assert.equal(credentials.values.get(ref), 'top-secret')
    assert.equal(JSON.stringify(created).includes('top-secret'), false)
    assert.equal(created.servers[0].env[0].configured, true)
    assert.equal(created.servers[0].status.state, 'connected')

    await runtime.update('github', {
      name: 'github', transport: 'stdio', command: 'npx', args: ['-y', 'server', '--verbose'],
      env: [{ key: 'TOKEN' }], expectedRevision: readManagedStore(dir).revision,
    })
    assert.equal(manager.entries.length, 2)
    assert.equal(credentials.values.get(ref), 'top-secret')

    manager.statuses.set('github', { state: 'failed', reason: 'gave-up', lastError: 'Bearer abc123' })
    const failed = await runtime.list()
    assert.equal(failed.servers[0].status.state, 'failed')
    assert.equal(failed.servers[0].status.error.includes('abc123'), false)

    const disabled = await runtime.setEnabled('github', false)
    assert.equal(disabled.servers[0].enabled, false)
    assert.equal(manager.registrations.has('github'), false)
    assert.equal(credentials.values.get(ref), 'top-secret')

    await runtime.setEnabled('github', true)
    assert.equal(manager.registrations.has('github'), true)
    await runtime.restart('github')
    assert.deepEqual(manager.restarts, ['github'])

    const removed = await runtime.remove('github')
    assert.equal(removed.servers.length, 0)
    assert.equal(credentials.values.has(ref), false)
    assert.equal(manager.registrations.has('github'), false)

    const actions = readAudit(dir).map(entry => entry.action)
    assert.ok(actions.includes('server.create'))
    assert.ok(actions.includes('server.delete'))
    assert.equal(JSON.stringify(readAudit(dir)).includes('top-secret'), false)
  } finally { cleanup() }
})

test('refuses to add when the host has no MCP manager and keeps definitions readable', async () => {
  const { dir, cleanup } = tempDir()
  try {
    const runtime = new ManagedMcpRuntime(dir)
    await assert.rejects(runtime.create({ name: 'github', transport: 'stdio', command: 'npx' }), /MCP manager is not available/)
    const payload = await runtime.list()
    assert.equal(payload.available, false)
    assert.deepEqual(payload.servers, [])
  } finally { cleanup() }
})

test('duplicate names owned by the host are refused before a definition is written', async () => {
  const { dir, cleanup } = tempDir()
  try {
    const manager = new FakeManager()
    manager.registrations.set('github', {})
    const runtime = new ManagedMcpRuntime(dir)
    runtime.attach(manager, new FakeCredentials())
    await tick()
    await assert.rejects(runtime.create({ name: 'github', transport: 'stdio', command: 'npx' }), /already configured or registered/)
    assert.equal(readManagedStore(dir).servers['github'], undefined)
  } finally { cleanup() }
})
