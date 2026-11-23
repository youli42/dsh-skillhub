import type { Context } from '@deepseek-ai/cordis'
import type { McpManagedView } from './mcp.ts'
import {
  appendAudit, createManagedServer, deleteManagedServer, readAudit, readManagedStore,
  redactAuditText, setManagedServerEnabled, updateManagedServer,
  type AuditEntry, type ManagedFieldKind, type ManagedServerDefinition, type ManagedServerInput,
  type ManagedStoreDocument, type SecretWrite,
} from './managed-mcp-store.ts'

/** The subset of the harness MCP manager this plugin uses. */
interface ManagerStatusView {
  readonly name: string
  readonly configured: boolean
  readonly status?: unknown
}
interface ManagerLike {
  list(): readonly ManagerStatusView[]
  register(name: string, entry: Record<string, unknown>): () => void
  restart(name: string): Promise<void>
}
interface CredentialInfoLike {
  readonly configured: boolean
  readonly writable?: boolean
  readonly masked?: string
  readonly source?: string
}
interface CredentialsLike {
  describe(ref: string): Promise<CredentialInfoLike>
  set(ref: string, value: string): Promise<void>
  unset(ref: string): Promise<void>
}

/** One secret field as the panel sees it: presence and a masked preview only. */
export interface ManagedSecretView {
  readonly key: string
  readonly ref: string
  readonly configured: boolean
  readonly writable: boolean
  readonly masked?: string
}
export interface ManagedStatusView {
  readonly state: 'connected' | 'connecting' | 'reconnecting' | 'waiting-credentials' | 'failed' | 'closed' | 'disabled' | 'unavailable'
  readonly tools?: number
  readonly connectedAt?: number
  readonly attempt?: number
  readonly maxAttempts?: number
  readonly nextRetryAtMs?: number
  readonly reason?: string
  readonly error?: string
}
export interface ManagedServerView {
  readonly name: string
  readonly transport: 'stdio' | 'streamable-http'
  readonly command: string
  readonly args: readonly string[]
  readonly cwd: string
  readonly url: string
  readonly env: readonly ManagedSecretView[]
  readonly headers: readonly ManagedSecretView[]
  readonly enabled: boolean
  readonly revision: number
  readonly createdAt: string
  readonly updatedAt: string
  readonly status: ManagedStatusView
}
export interface ManagedListPayload {
  readonly available: boolean
  readonly revision: number
  readonly servers: readonly ManagedServerView[]
  readonly error?: string
}

const EMPTY_DOCUMENT: ManagedStoreDocument = { version: 1, revision: 0, servers: {} }

function statusOf(raw: unknown): ManagedStatusView {
  if (typeof raw !== 'object' || raw === null) return { state: 'connecting' }
  const value = raw as { state?: unknown; toolCount?: unknown; connectedAt?: unknown; attempt?: unknown; maxAttempts?: unknown; nextRetryAtMs?: unknown; reason?: unknown; lastError?: unknown; result?: unknown }
  const state = value.state
  if (state === 'connected') {
    return {
      state,
      ...typeof value.toolCount === 'number' ? { tools: value.toolCount } : {},
      ...typeof value.connectedAt === 'number' ? { connectedAt: value.connectedAt } : {},
    }
  }
  if (state === 'connecting') {
    return { state, ...typeof value.attempt === 'number' ? { attempt: value.attempt } : {} }
  }
  if (state === 'reconnecting') {
    return {
      state,
      ...typeof value.attempt === 'number' ? { attempt: value.attempt } : {},
      ...typeof value.maxAttempts === 'number' ? { maxAttempts: value.maxAttempts } : {},
      ...typeof value.nextRetryAtMs === 'number' ? { nextRetryAtMs: value.nextRetryAtMs } : {},
      ...typeof value.lastError === 'string' ? { error: redactAuditText(value.lastError) } : {},
    }
  }
  if (state === 'waiting-credentials') {
    return { state, ...typeof value.lastError === 'string' ? { error: redactAuditText(value.lastError) } : {} }
  }
  if (state === 'failed') {
    return {
      state,
      ...typeof value.reason === 'string' ? { reason: value.reason } : {},
      ...typeof value.lastError === 'string' ? { error: redactAuditText(value.lastError) } : {},
    }
  }
  if (state === 'closed') return { state }
  if (state === 'disabled') return { state }
  return { state: 'connecting' }
}

function urlHost(url: string): string | undefined {
  try { return new URL(url).host } catch { return undefined }
}

function entryOf(definition: ManagedServerDefinition): Record<string, unknown> {
  if (definition.transport === 'stdio') {
    return {
      transport: 'stdio',
      command: definition.command,
      args: [...definition.args],
      ...definition.cwd === '' ? {} : { cwd: definition.cwd },
      env: Object.fromEntries(Object.entries(definition.envRefs).map(([key, ref]) => [key, `\${credential:${ref}}`])),
    }
  }
  return {
    transport: 'streamable-http',
    url: definition.url,
    headers: Object.fromEntries(Object.entries(definition.headerRefs).map(([key, ref]) => [key, `\${credential:${ref}}`])),
  }
}

function signatureOf(definition: ManagedServerDefinition): string {
  return JSON.stringify(entryOf(definition))
}

function auditDetail(definition: ManagedServerDefinition, fields: readonly string[], secretRefs: readonly string[]): Omit<AuditEntry, 'at' | 'action' | 'result'> {
  return {
    transport: definition.transport,
    ...definition.command === '' ? {} : { command: definition.command },
    ...definition.args.length === 0 ? {} : { argCount: definition.args.length },
    ...urlHost(definition.url) === undefined ? {} : { urlHost: urlHost(definition.url) },
    fields,
    ...secretRefs.length === 0 ? {} : { secretRefs },
  }
}

/**
 * Owns the SkillHub-managed MCP fleet.
 *
 * The runtime is deliberately a thin adapter: the harness MCP manager mounts,
 * reconnects, and reports status, and the harness credential provider stores
 * values. SkillHub only persists definitions, registers them, and records what
 * changed. When either service is absent, the API reports the feature as
 * unavailable instead of falling back to a second process manager or a
 * plaintext vault.
 */
export class ManagedMcpRuntime {
  private manager: ManagerLike | undefined
  private credentials: CredentialsLike | undefined
  private disposers = new Map<string, { dispose: () => void; signature: string }>()
  private registrationErrors = new Map<string, string>()
  private tail: Promise<unknown> = Promise.resolve()
  private disposed = false

  constructor(readonly storeDir: string) {}

  /** Attach the harness services; safe to call again after a host reload. */
  attach(manager: ManagerLike, credentials?: CredentialsLike): void {
    this.manager = manager
    this.credentials = credentials
    this.disposed = false
    void this.enqueue(async () => { await this.syncNow() })
  }

  /** Withdraw every registration this runtime made. */
  detach(): void {
    this.disposed = true
    for (const entry of this.disposers.values()) {
      try { entry.dispose() } catch { /* manager already gone */ }
    }
    this.disposers.clear()
    this.manager = undefined
    this.credentials = undefined
  }

  private enqueue<T>(run: () => Promise<T>): Promise<T> {
    const next = this.tail.then(run, run)
    this.tail = next.then(() => undefined, () => undefined)
    return next
  }

  private read(): ManagedStoreDocument {
    return readManagedStore(this.storeDir)
  }

  private async syncNow(): Promise<void> {
    const manager = this.manager
    if (this.disposed || manager === undefined) return
    let document: ManagedStoreDocument
    try { document = this.read() } catch (error) {
      this.registrationErrors.set('*', redactAuditText(error))
      return
    }
    for (const name of [...this.registrationErrors.keys()]) {
      const next = document.servers[name]
      if (next === undefined || !next.enabled) this.registrationErrors.delete(name)
    }
    for (const [name, entry] of [...this.disposers]) {
      const next = document.servers[name]
      if (next !== undefined && next.enabled && entry.signature === signatureOf(next)) continue
      this.disposers.delete(name)
      try { entry.dispose() } catch { /* already removed */ }
    }
    for (const [name, definition] of Object.entries(document.servers)) {
      if (!definition.enabled || this.disposers.has(name)) continue
      try {
        const dispose = manager.register(name, entryOf(definition))
        this.disposers.set(name, { dispose, signature: signatureOf(definition) })
        this.registrationErrors.delete(name)
      } catch (error) {
        this.registrationErrors.set(name, redactAuditText(error))
      }
    }
  }

  private async describeFields(
    refs: Readonly<Record<string, string>>,
    kind: ManagedFieldKind,
  ): Promise<ManagedSecretView[]> {
    const entries = Object.entries(refs)
    const views: ManagedSecretView[] = []
    for (const [key, ref] of entries) {
      let info: CredentialInfoLike = { configured: false }
      if (this.credentials !== undefined) {
        try { info = await this.credentials.describe(ref) } catch { info = { configured: false } }
      }
      views.push({
        key,
        ref,
        configured: info.configured === true,
        writable: info.writable === true,
        ...info.masked === undefined ? {} : { masked: info.masked },
        ...info.source === undefined ? {} : { source: info.source },
      })
    }
    void kind
    return views
  }

  private statusFor(name: string, enabled: boolean): ManagedStatusView {
    if (this.manager === undefined) return { state: 'unavailable' }
    const error = this.registrationErrors.get(name)
    if (error !== undefined) return { state: 'failed', reason: 'register', error }
    const view = this.manager.list().find(entry => entry.name === name)
    if (view === undefined) return enabled ? { state: 'connecting' } : { state: 'disabled' }
    return statusOf(view.status)
  }

  /**
   * Read definitions plus live status. Secret values never cross this boundary.
   * @returns the current managed fleet.
   */
  async list(): Promise<ManagedListPayload> {
    let document: ManagedStoreDocument
    try { document = this.read() } catch (error) {
      return { available: this.manager !== undefined, revision: 0, servers: [], error: redactAuditText(error) }
    }
    const servers: ManagedServerView[] = []
    for (const [name, definition] of Object.entries(document.servers).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)) {
      servers.push({
        name,
        transport: definition.transport,
        command: definition.command,
        args: [...definition.args],
        cwd: definition.cwd,
        url: definition.url,
        env: await this.describeFields(definition.envRefs, 'env'),
        headers: await this.describeFields(definition.headerRefs, 'headers'),
        enabled: definition.enabled,
        revision: document.revision,
        createdAt: definition.createdAt,
        updatedAt: definition.updatedAt,
        status: this.statusFor(name, definition.enabled),
      })
    }
    return {
      available: this.manager !== undefined,
      revision: document.revision,
      servers,
      ...this.registrationErrors.size === 0 ? {} : { error: [...this.registrationErrors.values()][0] },
    }
  }

  /**
   * Read only the facts the shared MCP catalog needs, synchronously.
   *
   * The panel's catalog is a single synchronous read. Secret presence is not
   * needed there — the edit dialog asks for it — so this path skips the
   * credential provider entirely and cannot make a catalog read wait on it.
   * @returns one row per managed definition, with the manager's live status.
   */
  catalogRows(): McpManagedView[] {
    let document: ManagedStoreDocument
    try { document = this.read() } catch { return [] }
    return Object.entries(document.servers).map(([name, definition]) => {
      const status = this.statusFor(name, definition.enabled)
      return {
        name,
        enabled: definition.enabled,
        transport: definition.transport,
        status: status.state,
        ...status.error === undefined ? {} : { statusDetail: status.error },
        ...status.tools === undefined ? {} : { tools: status.tools },
        revision: document.revision,
      }
    })
  }

  private assertAvailable(): ManagerLike {
    if (this.manager === undefined) {
      throw new Error('MCP manager is not available in this DSH build; managed MCP servers need DSH 0.2.2 or later')
    }
    return this.manager
  }

  private assertNameFree(name: string): void {
    const existing = this.manager?.list().find(entry => entry.name === name)
    if (existing !== undefined) {
      throw new Error(`an MCP server named "${name}" is already configured or registered by DSH`)
    }
  }

  private async writeSecrets(server: string, writes: readonly SecretWrite[]): Promise<void> {
    if (writes.length === 0) return
    if (this.credentials === undefined) {
      throw new Error('credential provider is not available; secrets were not stored')
    }
    for (const write of writes) {
      if (write.value === undefined) continue
      await this.credentials.set(write.ref, write.value)
      appendAudit(this.storeDir, {
        at: new Date().toISOString(),
        action: 'secret.set',
        server,
        result: 'ok',
        secretRefs: [write.ref],
      })
    }
  }

  private async clearSecrets(server: string, refs: readonly string[]): Promise<void> {
    if (refs.length === 0 || this.credentials === undefined) return
    for (const ref of refs) {
      try { await this.credentials.unset(ref) } catch { /* a missing value is already cleared */ }
      appendAudit(this.storeDir, {
        at: new Date().toISOString(),
        action: 'secret.clear',
        server,
        result: 'ok',
        secretRefs: [ref],
      })
    }
  }

  private audit(
    action: string,
    server: string,
    definition: ManagedServerDefinition,
    fields: readonly string[],
    secretRefs: readonly string[],
    result: 'ok' | 'error',
    error?: unknown,
  ): void {
    const detail = auditDetail(definition, fields, secretRefs)
    appendAudit(this.storeDir, {
      at: new Date().toISOString(),
      action,
      server,
      result,
      ...detail,
      ...error === undefined ? {} : { error: redactAuditText(error) },
    } as AuditEntry)
  }

  /**
   * Create one server, store its secrets, and register it.
   * @param input - request fields.
   * @returns the refreshed fleet.
   */
  async create(input: ManagedServerInput): Promise<ManagedListPayload> {
    return await this.enqueue(async () => {
      this.assertAvailable()
      this.assertNameFree(input.name)
      const prepared = createManagedServer(this.storeDir, input)
      try {
        await this.writeSecrets(input.name, prepared.secrets)
        await this.syncNow()
        this.audit('server.create', input.name, prepared.definition, prepared.fields, prepared.secrets.map(write => write.ref), 'ok')
      } catch (error) {
        this.registrationErrors.set(input.name, redactAuditText(error))
        this.audit('server.create', input.name, prepared.definition, prepared.fields, prepared.secrets.map(write => write.ref), 'error', error)
        throw error
      }
      return await this.list()
    })
  }

  /**
   * Update one server and reconcile its registration.
   * @param name - server name, immutable.
   * @param input - request fields.
   * @returns the refreshed fleet.
   */
  async update(name: string, input: ManagedServerInput): Promise<ManagedListPayload> {
    return await this.enqueue(async () => {
      this.assertAvailable()
      const prepared = updateManagedServer(this.storeDir, name, input)
      try {
        await this.writeSecrets(name, prepared.secrets)
        await this.clearSecrets(name, prepared.removedRefs)
        await this.syncNow()
        this.audit('server.update', name, prepared.definition, prepared.fields, prepared.secrets.map(write => write.ref), 'ok')
      } catch (error) {
        this.registrationErrors.set(name, redactAuditText(error))
        this.audit('server.update', name, prepared.definition, prepared.fields, prepared.secrets.map(write => write.ref), 'error', error)
        throw error
      }
      return await this.list()
    })
  }

  /**
   * Remove one server, its registration, and its credential references.
   * @param name - server name.
   * @returns the refreshed fleet.
   */
  async remove(name: string, expectedRevision?: number): Promise<ManagedListPayload> {
    return await this.enqueue(async () => {
      this.assertAvailable()
      // Remove the definition first: a stale revision must not leave the
      // service stopped while its configuration still claims to exist.
      const removed = deleteManagedServer(this.storeDir, name, expectedRevision)
      this.registrationErrors.delete(name)
      const entry = this.disposers.get(name)
      if (entry !== undefined) {
        this.disposers.delete(name)
        try { entry.dispose() } catch { /* manager already removed it */ }
      }
      await this.clearSecrets(name, removed.removedRefs)
      this.audit('server.delete', name, removed.definition, [], removed.removedRefs, 'ok')
      await this.syncNow()
      return await this.list()
    })
  }

  /**
   * Change durable run intent.
   * @param name - server name.
   * @param enabled - whether the manager should run it.
   * @returns the refreshed fleet.
   */
  async setEnabled(name: string, enabled: boolean, expectedRevision?: number): Promise<ManagedListPayload> {
    return await this.enqueue(async () => {
      this.assertAvailable()
      const changed = setManagedServerEnabled(this.storeDir, name, enabled, expectedRevision)
      await this.syncNow()
      this.audit(enabled ? 'server.enable' : 'server.disable', name, changed.definition, ['enabled'], [], 'ok')
      return await this.list()
    })
  }

  /**
   * Rebuild one registration, resetting its reconnect budget.
   * @param name - server name.
   * @returns the refreshed fleet.
   */
  async restart(name: string): Promise<ManagedListPayload> {
    return await this.enqueue(async () => {
      const manager = this.assertAvailable()
      const definition = this.read().servers[name]
      if (definition === undefined) throw new Error(`MCP server "${name}" does not exist`)
      await manager.restart(name)
      this.audit('server.restart', name, definition, [], [], 'ok')
      return await this.list()
    })
  }

  /**
   * Read the redacted operation trail.
   * @param server - optional server filter.
   * @param limit - maximum records.
   * @returns newest records last.
   */
  auditTrail(server?: string, limit?: number): AuditEntry[] {
    return readAudit(this.storeDir, { ...server === undefined ? {} : { server }, ...limit === undefined ? {} : { limit } })
  }
}

/**
 * Attach a runtime to whichever optional harness services are present.
 * @param ctx - plugin context.
 * @param runtime - runtime to attach.
 * @returns a disposer that detaches the runtime.
 */
export function attachManagedMcp(ctx: Context, runtime: ManagedMcpRuntime): () => void {
  let detach: (() => void) | undefined
  const fiber = ctx.inject(['mcpManager'], inner => {
    const manager = inner.get('mcpManager') as ManagerLike | undefined
    if (manager === undefined) return
    detach = inner.effect(() => {
      const credentials = (() => {
        try { return inner.get('credentials') as CredentialsLike | undefined } catch { return undefined }
      })()
      runtime.attach(manager, credentials)
      return () => { runtime.detach() }
    }, 'dsh-skillhub managed MCP services')
  })
  return () => { detach?.(); void fiber.dispose() }
}
