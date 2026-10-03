# Project Skills and declared project MCP belong to the workspace

Supersedes the "no repository roots" half of [ADR 0001](0001-only-installed-homes.md). ADR 0001's rule — a Skill exists only once it is installed into `~/.agents/skills` or `~/.dsh/skills` — still holds for the two user homes; what changes is that the session's own workspace may also carry Skills and MCP declarations, and SkillHub now lists and switches them.

## Project Skill roots

SkillHub reads three project roots **relative to the session working directory**, one level deep (`<root>/<name>/SKILL.md` or a flat `<root>/<name>.md`), exactly like `@deepseek-ai/dsh-skill-filesystem`:

| Root | Origin | Candidate rank |
|---|---|---|
| `.agents/skills` | `project-agents` | 90 |
| `.opencode/skills` | `project-opencode` | 91 |
| `.claude/skills` | `project-claude` | 92 |

`projectSkillRoots` in the plugin Config replaces the list and an empty list turns project Skills off.

**Why the working directory and not the nearest `.git`.** DSH's own provider resolves `<projectRoot>` by climbing to the nearest `.git` (OpenCode climbs to the git worktree the same way). SkillHub deliberately reads the session's exact working directory instead: it must show the Skills of the workspace the user actually opened, and a session in a subdirectory must not silently inherit a parent project's Skill switches. The consequence is accepted: opening a subdirectory shows no project Skills, while DSH's provider may still advertise `<gitRoot>/.agents/skills` for that session.

**Why the ranks sit below 100.** The registry keeps one winner per name inside one layer, and the filesystem provider's project roots rank 100 (`.dsh/skills`) and 200 (`.agents/skills`). A project candidate SkillHub reports must outrank them, otherwise turning a project Skill Off would only remove SkillHub's candidate and the built-in provider would refill the name. For the same reason Off is expressed as a lower-ranked candidate with `invocation.modelInvocable = false`, never as an omission.

**Project Skills belong to the Project and Chat layers.** A Global-layer read has no folder, so it has no project home: project Skills appear in the composer panel (This Project / This Chat), and a project toggle is stored in that folder's Project document or that chat's Chat document. Global Defaults still apply to a project Skill until a deeper layer overrides it.

**A project copy owns the name inside its workspace.** When the same name exists in a project root and a user home, the project candidate wins even if the user copy is On, which is what DSH's own precedence does. The panel reports the collision and both rows.

`.opencode/skills` and `.claude/skills` are not read by DSH at all, so a Skill found only there reaches the model **because SkillHub supplies it**. The panel labels those roots `SkillHub only` so the user can tell which visibility they are adding.

## Declared project MCP

DSH decides which MCP servers run from mounted `@deepseek-ai/dsh-mcp-client` rows; it never reads a project file for that. Projects nevertheless carry declarations for other agents, so SkillHub reads them and offers them:

| File | Table | Shapes |
|---|---|---|
| `.mcp.json` | `mcpServers` | `command`/`args`/`env` (stdio), `url`/`headers` (HTTP) |
| `.opencode/opencode.json` | `mcp` | `type: local` with `command: string[]` and `environment`, `type: remote` with `url` |

The list is Config-driven (`projectMcpFiles`) and relative to the session working directory. Parsing is a read: it validates names (`[A-Za-z0-9_-]{1,32}`), transports, that a stdio command exists on PATH, and that arguments naming files actually exist — the exact failure a stale absolute path produces. Per-variant and per-file problems are reported in the panel rather than throwing.

A declared server is **shown, not started**. Starting happens only through the panel's explicit approval, and only for the chat whose folder declares it:

- the approval record is stored per folder in `$DSH_HOME/skillhub/mcp-trust/<folderHash>.json` and is bound to a hash of the declaration's run-relevant fields, so editing `command`, `args`, `env`, `url`, or `headers` invalidates it and the user is asked again;
- the server is mounted with `agentCtx.plugin(McpClient, …)` in the chat's own scope, mirroring how the ACP bridge mounts MCP servers a client supplies, so it is disposed with the agent and the namespace can be reused by another chat;
- `cwd` is the session folder, so a relative argument such as `./Test_DreamShader.uproject` resolves exactly as it does for the other agent;
- because SkillHub owns that mount, the runtime treats it as fully hideable — the scope-local probe that refuses to hide a foreign server does not apply;
- a server name declared in both files becomes one row with two variants, each showing its own command line, and the user picks which one runs.
