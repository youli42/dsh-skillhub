import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  appendAudit, createManagedServer, deleteManagedServer, readAudit, readManagedStore,
  redactAuditText, setManagedServerEnabled, updateManagedServer,
} from '../lib/types/managed-mcp-store.js'

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'skillhub-mcp-store-'))
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

test('creates a stdio definition with credential references and no secret value on disk', () => {
  const { dir, cleanup } = tempDir()
  try {
    const result = createManagedServer(dir, {
      name: 'github', transport: 'stdio', command: 'npx', args: ['-y', 'server'],
      env: [{ key: 'GITHUB_TOKEN', value: 'super-secret-value' }],
    })
    const ref = result.definition.envRefs['GITHUB_TOKEN']
    assert.match(ref, /^SKILLHUB_GITHUB_ENV_GITHUB_TOKEN/)
    assert.equal(result.secrets.length, 1)
    assert.equal(result.secrets[0].value, 'super-secret-value')
    const raw = readFileSync(join(dir, 'mcp-servers.json'), 'utf8')
    assert.equal(raw.includes('super-secret-value'), false)
    assert.equal(statSync(join(dir, 'mcp-servers.json')).mode & 0o777, 0o600)
    assert.equal(readManagedStore(dir).revision, 1)
  } finally { cleanup() }
})

test('rejects invalid names, transports, and cross-transport fields before writing', () => {
  const { dir, cleanup } = tempDir()
  try {
    assert.throws(() => createManagedServer(dir, { name: '../bad', transport: 'stdio', command: 'npx' }), /invalid MCP server name/)
    assert.throws(() => createManagedServer(dir, { name: 'bad', transport: 'sse', command: 'npx' }), /transport/)
    assert.throws(() => createManagedServer(dir, { name: 'bad', transport: 'stdio', command: '' }), /requires a command/)
    assert.throws(() => createManagedServer(dir, { name: 'bad', transport: 'stdio', command: 'npx', url: 'https://x' }), /cannot use a url/)
    assert.throws(() => createManagedServer(dir, { name: 'bad', transport: 'streamable-http', url: 'ftp://x' }), /requires an http/)
    assert.throws(() => createManagedServer(dir, { name: 'bad', transport: 'streamable-http', url: 'https://x', args: ['x'] }), /cannot use args/)
    assert.equal(readManagedStore(dir).revision, 0)
  } finally { cleanup() }
})

test('updates reuse existing references, release removed ones, and check revisions', () => {
  const { dir, cleanup } = tempDir()
  try {
    const first = createManagedServer(dir, {
      name: 'github', transport: 'stdio', command: 'npx',
      env: [{ key: 'TOKEN', value: 'one' }],
    })
    const tokenRef = first.definition.envRefs['TOKEN']
    const second = updateManagedServer(dir, 'github', {
      name: 'github', transport: 'stdio', command: 'npx', args: ['--flag'],
      env: [{ key: 'TOKEN', value: 'two' }, { key: 'OTHER', value: 'three' }],
      expectedRevision: first.document.revision,
    })
    assert.equal(second.definition.envRefs['TOKEN'], tokenRef)
    assert.notEqual(second.definition.envRefs['OTHER'], tokenRef)
    assert.deepEqual(second.removedRefs, [])
    assert.equal(second.secrets.find(write => write.key === 'TOKEN').value, 'two')
    const third = updateManagedServer(dir, 'github', {
      name: 'github', transport: 'stdio', command: 'npx',
      env: [{ key: 'TOKEN' }],
      expectedRevision: second.document.revision,
    })
    assert.deepEqual(third.removedRefs, [second.definition.envRefs['OTHER']])
    assert.throws(() => updateManagedServer(dir, 'github', {
      name: 'github', transport: 'stdio', command: 'npx', expectedRevision: 999,
    }), /changed in another window/)
  } finally { cleanup() }
})

test('deleting a definition reports every reference for cleanup', () => {
  const { dir, cleanup } = tempDir()
  try {
    const created = createManagedServer(dir, {
      name: 'github', transport: 'stdio', command: 'npx',
      env: [{ key: 'TOKEN', value: 'one' }],
      headers: [],
    })
    const removed = deleteManagedServer(dir, 'github')
    assert.deepEqual(removed.removedRefs, [created.definition.envRefs['TOKEN']])
    assert.equal(readManagedStore(dir).servers['github'], undefined)
    assert.throws(() => deleteManagedServer(dir, 'github'), /does not exist/)
  } finally { cleanup() }
})

test('enable is durable and does not touch references', () => {
  const { dir, cleanup } = tempDir()
  try {
    createManagedServer(dir, { name: 'github', transport: 'stdio', command: 'npx' })
    const disabled = setManagedServerEnabled(dir, 'github', false)
    assert.equal(disabled.definition.enabled, false)
    assert.equal(readManagedStore(dir).servers['github'].enabled, false)
  } finally { cleanup() }
})

test('audit records are filtered, bounded, and redacted', () => {
  const { dir, cleanup } = tempDir()
  try {
    appendAudit(dir, { at: '2026-01-01T00:00:00.000Z', action: 'server.create', server: 'a', result: 'ok', secretRefs: ['REF_A'] })
    appendAudit(dir, { at: '2026-01-01T00:00:01.000Z', action: 'server.update', server: 'b', result: 'error', error: 'Bearer abc123 from ?token=xyz' })
    const all = readAudit(dir, { limit: 10 })
    assert.equal(all.length, 2)
    assert.equal(redactAuditText('Bearer abc123').includes('abc123'), false)
    assert.equal(redactAuditText('?token=xyz').includes('xyz'), false)
    assert.deepEqual(readAudit(dir, { server: 'a' }).map(entry => entry.action), ['server.create'])
    assert.equal(readAudit(dir, { limit: 1 }).length, 1)
    assert.equal(JSON.stringify(all).includes('super-secret'), false)
  } finally { cleanup() }
})

test('clearing a secret keeps its field but releases the stored value', () => {
  const { dir, cleanup } = tempDir()
  try {
    const created = createManagedServer(dir, {
      name: 'github', transport: 'stdio', command: 'npx',
      env: [{ key: 'TOKEN', value: 'secret' }],
    })
    const ref = created.definition.envRefs['TOKEN']
    const cleared = updateManagedServer(dir, 'github', {
      name: 'github', transport: 'stdio', command: 'npx',
      env: [{ key: 'TOKEN', clear: true }],
      expectedRevision: created.document.revision,
    })
    assert.equal(cleared.definition.envRefs['TOKEN'], ref)
    assert.deepEqual(cleared.removedRefs, [ref])
    assert.deepEqual(cleared.secrets, [])
  } finally { cleanup() }
})
