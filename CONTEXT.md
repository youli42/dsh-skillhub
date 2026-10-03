# SkillHub

Vocabulary for the DSH product that owns where skills live and which of them a Project or Session may use.

Glance Hub is a different product. Do not mix its terms here.

## Language

**SkillHub**:
The DSH product that manages the Skills DSH uses.
_Avoid_: skill manager, dashboard, DSHLI, Glance

**Agent home**:
The machine-wide skill directory other agents also read: `~/.agents/skills`. New installs land here unless the user picks DSH home.
_Avoid_: public directory, 公共目录, global skills

**DSH home**:
The skill directory only DSH treats as its own: `~/.dsh/skills`. Skills here must not be what other agents load.
_Avoid_: own directory, private skills, 自己的目录

**Project root**:
A workspace's own agent-config folder that holds Skills: `.agents/skills`, `.opencode/skills`, or `.claude/skills` under the session working directory. One level deep. Only Project and Chat layers see it.
_Avoid_: repository root, git root, workspace

**Project home**:
SkillHub's tree section for one Project root, labelled with the folder name (`.agents`). `.opencode` and `.claude` are marked `SkillHub only` because DSH itself never reads them.
_Avoid_: local skills, 项目技能目录

**MCP declaration**:
A project file that names MCP servers for another agent: `.mcp.json` (`mcpServers`) or `.opencode/opencode.json` (`mcp`). Declaring is not running.
_Avoid_: MCP config, mcp.json as a DSH setting

**Trust**:
The user's recorded approval of one MCP declaration's exact command line, per folder. Editing the declaration invalidates it.
_Avoid_: auto-approve, remember-all

**Skill**:
One Agent Skill bundle — a folder containing `SKILL.md`, or a flat `name.md` at a home root.
_Avoid_: skill project, pack, 一个 Skill 的项目

**Pack**:
A nested folder tree of Skills inside a home, often one cloned git repo. The author’s folders are Groups.
_Avoid_: skill project, 大的 Skill 项目 (when you mean the tree, not a DSH workspace)

**Group**:
A folder in a Pack used as a batch toggle. It is not itself a Skill. Agent home and DSH home are the top folder layer. If a home entry is a symlink whose real path sits under `<origin>/skills/...`, SkillHub rebuilds that author tree (for example `mattpocock-skills/engineering/ask-matt`). Expanding a folder reaches nested folders and, when present, the folder's own Skill as its own switch.
_Avoid_: category, namespace, 层级 (as the thing you toggle)

**Visibility**:
Which disk Skills DSH offers to the model catalog and the slash menu. Chat overrides win, then Project overrides, then Global Defaults. Missing overrides inherit live from the parent. Settings edits Global Defaults; the composer panel edits Project or Chat. Files stay on disk. Other agents keep seeing whatever they already read. A per-Skill toggle changes only its target; All on and All off change the layer default, including for disk Skills added later. Plugin registrations are outside SkillHub ownership.
_Avoid_: moving folders to `skills.disabled`, enable-on-disk, 可见性 as UI-only hide

**Off**:
A reversible Visibility choice. The Skill remains in its home and can be turned on again.
_Avoid_: Delete, uninstall, skills.disabled

**Global**:
The harness-wide default Visibility, edited only in Settings. Its default also applies to Skills added later.
_Avoid_: Agent home (a directory, not a layer)

**Project**:
User-local overrides for one workspace folder, edited from the composer panel. Missing entries follow Global Defaults. It follows the user, not the git repo.
_Avoid_: 对话, Pack, a file committed in the repo

**Session**:
One DSH session. Its Chat overrides beat Project and Global, while missing entries keep following their parent. Legacy snapshots remain explicit until reset.
_Avoid_: 单轮, turn

**Collision**:
Two installed Skills that share the same name. SkillHub shows both and warns. The user decides what to turn off. SkillHub does not rename or delete them.
_Avoid_: automatic winner, path-qualified names in the catalog

**Host skill**:
A skill a DSH plugin registers itself. SkillHub does not list, Off, or Delete it, and must not stop the plugin from using it.
_Avoid_: bundled, 插件内部 skill as SkillHub targets

## MCP visibility

MCP services are a separate catalog from disk Skills. Their tool-visibility documents live under the SkillHub store and follow Global, Project, Session inheritance. Visibility never means process stop, credential management or removal of prior conversation content. Only an unambiguously identified global tool registration can be fully hidden through the current public tool API. Unsupported scope or ownership is displayed explicitly.

A declared project MCP service is a row before it is a process: SkillHub shows the declaration, its problems, and its exact command line, and starts it only after the user approves that command. Stopping a service keeps the approval; editing the declaration voids it. SkillHub-owned mounts are fully hideable because SkillHub owns their scope.
