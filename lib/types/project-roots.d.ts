/**
 * Project skill roots.
 *
 * A project keeps its Skills inside the agent-config folders of the editor or
 * agent that owns them: `.agents/skills` (the shared Agent convention DSH also
 * reads), `.opencode/skills` (OpenCode), and `.claude/skills` (Claude Code).
 * SkillHub reads all three from the session working directory so one panel can
 * switch the Skills of every agent the user runs in that project.
 *
 * Discovery is one level deep, exactly like `@deepseek-ai/dsh-skill-filesystem`:
 * `<root>/<name>/SKILL.md` or a flat `<root>/<name>.md`. A nested `SKILL.md` is
 * deliberately never discovered, because DSH's own provider does not see it and
 * a switch for a Skill the model cannot load would be a lie.
 */
/** Which agent convention a project root belongs to. */
export type ProjectRootKind = 'agents' | 'opencode' | 'claude' | 'custom';
/** One project skill root that exists on disk. */
export interface ProjectRootSpec {
    readonly kind: ProjectRootKind;
    /** Candidate source label, also what the panel shows. */
    readonly source: string;
    /**
     * Candidate rank. Every project root must stay below the filesystem
     * provider's project ranks (100 `.dsh/skills`, 200 `.agents/skills`) so that a
     * project candidate SkillHub reports wins the name within the agent layer.
     * Losing the name would let the built-in provider refill a Skill the user
     * turned Off.
     */
    readonly rank: number;
    /** Absolute directory that holds `<name>/SKILL.md` entries. */
    readonly dir: string;
    /** Folder name shown in the tree, including the leading dot. */
    readonly label: string;
}
/**
 * Candidate rank per origin. Project roots stay in a band below the filesystem
 * provider's project ranks (100 `<root>/.dsh/skills`, 200 `<root>/.agents/skills`)
 * so a project candidate SkillHub reports wins the name inside the agent layer;
 * losing the name would let the built-in provider refill a Skill the user turned
 * Off. User-home ranks keep the historical values, which sit below that
 * provider's user ranks (400/500).
 */
export declare const ORIGIN_RANKS: Readonly<Record<string, number>>;
/**
 * Tie-break order for two candidates that share a name inside one class. Lower
 * wins. Mirrors which agent convention owns the name on disk when both files
 * exist, and matches DSH's own project-before-user precedence.
 */
export declare const ORIGIN_PRIORITY: Readonly<Record<string, number>>;
/** Rank for one discovery origin; unknown origins fall back to the user band. */
export declare function originRank(origin: string): number;
/** Same-class tie-break priority for one discovery origin. */
export declare function originPriority(origin: string): number;
export declare const DEFAULT_PROJECT_SKILL_ROOTS: readonly string[];
/**
 * Resolve the project skill roots that exist for one working directory.
 *
 * Only the exact directory is scanned: the caller's cwd is the project, so a
 * session opened in a subdirectory does not silently inherit its parent's
 * project Skills. Missing directories are simply absent — an empty project is
 * valid state, not an error.
 * @param cwd - session working directory, already resolved by the caller.
 * @param configured - relative root directories; defaults to the three conventions.
 * @returns existing roots in winner order, deduplicated by absolute path.
 */
export declare function projectSkillRoots(cwd: string, configured?: readonly string[]): ProjectRootSpec[];
/** Whether a candidate source label belongs to a project root. */
export declare function isProjectSource(source: string | undefined): boolean;
/** Paths SkillHub refuses to walk inside a root, matching the home walker. */
export declare const PROJECT_IGNORE: Set<string>;
/** Absolute path of one root's entry, used for ids and diagnostics. */
export declare function rootEntry(root: ProjectRootSpec, name: string): string;
/** Existing-file check that never follows a broken link into a throw. */
export declare function isFile(path: string): boolean;
//# sourceMappingURL=project-roots.d.ts.map