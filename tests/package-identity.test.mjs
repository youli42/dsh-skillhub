import assert from 'node:assert/strict'
import test from 'node:test'
import { checkPackageIdentity } from '../scripts/check-package.mjs'

const scoped = '@aa2246740/dsh-skillhub'
const patch = name => `- insert:\n    - id: dsh-skillhub\n      name: '${name}'\n`
const client = name => `window.__ModuleLoader__.load({ id: ${JSON.stringify(name)}, factory() { throw new Error('must stay lazy') } })`

test('rejects the 1.0.4 npm package-name mismatch before packing', () => {
  assert.throws(() => checkPackageIdentity(scoped, patch('dsh-skillhub'), client('dsh-skillhub')), /Bundle module name/)
})

test('rejects a renamed package whose compiled client still registers the old id', () => {
  assert.throws(() => checkPackageIdentity(scoped, patch(scoped), client('dsh-skillhub')), /Built client registration/)
})

test('accepts matching package, bundle and lazy client identities', () => {
  checkPackageIdentity(scoped, patch(scoped), client(scoped))
})
