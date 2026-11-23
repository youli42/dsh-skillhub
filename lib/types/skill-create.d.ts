/** A Skill created by SkillHub in one of the two user homes. */
export interface CreateSkillInput {
    readonly name: string;
    readonly description: string;
    readonly whenToUse?: string;
    readonly body: string;
}
/** Limits keep one request from filling the homes with an unusable Skill. */
export declare const MAX_SKILL_BODY_BYTES: number;
/**
 * Render the frontmatter the shared catalog parser reads.
 *
 * Values are JSON-quoted, which is also valid YAML double-quoted scalar syntax;
 * a description containing a colon, a quote, or a leading indicator therefore
 * cannot change the document shape.
 * @param input - validated Skill fields.
 * @returns the complete SKILL.md text.
 */
export declare function renderSkillFile(input: CreateSkillInput): string;
/**
 * Validate the fields of one new Skill.
 * @param input - raw request body fields.
 * @returns the normalized fields.
 */
export declare function readCreateSkillInput(input: {
    readonly name?: unknown;
    readonly description?: unknown;
    readonly whenToUse?: unknown;
    readonly body?: unknown;
}): CreateSkillInput;
/**
 * Create one `<home>/<name>/SKILL.md` without replacing anything.
 *
 * The directory is created first and the file with `wx`, so a concurrent create
 * cannot overwrite an existing Skill. Any path this function created is removed
 * again when the write fails, which leaves a rejected request with no debris.
 * @param homeRoot - Agent home or DSH home root.
 * @param input - validated Skill fields.
 * @returns the created SKILL.md path.
 */
export declare function createSkill(homeRoot: string, input: CreateSkillInput): string;
/**
 * Refuse a pack that would install an empty folder.
 *
 * The existing installer linked any directory, so a typo produced a broken pack
 * row instead of an error at the moment the user chose the path. The check only
 * reads names; it never changes the source tree.
 * @param sourceDir - absolute or relative candidate folder.
 * @returns the number of Skills it appears to carry.
 */
export declare function assertSkillPack(sourceDir: string): number;
//# sourceMappingURL=skill-create.d.ts.map