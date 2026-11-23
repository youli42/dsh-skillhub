import { createHash, randomUUID } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'

/**
 * SkillHub-managed MCP servers.
 *
 * A definition never contains a secret: environment values and headers are
 * stored as credential references, and the values live in the harness
 * credential provider. This module owns validation, the on-disk document, and
 * the redacted audit trail. It does not start anything; the runtime registers
 * definitions with the harness MCP manager.
 */

export type ManagedTransport = 'stdio' | 'streamable-http'
export type ManagedFieldKind = 'env' | 'headers'

export interface SecretFieldInput {
  readonly key: string
  readonly value?: string
  readonly clear?: boolean
}

export interface ManagedServerInput {
  readonly name: string
  readonly transport: ManagedTransport
  readonly command?: string
  readonly args?: readonly string[]
  readonly cwd?: string
  readonly url?: string
  readonly env?: readonly SecretFieldInput[]
  readonly headers?: readonly SecretFieldInput[]
  readonly enabled?: boolean
  readonly expectedRevision?: number
}

export interface ManagedServerDefinition {
  readonly transport: ManagedTransport
  readonly command: string
  readonly args: readonly string[]
  readonly cwd: string
  readonly url: string
  /** Environment variable name to credential reference. */
  readonly envRefs: Readonly<Record<string, string>>
  /** Header name to credential reference. */
  readonly headerRefs: Readonly<Record<string, string>>
  readonly enabled: boolean
  readonly createdAt: string
  readonly updatedAt: string
}

export interface ManagedStoreDocument {
  readonly version: 1
  readonly revision: number
  readonly servers: Readonly<Record<string, ManagedServerDefinition>>
}

export interface SecretWrite {
  readonly kind: ManagedFieldKind
  readonly key: string
  readonly ref: string
  /** Present when a new value must be stored; absent means leave the value alone. */
  readonly value?: string
}

export interface PreparedServer {
  readonly document: ManagedStoreDocument
  readonly definition: ManagedServerDefinition
  readonly secrets: readonly SecretWrite[]
  readonly removedRefs: readonly string[]
  readonly fields: readonly string[]
}

export interface AuditEntry {
  readonly at: string
  readonly action: string
  readonly server?: string
  readonly transport?: ManagedTransport
  readonly command?: string
  readonly argCount?: number
  readonly urlHost?: string
  readonly fields?: readonly string[]
  readonly secretRefs?: readonly string[]
  readonly result: 'ok' | 'error'
  readonly error?: string
}

const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/
const ENV_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/
const HEADER_KEY = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/
const MAX_ARGS = 128
const MAX_ARG_LENGTH = 8_192
const MAX_FIELDS_PER_KIND = 64
const MAX_SECRET_LENGTH = 8_192
const MAX_AUDIT_BYTES = 1024 * 1024

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown, label: string): string {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') throw new Error(`invalid MCP server: ${label} must be a string`)
  return value.trim()
}

function readArgs(value: unknown): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || !value.every(entry => typeof entry === 'string')) {
    throw new Error('invalid MCP server: args must be an array of strings')
  }
  if (value.length > MAX_ARGS) throw new Error('invalid MCP server: too many args')
  return value.map(entry => {
    if (entry.length > MAX_ARG_LENGTH) throw new Error('invalid MCP server: an argument is too long')
    return entry
  })
}

function readFields(value: unknown, kind: ManagedFieldKind, label: string): SecretFieldInput[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new Error(`invalid MCP server: ${label} must be an array`)
  if (value.length > MAX_FIELDS_PER_KIND) throw new Error(`invalid MCP server: too many ${label}`)
  const seen = new Set<string>()
  return value.map((entry): SecretFieldInput => {
    if (!isRecord(entry) || typeof entry['key'] !== 'string') {
      throw new Error(`invalid MCP server: every ${label} row needs a key`)
    }
    const key = entry['key'].trim()
    const pattern = kind === 'env' ? ENV_KEY : HEADER_KEY
    if (!pattern.test(key)) throw new Error(`invalid MCP server: invalid ${label} key "${key}"`)
    if (seen.has(key)) throw new Error(`invalid MCP server: duplicate ${label} key "${key}"`)
    seen.add(key)
    if (entry['value'] !== undefined && typeof entry['value'] !== 'string') {
      throw new Error(`invalid MCP server: ${label} value for "${key}" must be a string`)
    }
    const raw = typeof entry['value'] === 'string' ? entry['value'] : undefined
    if (raw !== undefined && raw.length > MAX_SECRET_LENGTH) {
      throw new Error(`invalid MCP server: ${label} value for "${key}" is too long`)
    }
    const clear = entry['clear'] === true
    return {
      key,
      ...raw !== undefined && raw !== '' ? { value: raw } : {},
      ...clear ? { clear: true } : {},
    }
  })
}

function serverName(value: unknown): string {
  const name = stringValue(value, 'name')
  if (!SERVER_NAME.test(name)) {
    throw new Error('invalid MCP server name: use 1-32 letters, digits, hyphens, or underscores')
  }
  return name
}

function transport(value: unknown): ManagedTransport {
  if (value !== 'stdio' && value !== 'streamable-http') {
    throw new Error('invalid MCP server: transport must be stdio or streamable-http')
  }
  return value
}

function slug(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function secretRef(name: string, kind: ManagedFieldKind, key: string, used: ReadonlySet<string>): string {
  const kindLabel = kind === 'env' ? 'ENV' : 'HDR'
  const digest = createHash('sha256').update(`${name}\u0000${kind}\u0000${key}`).digest('hex').slice(0, 8).toUpperCase()
  let base = `SKILLHUB_${slug(name)}_${kindLabel}_${slug(key) || 'VALUE'}`
  if (base.length > 72) base = `${base.slice(0, 63)}_${digest}`
  // Sanitizing can collapse two distinct keys; the suffix keeps references
  // distinct so one server's value can never overwrite another's.
  let candidate = base
  for (let index = 2; used.has(candidate); index += 1) candidate = `${base}_${digest}_${index}`
  return candidate
}

function allRefs(servers: Readonly<Record<string, ManagedServerDefinition>>): Set<string> {
  const refs = new Set<string>()
  for (const server of Object.values(servers)) {
    for (const ref of Object.values(server.envRefs)) refs.add(ref)
    for (const ref of Object.values(server.headerRefs)) refs.add(ref)
  }
  return refs
}

function emptyDocument(): ManagedStoreDocument {
  return { version: 1, revision: 0, servers: {} }
}

function storePath(storeDir: string): string {
  return join(storeDir, 'mcp-servers.json')
}

function normalizedStoreDir(storeDir: string): string {
  return resolve(storeDir)
}

/**
 * Read the managed-server document.
 * @param storeDir - SkillHub store root.
 * @returns an empty document when none was written yet.
 * @throws when the file exists but does not match the supported shape.
 */
export function readManagedStore(storeDir: string): ManagedStoreDocument {
  const path = storePath(normalizedStoreDir(storeDir))
  if (!existsSync(path)) return emptyDocument()
  let raw: unknown
  try { raw = JSON.parse(readFileSync(path, 'utf8')) as unknown } catch {
    throw new Error(`Invalid SkillHub MCP server store: ${path}`)
  }
  if (!isRecord(raw) || raw['version'] !== 1 || typeof raw['revision'] !== 'number' || !isRecord(raw['servers'])) {
    throw new Error(`Invalid SkillHub MCP server store: ${path}`)
  }
  const servers: Record<string, ManagedServerDefinition> = {}
  for (const [name, value] of Object.entries(raw['servers'])) {
    if (!SERVER_NAME.test(name) || !isRecord(value)) {
      throw new Error(`Invalid SkillHub MCP server store: ${path}`)
    }
    const entryTransport = value['transport']
    if (entryTransport !== 'stdio' && entryTransport !== 'streamable-http') {
      throw new Error(`Invalid SkillHub MCP server store: ${path}`)
    }
    servers[name] = {
      transport: entryTransport,
      command: typeof value['command'] === 'string' ? value['command'] : '',
      args: Array.isArray(value['args']) ? value['args'].filter((item): item is string => typeof item === 'string') : [],
      cwd: typeof value['cwd'] === 'string' ? value['cwd'] : '',
      url: typeof value['url'] === 'string' ? value['url'] : '',
      envRefs: isRecord(value['envRefs']) ? Object.fromEntries(Object.entries(value['envRefs']).filter((item): item is [string, string] => typeof item[1] === 'string')) : {},
      headerRefs: isRecord(value['headerRefs']) ? Object.fromEntries(Object.entries(value['headerRefs']).filter((item): item is [string, string] => typeof item[1] === 'string')) : {},
      enabled: value['enabled'] !== false,
      createdAt: typeof value['createdAt'] === 'string' ? value['createdAt'] : '',
      updatedAt: typeof value['updatedAt'] === 'string' ? value['updatedAt'] : '',
    }
  }
  return { version: 1, revision: raw['revision'], servers }
}

function writeManagedStore(storeDir: string, document: ManagedStoreDocument): void {
  const dir = normalizedStoreDir(storeDir)
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  const path = storePath(dir)
  const temp = `${path}.${randomUUID()}.tmp`
  writeFileSync(temp, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o600 })
  renameSync(temp, path)
}

function nextDocument(current: ManagedStoreDocument, servers: Record<string, ManagedServerDefinition>): ManagedStoreDocument {
  return { version: 1, revision: current.revision + 1, servers }
}

function assertRevision(current: ManagedStoreDocument, expected: number | undefined): void {
  if (expected === undefined) return
  if (!Number.isInteger(expected) || expected !== current.revision) {
    throw new Error('MCP configuration changed in another window; refresh and retry')
  }
}

function readDefinition(input: ManagedServerInput): {
  name: string
  transport: ManagedTransport
  command: string
  args: string[]
  cwd: string
  url: string
  env: SecretFieldInput[]
  headers: SecretFieldInput[]
  enabled: boolean
} {
  const name = serverName(input.name)
  const kind = transport(input.transport)
  const command = stringValue(input.command, 'command')
  const url = stringValue(input.url, 'url')
  const cwd = stringValue(input.cwd, 'cwd')
  const args = readArgs(input.args)
  const env = readFields(input.env, 'env', 'environment variables')
  const headers = readFields(input.headers, 'headers', 'headers')
  const enabled = input.enabled !== false
  if (kind === 'stdio') {
    if (command === '') throw new Error('invalid MCP server: a stdio server requires a command')
    if (url !== '') throw new Error('invalid MCP server: a stdio server cannot use a url')
    if (headers.length > 0) throw new Error('invalid MCP server: a stdio server cannot use headers')
    if (cwd !== '' && !isAbsolute(cwd)) throw new Error('invalid MCP server: cwd must be an absolute path')
    if (cwd !== '' && !existsSync(cwd)) throw new Error('invalid MCP server: cwd does not exist')
  } else {
    if (!/^https?:\/\//i.test(url)) throw new Error('invalid MCP server: a streamable-http server requires an http(s) url')
    if (command !== '') throw new Error('invalid MCP server: a streamable-http server cannot use a command')
    if (args.length > 0) throw new Error('invalid MCP server: a streamable-http server cannot use args')
    if (env.length > 0) throw new Error('invalid MCP server: a streamable-http server cannot use environment variables')
    if (cwd !== '') throw new Error('invalid MCP server: a streamable-http server cannot use cwd')
  }
  return { name, transport: kind, command, args, cwd, url, env, headers, enabled }
}

function buildRefs(
  name: string,
  kind: ManagedFieldKind,
  fields: readonly SecretFieldInput[],
  previous: Readonly<Record<string, string>>,
  used: Set<string>,
): { refs: Record<string, string>; writes: SecretWrite[]; clears: string[] } {
  const refs: Record<string, string> = {}
  const writes: SecretWrite[] = []
  const clears: string[] = []
  for (const field of fields) {
    const ref = previous[field.key] ?? secretRef(name, kind, field.key, used)
    refs[field.key] = ref
    used.add(ref)
    if (field.value !== undefined && field.value !== '') {
      writes.push({ kind, key: field.key, ref, value: field.value })
    }
    // Clearing keeps the field but removes the stored value, so the row stays
    // visible and the next start reports waiting-credentials until it is set.
    if (field.clear === true && field.value === undefined) clears.push(ref)
  }
  return { refs, writes, clears }
}

function removedSecrets(
  kind: ManagedFieldKind,
  previous: Readonly<Record<string, string>>,
  next: Readonly<Record<string, string>>,
): string[] {
  return Object.entries(previous)
    .filter(([key]) => next[key] === undefined)
    .map(([, ref]) => ref)
}

/**
 * Create one definition and persist it. Secrets are written by the caller,
 * because the credential provider is an async service.
 * @param storeDir - SkillHub store root.
 * @param input - validated request fields.
 * @returns the document and the secret values to store.
 */
export function createManagedServer(storeDir: string, input: ManagedServerInput): PreparedServer {
  const current = readManagedStore(storeDir)
  assertRevision(current, input.expectedRevision)
  const fields = readDefinition(input)
  if (current.servers[fields.name] !== undefined) {
    throw new Error(`an MCP server named "${fields.name}" already exists`)
  }
  const used = allRefs(current.servers)
  const env = buildRefs(fields.name, 'env', fields.env, {}, used)
  const headers = buildRefs(fields.name, 'headers', fields.headers, {}, used)
  const now = new Date().toISOString()
  const definition: ManagedServerDefinition = {
    transport: fields.transport,
    command: fields.command,
    args: fields.args,
    cwd: fields.cwd,
    url: fields.url,
    envRefs: env.refs,
    headerRefs: headers.refs,
    enabled: fields.enabled,
    createdAt: now,
    updatedAt: now,
  }
  const document = nextDocument(current, { ...current.servers, [fields.name]: definition })
  writeManagedStore(storeDir, document)
  return {
    document,
    definition,
    secrets: [...env.writes, ...headers.writes],
    removedRefs: [...env.clears, ...headers.clears],
    fields: definitionFields(definition),
  }
}

function definitionFields(definition: ManagedServerDefinition): string[] {
  const fields = ['transport', 'enabled']
  if (definition.command !== '') fields.push('command')
  if (definition.args.length > 0) fields.push('args')
  if (definition.cwd !== '') fields.push('cwd')
  if (definition.url !== '') fields.push('url')
  for (const key of Object.keys(definition.envRefs)) fields.push(`env.${key}`)
  for (const key of Object.keys(definition.headerRefs)) fields.push(`headers.${key}`)
  return fields
}

/**
 * Update one definition. The name is immutable; every other field may change.
 * Existing references are reused by key, so editing a non-secret field does
 * not rotate a secret, and a removed row releases its reference.
 * @param storeDir - SkillHub store root.
 * @param name - existing server name.
 * @param input - validated request fields.
 * @returns the updated document, secret writes, and released references.
 */
export function updateManagedServer(storeDir: string, name: string, input: ManagedServerInput): PreparedServer {
  const current = readManagedStore(storeDir)
  assertRevision(current, input.expectedRevision)
  const previous = current.servers[name]
  if (previous === undefined) throw new Error(`MCP server "${name}" does not exist`)
  if (input.name !== undefined && input.name !== name) throw new Error('invalid MCP server: the name cannot be changed')
  const fields = readDefinition({ ...input, name })
  const used = allRefs({ ...current.servers, [name]: { ...previous, envRefs: {}, headerRefs: {} } })
  const env = buildRefs(name, 'env', fields.env, previous.envRefs, used)
  const headers = buildRefs(name, 'headers', fields.headers, previous.headerRefs, used)
  const removedRefs = [
    ...removedSecrets('env', previous.envRefs, env.refs),
    ...removedSecrets('headers', previous.headerRefs, headers.refs),
    ...env.clears,
    ...headers.clears,
  ]
  const definition: ManagedServerDefinition = {
    transport: fields.transport,
    command: fields.command,
    args: fields.args,
    cwd: fields.cwd,
    url: fields.url,
    envRefs: env.refs,
    headerRefs: headers.refs,
    enabled: fields.enabled,
    createdAt: previous.createdAt,
    updatedAt: new Date().toISOString(),
  }
  const document = nextDocument(current, { ...current.servers, [name]: definition })
  writeManagedStore(storeDir, document)
  return {
    document,
    definition,
    secrets: [...env.writes, ...headers.writes],
    removedRefs,
    fields: definitionFields(definition),
  }
}

/**
 * Remove one definition and report the references its caller must release.
 * @param storeDir - SkillHub store root.
 * @param name - server to remove.
 * @param expectedRevision - optional revision check.
 * @returns the removed definition and the remaining document.
 */
export function deleteManagedServer(storeDir: string, name: string, expectedRevision?: number): { definition: ManagedServerDefinition; document: ManagedStoreDocument; removedRefs: string[] } {
  const current = readManagedStore(storeDir)
  assertRevision(current, expectedRevision)
  const previous = current.servers[name]
  if (previous === undefined) throw new Error(`MCP server "${name}" does not exist`)
  const servers = { ...current.servers }
  delete servers[name]
  const document = nextDocument(current, servers)
  writeManagedStore(storeDir, document)
  return {
    definition: previous,
    document,
    removedRefs: [...Object.values(previous.envRefs), ...Object.values(previous.headerRefs)],
  }
}

/**
 * Persist the durable run intent for one managed server.
 * @param storeDir - SkillHub store root.
 * @param name - server to change.
 * @param enabled - whether the manager should keep an instance mounted.
 * @param expectedRevision - optional revision check.
 * @returns the updated definition.
 */
export function setManagedServerEnabled(storeDir: string, name: string, enabled: boolean, expectedRevision?: number): { definition: ManagedServerDefinition; document: ManagedStoreDocument } {
  const current = readManagedStore(storeDir)
  assertRevision(current, expectedRevision)
  const previous = current.servers[name]
  if (previous === undefined) throw new Error(`MCP server "${name}" does not exist`)
  const definition = { ...previous, enabled, updatedAt: new Date().toISOString() }
  const document = nextDocument(current, { ...current.servers, [name]: definition })
  writeManagedStore(storeDir, document)
  return { definition, document }
}

function auditPath(storeDir: string): string {
  return join(normalizedStoreDir(storeDir), 'audit', 'mcp.jsonl')
}

/**
 * Append one redacted audit record. Rotation keeps the newest file bounded;
 * the caller is responsible for never putting a secret value in the entry.
 * @param storeDir - SkillHub store root.
 * @param entry - record to append.
 */
export function appendAudit(storeDir: string, entry: AuditEntry): void {
  const path = auditPath(storeDir)
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  try {
    if (existsSync(path) && statSync(path).size > MAX_AUDIT_BYTES) {
      renameSync(path, `${path}.1`)
    }
  } catch { /* rotation is best-effort; the write below still marks the change */ }
  appendFileSync(path, `${JSON.stringify(entry)}\n`, { mode: 0o600 })
}

/**
 * Read recent audit records, newest last.
 * @param storeDir - SkillHub store root.
 * @param options - limit and optional server filter.
 * @returns parsed records; malformed lines are skipped.
 */
export function readAudit(storeDir: string, options: { limit?: number; server?: string } = {}): AuditEntry[] {
  const path = auditPath(storeDir)
  if (!existsSync(path)) return []
  let lines: string[]
  try { lines = readFileSync(path, 'utf8').split('\n').filter(line => line !== '') } catch { return [] }
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500)
  const matches: AuditEntry[] = []
  for (const line of lines) {
    try {
      const parsed: unknown = JSON.parse(line)
      if (!isRecord(parsed) || typeof parsed['at'] !== 'string' || typeof parsed['action'] !== 'string') continue
      if (options.server !== undefined && parsed['server'] !== options.server) continue
      matches.push(parsed as unknown as AuditEntry)
    } catch { /* one bad line must not hide the rest */ }
  }
  return matches.slice(-limit)
}

/**
 * Keep diagnostics useful without echoing credentials. This is a last line of
 * defence: callers must not pass secret values in the first place.
 * @param error - thrown value or diagnostic text.
 * @returns a bounded, redacted sentence.
 */
export function redactAuditText(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error)
  return text
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, '$1 [redacted]')
    .replace(/([?&](?:token|key|secret|password|authorization)=)[^&\s]+/gi, '$1[redacted]')
    .slice(0, 300)
}
