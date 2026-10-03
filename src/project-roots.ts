import { existsSync, lstatSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Project skill roots.
 *
 * A project keeps its Skills inside the agent-config folders of the editor or
 * agent that owns them: `.agents/skills` (the shared Agent convention DSH also
 * reads), `.opencode/skills` (OpenCode), and `.claude/skills` (Claude Code).
 * SkillHub reads all three from the session working directory so one panel can
 * switch the Skills of every agent the user runs in that project.
 *
 * Discovery is one level deep, exactly like `@deepseek-ai/dsh-skill-filesystem`:
 * `<root>/<name>/SKILL.md` or a flat `<root>/<name>.md`. A nested `SKILL.md` is
 * deliberately never discovered, because DSH's own provider does not see it and
 * a switch for a Skill the model cannot load would be a lie.
 */

/** Which agent convention a project root belongs to. */
export type ProjectRootKind = 'agents' | 'opencode' | 'claude' | 'custom'

/** One project skill root that exists on disk. */
export interface ProjectRootSpec {
  readonly kind: ProjectRootKind
  /** Candidate source label, also what the panel shows. */
  readonly source: string
  /**
   * Candidate rank. Every project root must stay below the filesystem
   * provider's project ranks (100 `.dsh/skills`, 200 `.agents/skills`) so that a
   * project candidate SkillHub reports wins the name within the agent layer.
   * Losing the name would let the built-in provider refill a Skill the user
   * turned Off.
   */
  readonly rank: number
  /** Absolute directory that holds `<name>/SKILL.md` entries. */
  readonly dir: string
  /** Folder name shown in the tree, including the leading dot. */
  readonly label: string
}

interface RootDefaults {
  readonly source: string
  readonly rank: number
  readonly label: string
  readonly kind: ProjectRootKind
}

/**
 * Candidate rank per origin. Project roots stay in a band below the filesystem
 * provider's project ranks (100 `<root>/.dsh/skills`, 200 `<root>/.agents/skills`)
 * so a project candidate SkillHub reports wins the name inside the agent layer;
 * losing the name would let the built-in provider refill a Skill the user turned
 * Off. User-home ranks keep the historical values, which sit below that
 * provider's user ranks (400/500).
 */
export const ORIGIN_RANKS: Readonly<Record<string, number>> = {
  'project-agents': 90,
  'project-opencode': 91,
  'project-claude': 92,
  'project-custom': 93,
  'user-dsh': 350,
  'user-agents': 351,
}

/**
 * Tie-break order for two candidates that share a name inside one class. Lower
 * wins. Mirrors which agent convention owns the name on disk when both files
 * exist, and matches DSH's own project-before-user precedence.
 */
export const ORIGIN_PRIORITY: Readonly<Record<string, number>> = {
  'project-agents': 0,
  'project-opencode': 1,
  'project-claude': 2,
  'project-custom': 3,
  'user-dsh': 8,
  'user-agents': 9,
}

/** Rank for one discovery origin; unknown origins fall back to the user band. */
export function originRank(origin: string): number {
  return ORIGIN_RANKS[origin] ?? ORIGIN_RANKS['user-agents'] ?? 351
}

/** Same-class tie-break priority for one discovery origin. */
export function originPriority(origin: string): number {
  return ORIGIN_PRIORITY[origin] ?? 9
}

/**
 * Default roots, in winner order. The agent-scoped registration subtracts 2
 * (see `attachAgentProvider`), so the effective ranks are 88/89/90 — still
 * below the filesystem provider's project roots.
 */
const DEFAULTS = new Map<string, RootDefaults>([
  ['.agents/skills', {
    source: 'project-agents',
    rank: ORIGIN_RANKS['project-agents'] ?? 90,
    label: '.agents',
    kind: 'agents',
  }],
  ['.opencode/skills', {
    source: 'project-opencode',
    rank: ORIGIN_RANKS['project-opencode'] ?? 91,
    label: '.opencode',
    kind: 'opencode',
  }],
  ['.claude/skills', {
    source: 'project-claude',
    rank: ORIGIN_RANKS['project-claude'] ?? 92,
    label: '.claude',
    kind: 'claude',
  }],
])

export const DEFAULT_PROJECT_SKILL_ROOTS: readonly string[] = [...DEFAULTS.keys()]

/** Custom roots share one source label and rank after the known ones. */
const CUSTOM_SOURCE = 'project-custom'
const CUSTOM_RANK = 93

/** Bound the walk so a misconfigured list cannot fan out without limit. */
const MAX_ROOTS = 8

function normalizeRelative(entry: string): string {
  return entry.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '')
}

function isDirectory(path: string): boolean {
  try {
    return lstatSync(path).isDirectory()
  } catch {
    return false
  }
}

/**
 * Resolve the project skill roots that exist for one working directory.
 *
 * Only the exact directory is scanned: the caller's cwd is the project, so a
 * session opened in a subdirectory does not silently inherit its parent's
 * project Skills. Missing directories are simply absent — an empty project is
 * valid state, not an error.
 * @param cwd - session working directory, already resolved by the caller.
 * @param configured - relative root directories; defaults to the three conventions.
 * @returns existing roots in winner order, deduplicated by absolute path.
 */
export function projectSkillRoots(
  cwd: string,
  configured: readonly string[] = DEFAULT_PROJECT_SKILL_ROOTS,
): ProjectRootSpec[] {
  const base = resolve(cwd)
  const roots: ProjectRootSpec[] = []
  const seen = new Set<string>()
  let customIndex = 0
  for (const entry of configured) {
    if (roots.length >= MAX_ROOTS) break
    const relative = normalizeRelative(entry)
    if (relative === '' || relative.startsWith('..') || relative.includes(':')) continue
    const dir = join(base, relative)
    let key: string
    try {
      key = resolve(dir).toLowerCase()
    } catch {
      continue
    }
    if (seen.has(key)) continue
    seen.add(key)
    if (!isDirectory(dir)) continue
    const known = DEFAULTS.get(relative)
    if (known !== undefined) {
      roots.push({ ...known, dir })
      continue
    }
    const last = relative.slice(relative.lastIndexOf('/') + 1)
    roots.push({
      kind: 'custom',
      source: CUSTOM_SOURCE,
      rank: CUSTOM_RANK + customIndex,
      dir,
      label: last === '' ? relative : last,
    })
    customIndex += 1
  }
  return roots
}

/** Whether a candidate source label belongs to a project root. */
export function isProjectSource(source: string | undefined): boolean {
  return source !== undefined && source.startsWith('project-')
}

/** Paths SkillHub refuses to walk inside a root, matching the home walker. */
export const PROJECT_IGNORE = new Set(['.git', 'node_modules', '.system'])

/** Absolute path of one root's entry, used for ids and diagnostics. */
export function rootEntry(root: ProjectRootSpec, name: string): string {
  return join(root.dir, name)
}

/** Existing-file check that never follows a broken link into a throw. */
export function isFile(path: string): boolean {
  try {
    return existsSync(path) && lstatSync(path).isFile()
  } catch {
    return false
  }
}
