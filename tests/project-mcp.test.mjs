import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  DEFAULT_PROJECT_MCP_FILES,
  approveMcpServer,
  isApproved,
  mcpClientConfig,
  mcpTrustPath,
  readMcpTrust,
  readProjectMcp,
  resolveExecutable,
  revokeMcpServer,
} from '../lib/types/project-mcp.js'

async function project(tag) {
  const cwd = await mkdtemp(join(tmpdir(), `skillhub-mcp-${tag}-`))
  return { cwd, storeDir: join(cwd, 'store') }
}

async function writeJson(path, value) {
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}

test('reads .mcp.json and opencode.json, merging one name into its variants', async () => {
  const { cwd } = await project('read')
  const missing = join(cwd, 'gone', 'Test_DreamShader.uproject')
  await writeFile(join(cwd, 'Test_DreamShader.uproject'), '{}\n')
  await writeJson(join(cwd, '.mcp.json'), {
    mcpServers: {
      'ue-mcp': { command: process.execPath, args: ['-e', '0', missing] },
      'local-ok': { command: process.execPath, args: ['./Test_DreamShader.uproject'] },
      'http-one': { url: 'http://127.0.0.1:9/mcp' },
      'bad name!': { command: process.execPath },
      'no-command': { args: ['x'] },
    },
  })
  await writeJson(join(cwd, '.opencode', 'opencode.json'), {
    mcp: {
      'ue-mcp': { type: 'local', command: [process.execPath, '-e', '0'], environment: { UE: '1' } },
      'remote-one': { type: 'remote', url: 'https://example.invalid/mcp' },
      'off-one': { type: 'local', command: [process.execPath], enabled: false },
    },
  })

  assert.deepEqual([...DEFAULT_PROJECT_MCP_FILES], ['.mcp.json', '.opencode/opencode.json'])
  const read = readProjectMcp(cwd)
  // A name is only a row when at least one declaration can describe a server;
  // an entry with neither command nor url is a file-level problem instead.
  assert.deepEqual(read.servers.map(server => server.name),
    ['http-one', 'local-ok', 'off-one', 'remote-one', 'ue-mcp'])

  const ue = read.servers.find(server => server.name === 'ue-mcp')
  assert.deepEqual(ue.variants.map(variant => variant.source).sort(), ['mcp-json', 'opencode-json'])
  const claudeVariant = ue.variants.find(variant => variant.source === 'mcp-json')
  assert.ok(claudeVariant.problems.some(problem => problem.includes('does not exist')))
  const opencodeVariant = ue.variants.find(variant => variant.source === 'opencode-json')
  assert.deepEqual(opencodeVariant.problems, [])
  assert.equal(opencodeVariant.transport, 'stdio')
  assert.deepEqual(opencodeVariant.env, { UE: '1' })

  // A relative project path that exists is not a problem, and package
  // specifiers are never mistaken for paths.
  const localOk = read.servers.find(server => server.name === 'local-ok').variants[0]
  assert.deepEqual(localOk.problems, [])

  assert.equal(read.servers.find(server => server.name === 'http-one').variants[0].transport, 'streamable-http')
  assert.equal(read.servers.find(server => server.name === 'remote-one').variants[0].transport, 'streamable-http')
  const off = read.servers.find(server => server.name === 'off-one').variants[0]
  assert.equal(off.disabled, true)
  assert.ok(off.problems.some(problem => problem.includes('disabled')))

  assert.ok(read.problems.some(problem => problem.includes('bad name!')))
  assert.ok(read.problems.some(problem => problem.includes('neither')))
})

test('an unreadable or malformed declaration reports one file-level problem', async () => {
  const { cwd } = await project('broken')
  await writeFile(join(cwd, '.mcp.json'), '{ not json\n')
  const read = readProjectMcp(cwd)
  assert.deepEqual(read.servers, [])
  assert.ok(read.problems.some(problem => problem.includes('invalid JSON')))
})

test('approval is bound to the exact declaration content', async () => {
  const { cwd, storeDir } = await project('trust')
  await writeJson(join(cwd, '.mcp.json'), {
    mcpServers: { demo: { command: process.execPath, args: ['-e', '0'] } },
  })
  const variant = readProjectMcp(cwd).servers[0].variants[0]
  assert.equal(isApproved(readMcpTrust(storeDir, cwd), variant, 'demo'), false)

  approveMcpServer(storeDir, cwd, 'demo', variant.source, variant.hash)
  assert.equal(isApproved(readMcpTrust(storeDir, cwd), variant, 'demo'), true)
  assert.ok(mcpTrustPath(storeDir, cwd).endsWith('.json'))

  // Editing the command line produces a different hash, so the old approval
  // cannot authorise the new command.
  await writeJson(join(cwd, '.mcp.json'), {
    mcpServers: { demo: { command: process.execPath, args: ['-e', '1'] } },
  })
  const next = readProjectMcp(cwd).servers[0].variants[0]
  assert.notEqual(next.hash, variant.hash)
  assert.equal(isApproved(readMcpTrust(storeDir, cwd), next, 'demo'), false)

  approveMcpServer(storeDir, cwd, 'demo', next.source, next.hash)
  revokeMcpServer(storeDir, cwd, 'demo')
  assert.equal(isApproved(readMcpTrust(storeDir, cwd), next, 'demo'), false)
})

test('the client config carries the declared name and the project working directory', async () => {
  const { cwd } = await project('config')
  await writeJson(join(cwd, '.mcp.json'), {
    mcpServers: { 'ue-mcp': { command: process.execPath, args: ['./Test_DreamShader.uproject'] } },
  })
  const variant = readProjectMcp(cwd).servers[0].variants[0]
  const config = mcpClientConfig('ue-mcp', variant, cwd)
  assert.equal(config.serverName, 'ue-mcp')
  assert.equal(config.transport, 'stdio')
  assert.equal(config.command, process.execPath)
  assert.deepEqual(config.args, ['./Test_DreamShader.uproject'])
  assert.equal(config.cwd, cwd)
  // SkillHub owns this mount, so activation must fail loudly rather than leave a
  // "running" server that never connected.
  assert.equal(config.failOnStartupError, true)
})

test('resolveExecutable finds an absolute launcher and reports a missing command', () => {
  assert.equal(resolveExecutable(process.execPath), process.execPath)
  assert.equal(resolveExecutable('skillhub-definitely-not-a-command-xyz'), undefined)
})
