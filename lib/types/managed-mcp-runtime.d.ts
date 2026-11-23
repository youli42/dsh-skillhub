import type { Context } from '@deepseek-ai/cordis';
import type { McpManagedView } from './mcp.ts';
import { type AuditEntry, type ManagedServerInput } from './managed-mcp-store.ts';
/** The subset of the harness MCP manager this plugin uses. */
interface ManagerStatusView {
    readonly name: string;
    readonly configured: boolean;
    readonly status?: unknown;
}
interface ManagerLike {
    list(): readonly ManagerStatusView[];
    register(name: string, entry: Record<string, unknown>): () => void;
    restart(name: string): Promise<void>;
}
interface CredentialInfoLike {
    readonly configured: boolean;
    readonly writable?: boolean;
    readonly masked?: string;
    readonly source?: string;
}
interface CredentialsLike {
    describe(ref: string): Promise<CredentialInfoLike>;
    set(ref: string, value: string): Promise<void>;
    unset(ref: string): Promise<void>;
}
/** One secret field as the panel sees it: presence and a masked preview only. */
export interface ManagedSecretView {
    readonly key: string;
    readonly ref: string;
    readonly configured: boolean;
    readonly writable: boolean;
    readonly masked?: string;
}
export interface ManagedStatusView {
    readonly state: 'connected' | 'connecting' | 'reconnecting' | 'waiting-credentials' | 'failed' | 'closed' | 'disabled' | 'unavailable';
    readonly tools?: number;
    readonly connectedAt?: number;
    readonly attempt?: number;
    readonly maxAttempts?: number;
    readonly nextRetryAtMs?: number;
    readonly reason?: string;
    readonly error?: string;
}
export interface ManagedServerView {
    readonly name: string;
    readonly transport: 'stdio' | 'streamable-http';
    readonly command: string;
    readonly args: readonly string[];
    readonly cwd: string;
    readonly url: string;
    readonly env: readonly ManagedSecretView[];
    readonly headers: readonly ManagedSecretView[];
    readonly enabled: boolean;
    readonly revision: number;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly status: ManagedStatusView;
}
export interface ManagedListPayload {
    readonly available: boolean;
    readonly revision: number;
    readonly servers: readonly ManagedServerView[];
    readonly error?: string;
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
export declare class ManagedMcpRuntime {
    readonly storeDir: string;
    private manager;
    private credentials;
    private disposers;
    private registrationErrors;
    private tail;
    private disposed;
    constructor(storeDir: string);
    /** Attach the harness services; safe to call again after a host reload. */
    attach(manager: ManagerLike, credentials?: CredentialsLike): void;
    /** Withdraw every registration this runtime made. */
    detach(): void;
    private enqueue;
    private read;
    private syncNow;
    private describeFields;
    private statusFor;
    /**
     * Read definitions plus live status. Secret values never cross this boundary.
     * @returns the current managed fleet.
     */
    list(): Promise<ManagedListPayload>;
    /**
     * Read only the facts the shared MCP catalog needs, synchronously.
     *
     * The panel's catalog is a single synchronous read. Secret presence is not
     * needed there — the edit dialog asks for it — so this path skips the
     * credential provider entirely and cannot make a catalog read wait on it.
     * @returns one row per managed definition, with the manager's live status.
     */
    catalogRows(): McpManagedView[];
    private assertAvailable;
    private assertNameFree;
    private writeSecrets;
    private clearSecrets;
    private audit;
    /**
     * Create one server, store its secrets, and register it.
     * @param input - request fields.
     * @returns the refreshed fleet.
     */
    create(input: ManagedServerInput): Promise<ManagedListPayload>;
    /**
     * Update one server and reconcile its registration.
     * @param name - server name, immutable.
     * @param input - request fields.
     * @returns the refreshed fleet.
     */
    update(name: string, input: ManagedServerInput): Promise<ManagedListPayload>;
    /**
     * Remove one server, its registration, and its credential references.
     * @param name - server name.
     * @returns the refreshed fleet.
     */
    remove(name: string, expectedRevision?: number): Promise<ManagedListPayload>;
    /**
     * Change durable run intent.
     * @param name - server name.
     * @param enabled - whether the manager should run it.
     * @returns the refreshed fleet.
     */
    setEnabled(name: string, enabled: boolean, expectedRevision?: number): Promise<ManagedListPayload>;
    /**
     * Rebuild one registration, resetting its reconnect budget.
     * @param name - server name.
     * @returns the refreshed fleet.
     */
    restart(name: string): Promise<ManagedListPayload>;
    /**
     * Read the redacted operation trail.
     * @param server - optional server filter.
     * @param limit - maximum records.
     * @returns newest records last.
     */
    auditTrail(server?: string, limit?: number): AuditEntry[];
}
/**
 * Attach a runtime to whichever optional harness services are present.
 * @param ctx - plugin context.
 * @param runtime - runtime to attach.
 * @returns a disposer that detaches the runtime.
 */
export declare function attachManagedMcp(ctx: Context, runtime: ManagedMcpRuntime): () => void;
export {};
//# sourceMappingURL=managed-mcp-runtime.d.ts.map