import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as plugin from '../lib/types/dsh-skillhub.js'

/**
 * Walks the real plugin entry: `Config` defaults, `apply()` mounting the
 * provider and the MCP runtime, and the exact HTTP payload the Web client
 * consumes. The harness services `apply` injects are stood in for, because the
 * only real ones here are the Skill registry the plugin registers into.
 */
function request(path, body, method = 'GET') {
  const payload = body === undefined ? [] : [Buffer.from(JSON.stringify(body))]
  const req = Readable.from(payload)
  req.method = method
  req.url = path
  req.headers = { host: '127.0.0.1' }
  return req
}

function response() {
  const result = { status: 0, body: '' }
  let settle = () => {}
  const done = new Promise(resolve => { settle = resolve })
  return {
    result,
    done,
    writeHead(status) { result.status = status },
    end(body) { result.body = String(body); settle() },
  }
}

test('the plugin entry serves project Skills and declared MCP through its route', async (t) => {
  const base = await mkdtemp(join(tmpdir(), 'skillhub-entry-'))
  const cwd = join(base, 'project')
  await mkdir(join(cwd, '.agents', 'skills', 'panel-skill'), { recursive: true })
  await writeFile(
    join(cwd, '.agents', 'skills', 'panel-skill', 'SKILL.md'),
    '---\r\nname: panel-skill\r\nwhenToUse: in this project\r\ndescription: from the project\r\n---\r\n\r\nBody.\r\n',
  )
  await mkdir(join(cwd, '.opencode'), { recursive: true })
  await writeFile(join(cwd, '.mcp.json'), `${JSON.stringify({
    mcpServers: {
      'ue-mcp': { command: process.execPath, args: ['-e', '0'] },
      broken: { command: process.execPath, args: [join(base, 'missing', 'x.uproject')] },
    },
  }, null, 2)}\n`)

  // The plugin derives both homes and the store from these two variables.
  const agentsRoot = join(base, 'agents-root')
  const dshRoot = join(base, 'dsh-root')
  await mkdir(join(agentsRoot, 'skills'), { recursive: true })
  await mkdir(join(dshRoot, 'skills'), { recursive: true })
  const previous = { agents: process.env.DSH_AGENTS_HOME, home: process.env.DSH_HOME }
  process.env.DSH_AGENTS_HOME = agentsRoot
  process.env.DSH_HOME = dshRoot
  t.after(() => {
    if (previous.agents === undefined) delete process.env.DSH_AGENTS_HOME
    else process.env.DSH_AGENTS_HOME = previous.agents
    if (previous.home === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous.home
  })

  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  await ctx.plugin(SkillRegistry)
  const routes = []
  ctx.provide('webServer', {
    register(options) {
      routes.push(options)
      return () => {}
    },
  })
  ctx.provide('tools', {
    schemas: () => [],
    get: () => undefined,
    restrict: () => () => {},
    guard: () => () => {},
  })
  ctx.provide('agents', { list: () => [] })
  ctx.provide('connection', { requestRejection: () => undefined })

  const config = plugin.Config({ projectSkillRoots: ['.agents/skills'], projectMcpFiles: ['.mcp.json'] })
  assert.deepEqual(config.projectSkillRoots, ['.agents/skills'])
  assert.equal(config.enabled.get(), true)
  // Approved project services start with the session unless the profile says no.
  assert.equal(config.autoStartTrustedMcp, true)
  await ctx.plugin({ name: plugin.name, inject: plugin.inject, apply: plugin.apply }, config)

  assert.equal(routes.length, 1)
  assert.equal(routes[0].kind, 'prefix')
  assert.equal(routes[0].path, '/skillhub')
  const handle = (path, body, method) => {
    const res = response()
    routes[0].handler(request(path, body, method), res)
    return res
  }
  const query = `folder=${encodeURIComponent(cwd)}`

  // Project Skills reach the client, including the value the CRLF bug used to drop.
  const projectRead = handle(`/skillhub/catalog?layer=project&${query}`)
  await projectRead.done
  assert.equal(projectRead.result.status, 200)
  const project = JSON.parse(projectRead.result.body)
  const projectHome = project.tree.filter(home => home.home === 'project')
  assert.equal(projectHome.length, 1)
  assert.equal(projectHome[0].label, '.agents')
  assert.equal(projectHome[0].source, 'project-agents')
  assert.deepEqual(projectHome[0].children.map(child => child.name), ['panel-skill'])
  assert.equal(projectHome[0].children[0].description, 'from the project')
  assert.deepEqual(project.offered.map(skill => skill.name), ['panel-skill'])

  // A Global read has no folder, so it must not invent a project section.
  const globalRead = handle('/skillhub/catalog?layer=global')
  await globalRead.done
  const global = JSON.parse(globalRead.result.body)
  assert.equal(global.tree.filter(home => home.home === 'project').length, 0)
  assert.deepEqual(global.offered, [])

  // Declared project MCP is listed without being started, with its problems.
  const mcpRead = handle(`/skillhub/mcp/catalog?layer=session&sessionId=s1&${query}`)
  await mcpRead.done
  assert.equal(mcpRead.result.status, 200)
  const mcp = JSON.parse(mcpRead.result.body)
  const ue = mcp.servers.find(server => server.name === 'ue-mcp')
  assert.equal(ue.running, false)
  assert.equal(ue.declared, true)
  assert.equal(ue.variants[0].startable, true)
  assert.equal(ue.variants[0].source, 'mcp-json')
  // Nothing has started yet, so the row reads Off and asks to be started instead
  // of showing a switch that would claim the service was on.
  assert.equal(ue.gate, 'off')
  assert.equal(ue.startRequired, true)
  const broken = mcp.servers.find(server => server.name === 'broken')
  assert.equal(broken.variants[0].startable, false)
  assert.ok(broken.problems.some(problem => problem.includes('does not exist')))

  // A toggle through the route writes this folder's Project document and answers
  // the refreshed catalog.
  const toggled = handle('/skillhub/toggle', {
    layer: 'project', folder: cwd, kind: 'skill', id: 'project:panel-skill/SKILL.md', on: false,
  }, 'POST')
  await toggled.done
  assert.equal(toggled.result.status, 200)
  const after = JSON.parse(toggled.result.body)
  assert.deepEqual(after.offered, [])
  assert.equal(after.tree.find(home => home.home === 'project').children[0].gate, 'off')

  const stored = await readdir(join(dshRoot, 'skillhub', 'projects'))
  assert.equal(stored.length, 1)

  // The route's invalidation is what carries the write into the model's own
  // view: without it the registry would keep serving the catalog it cached.
  const { isModelInvocable } = await import('@deepseek-ai/dsh-skill')
  const listed = await ctx.skills.list({ cwd })
  const panel = listed.find(skill => skill.name === 'panel-skill')
  assert.ok(panel !== undefined)
  assert.equal(isModelInvocable(panel), false)
})
