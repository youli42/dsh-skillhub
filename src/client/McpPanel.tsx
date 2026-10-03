import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, IconCordisPluginOutlineRegular, RiskConfirmation, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import type { LayerName } from './catalog-api.ts'
import type { SkillHubKey } from './locales.ts'
import { GateSwitch, gateWord, notifyCatalogChanged, useCatalogRefresh, type SkillHubSurface } from './SkillHubPanel.tsx'
import css from './SkillHubPanel.module.css'

/**
 * One declared way to start a server. A project may declare the same name in
 * `.mcp.json` and `.opencode/opencode.json`; the panel shows every variant with
 * its exact command line so the user approves what actually runs.
 */
type Variant = {
  source: string
  transport: string
  command: string
  approved: boolean
  startable: boolean
  problems: string[]
}
type Server = {
  name: string
  tools: number
  gate: 'on' | 'off'
  source: LayerName
  supported?: boolean
  running?: boolean
  declared?: boolean
  managed?: boolean
  startRequired?: boolean
  variants?: Variant[]
  problems?: string[]
}
type Catalog = { servers: Server[]; declaredProblems?: string[] }
export interface McpBulkActions { allOn: () => void; allOff: () => void; disabled: boolean }

/** The folder's own name, which is what tells one workspace from another here. */
function folderName(folder: string): string {
  return folder.split(/[\\/]/).filter(part => part !== '').pop() ?? folder
}
export interface McpPanelProps {
  surface: SkillHubSurface
  layer: LayerName
  sessionId?: string | undefined
  folder?: string | undefined
  canWriteSession: boolean
  canWriteProject: boolean
  layerReady: boolean
  onServerCountChange?: ((count: number) => void) | undefined
  onBulkActions?: ((actions: McpBulkActions | undefined) => void) | undefined
  t: Translate<SkillHubKey>
}

export function McpPanel(props: McpPanelProps) {
  const { t, layer, sessionId, folder, layerReady } = props
  const [catalog, setCatalog] = useState<Catalog>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pendingTrust, setPendingTrust] = useState<{ server: string; source?: string; commands: string[] }>()
  const [acknowledged, setAcknowledged] = useState(false)
  const pending = useRef(false)
  const generation = useRef(0)
  const inFlight = useRef(0)
  const tRef = useRef(t)
  tRef.current = t
  const onCountRef = useRef(props.onServerCountChange)
  onCountRef.current = props.onServerCountChange
  const query = { layer, ...(sessionId ? { sessionId } : {}), ...(folder ? { folder } : {}) }
  const key = JSON.stringify(query)
  const activeKey = useRef(key)
  activeKey.current = key

  const request = useCallback(async (path: string, body?: object, signal?: AbortSignal) => {
    const response = await fetch(`/skillhub/mcp/${path}`, body === undefined
      ? { ...(signal ? { signal } : {}) }
      : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error(tRef.current('mcp.unavailable'))
    const data = await response.json() as Catalog & { error?: string }
    if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`)
    if (!Array.isArray(data.servers)) throw new Error(tRef.current('mcp.unavailable'))
    return data
  }, [])
  const load = useCallback(() => {
    const current = ++generation.current
    const controller = new AbortController()
    inFlight.current += 1
    setRefreshing(true)
    const done = () => {
      inFlight.current -= 1
      if (inFlight.current === 0) setRefreshing(false)
    }
    void request(`catalog?${new URLSearchParams(JSON.parse(key) as Record<string, string>)}`, undefined, controller.signal)
      .then(data => {
        if (key === activeKey.current && current === generation.current) {
          setCatalog(data)
          onCountRef.current?.(data.servers.length)
          setError(undefined)
        }
      }).catch((caught: Error) => {
        if (!controller.signal.aborted && key === activeKey.current && current === generation.current) setError(caught.message)
      }).finally(done)
    return () => controller.abort()
  }, [key, request])
  // Keep the previous catalog mounted while the new layer's read is in flight:
  // clearing it here was what made switching layers flash a skeleton.
  useEffect(() => { setError(undefined); return load() }, [load])
  useCatalogRefresh(load)

  const apply = (latest: Catalog | undefined) => {
    if (latest && key === activeKey.current) {
      setCatalog(latest)
      onCountRef.current?.(latest.servers.length)
    }
  }
  const update = async (servers: readonly string[], on: boolean) => {
    if (pending.current || !layerReady) return
    pending.current = true
    ++generation.current
    setBusy(true)
    setError(undefined)
    try {
      let latest: Catalog | undefined
      for (const server of servers) latest = await request('toggle', { ...query, server, on })
      apply(latest)
    } catch (caught) {
      if (key === activeKey.current) setError(String(caught))
    } finally {
      pending.current = false
      setBusy(false)
      // Even a partially completed bulk write must refresh the other surfaces.
      notifyCatalogChanged(layer)
    }
  }
  const runLifecycle = async (path: 'start' | 'stop', server: string, source?: string) => {
    if (pending.current) return
    pending.current = true
    ++generation.current
    setBusy(true)
    setError(undefined)
    try {
      apply(await request(path, { ...query, server, ...(source !== undefined ? { source } : {}) }))
      notifyCatalogChanged(layer)
    } catch (caught) {
      if (key === activeKey.current) setError(String(caught))
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  const askTrust = (server: Server) => {
    const variants = (server.variants ?? []).filter(variant => variant.startable)
    setAcknowledged(false)
    setPendingTrust({
      server: server.name,
      ...(variants[0] !== undefined ? { source: variants[0].source } : {}),
      commands: (server.variants ?? []).map(variant => `${variant.source}: ${variant.command}`),
    })
  }
  /**
   * A declared row's primary action: an already approved variant starts at once,
   * a new one asks for trust before anything runs.
   */
  const primaryAction = (server: Server) => {
    const variants = (server.variants ?? []).filter(variant => variant.startable)
    const trusted = variants.find(variant => variant.approved)
    if (trusted !== undefined) void runLifecycle('start', server.name, trusted.source)
    else askTrust(server)
  }
  const bulkActions = useMemo<McpBulkActions | undefined>(() => {
    if (!catalog?.servers.length) return undefined
    // A declared service that has not been started carries no usable visibility:
    // the Host reports it Off, and writing that value would mean nothing. Bulk
    // actions therefore only touch services that exist right now.
    const live = catalog.servers.filter(server => !server.startRequired)
    if (live.length === 0) return undefined
    const names = live.filter(server => server.supported || server.gate === 'off').map(server => server.name)
    return {
      allOn: () => void update(live.map(server => server.name), true),
      allOff: () => void update(names, false),
      disabled: !layerReady || busy,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, key, layerReady, busy])
  useEffect(() => {
    props.onBulkActions?.(bulkActions)
    return () => props.onBulkActions?.(undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkActions])

  return (
    <div className={css.mcpBody} data-ud-check="skillhub-mcp-body" aria-busy={busy || refreshing}>
      {error !== undefined ? <div className={css.bannerRow}>
        <p className={css.error} role="alert">{error}</p>
        <Button variant="outline" size="sm" onClick={() => load()}>{t('error.retry')}</Button>
      </div> : null}
      {catalog !== undefined && (catalog.declaredProblems?.length ?? 0) > 0 ? <p className={css.warn} role="status">
        {t('mcp.declaredProblems')} {(catalog.declaredProblems ?? []).join(' · ')}
      </p> : null}
      {/* Project declarations belong to one folder, and the approval is recorded
          per folder. Naming the folder here is what tells the user whether the
          service they trusted a moment ago is the one they are looking at now,
          or the same service declared in another workspace. */}
      {catalog !== undefined && folder !== undefined && folder !== ''
        && catalog.servers.some(server => server.declared) ? <p className={css.scope} title={folder}>
        {t('mcp.scope', { name: folderName(folder) })}
      </p> : null}
      {catalog === undefined && error === undefined ? <div className={css.skeleton} aria-label={t('loading')}>
        <div className={css.skel} /><div className={css.skel} /><div className={css.skel} />
      </div> : null}
      {catalog !== undefined && catalog.servers.length === 0 ? <div className={css.emptyCard} data-ud-check="skillhub-mcp-empty">
        <div className={css.emptyIcon}><IconCordisPluginOutlineRegular size={28} /></div>
        <h3 className={css.emptyTitle}>{t('mcp.empty.title')}</h3>
        <p className={css.emptyDesc}>{t('mcp.empty.desc')}</p>
      </div> : null}
      {catalog !== undefined && catalog.servers.length > 0 ? <div className={css.mcpList}>
        {catalog.servers.map(server => {
          const variants = server.variants ?? []
          const startable = variants.some(variant => variant.startable)
          const trusted = variants.some(variant => variant.startable && variant.approved)
          return <div key={server.name} className={css.row} data-leaf="" data-declared={server.declared && !server.running ? '' : undefined}>
            <span className={css.chevronGhost} />
            <div className={css.cell}>
              <div className={css.name}>
                <span className={css.nameText}>{server.name}</span>
                <Tag tone="quiet">{t('mcp.tools', { n: server.tools })}</Tag>
                {server.declared && !server.running ? <Tag tone="quiet">{t('mcp.declared')}</Tag> : null}
                {server.declared && variants.some(variant => variant.approved) ? <Tag tone="quiet">{t('mcp.approved')}</Tag> : null}
                {server.managed && server.running ? <Tag tone="quiet">{t('mcp.managed')}</Tag> : null}
                {server.declared && !startable ? <Tag tone="warning">{t('mcp.notStartable')}</Tag> : null}
                {!server.supported ? <Tag tone="warning">{t('mcp.unsupported')}</Tag> : null}
              </div>
              {variants.length > 0 ? <div className={css.variantList}>
                {variants.map(variant => <div key={`${variant.source}:${variant.command}`} className={css.variant}>
                  <span className={css.variantSource}>{variant.source}</span>
                  <code className={css.variantCommand} title={variant.command}>{variant.command}</code>
                </div>)}
              </div> : null}
              {(server.problems?.length ?? 0) > 0 ? <ul className={css.problems}>
                {(server.problems ?? []).map(problem => <li key={problem}>{problem}</li>)}
              </ul> : null}
            </div>
            <div className={css.actions}>
              {server.declared ? (server.running && server.managed
                ? <Button variant="outline" size="sm" disabled={busy} onClick={() => void runLifecycle('stop', server.name)}>{t('mcp.stop')}</Button>
                : <Button variant="outline" size="sm" disabled={busy || !layerReady || !startable}
                  onClick={() => primaryAction(server)}>{trusted ? t('mcp.start') : t('mcp.trust')}</Button>) : null}
              <GateSwitch
                gate={server.gate}
                label={t(server.startRequired ? 'switch.mcpPending' : 'switch.mcp',
                  { name: server.name, state: gateWord(t, server.gate) })}
                disabled={!layerReady || busy || server.startRequired === true
                  || (!server.supported && server.gate === 'on')}
                onChange={on => void update([server.name], on)}
              />
            </div>
          </div>
        })}
      </div> : null}
      <RiskConfirmation
        open={pendingTrust !== undefined}
        title={t('mcp.trust.title', { name: pendingTrust?.server ?? '' })}
        description={t('mcp.trust.desc', { command: (pendingTrust?.commands ?? []).join('  |  ') })}
        acknowledgeLabel={t('mcp.trust.ack')}
        cancelLabel={t('cancel')}
        closeLabel={t('close')}
        confirmLabel={t('mcp.trust.confirm')}
        acknowledged={acknowledged}
        disabled={busy}
        onAcknowledgedChange={setAcknowledged}
        onCancel={() => setPendingTrust(undefined)}
        onConfirm={() => {
          const request = pendingTrust
          setPendingTrust(undefined)
          if (request !== undefined) void runLifecycle('start', request.server, request.source)
        }}
      />
    </div>
  )
}
