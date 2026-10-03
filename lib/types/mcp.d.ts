import { type PropagationMetadata } from './propagation.ts';
export type McpLayer = 'global' | 'project' | 'session';
export type McpGate = 'on' | 'off';
export type McpLayerGate = McpGate | 'inherit';
export interface McpVisibilityDocument extends PropagationMetadata {
    readonly version: 2;
    readonly default: McpLayerGate;
    readonly gates: Readonly<Record<string, McpLayerGate>>;
}
/**
 * One declared way to start a server. A project may declare the same server name
 * in more than one file (`.mcp.json` and `.opencode/opencode.json`), so the
 * panel lists every variant and the user picks the one that runs.
 */
export interface McpVariantView {
    /** Declaration source: `mcp-json` or `opencode-json`. */
    readonly source: string;
    readonly transport: string;
    /** Rendered command line, or the endpoint URL for HTTP. */
    readonly command: string;
    /** Approval exists for this exact declaration content. */
    readonly approved: boolean;
    /** Nothing in this variant would stop it from starting. */
    readonly startable: boolean;
    readonly problems: readonly string[];
}
export interface McpServerView {
    readonly name: string;
    readonly tools: number;
    readonly gate: McpGate;
    readonly source: McpLayer;
    /** A live `mcp-client` fiber exists in this session. */
    readonly running?: boolean;
    /** Declared by a project file for this folder. */
    readonly declared?: boolean;
    /** SkillHub mounted it for this session, so hiding it is provably complete. */
    readonly managed?: boolean;
    /**
     * Declared for this folder but not running: the user has to approve and start
     * it before its visibility can mean anything, so the panel shows it Off and
     * offers no switch.
     */
    readonly startRequired?: boolean;
    /**
     * The last start of this session failed: the service was approved but never
     * connected. Its reason is in `problems`, and the row marks it so a failure is
     * scannable rather than hidden among declaration warnings.
     */
    readonly failed?: boolean;
    /** Hiding it through the public tool API removes every one of its tools. */
    readonly supported?: boolean;
    /** Declared ways to start it, in priority order. */
    readonly variants?: readonly McpVariantView[];
    /** Aggregated declaration problems, already human-readable. */
    readonly problems?: readonly string[];
}
export interface McpCatalogQuery {
    readonly sessionId?: string;
    readonly folder?: string;
    readonly layer?: McpLayer;
}
export interface McpToggle {
    readonly layer: McpLayer;
    readonly sessionId?: string;
    readonly folder?: string;
    readonly server: string;
    readonly on: boolean;
}
export interface McpToggleAll {
    readonly layer: McpLayer;
    readonly sessionId?: string;
    readonly folder?: string;
    readonly on: boolean;
}
export interface McpInherit {
    readonly layer: McpLayer;
    readonly sessionId?: string;
    readonly folder?: string;
    readonly server: string;
}
export interface McpInheritAll {
    readonly layer: McpLayer;
    readonly sessionId?: string;
    readonly folder?: string;
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
export declare function attributeMcpTool(name: string, servers: readonly string[]): string | undefined;
export declare function serversFromToolNames(names: readonly string[], servers: readonly string[]): Map<string, number>;
export declare function computeDenyList(toolNames: readonly string[], hidden: ReadonlySet<string>, servers: readonly string[]): string[];
export declare class McpHub {
    readonly paths: {
        readonly storeDir: string;
    };
    constructor(paths: {
        readonly storeDir: string;
    });
    private globalPath;
    private projectPath;
    private sessionPath;
    private documentPath;
    effectiveGate(server: string, sessionId?: string, folder?: string): {
        gate: McpGate;
        source: McpLayer;
    };
    hiddenServers(sessionId?: string, folder?: string, servers?: readonly string[]): Set<string>;
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
    private gateState;
    catalog(query?: McpCatalogQuery, toolNames?: readonly string[], servers?: readonly string[]): {
        servers: McpServerView[];
        layer: McpLayer;
    };
    toggle(request: McpToggle): void;
    inherit(request: McpInherit): void;
}
//# sourceMappingURL=mcp.d.ts.map