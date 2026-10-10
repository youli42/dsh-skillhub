import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, readdir, rm, symlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { runInNewContext } from 'node:vm'

const harness = process.env.DSHX_HARNESS
assert.ok(harness, 'Set DSHX_HARNESS to the official RC2 checkout')
const packageRoot = resolve(process.argv[2])
const pkg = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'))
const require = createRequire(join(harness, 'packages/client/modules/package.json'))
const { Context } = await import(require.resolve('@deepseek-ai/cordis'))
const { ModuleLoader } = await import(require.resolve('@deepseek-ai/cordis-plugin-loader'))
const { ClientModuleRegistry } = await import(pathToFileURL(join(harness, 'packages/client/modules/lib/index.js')).href)
const internal = ModuleLoader.fromInternal()
assert.ok(internal, 'Run this probe with --expose-internals')
const official = new Map()
for (const group of await readdir(join(harness, 'packages'), { withFileTypes: true })) {
  if (!group.isDirectory()) continue
  for (const item of await readdir(join(harness, 'packages', group.name), { withFileTypes: true })) {
    if (!item.isDirectory()) continue
    const root = join(harness, 'packages', group.name, item.name)
    let metadata
    try { metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) }
    catch (error) { if (error.code === 'ENOENT') continue; throw error }
    official.set(metadata.name, { root, metadata })
  }
}

const fixture = await mkdtemp(join(tmpdir(), 'skillhub-package-loader-'))
const results = []
try {
  for (const installedName of [pkg.name, 'dsh-skillhub']) {
    const profile = join(fixture, installedName === pkg.name ? 'canonical' : 'legacy-alias')
    const link = join(profile, 'node_modules', installedName)
    await mkdir(dirname(link), { recursive: true })
    await symlink(packageRoot, link, 'junction')
    const baseUrl = pathToFileURL(join(profile, 'cordis.yml')).href
    const rows = new Map()
    const add = (name, base, metadata) => {
      if (rows.has(name)) return
      rows.set(name, {
        options: { name }, fiber: {}, disabled: false,
        parent: { tree: { ctx: { baseUrl: base } } },
      })
      for (const dependency of metadata.dsh?.client?.inject ?? []) {
        const found = official.get(dependency)
        assert.ok(found, `Official client dependency missing: ${dependency}`)
        add(dependency, pathToFileURL(join(found.root, 'cordis.yml')).href, found.metadata)
      }
    }
    add(installedName, baseUrl, pkg)
    const ctx = new Context()
    ctx.baseUrl = baseUrl
    ctx.provide('loader', { internal, entries: () => rows.values() })
    try {
      const registry = new ClientModuleRegistry(ctx)
      const entry = registry.graph().entries.find(row => row.id === pkg.name)
      const registrations = []
      if (entry) {
        const response = await registry.fetchBundle(new Request(new URL(entry.url, 'http://localhost/')))
        assert.equal(response.status, 200)
        runInNewContext(await response.text(), {
          window: { __ModuleLoader__: { load: ({ id }) => registrations.push(id) } },
        })
        assert.ok(registrations.includes(pkg.name), 'Served bundle must register the graph entry ID')
      }
      assert.equal(Boolean(entry), installedName === pkg.name)
      results.push({ installedName, graphContainsClient: Boolean(entry), servedClientRegistersExpectedId: registrations.includes(pkg.name) })
    } finally {
      await ctx.fiber.dispose()
    }
  }
} finally {
  await rm(fixture, { recursive: true, force: true })
}
console.log(JSON.stringify({ version: pkg.version, harness: '0.2.0-rc.2', results }))
