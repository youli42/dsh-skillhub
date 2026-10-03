import type { Context, Volatile } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { SkillHub } from './hub.ts';
export declare const name = "dsh-skillhub";
export declare const inject: string[];
export interface Config {
    /** Profile field. A settings edit is stored immediately and read on the next Host load. */
    enabled: Volatile<boolean>;
    /**
     * Project skill roots, relative to the session working directory. Defaults to
     * `.agents/skills`, `.opencode/skills`, and `.claude/skills`; an empty list
     * turns project Skills off entirely.
     */
    projectSkillRoots: string[];
    /**
     * Project MCP declaration files, relative to the session working directory.
     * Defaults to `.mcp.json` and `.opencode/opencode.json`.
     */
    projectMcpFiles: string[];
    /**
     * Start project-declared MCP services whose exact command was already approved
     * when a session opens. An unapproved declaration still waits for the user.
     */
    autoStartTrustedMcp: boolean;
}
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    enabled: z<boolean, boolean, "volatile-defined">;
    projectSkillRoots: z<string[], string[], "defined">;
    projectMcpFiles: z<string[], string[], "defined">;
    autoStartTrustedMcp: z<boolean, boolean, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    enabled: z<boolean, boolean, "volatile-defined">;
    projectSkillRoots: z<string[], string[], "defined">;
    projectMcpFiles: z<string[], string[], "defined">;
    autoStartTrustedMcp: z<boolean, boolean, "defined">;
}>>, "plain">;
export declare function apply(ctx: Context, config: Config): void;
export declare function attachAgentProvider(owner: Context, hub: SkillHub, payload: unknown): void;
//# sourceMappingURL=dsh-skillhub.d.ts.map