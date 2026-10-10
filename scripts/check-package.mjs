import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { runInNewContext } from 'node:vm'

/** Verify the three identities used by the official package and client loaders. */
export function checkPackageIdentity(name, patch, client) {
  const names = [...patch.matchAll(/^\s+name:\s*['"]?([^'"\s]+)['"]?\s*$/gm)].map(match => match[1])
  assert.deepEqual(names, [name], 'Bundle module name must equal package.json name; npm aliases are not supported')
  const registrations = []
  runInNewContext(client, {
    window: { __ModuleLoader__: { load: ({ id }) => registrations.push(id) } },
  }, { timeout: 1000 })
  assert.deepEqual(registrations, [name], 'Built client registration must equal package.json name; rebuild before packing')
}

/** Check the already-built package, without requiring the development toolchain. */
export async function checkPackage(root) {
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
  const patch = await readFile(resolve(root, pkg.dsh.bundle.patch), 'utf8')
  const client = await readFile(resolve(root, pkg.exports['./client'].default), 'utf8')
  checkPackageIdentity(pkg.name, patch, client)
  return pkg.name
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)))
  console.log(`Package identity verified: ${await checkPackage(root)}`)
}
