import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { scopeOf } from '@deepseek-ai/dsh-scope'
import type { SkillCandidate, SkillDefinition, SkillLookupOptions, SkillProvider, SkillViewOptions } from '@deepseek-ai/dsh-skill'
import type { Catalog, ManagedSkill } from './catalog.ts'
import type { SkillHub } from './hub.ts'
import { isProjectSource, originPriority, originRank } from './project-roots.ts'

const PROVIDER = 'skillhub'

/**
 * Read a session id out of a value that may be an id, a plain `{ session }`
 * key, or a Cordis Context (whose own property dereference is guarded and may
 * throw). Return the first readable shape.
 * @param holder - candidate scope key.
 * @returns the session id, when one is readable.
 */
function sessionIdOfKey(holder: unknown): string | undefined {
  if (typeof holder !== 'object' || holder === null) return undefined
  const agent = holder as {
    id?: unknown
    session?: { id?: unknown; header?: { id?: unknown } }
  }
  try {
    if (typeof agent.session?.id === 'string') return agent.session.id
    if (typeof agent.session?.header?.id === 'string') return agent.session.header.id
    // A Context tag can hand back the agent context itself, whose `session`
    // only resolves as a string after the raw id is read through the key.
    const raw = agent.session
    if (typeof raw === 'string') return raw
  } catch {
    // The guarded Context proxy refuses an un-injected service read: not an id.
    return undefined
  }
  return undefined
}

/**
 * Resolve the chat whose visibility layer applies to a lookup.
 *
 * The registry passes its viewing scope through as an opaque {@link ScopeKey}.
 * For an agent read that is the agent's own Context — the session id lives on
 * the scope tag the registry wrote into it, NOT as a `scope.session` property.
 * Reading only the property shape silently resolved no session, so a Chat-layer
 * override never reached the provider and the model kept seeing the Project or
 * Global value the user had just overridden in the conversation panel.
 *
 * The plain-object shape is still accepted for direct callers that hand over an
 * `{ session: { id } }` value, and for the per-agent registration below, which
 * knows its own session id and can pass it in as a string.
 * @param scope - the lookup scope: an agent Context, a scope key, or an id.
 * @returns the session id, or undefined when the read is not chat-scoped.
 */
export function sessionIdFromScope(scope: unknown): string | undefined {
  if (typeof scope === 'string') return scope === '' ? undefined : scope
  if (typeof scope !== 'object' || scope === null) return undefined
  try {
    const tagged = scopeOf(scope as Context)
    const fromTag = sessionIdOfKey(tagged)
    if (fromTag !== undefined) return fromTag
  } catch {
    // Not a Cordis Context: fall through to the plain-object shape.
  }
  return sessionIdOfKey(scope)
}

function toCandidate(skill: ManagedSkill): SkillCandidate {
  return {
    name: skill.name,
    description: skill.description,
    ...skill.whenToUse !== undefined ? { whenToUse: skill.whenToUse } : {},
    invocation: skill.invocation,
    source: skill.origin,
    provider: PROVIDER,
    rank: originRank(skill.origin),
    locator: { path: skill.path, directory: skill.directory },
    path: skill.path,
    resourceBase: { kind: 'directory', path: skill.directory },
  }
}

/**
 * Rank one Skill above another for the same name.
 *
 * A project copy always owns the name inside its workspace, which matches what
 * DSH's own filesystem provider does (project roots rank below user roots).
 * Between user homes the historical rule stands: an On sibling wins the name so
 * that turning one home Off cannot hide the copy that is still On. The winner's
 * invocation policy is what hides an Off Skill — its rank keeps the built-in
 * provider from refilling the name.
 * @param left - first candidate.
 * @param right - second candidate.
 * @returns negative when the left candidate wins.
 */
function compareCandidates(left: ManagedSkill, right: ManagedSkill): number {
  const leftProject = isProjectSource(left.origin)
  const rightProject = isProjectSource(right.origin)
  if (leftProject !== rightProject) return leftProject ? -1 : 1
  const leftOn = left.gate === 'on'
  const rightOn = right.gate === 'on'
  if (leftOn !== rightOn) return leftOn ? -1 : 1
  return originPriority(left.origin) - originPriority(right.origin)
}

export function providerSkillsFromCatalog(catalog: Catalog): ManagedSkill[] {
  const byName = new Map<string, ManagedSkill[]>()
  for (const skill of catalog.inventory) {
    const list = byName.get(skill.name) ?? []
    list.push(skill)
    byName.set(skill.name, list)
  }
  const selected: ManagedSkill[] = []
  for (const group of byName.values()) {
    const sorted = [...group].sort(compareCandidates)
    const pick = sorted[0]
    if (pick === undefined) continue
    selected.push(pick)
  }
  return selected
}

/**
 * Build the provider the registry reads.
 *
 * `boundSessionId` exists because one provider instance serves every scope in
 * the layer it was registered in: the global registration cannot tell which
 * chat is asking, while the per-agent registration made on `agent/created`
 * knows exactly one agent. Passing that chat in here makes the Chat layer apply
 * even when a caller forwards no usable scope, which is what previously let a
 * chat-level override be ignored by the model's catalog.
 * @param hub - visibility store backing the provider.
 * @param boundSessionId - chat this provider belongs to, when it is agent-scoped.
 */
export function createSkillHubProvider(hub: SkillHub, boundSessionId?: string): SkillProvider {
  return {
    name: PROVIDER,
    async list(options: SkillLookupOptions): Promise<SkillCandidate[]> {
      try {
        const view = options as SkillViewOptions
        const sessionId = sessionIdFromScope(view.scope) ?? boundSessionId
        const query: { sessionId?: string; folder?: string } = {}
        if (sessionId !== undefined) query.sessionId = sessionId
        if (options.cwd !== undefined) query.folder = resolve(options.cwd)
        return providerSkillsFromCatalog(hub.catalog(query)).map(toCandidate)
      } catch (error) {
        console.error('[dsh-skillhub] list failed', error)
        return []
      }
    },
    async get(candidate: SkillCandidate): Promise<SkillDefinition | undefined> {
      const locator = candidate.locator as { path?: string; directory?: string }
      if (typeof locator.path !== 'string') return undefined
      let content: string
      try {
        content = readFileSync(locator.path, 'utf8')
      } catch {
        return undefined
      }
      const split = content.startsWith('---') ? content.indexOf('\n---', 3) : -1
      const body = split >= 0 ? content.slice(split + 4).replace(/^\r?\n/, '') : content
      return {
        name: candidate.name,
        description: candidate.description,
        ...candidate.whenToUse !== undefined ? { whenToUse: candidate.whenToUse } : {},
        invocation: candidate.invocation,
        source: candidate.source,
        provider: PROVIDER,
        resourceBase: { kind: 'directory', path: locator.directory ?? dirname(locator.path) },
        path: locator.path,
        content: body,
      }
    },
  }
}
