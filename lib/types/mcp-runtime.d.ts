import type { Context } from '@deepseek-ai/cordis';
import { McpHub, type McpCatalogQuery, type McpServerView } from './mcp.ts';
import { type ProjectMcpRead } from './project-mcp.ts';
interface Agent {
    id: string;
    ctx: Context;
    session?: {
        id?: string;
        header?: {
            id?: string;
            cwd?: string;
        };
    };
}
/** Project-level MCP support for the session that opened a workspace. */
export interface ProjectMcpOptions {
    /** Store directory holding `mcp-trust/<folderHash>.json`. */
    readonly storeDir: string;
    /** Declaration files, relative to the session folder. */
    readonly files?: readonly string[];
    /** Test seam: read declarations without touching disk. */
    readonly read?: (folder: string, files: readonly string[]) => ProjectMcpRead;
    /**
     * Start declarations this folder has already approved as soon as a session
     * opens. Only an approval recorded for the exact declaration content starts
     * anything: an untrusted command still waits for the user.
     */
    readonly autoStart?: boolean;
}
/** Uses public Cordis fiber configuration; only serverName leaves this function. */
export declare function liveMcpServers(ctx: Context): string[];
export declare function installMcpVisibility(ctx: Context, hub: McpHub, discover?: () => string[], project?: ProjectMcpOptions): {
    attach: (agent: Agent) => void;
    refresh: () => void;
    catalog: (query?: McpCatalogQuery) => {
        servers: McpServerView[];
        declaredProblems: readonly string[];
        layer: import("./mcp.ts").McpLayer;
    };
    mutate(query: McpCatalogQuery, server: string, onValue?: boolean): {
        servers: McpServerView[];
        declaredProblems: readonly string[];
        layer: import("./mcp.ts").McpLayer;
    };
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
    start(query: McpCatalogQuery, server: string, source?: string): Promise<{
        started: string;
        variant: string;
        servers: McpServerView[];
        declaredProblems: readonly string[];
        layer: import("./mcp.ts").McpLayer;
    }>;
    /**
     * Unmount a server SkillHub started; the approval record stays, and the stop
     * is remembered so reopening the session does not silently restart it.
     */
    stop(query: McpCatalogQuery, server: string): Promise<{
        servers: McpServerView[];
        declaredProblems: readonly string[];
        layer: import("./mcp.ts").McpLayer;
    }>;
};
export {};
//# sourceMappingURL=mcp-runtime.d.ts.map