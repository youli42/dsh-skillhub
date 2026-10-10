import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import React from 'react'
import * as ReactDOM from 'react-dom'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'

/**
 * Loads the built client bundle exactly as the Web module loader does and checks
 * it against the host's real primitive export surface.
 *
 * The primitives package cannot be imported here (its modules import CSS), so the
 * surface is read from the installed declaration-free entry and every access the
 * bundle makes is validated against it: a name the host does not export would be
 * a blank panel after a refresh, and this turns that into a failing test. Effects
 * do not run under static rendering, so this covers load, slot registration, the
 * i18n dictionaries, and the shells — not the data-bearing rows.
 */
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const require_ = createRequire(import.meta.url)

function primitiveSurface() {
  const entry = require_.resolve('@deepseek-ai/dsh-client-ui-primitives')
  const match = /export \{([\s\S]*?)\};/.exec(readFileSync(entry, 'utf8'))
  assert.ok(match !== null, 'the primitives package should publish one export list')
  return new Set(match[1].split(',').map(part => part.trim().split(/\s+as\s+/).pop()).filter(Boolean))
}

function component(name, props) {
  if (name === 'Tooltip' || name === 'Toast') return props.children ?? null
  if (name === 'Menu') return props.anchor ?? null
  if (name === 'RiskConfirmation') {
    if (props.open !== true) return null
    return React.createElement('div', { 'data-stub': name, 'data-command': props.description }, props.confirmLabel)
  }
  if (/^Icon/.test(name)) return React.createElement('span', { 'data-icon': name })
  if (name === 'Input') return React.createElement('input', { value: props.value ?? '', readOnly: true })
  return React.createElement('div', { 'data-stub': name }, props.children ?? null)
}

/** A require() result that throws on any name the host does not export. */
function primitiveStub(surface, accessed) {
  const cache = new Map()
  const target = {
    __esModule: true,
    writeClipboard: async () => true,
  }
  const proxy = new Proxy(target, {
    get(object, property) {
      if (typeof property !== 'string') return Reflect.get(object, property)
      if (property === '__esModule') return true
      if (property === 'default') return proxy
      if (property === 'then') return undefined
      if (Reflect.has(object, property)) return Reflect.get(object, property)
      if (!surface.has(property)) {
        throw new Error(`the client bundle imports "${property}", which the host primitives do not export`)
      }
      if (!cache.has(property)) {
        accessed.add(property)
        cache.set(property, /^use[A-Z]/.test(property) ? () => undefined : component.bind(null, property))
      }
      return cache.get(property)
    },
  })
  return proxy
}

function loadBundle(modules) {
  const code = readFileSync(join(root, 'lib', 'client.js'), 'utf8')
  const requireFn = (specifier) => {
    if (!Object.hasOwn(modules, specifier)) {
      throw new Error(`the client bundle requires "${specifier}", which this test does not provide`)
    }
    return modules[specifier]
  }
  let captured
  const windowShim = {
    __ModuleLoader__: {
      load(entry) {
        captured = { id: entry.id, exports: entry.factory(requireFn) }
      },
    },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
  }
  const loader = new Function('window', 'document', code)
  loader(windowShim, undefined)
  assert.ok(captured !== undefined, 'the bundle should register itself with the module loader')
  return { captured, windowShim }
}

test('the client bundle loads, registers both slots, and renders its shells', () => {
  const surface = primitiveSurface()
  assert.ok(surface.has('RiskConfirmation'), 'the trust dialog primitive must exist in this host build')
  const accessed = new Set()
  const { captured } = loadBundle({
    'react': React,
    'react-dom': ReactDOM,
    'react/jsx-runtime': jsxRuntime,
    '@deepseek-ai/dsh-client-ui-primitives': primitiveStub(surface, accessed),
  })

  assert.equal(captured.id, '@aa2246740/dsh-skillhub')
  assert.equal(captured.exports.name, 'dsh-skillhub-client')
  assert.deepEqual(captured.exports.inject, ['slots', 'locale', 'loader'])
  assert.equal(typeof captured.exports.apply, 'function')

  const dictionaries = new Map()
  const registrations = []
  const t = (key, params) => {
    const dictionary = dictionaries.get('skillhub')?.en ?? {}
    const template = dictionary[key] ?? key
    return String(template).replace(/\{(\w+)\}/g, (_, name) => String(params?.[name] ?? `{${name}}`))
  }
  const ctx = {
    effect: (run) => {
      const dispose = run()
      return () => { if (typeof dispose === 'function') dispose() }
    },
    logger: { warn() {} },
    get: () => undefined,
    locale: {
      register: (namespace, value) => {
        dictionaries.set(namespace, value)
        return () => {}
      },
      bind: () => t,
    },
    slots: {
      inject: (_name, callback) => callback(),
      register: (options, Component) => {
        registrations.push({ options, Component })
        return () => {}
      },
    },
  }
  globalThis.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() {} }
  // Node has a global BroadcastChannel, which the browser client uses to notify
  // other windows; without hiding it here the open channel keeps the test
  // process alive after the assertions finish.
  const browserChannel = globalThis.BroadcastChannel
  globalThis.BroadcastChannel = undefined
  try {
    captured.exports.apply(ctx)
  } finally {
    globalThis.BroadcastChannel = browserChannel
  }

  assert.deepEqual(registrations.map(row => row.options.name), ['settings.section', 'conversation.input.left'])
  assert.deepEqual(registrations.map(row => row.options.id), ['dsh-skillhub', 'dsh-skillhub'])
  assert.deepEqual(registrations.map(row => row.options.order), [80, 40])
  assert.deepEqual([...dictionaries.keys()], ['skillhub'])
  assert.equal(dictionaries.get('skillhub').en['badge.skillhubOnly'], 'SkillHub only')
  assert.equal(dictionaries.get('skillhub').zh['mcp.trust'], '信任并启动')

  const settings = renderToStaticMarkup(React.createElement(registrations[0].Component, { t }))
  assert.match(settings, /data-ud-check="skillhub-tree"/)
  assert.match(settings, /skillhub-header|Skills/)
  const chip = renderToStaticMarkup(React.createElement(registrations[1].Component, {
    sessionId: 's1',
    useSessions: selector => selector({ byId: { s1: { cwd: 'D:/tmp/project' } } }),
    t,
  }))
  assert.match(chip, /data-skillhub-chip/)

  // Every primitive the bundle reached for exists on the host surface, and the
  // check itself is live rather than vacuous.
  assert.ok(accessed.size > 0)
  for (const name of accessed) assert.ok(surface.has(name))
  assert.ok(accessed.has('Pill') || accessed.has('Button'))

  // A className the CSS module does not define is silently dropped at runtime
  // (css.unknown === undefined), so an unstyled row never fails a build. The
  // generated module exposes `.<hash>_<local>` rules; the classes the new MCP
  // markup relies on must be among them.
  const bundleSource = readFileSync(join(root, 'lib', 'client.js'), 'utf8')
  for (const local of ['variantList', 'variant', 'variantSource', 'variantCommand', 'problems', 'cell', 'slash', 'switch']) {
    assert.match(bundleSource, new RegExp(`[A-Za-z0-9]{6}_${local}\\{`), `the stylesheet should define .${local}`)
  }

  // The popover paints an opaque surface. `--dsw-specific-menu` is the host's
  // frosted menu fill: it carries alpha and is meant to be used together with
  // `backdrop-filter`, so on its own it let the chat read through the panel. It
  // may only appear layered over the opaque overlay background.
  assert.match(bundleSource, /_menu\{[^}]*background-color:var\(--dsw-alias-bg-overlay\)/,
    'the popover should paint the opaque overlay background')
  assert.match(bundleSource, /_menu\{[^}]*background-image:linear-gradient\(var\(--dsw-specific-menu\),\s*var\(--dsw-specific-menu\)\)/,
    'the host menu tone should be layered over that opaque background')
  assert.doesNotMatch(bundleSource, /_menu\{[^}]*[^-]background:var\(--dsw-specific-menu\)/,
    'the popover must never assign the translucent fill as its only background')
})
