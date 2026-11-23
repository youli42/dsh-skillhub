import { existsSync, mkdirSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { isHostSkillName } from './catalog.ts'

/** A Skill created by SkillHub in one of the two user homes. */
export interface CreateSkillInput {
  readonly name: string
  readonly description: string
  readonly whenToUse?: string
  readonly body: string
}

/** Limits keep one request from filling the homes with an unusable Skill. */
export const MAX_SKILL_BODY_BYTES = 256 * 1024
const MAX_SUMMARY_TEXT = 2_000
const MAX_NAME_LENGTH = 64

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function assertText(value: string, label: string, max: number): string {
  if (value === '') throw new Error(`invalid skill: ${label} is required`)
  if (value.length > max) throw new Error(`invalid skill: ${label} is too long`)
  return value
}

/**
 * Render the frontmatter the shared catalog parser reads.
 *
 * Values are JSON-quoted, which is also valid YAML double-quoted scalar syntax;
 * a description containing a colon, a quote, or a leading indicator therefore
 * cannot change the document shape.
 * @param input - validated Skill fields.
 * @returns the complete SKILL.md text.
 */
export function renderSkillFile(input: CreateSkillInput): string {
  const lines = [
    '---',
    `name: ${input.name}`,
    `description: ${JSON.stringify(input.description)}`,
  ]
  if (input.whenToUse !== undefined && input.whenToUse !== '') {
    lines.push(`whenToUse: ${JSON.stringify(input.whenToUse)}`)
  }
  lines.push('---', '', input.body.replace(/\r\n/g, '\n').replace(/\s+$/, ''), '')
  return lines.join('\n')
}

/**
 * Validate the fields of one new Skill.
 * @param input - raw request body fields.
 * @returns the normalized fields.
 */
export function readCreateSkillInput(input: {
  readonly name?: unknown
  readonly description?: unknown
  readonly whenToUse?: unknown
  readonly body?: unknown
}): CreateSkillInput {
  const name = text(input.name)
  if (!isHostSkillName(name)) {
    throw new Error('invalid skill name: use lowercase words joined by hyphens')
  }
  if (name.length > MAX_NAME_LENGTH) throw new Error('invalid skill name: too long')
  const description = assertText(text(input.description), 'description', MAX_SUMMARY_TEXT)
  const whenToUse = text(input.whenToUse)
  if (whenToUse.length > MAX_SUMMARY_TEXT) throw new Error('invalid skill: whenToUse is too long')
  const body = typeof input.body === 'string' ? input.body : ''
  if (body.trim() === '') throw new Error('invalid skill: instructions are required')
  if (Buffer.byteLength(body, 'utf8') > MAX_SKILL_BODY_BYTES) {
    throw new Error('invalid skill: instructions are too large')
  }
  return { name, description, ...(whenToUse === '' ? {} : { whenToUse }), body }
}

/**
 * Create one `<home>/<name>/SKILL.md` without replacing anything.
 *
 * The directory is created first and the file with `wx`, so a concurrent create
 * cannot overwrite an existing Skill. Any path this function created is removed
 * again when the write fails, which leaves a rejected request with no debris.
 * @param homeRoot - Agent home or DSH home root.
 * @param input - validated Skill fields.
 * @returns the created SKILL.md path.
 */
export function createSkill(homeRoot: string, input: CreateSkillInput): string {
  if (!isHostSkillName(input.name)) {
    throw new Error('invalid skill name: use lowercase words joined by hyphens')
  }
  const root = resolve(homeRoot)
  mkdirSync(root, { recursive: true })
  const directory = join(root, input.name)
  if (existsSync(directory)) {
    throw new Error(`a Skill named "${input.name}" already exists in this home`)
  }
  mkdirSync(directory)
  const path = join(directory, 'SKILL.md')
  try {
    writeFileSync(path, renderSkillFile(input), { mode: 0o644, flag: 'wx' })
  } catch (error) {
    try { rmSync(directory, { recursive: true, force: true }) } catch { /* best-effort rollback */ }
    throw error
  }
  return path
}

const IGNORED_PACK_DIRECTORIES = new Set(['.git', 'node_modules', '.system'])

/**
 * Count the Skills a folder tree can contribute, without following directory
 * links (a link cycle must not turn an install into an unbounded walk).
 * @param root - candidate pack directory.
 * @param depth - remaining folder levels, matching the catalog's one-level view.
 * @returns the number of SKILL.md files and flat .md skills at the root.
 */
function countPackSkills(root: string, depth: number, isRoot = false): number {
  let count = 0
  let entries
  try { entries = readdirSync(root, { withFileTypes: true }) } catch { return 0 }
  // Count the pack's own Skill once. Recursing into its children and counting
  // their SKILL.md files again is what made a one-skill pack read as two.
  if (existsSync(join(root, 'SKILL.md'))) count += 1
  for (const entry of entries) {
    if (IGNORED_PACK_DIRECTORIES.has(entry.name)) continue
    const path = join(root, entry.name)
    if (entry.isDirectory()) {
      if (depth > 0) count += countPackSkills(path, depth - 1)
    } else if (isRoot && entry.isFile() && entry.name.endsWith('.md')) {
      // A flat Skill at a home root; the catalog does not read flat files
      // below the home layer.
      count += 1
    }
  }
  return count
}

/**
 * Refuse a pack that would install an empty folder.
 *
 * The existing installer linked any directory, so a typo produced a broken pack
 * row instead of an error at the moment the user chose the path. The check only
 * reads names; it never changes the source tree.
 * @param sourceDir - absolute or relative candidate folder.
 * @returns the number of Skills it appears to carry.
 */
export function assertSkillPack(sourceDir: string): number {
  let real: string
  try { real = requireRealDirectory(sourceDir) } catch (error) {
    throw new Error(`Pack source is not a readable directory: ${basename(sourceDir)} (${String(error)})`)
  }
  const count = countPackSkills(real, 2, true)
  if (count === 0) {
    throw new Error(`Pack source does not contain any SKILL.md: ${basename(real)}`)
  }
  return count
}

function requireRealDirectory(sourceDir: string): string {
  const real = realpathSync(resolve(sourceDir))
  if (!statSync(real).isDirectory()) throw new Error('not a directory')
  return real
}
