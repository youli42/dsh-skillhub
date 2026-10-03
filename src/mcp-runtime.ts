import type { Context } from '@deepseek-ai/cordis'
import { McpHub, attributeMcpTool, computeDenyList, type McpCatalogQuery, type McpServerView, type McpVariantView } from './mcp.ts'
import {
  DEFAULT_PROJECT_MCP_FILES, approveMcpServer, isApproved, mcpClientConfig, readMcpTrust, readProjectMcp,
  type ProjectMcpRead, type ProjectMcpTrust, type ProjectMcpVariant,
} from './project-mcp.ts'

interface Tools {
  schemas(scope?: unknown): { name: string }[]
  get(name: string, scope?: unknown): unknown
  restrict(filter: { deny: string[] }): () => void
  guard(fn: (exec: { name: string }) => string | undefined): () => void
}
interface Agent {
  id: string
  ctx: Context
  session?: { id?: string; header?: { id?: string; cwd?: string } }
}

interface Mounted {
  readonly server: string
  readonly folder: string
  readonly source: string
  readonly hash: string
  readonly dispose: () => Promise<void>
}

/** Project-level MCP support for the session that opened a workspace. */
export interface ProjectMcpOptions {
  /** Store directory holding `mcp-trust/<folderHash>.json`. */
  readonly storeDir: string
  /** Declaration files, relative to the session folder. */
  readonly files?: readonly string[]
  /** Test seam: read declarations without touching disk. */
  readonly read?: (folder: string, files: readonly string[]) => ProjectMcpRead
  /**
   * Start declarations this folder has already approved as soon as a session
   * opens. Only an approval recorded for the exact declaration content starts
   * anything: an untrusted command still waits for the user.
   */
  readonly autoStart?: boolean
}

const EMPTY_READ: ProjectMcpRead = { servers: [], problems: [] }
const EMPTY_TRUST: ProjectMcpTrust = { version: 1, servers: {} }

let clientModule: Promise<unknown> | undefined

/**
 * Resolve the MCP client plugin. It ships with DSH, so this normally cannot
 * fail; when the profile cannot resolve it the caller reports one readable
 * sentence instead of a stack trace.
 */
async function loadMcpClient(): Promise<unknown> {
  clientModule ??= import('@deepseek-ai/dsh-mcp-client').catch((error: unknown) => {
    clientModule = undefined
    throw new Error(`@deepseek-ai/dsh-mcp-client is not resolvable here: ${String(error)}`)
  })
  return await clientModule
}

/**
 * Uses public Cordis fiber configuration; only serverName leaves this function.
 *
 * Only an ACTIVE fiber counts. A rejected activation keeps its fiber — and with
 * it the `serverName` in its config — in the registry, so counting those would
 * report a server that never connected as running, which is exactly the
 * misleading state a failed start must not produce. ACTIVE is Cordis's public
 * FiberState value; the enum is compile-time only.
 */
export function liveMcpServers(ctx: Context): string[] {
  const names = new Set<string>()
  for (const runtime of ctx.registry.values()) {
    if (runtime.name !== 'mcp-client') continue
    for (const fiber of runtime.fibers) {
      if (fiber.uid === null || fiber.state !== 2) continue
      const name: unknown = fiber.config?.serverName
      if (typeof name === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(name)) names.add(name)
    }
  }
  return [...names].sort()
}

function renderVariant(variant: ProjectMcpVariant): string {
  if (variant.transport === 'streamable-http') return variant.url ?? '(missing url)'
  const args = variant.args.length === 0 ? '' : ` ${variant.args.join(' ')}`
  return `${variant.command ?? '(missing command)'}${args}`
}

function variantViews(entry: { name: string; variants: readonly ProjectMcpVariant[] }, trust: ProjectMcpTrust): McpVariantView[] {
  return entry.variants.map(variant => ({
    source: variant.source,
    transport: variant.transport,
    command: renderVariant(variant),
    approved: isApproved(trust, variant, entry.name),
    startable: !variant.disabled && variant.problems.length === 0,
    problems: variant.problems,
  }))
}

function declaredProblems(entry: { variants: readonly ProjectMcpVariant[] }): string[] {
  const problems: string[] = []
  for (const variant of entry.variants) {
    for (const problem of variant.problems) {
      const label = `${variant.source}: ${problem}`
      if (!problems.includes(label)) problems.push(label)
    }
  }
  return problems
}

/**
 * One readable sentence for a failed activation.
 *
 * The MCP client rejects with a generic message and attaches the real failure as
 * `cause` (a spawn error, a refused connection, a handshake timeout), so the
 * cause is what the user needs. Depth is bounded because a cause chain may loop.
 * @param error - whatever the mount threw.
 * @returns a single line suitable for a panel row.
 */
function describeFailure(error: unknown): string {
  const parts: string[] = []
  let current: unknown = error
  for (let depth = 0; depth < 4 && current !== undefined && current !== null; depth += 1) {
    const message = current instanceof Error ? current.message : String(current)
    if (message !== '' && !parts.includes(message)) parts.push(message)
    current = current instanceof Error ? (current as { cause?: unknown }).cause : undefined
  }
  return parts.length === 0 ? 'unknown error' : parts.join(' — ')
}

export function installMcpVisibility(
  ctx: Context,
  hub: McpHub,
  discover = () => liveMcpServers(ctx),
  project?: ProjectMcpOptions,
) {
  const tools = ctx.get('tools') as Tools | undefined
  if (!tools) throw new Error('SkillHub MCP requires tools service')
  const agents = new Map<Agent, { lift: () => void; guard: () => void; signature: string; dispose: () => void }>()
  const mounted = new Map<string, Mounted>()
  /**
   * Sessions whose approved declarations have already been started. One pass per
   * session: a declaration added while the session is open is the panel's job,
   * not something to keep re-scanning for on every event.
   */
  const autoStarted = new Set<string>()
  /** Servers the user stopped, so entering again does not silently restart them. */
  const userStopped = new Set<string>()
  /**
   * Why a start failed, per session and server. A mounted fiber means a connected
   * server (`failOnStartupError`), so this is the only way a row can explain a
   * service that was approved but never came up — and it also stops the
   * automatic start from retrying it on every event in the same session.
   */
  const startFailures = new Map<string, string>()
  const autoStartEnabled = project !== undefined && project.autoStart !== false
  let refreshing = false
  let disposed = false
  const names = () => tools.schemas().map(t => t.name)
  const identity = (agent: Agent) => ({ sessionId: agent.session?.id ?? agent.session?.header?.id ?? agent.id, folder: agent.session?.header?.cwd })
  const mountKey = (sessionId: string | undefined, server: string): string => `${sessionId ?? ''}\u0000${server}`
  const files = project?.files ?? DEFAULT_PROJECT_MCP_FILES
  const readDeclared = (folder: string): ProjectMcpRead => project === undefined
    ? EMPTY_READ
    : (project.read ?? readProjectMcp)(folder, files)
  const trustOf = (folder: string): ProjectMcpTrust => project === undefined
    ? EMPTY_TRUST
    : readMcpTrust(project.storeDir, folder)
  const agentFor = (sessionId: string | undefined): Agent | undefined => {
    if (sessionId === undefined || sessionId === '') return undefined
    for (const agent of agents.keys()) {
      if (identity(agent).sessionId === sessionId) return agent
    }
    return undefined
  }
  const folderFor = (query: McpCatalogQuery): string | undefined => {
    if (query.folder !== undefined && query.folder !== '') return query.folder
    const agent = agentFor(query.sessionId)
    return agent === undefined ? undefined : identity(agent).folder
  }
  const problematic = (server: string, servers: string[], sessionId?: string) => {
    // A server SkillHub mounted lives in exactly this session's scope, so hiding
    // it is complete by construction; the scope-local probe below would
    // otherwise refuse to switch off the very server SkillHub started.
    if (mounted.has(mountKey(sessionId, server))) return false
    if (servers.some(other => other !== server && (server.startsWith(`${other}__`) || other.startsWith(`${server}__`)))) return true
    for (const agent of agents.keys()) {
      // A disposing agent context can throw here; "cannot prove clean" means
      // the server is reported problematic rather than trusted.
      try {
        for (const tool of (agent.ctx.get('tools') as Tools).schemas(agent)) {
          if (tool.name.startsWith(`mcp__${server}__`) && tools.get(tool.name) !== tools.get(tool.name, agent)) return true
        }
      } catch {
        return true
      }
    }
    return false
  }
  const refresh = () => {
    if (refreshing || disposed) return
    refreshing = true
    try {
      const servers = discover()
      const all = names()
      for (const [agent, state] of agents) {
        const id = identity(agent)
        const denied = computeDenyList(all, hub.hiddenServers(id.sessionId, id.folder, servers), servers).sort()
        const signature = JSON.stringify(denied)
        if (signature === state.signature) continue
        const scoped = agent.ctx.get('tools') as Tools
        const next = denied.length ? scoped.restrict({ deny: denied }) : () => {}
        const previous = state.lift
        state.lift = next
        state.signature = signature
        previous()
      }
    } finally { refreshing = false }
  }
  const id = (agent: Agent) => identity(agent).sessionId
  /** Unmount everything this session started; the approval record stays. */
  const releaseAgent = async (sessionId: string | undefined): Promise<void> => {
    if (sessionId === undefined || sessionId === '') return
    autoStarted.delete(sessionId)
    for (const key of [...startFailures.keys()]) {
      if (key.startsWith(`${sessionId}\u0000`)) startFailures.delete(key)
    }
    for (const [key, entry] of [...mounted.entries()]) {
      if (!key.startsWith(`${sessionId}\u0000`)) continue
      mounted.delete(key)
      userStopped.delete(key)
      await entry.dispose()
    }
  }
  /**
   * Start the approved declarations of this session's folder.
   *
   * Runs once per session, in the background. `agent/created` is a serial event
   * whose listeners are awaited before creation resolves while queued input
   * waits, so this never blocks and never throws: an MCP handshake can take
   * seconds and a broken declaration must not hold up the session. What went
   * wrong is recorded instead, and the row shows it.
   * @param agent - the session's agent, whose folder must already be known.
   */
  const autoStartApproved = (agent: Agent): void => {
    if (!autoStartEnabled || disposed) return
    const sessionId = id(agent)
    if (sessionId === undefined || sessionId === '' || autoStarted.has(sessionId)) return
    const folder = identity(agent).folder
    if (folder === undefined || folder === '') return
    autoStarted.add(sessionId)
    const declared = readDeclared(folder).servers
    const trust = trustOf(folder)
    for (const entry of declared) {
      const key = mountKey(sessionId, entry.name)
      if (mounted.has(key) || userStopped.has(key) || startFailures.has(key)) continue
      const variant = entry.variants.find(candidate =>
        !candidate.disabled && candidate.problems.length === 0 && isApproved(trust, candidate, entry.name))
      if (variant === undefined) continue
      void mount(agent, entry.name, folder, variant).then(() => { refresh() }).catch((error: unknown) => {
        const detail = describeFailure(error)
        startFailures.set(key, `Start failed: ${detail}`)
        const message = `[dsh-skillhub] could not auto-start MCP service "${entry.name}": ${detail}`
        const logger = (agent.ctx as unknown as { logger?: { warn?: (text: string) => void } }).logger
        if (typeof logger?.warn === 'function') logger.warn(message)
        else console.warn(message)
      })
    }
  }
  const attach = (agent: Agent) => {
    if (disposed || !agent?.ctx || agents.has(agent)) return
    const scoped = agent.ctx.get('tools') as Tools | undefined
    if (!scoped) return
    const state = { lift: () => {}, guard: () => {}, signature: '[]', dispose: () => {} }
    agents.set(agent, state)
    state.guard = scoped.guard(exec => {
      // discover() runs on every exec so attribution always sees the live
      // server set, not a snapshot from attach time.
      const owner = attributeMcpTool(exec.name, discover())
      const identityOfAgent = identity(agent)
      return owner && hub.effectiveGate(owner, identityOfAgent.sessionId, identityOfAgent.folder).gate === 'off'
        ? 'This MCP service is hidden by SkillHub for this session.' : undefined
    })
    state.dispose = agent.ctx.effect(() => () => {
      agents.delete(agent)
      state.lift()
      state.guard()
      void releaseAgent(id(agent))
    }, 'skillhub MCP agent cleanup')
    refresh()
    autoStartApproved(agent)
  }
  const mount = async (agent: Agent, server: string, folder: string, variant: ProjectMcpVariant): Promise<void> => {
    const sessionId = id(agent)
    const key = mountKey(sessionId, server)
    const existing = mounted.get(key)
    if (existing !== undefined) {
      mounted.delete(key)
      await existing.dispose()
    }
    const module = await loadMcpClient()
    const namespace = module as { apply?: unknown; default?: unknown }
    const plugin = typeof namespace.apply === 'function' ? namespace : (namespace.default ?? namespace)
    const plug = agent.ctx.plugin.bind(agent.ctx) as unknown as
      (value: unknown, config: unknown) => Promise<{ dispose: () => unknown }>
    let fiber: { dispose: () => unknown }
    try {
      fiber = await plug(plugin, mcpClientConfig(server, variant, folder))
    } catch (error) {
      // Activation only resolves once the server is connected and its tools are
      // published, so a rejection here means nothing was mounted. The wrapper
      // keeps the readable prefix while `describeFailure` carries the cause.
      throw new Error(`Cannot start "${server}": ${describeFailure(error)}`)
    }
    startFailures.delete(key)
    mounted.set(key, {
      server,
      folder,
      source: variant.source,
      hash: variant.hash,
      dispose: async () => { try { await fiber.dispose() } catch { /* already gone */ } },
    })
  }
  const on = ctx.on.bind(ctx) as (event: string, fn: (...args: any[]) => void) => () => void
  const offChange = on('tools/change', refresh)
  const offCreated = on('agent/created', ({ agent }: { agent: Agent }) => attach(agent))
  // A session whose folder was not readable yet at creation gets another chance
  // as soon as it starts doing work. `agent/status` is an emit, so a listener
  // here cannot veto or delay a turn.
  const offStatus = on('agent/status', ({ agent }: { agent: Agent }) => autoStartApproved(agent))
  const registry = ctx.get('agents') as { list(): Agent[] } | undefined
  for (const agent of registry?.list() ?? []) attach(agent)
  ctx.effect(() => () => {
    disposed = true
    offChange(); offCreated(); offStatus()
    for (const state of agents.values()) { state.dispose(); state.lift(); state.guard() }
    agents.clear()
    autoStarted.clear()
    userStopped.clear()
    startFailures.clear()
    for (const entry of mounted.values()) void entry.dispose()
    mounted.clear()
  }, 'skillhub MCP visibility')
  const catalog = (query: McpCatalogQuery = {}) => {
    // A read is also the retry point for a session whose folder only became
    // known after creation; the guard makes this a set lookup afterwards.
    const sessionAgent = agentFor(query.sessionId)
    if (sessionAgent !== undefined) autoStartApproved(sessionAgent)
    const servers = discover()
    const result = hub.catalog(query, names(), servers)
    const folder = project === undefined ? undefined : folderFor(query)
    const declared = folder === undefined || folder === '' ? EMPTY_READ : readDeclared(folder)
    const trust = folder === undefined || folder === '' ? EMPTY_TRUST : trustOf(folder)
    const declaredByName = new Map(declared.servers.map(entry => [entry.name, entry]))
    /** Declaration problems plus the last start failure, as one warn list. */
    const problemsFor = (name: string, entry: { variants: readonly ProjectMcpVariant[] }): string[] => {
      const failure = startFailures.get(mountKey(query.sessionId, name))
      return failure === undefined ? declaredProblems(entry) : [...declaredProblems(entry), failure]
    }
    const failedFor = (name: string): boolean => startFailures.has(mountKey(query.sessionId, name))
    const views: McpServerView[] = result.servers.map(row => {
      const entry = declaredByName.get(row.name)
      const managed = mounted.has(mountKey(query.sessionId, row.name))
      // A live fiber is a connected server, so nothing failed here any more.
      if (managed) startFailures.delete(mountKey(query.sessionId, row.name))
      return {
        ...row,
        running: true,
        declared: entry !== undefined,
        managed,
        failed: failedFor(row.name),
        supported: managed || !problematic(row.name, servers, query.sessionId),
        ...entry !== undefined ? { variants: variantViews(entry, trust), problems: problemsFor(row.name, entry) } : {},
      }
    })
    for (const entry of declared.servers) {
      if (result.servers.some(row => row.name === entry.name)) continue
      const state = hub.effectiveGate(entry.name, query.sessionId, folder)
      // The mount itself is the authority on whether this service runs: the
      // discovery list is a scan that can lag a fiber that was just started, and
      // a running service must offer Stop and its real visibility, not the
      // "not started yet" shape.
      const managed = mounted.has(mountKey(query.sessionId, entry.name))
      views.push({
        name: entry.name,
        tools: 0,
        // A declared service that is not running is shown Off. Reporting the
        // stored visibility here read as "this service is on" while nothing had
        // been spawned, which is exactly the wrong signal before the user
        // approves the command. The stored value keeps its job once the service
        // runs; `startRequired` keeps the panel from offering a switch for it.
        gate: managed ? state.gate : 'off',
        source: state.source,
        running: managed,
        declared: true,
        managed,
        startRequired: !managed,
        failed: failedFor(entry.name),
        supported: true,
        variants: variantViews(entry, trust),
        problems: problemsFor(entry.name, entry),
      })
    }
    views.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))
    return { ...result, servers: views, declaredProblems: declared.problems }
  }
  return {
    attach,
    refresh,
    catalog,
    mutate(query: McpCatalogQuery, server: string, onValue?: boolean) {
      const servers = discover()
      const folder = project === undefined ? undefined : folderFor(query)
      const declared = folder === undefined || folder === '' ? EMPTY_READ : readDeclared(folder)
      if (!servers.includes(server) && !declared.servers.some(entry => entry.name === server)) {
        throw new Error('MCP service is not registered or declared here; refresh the list')
      }
      const managed = mounted.has(mountKey(query.sessionId, server))
      if (onValue === false && !managed && problematic(server, servers, query.sessionId)) {
        throw new Error('Cannot fully hide this service: ambiguous namespace or scope-local tools')
      }
      const request = { ...query, layer: query.layer ?? 'global', server }
      if (onValue === undefined) hub.inherit(request)
      else hub.toggle({ ...request, on: onValue })
      refresh()
      return catalog(query)
    },
    /**
     * Approve one declaration and mount it for this session.
     *
     * The approval is per exact declaration content: editing `command`, `args`,
     * `env`, `url`, or `headers` in the project file invalidates it and the user
     * is asked again. Nothing starts without this call, and once an approval
     * exists the service starts automatically when that folder's session opens.
     * @param query - layer/session/folder selection.
     * @param server - declared server name.
     * @param source - which declaration file to use when several declare the name.
     * @returns the refreshed catalog plus what happened.
     */
    async start(query: McpCatalogQuery, server: string, source?: string) {
      if (project === undefined) throw new Error('Project MCP support is not enabled')
      const agent = agentFor(query.sessionId)
      if (agent === undefined) throw new Error('An open chat is required to start a project MCP service')
      const folder = identity(agent).folder
      if (folder === undefined || folder === '') throw new Error('A workspace folder is required to start a project MCP service')
      const declared = readDeclared(folder).servers.find(entry => entry.name === server)
      if (declared === undefined) throw new Error(`MCP service "${server}" is not declared in this project`)
      const usable = declared.variants.filter(variant => !variant.disabled && variant.problems.length === 0)
      if (usable.length === 0) {
        const detail = declaredProblems(declared).join('; ')
        throw new Error(`Cannot start "${server}": ${detail === '' ? 'no usable declaration' : detail}`)
      }
      const variant = source === undefined ? usable[0] : usable.find(entry => entry.source === source)
      if (variant === undefined) throw new Error(`No startable declaration for "${server}" from "${source ?? ''}"`)
      approveMcpServer(project.storeDir, folder, server, variant.source, variant.hash)
      const key = mountKey(query.sessionId, server)
      userStopped.delete(key)
      try {
        await mount(agent, server, folder, variant)
      } catch (error) {
        // The approval stays: trust is a statement about the command, not about
        // whether it happens to run right now. The row explains the failure, and
        // the next 启动 retries from there.
        startFailures.set(key, `Start failed: ${describeFailure(error)}`)
        refresh()
        throw error
      }
      refresh()
      return { ...catalog(query), started: server, variant: renderVariant(variant) }
    },
    /**
     * Unmount a server SkillHub started; the approval record stays, and the stop
     * is remembered so reopening the session does not silently restart it.
     */
    async stop(query: McpCatalogQuery, server: string) {
      const key = mountKey(query.sessionId, server)
      userStopped.add(key)
      const entry = mounted.get(key)
      if (entry !== undefined) {
        mounted.delete(key)
        await entry.dispose()
      }
      refresh()
      return catalog(query)
    },
  }
}
