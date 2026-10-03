# User skills exist only when installed into Agent home or DSH home

_Partly superseded by [ADR 0009](0009-project-roots-and-declared-mcp.md): the two user homes still work exactly as described here, and the workspace's own agent-config roots are now read as well._

DSH today also scans a repo’s `.dsh/skills` and `.agents/skills`, plus custom and bundled roots. SkillHub does not. Opening a git workspace does not make its folders into Skills. A Skill is something the user installed into `~/.agents/skills` or `~/.dsh/skills`. That keeps SkillHub the only manager and matches the rule “not installed, not a skill.”
