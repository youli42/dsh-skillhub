import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import React from 'react'
import * as ReactDOM from 'react-dom'
import * as jsxRuntime from 'react/jsx-runtime'
import { createRoot } from 'react-dom/client'

/**
 * Renders the built client against a real DOM with real effects, so the rows the
 * static smoke test cannot reach are exercised end to end: the project home
 * section in the composer popover, a declared-but-not-running MCP service with
 * its command line and problems, and the trust flow that turns a click into the
 * exact `/mcp/start` body.
 *
 * The host primitives are stood in for by small faithful versions of the ones
 * this flow uses (Button, Pill, Tag, RiskConfirmation, …), because the real
 * package imports CSS and cannot load outside the browser loader.
 */
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const require_ = createRequire(import.meta.url)

function primitiveSurface() {
  const entry = require_.resolve('@deepseek-ai/dsh-client-ui-primitives')
  const match = /export \{([\s\S]*?)\};/.exec(readFileSync(entry, 'utf8'))
  assert.ok(match !== null)
  return new Set(match[1].split(',').map(part => part.trim().split(/\s+as\s+/).pop()).filter(Boolean))
}

function primitives(surface) {
  const components = new Map()
  const cache = new Map()
  const target = {
    __esModule: true,
    writeClipboard: async () => true,
  }
  const stub = {
    Button: ({ children, onClick, disabled }) => React.createElement('button', { type: 'button', onClick, disabled }, children),
    Pill: ({ children, onClick, active }) => React.createElement('button', { type: 'button', onClick, 'data-active': active ? '' : undefined }, children),
    Tag: ({ children }) => React.createElement('span', { 'data-tag': '' }, children),
    Tooltip: ({ children }) => children ?? null,
    Toast: () => null,
    Menu: ({ anchor }) => anchor ?? null,
    Input: ({ value, onChange, placeholder }) => React.createElement('input', { value: value ?? '', onChange, placeholder, readOnly: onChange === undefined }),
    RiskConfirmation: ({ open, title, description, acknowledgeLabel, cancelLabel, confirmLabel, acknowledged, disabled, onAcknowledgedChange, onCancel, onConfirm }) => {
      if (open !== true) return null
      return React.createElement('div', { 'data-stub': 'risk' }, [
        React.createElement('h2', { key: 'title' }, title),
        React.createElement('p', { key: 'desc' }, description),
        React.createElement('label', { key: 'ack' }, [
          React.createElement('input', {
            key: 'box',
            type: 'checkbox',
            checked: acknowledged,
            onChange: event => onAcknowledgedChange(event.target.checked),
          }),
          acknowledgeLabel,
        ]),
        React.createElement('button', { key: 'cancel', type: 'button', onClick: onCancel }, cancelLabel),
        React.createElement('button', {
          key: 'confirm', type: 'button', disabled: disabled || !acknowledged, onClick: onConfirm,
        }, confirmLabel),
      ])
    },
  }
  for (const [name, value] of Object.entries(stub)) components.set(name, value)
  const proxy = new Proxy(target, {
    get(object, property) {
      if (typeof property !== 'string') return Reflect.get(object, property)
      if (property === '__esModule') return true
      if (property === 'default') return proxy
      if (property === 'then') return undefined
      if (Reflect.has(object, property)) return Reflect.get(object, property)
      if (!surface.has(property)) throw new Error(`the client bundle imports "${property}", which the host primitives do not export`)
      if (!cache.has(property)) {
        cache.set(property, components.get(property)
          ?? (/^use[A-Z]/.test(property)
            ? () => undefined
            : ({ children }) => React.createElement('span', { 'data-stub': property }, children ?? null)))
      }
      return cache.get(property)
    },
  })
  return proxy
}

function translate(dictionaries) {
  return (key, params) => {
    const dictionary = dictionaries.get('skillhub')?.en ?? {}
    const template = dictionary[key] ?? key
    return String(template).replace(/\{(\w+)\}/g, (_, name) => String(params?.[name] ?? `{${name}}`))
  }
}

function loadBundle(document, modules) {
  const code = readFileSync(join(root, 'lib', 'client.js'), 'utf8')
  const requireFn = (specifier) => {
    if (!Object.hasOwn(modules, specifier)) throw new Error(`the client bundle requires "${specifier}"`)
    return modules[specifier]
  }
  let captured
  const windowShim = {
    __ModuleLoader__: { load(entry) { captured = { id: entry.id, exports: entry.factory(requireFn) } } },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
  }
  new Function('window', 'document', code)(windowShim, document)
  assert.ok(captured !== undefined)
  return captured
}

test('the composer popover renders project Skills, a declared MCP service, and the trust flow', async (t) => {
  const CWD = 'D:/work/dream-project'
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://127.0.0.1:3080/' })
  const { window } = dom
  for (const [key, value] of Object.entries({
    window, document: window.document, navigator: window.navigator, HTMLElement: window.HTMLElement,
    Element: window.Element, Node: window.Node, Event: window.Event, CustomEvent: window.CustomEvent,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
  }
  const browserChannel = globalThis.BroadcastChannel
  globalThis.BroadcastChannel = undefined
  t.after(() => {
    globalThis.BroadcastChannel = browserChannel
    dom.window.close()
  })

  const catalog = (layer) => ({
    offered: [{ id: 'project:ue-mcp-workflow/SKILL.md', name: 'ue-mcp-workflow', home: 'project' }],
    tree: [
      { kind: 'home', home: 'agent', path: 'C:/Users/x/.agents/skills', children: [] },
      {
        kind: 'home', home: 'project', path: `${CWD}/.opencode/skills`, source: 'project-opencode', label: '.opencode',
        children: [
          {
            kind: 'root-skill', id: 'project:ue-mcp-workflow/SKILL.md', name: 'ue-mcp-workflow',
            description: 'drive the editor', home: 'project', path: `${CWD}/.opencode/skills/ue-mcp-workflow/SKILL.md`,
            gate: 'on', source: 'global', collision: false,
          },
          {
            kind: 'broken', name: 'notes', path: `${CWD}/.opencode/skills/notes`,
            home: 'project', reason: { kind: 'invalid-frontmatter', message: 'name and description are required' },
          },
        ],
      },
    ],
    collisions: [],
    broken: [],
    layer,
    resolved: true,
    legacySessionSnapshot: false,
  })
  const mcpCatalog = (layer, started = false) => ({
    servers: [
      started
        ? {
          name: 'ue-mcp', tools: 2, gate: 'on', source: 'global', running: true, declared: true, managed: true, supported: true,
          variants: [
            { source: 'mcp-json', transport: 'stdio', command: 'npx ue-mcp E:/gone/Test_DreamShader.uproject', approved: false, startable: false, problems: ['argument path does not exist: E:\\gone\\Test_DreamShader.uproject'] },
            { source: 'opencode-json', transport: 'stdio', command: 'npx ue-mcp ./Test_DreamShader.uproject', approved: true, startable: true, problems: [] },
          ],
          problems: ['mcp-json: argument path does not exist: E:\\gone\\Test_DreamShader.uproject'],
        }
        : {
          name: 'ue-mcp', tools: 0, gate: 'off', source: 'global', running: false, declared: true, managed: false, startRequired: true, supported: true,
          variants: [
            { source: 'mcp-json', transport: 'stdio', command: 'npx ue-mcp E:/gone/Test_DreamShader.uproject', approved: false, startable: false, problems: ['argument path does not exist: E:\\gone\\Test_DreamShader.uproject'] },
            { source: 'opencode-json', transport: 'stdio', command: 'npx ue-mcp ./Test_DreamShader.uproject', approved: false, startable: true, problems: [] },
          ],
          problems: ['mcp-json: argument path does not exist: E:\\gone\\Test_DreamShader.uproject'],
        },
      {
        name: 'no-runner', tools: 0, gate: 'off', source: 'global', running: false, declared: true, managed: false, startRequired: true, supported: true,
        variants: [
          { source: 'mcp-json', transport: 'stdio', command: 'ue-mcp-missing --serve', approved: false, startable: false, problems: ['command not found on PATH: ue-mcp-missing'] },
        ],
        problems: ['mcp-json: command not found on PATH: ue-mcp-missing'],
      },
    ],
    layer,
    declaredProblems: [],
  })

  const calls = []
  globalThis.fetch = async (url, init) => {
    const target = String(url)
    calls.push({ url: target, body: init?.body === undefined ? undefined : JSON.parse(init.body) })
    const payload = target.includes('/mcp/catalog') ? mcpCatalog('session')
      : target.includes('/mcp/start') ? mcpCatalog('session', true)
        : catalog('session')
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  const surface = primitiveSurface()
  const captured = loadBundle(window.document, {
    'react': React,
    'react-dom': ReactDOM,
    'react/jsx-runtime': jsxRuntime,
    '@deepseek-ai/dsh-client-ui-primitives': primitives(surface),
  })

  const dictionaries = new Map()
  const registrations = []
  const ctx = {
    effect: (run) => { const dispose = run(); return () => { if (typeof dispose === 'function') dispose() } },
    logger: { warn() {} },
    get: () => undefined,
    locale: { register: (namespace, value) => { dictionaries.set(namespace, value); return () => {} }, bind: () => translate(dictionaries) },
    slots: {
      inject: (_name, callback) => callback(),
      register: (options, Component) => { registrations.push({ options, Component }); return () => {} },
    },
  }
  captured.exports.apply(ctx)
  const chip = registrations.find(row => row.options.name === 'conversation.input.left')
  assert.ok(chip !== undefined)

  const act = React.act ?? (await import('react-dom/test-utils')).act
  const container = window.document.createElement('div')
  window.document.body.appendChild(container)
  const reactRoot = createRoot(container)
  t.after(async () => { await act(async () => { reactRoot.unmount() }) })
  const t_ = translate(dictionaries)

  await act(async () => {
    reactRoot.render(React.createElement(chip.Component, {
      sessionId: 's1',
      useSessions: selector => selector({ byId: { s1: { cwd: CWD } } }),
      t: t_,
    }))
  })

  // Closed chip: only the trigger exists.
  assert.match(container.innerHTML, /data-skillhub-chip/)
  assert.equal(window.document.querySelector('[data-ud-check="skillhub-tree"]'), null)

  const trigger = container.querySelector('button')
  await act(async () => { trigger.dispatchEvent(new window.MouseEvent('click', { bubbles: true })) })

  // The popover is portaled to the body; its skills tab lists the project root.
  const tree = window.document.querySelector('[data-ud-check="skillhub-tree"]')
  assert.ok(tree !== null, 'the popover tree should be mounted')
  assert.match(tree.textContent, /\.opencode/)
  assert.match(tree.textContent, /SkillHub only/)
  assert.match(tree.textContent, /ue-mcp-workflow/)
  assert.match(tree.textContent, /Invalid config/)
  assert.equal(calls.filter(call => call.url.includes('/catalog')).length >= 1, true)
  assert.match(calls[0].url, /sessionId=s1/)
  assert.match(calls[0].url, /folder=D%3A%2Fwork%2Fdream-project/)

  // Switch to the MCP tab: the declared row shows its command line and problems.
  const mcpTab = [...window.document.querySelectorAll('button')].find(button => button.textContent?.includes('MCP'))
  assert.ok(mcpTab !== undefined)
  await act(async () => { mcpTab.dispatchEvent(new window.MouseEvent('click', { bubbles: true })) })
  const mcpBody = window.document.querySelector('[data-ud-check="skillhub-mcp-body"]')
  assert.ok(mcpBody !== null)
  assert.match(mcpBody.textContent, /Declared/)
  assert.match(mcpBody.textContent, /opencode-json/)
  assert.match(mcpBody.textContent, /npx ue-mcp \.\/Test_DreamShader\.uproject/)
  assert.match(mcpBody.textContent, /argument path does not exist/)
  // A server whose every declaration fails is tagged, and its action stays inert.
  assert.match(mcpBody.textContent, /no-runner/)
  assert.match(mcpBody.textContent, /Not startable/)
  assert.match(mcpBody.textContent, /command not found on PATH/)
  const inert = [...mcpBody.querySelectorAll('button')].filter(button => button.textContent === 'Trust and start')
  assert.equal(inert.length, 2)
  assert.equal(inert.some(button => button.disabled), true)
  // Nothing here is running, so every row must read Off and offer no switch: a
  // switch that says "on" for a service that was never started is the misleading
  // state this rule removes.
  const switches = [...mcpBody.querySelectorAll('[role="switch"]')]
  assert.equal(switches.length, 2)
  for (const control of switches) {
    assert.equal(control.getAttribute('aria-checked'), 'false')
    assert.equal(control.disabled, true)
    assert.match(control.getAttribute('aria-label'), /not running yet/)
  }

  // Trust flow: a startable-but-unapproved service asks first, then posts the
  // selected declaration source for this chat and folder.
  const startButton = [...window.document.querySelectorAll('button')].find(button => button.textContent === 'Trust and start')
  assert.ok(startButton !== undefined, 'an unapproved declared service should offer the trust action')
  await act(async () => { startButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true })) })
  const dialog = window.document.querySelector('[data-stub="risk"]')
  assert.ok(dialog !== null, 'the trust confirmation should open')
  assert.match(dialog.textContent, /npx ue-mcp \.\/Test_DreamShader\.uproject/)

  const confirm = [...dialog.querySelectorAll('button')].find(button => button.textContent === 'Trust and start')
  assert.equal(confirm.disabled, true, 'the primary action stays disabled until acknowledged')
  const box = dialog.querySelector('input[type="checkbox"]')
  // The DOM's own click toggles `checked` before the event, which is what
  // React's change tracking compares against.
  await act(async () => { box.click() })
  assert.equal(box.checked, true)
  const enabled = [...window.document.querySelector('[data-stub="risk"]').querySelectorAll('button')]
    .find(button => button.textContent === 'Trust and start')
  assert.equal(enabled.disabled, false)
  await act(async () => { enabled.dispatchEvent(new window.MouseEvent('click', { bubbles: true })) })

  const started = calls.find(call => call.url.includes('/mcp/start'))
  assert.ok(started !== undefined, 'confirming trust should call the start route')
  assert.deepEqual(started.body, {
    layer: 'session', sessionId: 's1', folder: CWD, server: 'ue-mcp', source: 'opencode-json',
  })
  assert.equal(window.document.querySelector('[data-stub="risk"]'), null, 'the dialog closes after confirming')

  // The started service now reports its stored visibility: the row is running,
  // owned by SkillHub, and the switch is usable again.
  const startedRow = window.document.querySelector('[data-ud-check="skillhub-mcp-body"]')
  assert.ok(startedRow !== null)
  assert.match(startedRow.textContent, /Started by SkillHub/)
  assert.match(startedRow.textContent, /2 tools/)
  const startedSwitch = [...startedRow.querySelectorAll('[role="switch"]')]
    .find(control => control.getAttribute('aria-label')?.includes('ue-mcp'))
  assert.ok(startedSwitch !== undefined)
  assert.equal(startedSwitch.disabled, false)
  assert.equal(startedSwitch.getAttribute('aria-checked'), 'true')
  assert.match(startedRow.textContent, /Stop/)
})
