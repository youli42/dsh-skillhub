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
export type ProjectMcpSource = 'mcp-json' | 'opencode-json';
export declare const DEFAULT_PROJECT_MCP_FILES: readonly string[];
export type McpTransport = 'stdio' | 'streamable-http';
/** One server as declared by one file. A name may have several variants. */
export interface ProjectMcpVariant {
    readonly source: ProjectMcpSource;
    /** Absolute declaration file path. */
    readonly file: string;
    readonly transport: McpTransport;
    readonly command?: string;
    readonly args: readonly string[];
    readonly env?: Readonly<Record<string, string>>;
    readonly url?: string;
    readonly headers?: Readonly<Record<string, string>>;
    /** Declared `enabled: false`; shown but never startable. */
    readonly disabled: boolean;
    /** Reasons this variant would fail to start, already human-readable. */
    readonly problems: readonly string[];
    /** Hash over the run-relevant fields; approval is valid only for this value. */
    readonly hash: string;
}
export interface ProjectMcpServer {
    readonly name: string;
    readonly variants: readonly ProjectMcpVariant[];
}
export interface ProjectMcpRead {
    readonly servers: readonly ProjectMcpServer[];
    /** File-level problems: missing JSON, invalid shape, rejected server name. */
    readonly problems: readonly string[];
}
export interface ProjectMcpTrust {
    readonly version: 1;
    readonly servers: Readonly<Record<string, {
        source: ProjectMcpSource;
        hash: string;
        approvedAt: string;
    }>>;
}
/**
 * Locate a stdio command the way a shell would. Used only for diagnostics — the
 * MCP SDK spawns through cross-spawn, which does its own PATH/PATHEXT lookup, so
 * the declaration is passed through unchanged.
 * @param command - declared executable.
 * @returns the absolute launcher when one is found.
 */
export declare function resolveExecutable(command: string): string | undefined;
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
export declare function argumentProblem(arg: string, cwd: string): string | undefined;
/**
 * Read every project declaration file for one working directory.
 * @param cwd - session working directory.
 * @param files - relative declaration files; defaults to `.mcp.json` and `.opencode/opencode.json`.
 * @returns servers merged by name, with per-variant problems, plus file problems.
 */
export declare function readProjectMcp(cwd: string, files?: readonly string[]): ProjectMcpRead;
/** Stable key for one folder's trust document. */
export declare function folderTrustKey(folder: string): string;
/** Where one folder's MCP approvals live. */
export declare function mcpTrustPath(storeDir: string, folder: string): string;
/** Read one folder's approvals; a corrupt file reads as empty rather than throwing. */
export declare function readMcpTrust(storeDir: string, folder: string): ProjectMcpTrust;
/** Record one approval for one exact variant hash. */
export declare function approveMcpServer(storeDir: string, folder: string, name: string, source: ProjectMcpSource, hash: string): ProjectMcpTrust;
/** Drop one approval, for example after the user stops a server. */
export declare function revokeMcpServer(storeDir: string, folder: string, name: string): ProjectMcpTrust;
/** Whether one variant has an approval recorded for its exact current content. */
export declare function isApproved(trust: ProjectMcpTrust, variant: ProjectMcpVariant, name: string): boolean;
export interface McpClientConfig {
    readonly serverName: string;
    readonly transport: McpTransport;
    readonly command?: string;
    readonly args?: readonly string[];
    readonly env?: Readonly<Record<string, string>>;
    readonly cwd?: string;
    readonly url?: string;
    readonly headers?: Readonly<Record<string, string>>;
    readonly failOnStartupError: boolean;
}
/**
 * Build the `@deepseek-ai/dsh-mcp-client` config for one variant.
 *
 * `cwd` is always the session folder so a relative argument such as
 * `./Test_DreamShader.uproject` resolves exactly as it does for the other agent.
 * @param name - server name, which becomes the `mcp__<name>__` tool namespace.
 * @param variant - approved declaration.
 * @param folder - session working directory.
 * @returns the config to mount.
 */
export declare function mcpClientConfig(name: string, variant: ProjectMcpVariant, folder: string): McpClientConfig;
/** Whether a path is a regular file, without following a broken link into a throw. */
export declare function isReadableFile(path: string): boolean;
//# sourceMappingURL=project-mcp.d.ts.map