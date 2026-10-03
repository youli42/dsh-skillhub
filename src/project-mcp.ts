import { createHash, randomUUID } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { delimiter, dirname, isAbsolute, join, resolve, sep } from 'node:path'

/**
 * Project-level MCP declarations.
 *
 * DSH itself never reads a project file to decide which MCP servers run: a
 * server exists only when a `@deepseek-ai/dsh-mcp-client` row is mounted. This
 * module reads the declarations a project already carries for other agents —
 * `.mcp.json` (Claude Code and compatible clients) and `.opencode/opencode.json`
 * (`mcp`, OpenCode) — so SkillHub can show them and, after the user approves the
 * exact command line, mount them for the session.
 *
 * Nothing here starts a process. Parsing and trust are pure reads; starting is
 * `mcp-runtime.ts`'s job and requires an approved record.
 */

/** A declaration file SkillHub reads, in priority order. */
export type ProjectMcpSource = 'mcp-json' | 'opencode-json'

export const DEFAULT_PROJECT_MCP_FILES: readonly string[] = ['.mcp.json', '.opencode/opencode.json']

export type McpTransport = 'stdio' | 'streamable-http'

/** One server as declared by one file. A name may have several variants. */
export interface ProjectMcpVariant {
  readonly source: ProjectMcpSource
  /** Absolute declaration file path. */
  readonly file: string
  readonly transport: McpTransport
  readonly command?: string
  readonly args: readonly string[]
  readonly env?: Readonly<Record<string, string>>
  readonly url?: string
  readonly headers?: Readonly<Record<string, string>>
  /** Declared `enabled: false`; shown but never startable. */
  readonly disabled: boolean
  /** Reasons this variant would fail to start, already human-readable. */
  readonly problems: readonly string[]
  /** Hash over the run-relevant fields; approval is valid only for this value. */
  readonly hash: string
}

export interface ProjectMcpServer {
  readonly name: string
  readonly variants: readonly ProjectMcpVariant[]
}

export interface ProjectMcpRead {
  readonly servers: readonly ProjectMcpServer[]
  /** File-level problems: missing JSON, invalid shape, rejected server name. */
  readonly problems: readonly string[]
}

export interface ProjectMcpTrust {
  readonly version: 1
  readonly servers: Readonly<Record<string, { source: ProjectMcpSource; hash: string; approvedAt: string }>>
}

const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/
const EMPTY_TRUST: ProjectMcpTrust = { version: 1, servers: {} }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.every(entry => typeof entry === 'string') ? [...value] as string[] : undefined
}

function stringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined
  const out: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') out[key] = entry
  }
  return out
}

/** Sorted-key hash so an equal declaration always hashes equally. */
function hashVariant(fields: Record<string, unknown>): string {
  const stable: Record<string, unknown> = {}
  for (const key of Object.keys(fields).sort()) stable[key] = fields[key]
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex').slice(0, 32)
}

/**
 * Locate a stdio command the way a shell would. Used only for diagnostics — the
 * MCP SDK spawns through cross-spawn, which does its own PATH/PATHEXT lookup, so
 * the declaration is passed through unchanged.
 * @param command - declared executable.
 * @returns the absolute launcher when one is found.
 */
export function resolveExecutable(command: string): string | undefined {
  if (command.trim() === '') return undefined
  const suffixes = process.platform === 'win32' ? ['', '.cmd', '.exe', '.bat'] : ['']
  if (isAbsolute(command)) {
    for (const suffix of suffixes) {
      const candidate = `${command}${suffix}`
      if (existsSync(candidate)) return candidate
    }
    return undefined
  }
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (dir === '') continue
    for (const suffix of suffixes) {
      const candidate = join(dir, `${command}${suffix}`)
      try {
        if (existsSync(candidate) && lstatSync(candidate).isFile()) return candidate
      } catch { /* unreadable PATH entry: keep looking */ }
    }
  }
  return undefined
}

/**
 * Report an argument that names a file the user probably expects to exist.
 *
 * `npx` package specifiers (`@scope/name`) and flags are not paths; only an
 * absolute path, an explicit `./`/`../` path, or a relative path that carries a
 * file extension is checked, so a missing UE project (`E:/...uproject`) is
 * reported while a package name is not.
 * @param arg - one declared argument.
 * @param cwd - working directory relative arguments resolve against.
 * @returns a problem sentence, or undefined when the argument is not a path.
 */
export function argumentProblem(arg: string, cwd: string): string | undefined {
  if (arg === '' || arg.startsWith('-')) return undefined
  const explicitRelative = arg.startsWith('./') || arg.startsWith('../') || arg.startsWith('.\\') || arg.startsWith('..\\')
  const absolute = isAbsolute(arg)
  const looksLikeFile = /[^/\\]\.[A-Za-z0-9]{1,8}$/.test(arg)
  if (!explicitRelative && !absolute && !looksLikeFile) return undefined
  if (!explicitRelative && !absolute && !arg.includes(sep) && !arg.includes('/')) return undefined
  const target = resolve(cwd, arg)
  try {
    return existsSync(target) ? undefined : `argument path does not exist: ${target}`
  } catch {
    return `argument path is unreadable: ${target}`
  }
}

interface ParsedFile {
  readonly source: ProjectMcpSource
  readonly file: string
  readonly servers: Map<string, ProjectMcpVariant[]>
  readonly problems: string[]
}

function readJsonFile(path: string, problems: string[]): unknown | undefined {
  if (!existsSync(path)) return undefined
  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch (error) {
    problems.push(`${path}: unreadable (${String(error)})`)
    return undefined
  }
  try {
    return JSON.parse(text) as unknown
  } catch (error) {
    problems.push(`${path}: invalid JSON (${String(error)})`)
    return undefined
  }
}

function variantOf(
  source: ProjectMcpSource,
  file: string,
  cwd: string,
  input: { transport: McpTransport; command?: string; args: string[]; env?: Record<string, string>; url?: string; headers?: Record<string, string>; disabled: boolean },
): ProjectMcpVariant {
  const problems: string[] = []
  if (input.disabled) problems.push('declared disabled in the project file (enabled: false)')
  if (input.transport === 'stdio') {
    if (input.command === undefined || input.command.trim() === '') {
      problems.push('stdio transport without a command')
    } else if (resolveExecutable(input.command) === undefined) {
      problems.push(`command not found on PATH: ${input.command}`)
    }
    for (const arg of input.args) {
      const problem = argumentProblem(arg, cwd)
      if (problem !== undefined) problems.push(problem)
    }
  } else if (input.url === undefined || !/^https?:\/\//i.test(input.url)) {
    problems.push('streamable-http transport without an http(s) url')
  }
  return {
    source,
    file,
    transport: input.transport,
    ...input.command !== undefined ? { command: input.command } : {},
    args: [...input.args],
    ...input.env !== undefined ? { env: input.env } : {},
    ...input.url !== undefined ? { url: input.url } : {},
    ...input.headers !== undefined ? { headers: input.headers } : {},
    disabled: input.disabled,
    problems,
    hash: hashVariant({
      source,
      transport: input.transport,
      command: input.command ?? null,
      args: input.args,
      env: input.env ?? null,
      url: input.url ?? null,
      headers: input.headers ?? null,
    }),
  }
}

function collectClaudeStyle(entry: Record<string, unknown>, source: ProjectMcpSource, file: string, cwd: string): { variant?: ProjectMcpVariant; problem?: string } {
  const command = typeof entry['command'] === 'string' ? entry['command'] : undefined
  const url = typeof entry['url'] === 'string' ? entry['url'] : undefined
  const type = typeof entry['type'] === 'string' ? entry['type'].toLowerCase() : undefined
  const args = stringArray(entry['args']) ?? []
  const env = stringRecord(entry['env'])
  const headers = stringRecord(entry['headers'])
  const disabled = entry['enabled'] === false || entry['disabled'] === true
  if (url !== undefined) {
    if (type !== undefined && type !== 'http' && type !== 'streamable-http') {
      return { problem: `${file}: transport "${type}" is not supported` }
    }
    return {
      variant: variantOf(source, file, cwd, {
        transport: 'streamable-http', url, args, disabled,
        ...(headers !== undefined ? { headers } : {}),
      }),
    }
  }
  if (command === undefined) return { problem: `${file}: entry has neither "command" nor "url"` }
  return {
    variant: variantOf(source, file, cwd, {
      transport: 'stdio', command, args, disabled,
      ...(env !== undefined ? { env } : {}),
    }),
  }
}

function collectOpencodeStyle(entry: Record<string, unknown>, source: ProjectMcpSource, file: string, cwd: string): { variant?: ProjectMcpVariant; problem?: string } {
  const type = typeof entry['type'] === 'string' ? entry['type'].toLowerCase() : 'local'
  const disabled = entry['enabled'] === false
  const env = stringRecord(entry['environment']) ?? stringRecord(entry['env'])
  const headers = stringRecord(entry['headers'])
  if (type === 'local') {
    const parts = stringArray(entry['command'])
    if (parts === undefined || parts.length === 0 || parts[0] === '') {
      return { problem: `${file}: "command" must be a non-empty string array` }
    }
    const [command, ...args] = parts
    return {
      variant: variantOf(source, file, cwd, {
        transport: 'stdio', command: command as string, args, disabled,
        ...(env !== undefined ? { env } : {}),
      }),
    }
  }
  if (type === 'remote') {
    const url = typeof entry['url'] === 'string' ? entry['url'] : undefined
    if (url === undefined) return { problem: `${file}: remote entry has no "url"` }
    return {
      variant: variantOf(source, file, cwd, {
        transport: 'streamable-http', url, args: [], disabled,
        ...(headers !== undefined ? { headers } : {}),
      }),
    }
  }
  return { problem: `${file}: mcp transport "${type}" is not supported` }
}

function parseFile(path: string, source: ProjectMcpSource, cwd: string): ParsedFile {
  const problems: string[] = []
  const servers = new Map<string, ProjectMcpVariant[]>()
  const raw = readJsonFile(path, problems)
  if (raw === undefined) return { source, file: path, servers, problems }
  if (!isRecord(raw)) {
    problems.push(`${path}: top level must be a JSON object`)
    return { source, file: path, servers, problems }
  }
  const table = source === 'mcp-json' ? raw['mcpServers'] : raw['mcp']
  if (table === undefined) return { source, file: path, servers, problems }
  if (!isRecord(table)) {
    problems.push(`${path}: "${source === 'mcp-json' ? 'mcpServers' : 'mcp'}" must be an object`)
    return { source, file: path, servers, problems }
  }
  for (const [name, entry] of Object.entries(table)) {
    if (!SERVER_NAME.test(name)) {
      problems.push(`${path}: server name "${name}" does not match [A-Za-z0-9_-]{1,32}`)
      continue
    }
    if (!isRecord(entry)) {
      problems.push(`${path}: server "${name}" must be an object`)
      continue
    }
    const collected = source === 'mcp-json'
      ? collectClaudeStyle(entry, source, path, cwd)
      : collectOpencodeStyle(entry, source, path, cwd)
    if (collected.problem !== undefined) {
      problems.push(collected.problem)
      continue
    }
    const variant = collected.variant
    if (variant === undefined) continue
    const list = servers.get(name) ?? []
    list.push(variant)
    servers.set(name, list)
  }
  return { source, file: path, servers, problems }
}

/**
 * Read every project declaration file for one working directory.
 * @param cwd - session working directory.
 * @param files - relative declaration files; defaults to `.mcp.json` and `.opencode/opencode.json`.
 * @returns servers merged by name, with per-variant problems, plus file problems.
 */
export function readProjectMcp(
  cwd: string,
  files: readonly string[] = DEFAULT_PROJECT_MCP_FILES,
): ProjectMcpRead {
  const base = resolve(cwd)
  const problems: string[] = []
  const byName = new Map<string, ProjectMcpVariant[]>()
  for (const entry of files) {
    const relative = entry.trim().replace(/\\/g, '/')
    if (relative === '' || relative.startsWith('..')) continue
    const source: ProjectMcpSource = relative.endsWith('opencode.json') ? 'opencode-json' : 'mcp-json'
    const parsed = parseFile(join(base, relative), source, base)
    problems.push(...parsed.problems)
    for (const [name, variants] of parsed.servers) {
      const list = byName.get(name) ?? []
      list.push(...variants)
      byName.set(name, list)
    }
  }
  const servers: ProjectMcpServer[] = [...byName.entries()]
    .map(([name, variants]) => ({ name, variants }))
    .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))
  return { servers, problems }
}

/** Stable key for one folder's trust document. */
export function folderTrustKey(folder: string): string {
  return createHash('sha256').update(resolve(folder)).digest('hex').slice(0, 24)
}

/** Where one folder's MCP approvals live. */
export function mcpTrustPath(storeDir: string, folder: string): string {
  return join(storeDir, 'mcp-trust', `${folderTrustKey(folder)}.json`)
}

/** Read one folder's approvals; a corrupt file reads as empty rather than throwing. */
export function readMcpTrust(storeDir: string, folder: string): ProjectMcpTrust {
  const path = mcpTrustPath(storeDir, folder)
  if (!existsSync(path)) return EMPTY_TRUST
  try {
    const raw: unknown = JSON.parse(readFileSync(path, 'utf8'))
    if (!isRecord(raw) || raw['version'] !== 1 || !isRecord(raw['servers'])) return EMPTY_TRUST
    const servers: Record<string, { source: ProjectMcpSource; hash: string; approvedAt: string }> = {}
    for (const [name, value] of Object.entries(raw['servers'])) {
      if (!isRecord(value) || typeof value['hash'] !== 'string') continue
      servers[name] = {
        source: value['source'] === 'opencode-json' ? 'opencode-json' : 'mcp-json',
        hash: value['hash'],
        approvedAt: typeof value['approvedAt'] === 'string' ? value['approvedAt'] : '',
      }
    }
    return { version: 1, servers }
  } catch {
    return EMPTY_TRUST
  }
}

/** Record one approval for one exact variant hash. */
export function approveMcpServer(
  storeDir: string,
  folder: string,
  name: string,
  source: ProjectMcpSource,
  hash: string,
): ProjectMcpTrust {
  const path = mcpTrustPath(storeDir, folder)
  const current = readMcpTrust(storeDir, folder)
  const next: ProjectMcpTrust = {
    version: 1,
    servers: { ...current.servers, [name]: { source, hash, approvedAt: new Date().toISOString() } },
  }
  mkdirSync(dirname(path), { recursive: true })
  const temp = `${path}.${randomUUID()}.tmp`
  writeFileSync(temp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
  renameSync(temp, path)
  return next
}

/** Drop one approval, for example after the user stops a server. */
export function revokeMcpServer(storeDir: string, folder: string, name: string): ProjectMcpTrust {
  const path = mcpTrustPath(storeDir, folder)
  const current = readMcpTrust(storeDir, folder)
  const servers = { ...current.servers }
  delete servers[name]
  const next: ProjectMcpTrust = { version: 1, servers }
  mkdirSync(dirname(path), { recursive: true })
  const temp = `${path}.${randomUUID()}.tmp`
  writeFileSync(temp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
  renameSync(temp, path)
  return next
}

/** Whether one variant has an approval recorded for its exact current content. */
export function isApproved(trust: ProjectMcpTrust, variant: ProjectMcpVariant, name: string): boolean {
  const record = trust.servers[name]
  return record !== undefined && record.hash === variant.hash && record.source === variant.source
}

export interface McpClientConfig {
  readonly serverName: string
  readonly transport: McpTransport
  readonly command?: string
  readonly args?: readonly string[]
  readonly env?: Readonly<Record<string, string>>
  readonly cwd?: string
  readonly url?: string
  readonly headers?: Readonly<Record<string, string>>
  readonly failOnStartupError: boolean
}

/**
 * Build the `@deepseek-ai/dsh-mcp-client` config for one variant.
 *
 * `cwd` is always the session folder so a relative argument such as
 * `./Test_DreamShader.uproject` resolves exactly as it does for the other agent.
 *
 * `failOnStartupError` is on: SkillHub owns this mount, so a server that never
 * connected must not look mounted. Activation awaits the initial connection and
 * tool discovery and rejects with the underlying cause, which keeps one honest
 * invariant — a fiber exists only for a server that is actually serving — and
 * gives the panel a reason to show instead of "started, 0 tools".
 * @param name - server name, which becomes the `mcp__<name>__` tool namespace.
 * @param variant - approved declaration.
 * @param folder - session working directory.
 * @returns the config to mount.
 */
export function mcpClientConfig(name: string, variant: ProjectMcpVariant, folder: string): McpClientConfig {
  if (variant.transport === 'stdio') {
    return {
      serverName: name,
      transport: 'stdio',
      command: variant.command ?? '',
      args: [...variant.args],
      ...variant.env !== undefined ? { env: variant.env } : {},
      cwd: resolve(folder),
      failOnStartupError: true,
    }
  }
  return {
    serverName: name,
    transport: 'streamable-http',
    url: variant.url ?? '',
    ...variant.headers !== undefined ? { headers: variant.headers } : {},
    failOnStartupError: true,
  }
}

/** Whether a path is a regular file, without following a broken link into a throw. */
export function isReadableFile(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}
