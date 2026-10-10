// DSHX_HARNESS=/path/to/RC2 node --test tests/package-loader-runtime.test.mjs
// Set DSH_SKILLHUB_PACKAGE_DIR to the extracted final tarball to test shipped bytes.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

test('official RC2 graph discovers the canonical package and serves the matching client', () => {
  const stdout = execFileSync(process.execPath, [
    '--expose-internals', resolve(root, 'tests/helpers/package-loader-probe.mjs'),
    process.env.DSH_SKILLHUB_PACKAGE_DIR ?? root,
  ], { encoding: 'utf8', env: process.env, timeout: 30_000 })
  const evidence = JSON.parse(stdout)
  assert.deepEqual(evidence.results, [
    { installedName: '@aa2246740/dsh-skillhub', graphContainsClient: true, servedClientRegistersExpectedId: true },
    { installedName: 'dsh-skillhub', graphContainsClient: false, servedClientRegistersExpectedId: false },
  ])
})
