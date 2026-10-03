import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Context, Volatile } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-settings'
import type { SkillProviderControl } from '@deepseek-ai/dsh-skill'
import z from '@deepseek-ai/schemastery'
import { McpHub } from './mcp.ts'
import { installMcpVisibility } from './mcp-runtime.ts'
import { DEFAULT_PROJECT_MCP_FILES } from './project-mcp.ts'
import { DEFAULT_PROJECT_SKILL_ROOTS } from './project-roots.ts'
import { SkillHub } from './hub.ts'
import { handleSkillHubHttp } from './http.ts'
import { createSkillHubProvider } from './provider.ts'

export const name = 'dsh-skillhub'
export const inject = ['skills', 'webServer', 'connection', 'tools', 'agents']

export interface Config {
  /** Profile field. A settings edit is stored immediately and read on the next Host load. */
  enabled: Volatile<boolean>
  /**
   * Project skill roots, relative to the session working directory. Defaults to
   * `.agents/skills`, `.opencode/skills`, and `.claude/skills`; an empty list
   * turns project Skills off entirely.
   */
  projectSkillRoots: string[]
  /**
   * Project MCP declaration files, relative to the session working directory.
   * Defaults to `.mcp.json` and `.opencode/opencode.json`.
   */
  projectMcpFiles: string[]
  /**
   * Start project-declared MCP services whose exact command was already approved
   * when a session opens. An unapproved declaration still waits for the user.
   */
  autoStartTrustedMcp: boolean
}

export const Config = z.object({
  enabled: z.boolean().default(true).volatile(),
  projectSkillRoots: z.array(String).default([...DEFAULT_PROJECT_SKILL_ROOTS]),
  projectMcpFiles: z.array(String).default([...DEFAULT_PROJECT_MCP_FILES]),
  autoStartTrustedMcp: z.boolean().default(true),
})

function env(name: string): string | undefined {
  const value = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name]
  return value
}

function defaultAgentHome(): string {
  return join(env('DSH_AGENTS_HOME') ?? join(homedir(), '.agents'), 'skills')
}

function defaultDshHome(): string {
  return join(env('DSH_HOME') ?? join(homedir(), '.dsh'), 'skills')
}

function defaultStoreDir(): string {
  return join(env('DSH_HOME') ?? join(homedir(), '.dsh'), 'skillhub')
}

export function apply(ctx: Context, config: Config) {
  console.log('[my-plugins/dsh-skillhub] loaded')
  // The settings page stays registered when the plugin is disabled so the
  // enabled field can be turned back on. The running fiber reads it once.
  ctx.inject(['settings'], settingsCtx => {
    settingsCtx.effect(() => settingsCtx.settings.configure({ auto: true }, ctx.fiber))
  })
  if (config.enabled.get() === false) {
    console.log('[my-plugins/dsh-skillhub] disabled; provider, http, and hooks skipped')
    return
  }
  const hub = new SkillHub({
    agentHome: defaultAgentHome(),
    dshHome: defaultDshHome(),
    storeDir: defaultStoreDir(),
    projectRoots: config.projectSkillRoots,
  })
  let control: SkillProviderControl | undefined
  ctx.skills.registerProvider((next) => {
    control = next
    return createSkillHubProvider(hub)
  })
  const mcp = installMcpVisibility(
    ctx,
    new McpHub({ storeDir: defaultStoreDir() }),
    undefined,
    {
      storeDir: defaultStoreDir(),
      files: config.projectMcpFiles,
      autoStart: config.autoStartTrustedMcp,
    },
  )
  const invalidate = () => { control?.invalidate() }
  const connection = ctx.get('connection') as {
    requestRejection: (request: Parameters<ReturnType<typeof handleSkillHubHttp>>[0]) => 401 | 403 | undefined
  } | undefined
  const handler = handleSkillHubHttp(
    hub,
    invalidate,
    request => connection === undefined ? 401 : connection.requestRejection(request),
    mcp,
  )
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/skillhub',
    handler: (req, res) => { void handler(req, res) },
  }), 'dsh-skillhub http')
  const attached = new WeakSet<object>()
  const attach = (payload: unknown) => {
    const agent = (payload as { agent?: object } | undefined)?.agent
    if (agent === undefined || attached.has(agent)) return
    attached.add(agent)
    attachAgentProvider(ctx, hub, payload)
  }
  ctx.effect(() => {
    const onCreated = ctx.on.bind(ctx) as (event: string, listener: (payload: unknown) => void) => () => void
    return onCreated('agent/created', attach)
  }, 'dsh-skillhub agent provider')
  const agents = ctx.get('agents') as { list(): object[] } | undefined
  for (const agent of agents?.list() ?? []) attach({ agent })
  console.log('[my-plugins/dsh-skillhub] http /skillhub')
}

/** Chat identity of one created agent, for the provider registered under it. */
function sessionIdOfAgent(agent: { id?: string; session?: { id?: string; header?: { id?: string } } }): string | undefined {
  if (typeof agent.session?.id === 'string') return agent.session.id
  if (typeof agent.session?.header?.id === 'string') return agent.session.header.id
  return typeof agent.id === 'string' && agent.id !== '' ? agent.id : undefined
}

export function attachAgentProvider(
  owner: Context,
  hub: SkillHub,
  payload: unknown,
): void {
  if (typeof payload !== 'object' || payload === null) return
  const agent = (payload as {
    agent?: { id?: string; ctx?: Context; session?: { id?: string; header?: { id?: string; cwd?: string } } }
  }).agent
  if (agent === undefined) return
  const agentCtx = agent.ctx
  if (agentCtx === undefined) return
  try {
    const skills = agentCtx.get('skills') as Context['skills'] | undefined
    if (skills === undefined || typeof skills.registerProvider !== 'function') return
    // Bind this agent's chat into its provider: the registry reads with the
    // agent's own context as the scope, and resolving the chat from inside that
    // value is not reliable for every caller shape. This registration serves
    // exactly one agent, so its Chat layer can be applied unconditionally.
    const sessionId = sessionIdOfAgent(agent)
    // Older releases left a provider owned only by the agent across Host HMR.
    // A separate public registration outranks that legacy provider for the same
    // disk skills, without touching private registry state or other plugins.
    // Both the plugin and the agent now own the exact disposer.
    owner.effect(() => agentCtx.effect(() => skills.registerProvider(() => {
      const current = createSkillHubProvider(hub, sessionId)
      const name = 'skillhub-propagation'
      return {
        ...current,
        name,
        async list(options) {
          const result = await current.list(options)
          if (!Array.isArray(result)) return result
          return result.map(candidate => ({ ...candidate, provider: name, rank: (candidate.rank ?? 350) - 2 }))
        },
      }
    }), 'dsh-skillhub scoped propagation'), 'dsh-skillhub agent provider')
  } catch (error) {
    console.error('[dsh-skillhub] agent provider failed', error)
  }
}
