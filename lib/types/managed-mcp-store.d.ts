/**
 * SkillHub-managed MCP servers.
 *
 * A definition never contains a secret: environment values and headers are
 * stored as credential references, and the values live in the harness
 * credential provider. This module owns validation, the on-disk document, and
 * the redacted audit trail. It does not start anything; the runtime registers
 * definitions with the harness MCP manager.
 */
export type ManagedTransport = 'stdio' | 'streamable-http';
export type ManagedFieldKind = 'env' | 'headers';
export interface SecretFieldInput {
    readonly key: string;
    readonly value?: string;
    readonly clear?: boolean;
}
export interface ManagedServerInput {
    readonly name: string;
    readonly transport: ManagedTransport;
    readonly command?: string;
    readonly args?: readonly string[];
    readonly cwd?: string;
    readonly url?: string;
    readonly env?: readonly SecretFieldInput[];
    readonly headers?: readonly SecretFieldInput[];
    readonly enabled?: boolean;
    readonly expectedRevision?: number;
}
export interface ManagedServerDefinition {
    readonly transport: ManagedTransport;
    readonly command: string;
    readonly args: readonly string[];
    readonly cwd: string;
    readonly url: string;
    /** Environment variable name to credential reference. */
    readonly envRefs: Readonly<Record<string, string>>;
    /** Header name to credential reference. */
    readonly headerRefs: Readonly<Record<string, string>>;
    readonly enabled: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
}
export interface ManagedStoreDocument {
    readonly version: 1;
    readonly revision: number;
    readonly servers: Readonly<Record<string, ManagedServerDefinition>>;
}
export interface SecretWrite {
    readonly kind: ManagedFieldKind;
    readonly key: string;
    readonly ref: string;
    /** Present when a new value must be stored; absent means leave the value alone. */
    readonly value?: string;
}
export interface PreparedServer {
    readonly document: ManagedStoreDocument;
    readonly definition: ManagedServerDefinition;
    readonly secrets: readonly SecretWrite[];
    readonly removedRefs: readonly string[];
    readonly fields: readonly string[];
}
export interface AuditEntry {
    readonly at: string;
    readonly action: string;
    readonly server?: string;
    readonly transport?: ManagedTransport;
    readonly command?: string;
    readonly argCount?: number;
    readonly urlHost?: string;
    readonly fields?: readonly string[];
    readonly secretRefs?: readonly string[];
    readonly result: 'ok' | 'error';
    readonly error?: string;
}
/**
 * Read the managed-server document.
 * @param storeDir - SkillHub store root.
 * @returns an empty document when none was written yet.
 * @throws when the file exists but does not match the supported shape.
 */
export declare function readManagedStore(storeDir: string): ManagedStoreDocument;
/**
 * Create one definition and persist it. Secrets are written by the caller,
 * because the credential provider is an async service.
 * @param storeDir - SkillHub store root.
 * @param input - validated request fields.
 * @returns the document and the secret values to store.
 */
export declare function createManagedServer(storeDir: string, input: ManagedServerInput): PreparedServer;
/**
 * Update one definition. The name is immutable; every other field may change.
 * Existing references are reused by key, so editing a non-secret field does
 * not rotate a secret, and a removed row releases its reference.
 * @param storeDir - SkillHub store root.
 * @param name - existing server name.
 * @param input - validated request fields.
 * @returns the updated document, secret writes, and released references.
 */
export declare function updateManagedServer(storeDir: string, name: string, input: ManagedServerInput): PreparedServer;
/**
 * Remove one definition and report the references its caller must release.
 * @param storeDir - SkillHub store root.
 * @param name - server to remove.
 * @param expectedRevision - optional revision check.
 * @returns the removed definition and the remaining document.
 */
export declare function deleteManagedServer(storeDir: string, name: string, expectedRevision?: number): {
    definition: ManagedServerDefinition;
    document: ManagedStoreDocument;
    removedRefs: string[];
};
/**
 * Persist the durable run intent for one managed server.
 * @param storeDir - SkillHub store root.
 * @param name - server to change.
 * @param enabled - whether the manager should keep an instance mounted.
 * @param expectedRevision - optional revision check.
 * @returns the updated definition.
 */
export declare function setManagedServerEnabled(storeDir: string, name: string, enabled: boolean, expectedRevision?: number): {
    definition: ManagedServerDefinition;
    document: ManagedStoreDocument;
};
/**
 * Append one redacted audit record. Rotation keeps the newest file bounded;
 * the caller is responsible for never putting a secret value in the entry.
 * @param storeDir - SkillHub store root.
 * @param entry - record to append.
 */
export declare function appendAudit(storeDir: string, entry: AuditEntry): void;
/**
 * Read recent audit records, newest last.
 * @param storeDir - SkillHub store root.
 * @param options - limit and optional server filter.
 * @returns parsed records; malformed lines are skipped.
 */
export declare function readAudit(storeDir: string, options?: {
    limit?: number;
    server?: string;
}): AuditEntry[];
/**
 * Keep diagnostics useful without echoing credentials. This is a last line of
 * defence: callers must not pass secret values in the first place.
 * @param error - thrown value or diagnostic text.
 * @returns a bounded, redacted sentence.
 */
export declare function redactAuditText(error: unknown): string;
//# sourceMappingURL=managed-mcp-store.d.ts.map