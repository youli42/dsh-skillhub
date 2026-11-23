import assert from 'node:assert/strict'
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { SkillHub } from '../lib/types/hub.js'
import {
  assertSkillPack, createSkill, readCreateSkillInput, renderSkillFile,
} from '../lib/types/skill-create.js'

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'skillhub-create-'))
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

function hubFor(root) {
  return new SkillHub({
    agentHome: join(root, 'agents', 'skills'),
    dshHome: join(root, 'dsh', 'skills'),
    storeDir: join(root, 'store'),
  })
}

test('creates a valid SKILL.md that the catalog reads back under the chosen home', () => {
  const { dir, cleanup } = tempDir()
  try {
    const hub = hubFor(dir)
    const input = readCreateSkillInput({
      name: 'my-skill',
      description: 'A test skill: with a colon',
      whenToUse: 'When testing',
      body: '# My skill\n\nDo the thing.',
    })
    const path = createSkill(hub.paths.agentHome, input)
    const text = readFileSync(path, 'utf8')
    assert.equal(text.includes('name: my-skill'), true)
    assert.equal(text.includes('description: "A test skill: with a colon"'), true)
    const catalog = hub.catalog({ layer: 'global' })
    const home = catalog.tree.find(node => node.home === 'agent')
    assert.equal(home.children.some(node =>
      node.kind === 'root-skill' ? node.name === 'my-skill' : node.skill?.name === 'my-skill',
    ), true)
  } finally { cleanup() }
})

test('refuses invalid names, missing instructions, duplicates, and traversal', () => {
  const { dir, cleanup } = tempDir()
  try {
    const hub = hubFor(dir)
    assert.throws(() => readCreateSkillInput({ name: 'Bad Name', description: 'x', body: 'x' }), /invalid skill name/)
    assert.throws(() => readCreateSkillInput({ name: 'ok', description: 'x', body: '   ' }), /instructions are required/)
    const input = readCreateSkillInput({ name: 'ok', description: 'x', body: 'x' })
    createSkill(hub.paths.agentHome, input)
    assert.throws(() => createSkill(hub.paths.agentHome, input), /already exists/)
    assert.throws(() => createSkill(hub.paths.agentHome, { ...input, name: '../escape' }), /invalid skill name/)
  } finally { cleanup() }
})

test('renders quoted frontmatter values without changing the document shape', () => {
  const text = renderSkillFile({
    name: 'quoted',
    description: 'A "quoted" value',
    whenToUse: 'Only when needed',
    body: 'Body',
  })
  assert.match(text, /description: "A \\"quoted\\" value"/)
  assert.match(text, /whenToUse: "Only when needed"/)
  assert.ok(text.endsWith('Body\n'))
})

test('rejects an empty pack and accepts a pack with a SKILL.md', () => {
  const { dir, cleanup } = tempDir()
  try {
    const empty = join(dir, 'empty-pack')
    mkdirSync(empty)
    assert.throws(() => assertSkillPack(empty), /does not contain any SKILL.md/)

    const pack = join(dir, 'good-pack')
    mkdirSync(join(pack, 'one'), { recursive: true })
    writeFileSync(join(pack, 'one', 'SKILL.md'), '---\nname: one\ndescription: x\n---\nbody\n')
    assert.equal(assertSkillPack(pack), 1)

    const hub = hubFor(dir)
    hub.install(pack, 'dsh')
    const linked = join(hub.paths.dshHome, 'good-pack')
    assert.equal(lstatSync(linked).isSymbolicLink(), true)
    assert.throws(() => hub.install(pack, 'dsh'), /already exists/)
  } finally { cleanup() }
})
