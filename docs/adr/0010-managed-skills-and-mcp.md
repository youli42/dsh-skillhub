# Managed MCP servers and add-only Skill creation

Supersedes the "no Install UI" half of [ADR 0001](0001-only-installed-homes.md) and the read-only stance in the original design.

## Decision

SkillHub may create two kinds of state from Settings:

1. **A new Skill**, written as `<agent-home|dsh-home>/<name>/SKILL.md`, or a local folder installed as a symlink.
2. **A managed MCP server**, persisted under `$DSH_HOME/skillhub/mcp-servers.json` and registered with the harness MCP manager.

Everything else stays read-only: existing Skill files are never edited or deleted, project `.mcp.json` / `.opencode/opencode.json` declarations are never rewritten, and host/plugin Skills remain outside SkillHub ownership.

## Why the harness MCP manager

The manager already owns mounting, reconnect, probe, restart, and status for the global MCP plane. A second process manager in SkillHub would duplicate that lifecycle and could not share the `serverName` namespace safely. When the manager is absent (older Harness builds), the add/edit surface reports itself unavailable; it does not fall back to a private manager.

## Why credentials, not a private vault

Managed server environment values and headers are stored as `${credential:REF}` templates. Reference values live in the harness credential provider (`~/.dsh/.credentials.yaml`, mode 0600 by default), and SkillHub persists only references. The browser receives `configured` and a provider-masked preview; it never receives a value. This keeps one writable secret store for the whole harness and means a changed credential reaches the next reconnection without rewriting the definition.

Secrets are not isolated from the agent: the provider is readable by the same OS user, so agent tool processes can read it. That is a property of the local provider, not of this feature, and is documented rather than papered over.

## Activity trail

Every managed-server mutation appends one JSONL record under `$DSH_HOME/skillhub/audit/mcp.jsonl` (mode 0600, rotated at 1 MiB). Records contain the server name, transport, executable or URL host, changed field names, secret references, result, and a redacted error. Arguments and secret values are not recorded. The panel exposes a read-only view; the file is not a restore mechanism.

## Skill creation rules

- Names must match the host grammar `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- The target directory must not exist; the file is opened with `wx` and the directory is rolled back on failure.
- The written frontmatter is JSON-quoted, which is also valid YAML double-quoted syntax.
- A pack install must contain at least one `SKILL.md`; the source folder is linked, never copied.
- No Skill delete or edit action exists. Removing a Skill remains a filesystem operation outside SkillHub.

## Consequences

- DSH versions without the MCP manager keep the full visibility surface but hide/refuse managed-server writes.
- A managed server and a project declaration can share a name; the manager registration wins the namespace and the project start reports the collision, so the panel shows the failure instead of pretending both run.
- Deleting a managed server clears its credential references but intentionally keeps its activity records.
