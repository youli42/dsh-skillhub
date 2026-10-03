import { createHash, randomUUID } from 'node:crypto'
import { nextPropagationRevision, propagatedGate, readPropagationMetadata, type PropagationMetadata } from './propagation.ts'
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { join, resolve } from 'node:path'

export type McpLayer = 'global' | 'project' | 'session'
export type McpGate = 'on' | 'off'
export type McpLayerGate = McpGate | 'inherit'

export interface McpVisibilityDocument extends PropagationMetadata {
  readonly version: 2
  readonly default: McpLayerGate
  readonly gates: Readonly<Record<string, McpLayerGate>>
}

/**
 * One declared way to start a server. A project may declare the same server name
 * in more than one file (`.mcp.json` and `.opencode/opencode.json`), so the
 * panel lists every variant and the user picks the one that runs.
 */
export interface McpVariantView {
  /** Declaration source: `mcp-json` or `opencode-json`. */
  readonly source: string
  readonly transport: string
  /** Rendered command line, or the endpoint URL for HTTP. */
  readonly command: string
  /** Approval exists for this exact declaration content. */
  readonly approved: boolean
  /** Nothing in this variant would stop it from starting. */
  readonly startable: boolean
  readonly problems: readonly string[]
}

export interface McpServerView {
  readonly name: string
  readonly tools: number
  readonly gate: McpGate
  readonly source: McpLayer
  /** A live `mcp-client` fiber exists in this session. */
  readonly running?: boolean
  /** Declared by a project file for this folder. */
  readonly declared?: boolean
  /** SkillHub mounted it for this session, so hiding it is provably complete. */
  readonly managed?: boolean
  /**
   * Declared for this folder but not running: the user has to approve and start
   * it before its visibility can mean anything, so the panel shows it Off and
   * offers no switch.
   */
  readonly startRequired?: boolean
  /**
   * The last start of this session failed: the service was approved but never
   * connected. Its reason is in `problems`, and the row marks it so a failure is
   * scannable rather than hidden among declaration warnings.
   */
  readonly failed?: boolean
  /** Hiding it through the public tool API removes every one of its tools. */
  readonly supported?: boolean
  /** Declared ways to start it, in priority order. */
  readonly variants?: readonly McpVariantView[]
  /** Aggregated declaration problems, already human-readable. */
  readonly problems?: readonly string[]
}

export interface McpCatalogQuery {
  readonly sessionId?: string
  readonly folder?: string
  readonly layer?: McpLayer
}

export interface McpToggle {
  readonly layer: McpLayer
  readonly sessionId?: string
  readonly folder?: string
  readonly server: string
  readonly on: boolean
}

export interface McpToggleAll {
  readonly layer: McpLayer
  readonly sessionId?: string
  readonly folder?: string
  readonly on: boolean
}

export interface McpInherit {
  readonly layer: McpLayer
  readonly sessionId?: string
  readonly folder?: string
  readonly server: string
}

export interface McpInheritAll {
  readonly layer: McpLayer
  readonly sessionId?: string
  readonly folder?: string
}

/**
 * Attribute one global tool name to its owning MCP server.
 *
 * Public MCP names are NOT reliably parseable: serverName permits underscores
 * (including double underscores), raw tool names may contain separators, and
 * long names are truncated with an appended identity hash. The only safe
 * attribution is against the authoritative live server set (read from the
 * registry's mcp-client fibers, serverName only — never credentials).
 *
 * A name is attributed only on unique delimiter-bounded prefix match. Nested
 * servers (for example `a` and `a__b` both live) make `mcp__a__b__c`
 * genuinely ambiguous, so it is attributed to neither: hiding must never
 * remove the wrong server's tool. Unmatched names (stale, truncated-hash, or
 * scope-local registrations) are likewise never denied.
 */
export function attributeMcpTool(name: string, servers: readonly string[]): string | undefined {
  if (!name.startsWith('mcp__')) return undefined
  let match: string | undefined
  let ambiguous = false
  for (const server of servers) {
    if (server === '' || name.length <= 6 + server.length) continue
    if (!name.startsWith(`mcp__${server}__`)) continue
    if (match !== undefined) {
      ambiguous = true
      break
    }
    match = server
  }
  if (ambiguous || match === undefined) return undefined
  return match
}

export function serversFromToolNames(
  names: readonly string[],
  servers: readonly string[],
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const server of servers) counts.set(server, 0)
  for (const name of names) {
    const owner = attributeMcpTool(name, servers)
    if (owner === undefined) continue
    counts.set(owner, (counts.get(owner) ?? 0) + 1)
  }
  return counts
}

export function computeDenyList(
  toolNames: readonly string[],
  hidden: ReadonlySet<string>,
  servers: readonly string[],
): string[] {
  if (hidden.size === 0) return []
  const deny: string[] = []
  for (const name of toolNames) {
    const owner = attributeMcpTool(name, servers)
    if (owner !== undefined && hidden.has(owner)) deny.push(name)
  }
  return deny
}

function emptyDocument(layer: McpLayer): McpVisibilityDocument {
  return {
    version: 2,
    default: layer === 'global' ? 'on' : 'inherit',
    gates: {},
  }
}

function parsedGates(value: unknown, layer: McpLayer, path: string): Record<string, McpLayerGate> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid SkillHub MCP visibility document: ${path}`)
  }
  const gates: Record<string, McpLayerGate> = Object.create(null) as Record<string, McpLayerGate>
  for (const [server, gate] of Object.entries(value)) {
    if (gate !== 'on' && gate !== 'off' && !(layer !== 'global' && gate === 'inherit')) {
      throw new Error(`Invalid SkillHub MCP visibility document: ${path}`)
    }
    gates[server] = gate
  }
  return gates
}

function readDoc(path: string, layer: McpLayer): McpVisibilityDocument {
  if (!existsSync(path)) return emptyDocument(layer)
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(path, 'utf8')) as unknown
  } catch {
    throw new Error(`Invalid SkillHub MCP visibility document: ${path}`)
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`Invalid SkillHub MCP visibility document: ${path}`)
  }
  const object = raw as { version?: unknown; default?: unknown; gates?: unknown }
  const gates = parsedGates(object.gates, layer, path)
  if (object.version !== 2) {
    throw new Error(`Unsupported SkillHub MCP visibility document version: ${path}`)
  }
  const defaultGate = object.default
  if (defaultGate !== 'on' && defaultGate !== 'off' && !(layer !== 'global' && defaultGate === 'inherit')) {
    throw new Error(`Invalid SkillHub MCP visibility document: ${path}`)
  }
  return { version: 2, default: defaultGate, gates, ...readPropagationMetadata(object, path) }
}

function writeDoc(path: string, doc: McpVisibilityDocument): void {
  mkdirSync(join(path, '..'), { recursive: true })
  const temp = `${path}.${randomUUID()}.tmp`
  writeFileSync(temp, `${JSON.stringify({ version: 2, default: doc.default, gates: doc.gates, ...readPropagationMetadata(doc, path) }, null, 2)}\n`, { mode: 0o600 })
  renameSync(temp, path)
}

function folderKey(folder: string): string {
  return createHash('sha256').update(folder).digest('hex').slice(0, 24)
}

function normalizeFolder(folder: string): string {
  return resolve(folder)
}

function optionalFolder(folder: string | undefined): string | undefined {
  if (folder === undefined || folder.trim() === '') return undefined
  return normalizeFolder(folder)
}

function assertSessionId(sessionId: string): void {
  if (
    sessionId.trim() === ''
    || sessionId === '.'
    || sessionId === '..'
    || sessionId.includes('/')
    || sessionId.includes('\\')
    || sessionId.includes('\0')
  ) {
    throw new Error('invalid sessionId for Session visibility')
  }
}

function assertServer(server: string): void {
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(server)) {
    throw new Error('invalid MCP server name')
  }
}

function resolvedLayer(query: McpCatalogQuery): McpLayer {
  if (query.layer !== undefined) return query.layer
  if (query.sessionId !== undefined) return 'session'
  if (query.folder !== undefined) return 'project'
  return 'global'
}

export class McpHub {
  constructor(readonly paths: { readonly storeDir: string }) {
    mkdirSync(this.paths.storeDir, { recursive: true })
  }

  private globalPath(): string {
    return join(this.paths.storeDir, 'mcp-global.json')
  }

  private projectPath(folder: string): string {
    return join(this.paths.storeDir, 'mcp-projects', `${folderKey(normalizeFolder(folder))}.json`)
  }

  private sessionPath(sessionId: string): string {
    assertSessionId(sessionId)
    return join(this.paths.storeDir, 'mcp-sessions', `${sessionId}.json`)
  }

  private documentPath(layer: McpLayer, sessionId?: string, folder?: string): string {
    if (!['global', 'project', 'session'].includes(layer)) throw new Error('invalid MCP layer')
    if (layer === 'global') return this.globalPath()
    if (layer === 'project') {
      if (folder === undefined || folder === '') throw new Error('folder required for Project visibility')
      return this.projectPath(folder)
    }
    if (sessionId === undefined || sessionId === '') throw new Error('sessionId required for Session visibility')
    return this.sessionPath(sessionId)
  }

  effectiveGate(server: string, sessionId?: string, folder?: string): { gate: McpGate; source: McpLayer } {
    const normalizedFolder = optionalFolder(folder)
    const global = readDoc(this.globalPath(), 'global')
    const project = normalizedFolder === undefined ? undefined : readDoc(this.projectPath(normalizedFolder), 'project')
    const session = sessionId === undefined || sessionId === '' ? undefined : readDoc(this.sessionPath(sessionId), 'session')
    return propagatedGate(server, [['global', global], ['project', project], ['session', session]])
  }

  hiddenServers(sessionId?: string, folder?: string, servers?: readonly string[]): Set<string> {
    const hidden = new Set<string>()
    if (servers === undefined) return hidden
    for (const server of servers) {
      if (this.effectiveGate(server, sessionId, folder).gate === 'off') hidden.add(server)
    }
    return hidden
  }

  /**
   * Resolve one server through the complete inheritance chain, whichever layer
   * is being edited. The panel's display and the runtime's enforce/guard path
   * must read the same value: a Project or Chat override has to change what the
   * panel shows, because it already changes what the model may call. A layer
   * that is not part of the query simply restricts nothing: reading `global`
   * reports the global default alone (no folder was chosen, so no Project row
   * can apply), `project` composes Global→Project, and `session` composes
   * Global→Project→Chat.
   * @param name - MCP server name.
   * @param layer - the layer being edited or observed.
   * @param sessionId - chat whose Chat document participates (session layer only).
   * @param folder - normalized workspace folder whose Project document participates.
   * @returns the effective gate plus the layer that decided it.
   */
  private gateState(name: string, layer: McpLayer, sessionId?: string, folder?: string): { gate: McpGate; source: McpLayer } {
    const global = readDoc(this.globalPath(), 'global')
    const project = layer === 'global' || folder === undefined ? undefined : readDoc(this.projectPath(folder), 'project')
    const session = layer !== 'session' || sessionId === undefined ? undefined : readDoc(this.sessionPath(sessionId), 'session')
    return propagatedGate(name, [['global', global], ['project', project], ['session', session]])
  }

  catalog(
    query: McpCatalogQuery = {},
    toolNames: readonly string[] = [],
    servers: readonly string[] = [],
  ): { servers: McpServerView[]; layer: McpLayer } {
    const layer = resolvedLayer(query)
    const folder = optionalFolder(query.folder)
    if (layer === 'project' && folder === undefined) throw new Error('folder required for Project visibility')
    if (layer === 'session' && query.sessionId === undefined) {
      throw new Error('sessionId required for Session visibility')
    }
    const counts = serversFromToolNames(toolNames, servers)
    const views: McpServerView[] = [...counts.entries()]
      .map(([name, tools]) => {
        const state = this.gateState(name, layer, query.sessionId, folder)
        return { name, tools, gate: state.gate, source: state.source }
      })
      .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))
    return { servers: views, layer }
  }

  toggle(request: McpToggle): void {
    assertServer(request.server)
    const folder = optionalFolder(request.folder)
    const path = this.documentPath(request.layer, request.sessionId, folder)
    const current = readDoc(path, request.layer)
    const revision = nextPropagationRevision(this.paths.storeDir)
    writeDoc(path, { ...current,
      gates: { ...current.gates, [request.server]: request.on ? 'on' : 'off' },
      gateRevisions: { ...current.gateRevisions, [request.server]: revision },
    })
  }

  inherit(request: McpInherit): void {
    assertServer(request.server)
    const folder = optionalFolder(request.folder)
    const path = this.documentPath(request.layer, request.sessionId, folder)
    const current = readDoc(path, request.layer)
    const gates = { ...current.gates }
    if (request.layer === 'global' || current.default === 'inherit') delete gates[request.server]
    else gates[request.server] = 'inherit'
    writeDoc(path, { ...current, gates })
  }
}
