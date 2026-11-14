import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { IconSkillOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-general/client'
import { SkillHubPanel } from './SkillHubPanel.tsx'
import { usePanelPosition } from './usePanelPosition.ts'
import { en, zh, type SkillHubKey } from './locales.ts'
import css from './SkillHubPanel.module.css'
import { connectSlashRefresh, type SkillClientLoader } from './slash-refresh.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    skillhub: SkillHubKey
  }
}

export const name = 'dsh-skillhub-client'
export const inject = ['slots', 'locale', 'loader']

const NS = 'skillhub'

const PANEL_GAP = 8
const PANEL_MARGIN = 12
const UNPLACED: CSSProperties = { visibility: 'hidden', left: 0, top: 0 }

export function apply(ctx: ClientContext) {
  ctx.effect(() => connectSlashRefresh(ctx.get('loader') as SkillClientLoader,
    error => { ctx.logger.warn(`SkillHub autocomplete refresh failed: ${String(error)}`) }), 'dsh-skillhub: autocomplete refresh')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-skillhub: dictionaries')
  const t = ctx.locale.bind(NS)

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'dsh-skillhub',
    order: 80,
    label: () => t('nav'),
    locale: NS,
  }, SkillHubSettings))

  ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
    name: 'conversation.input.left',
    id: 'dsh-skillhub',
    order: 40,
    label: () => t('chip'),
    locale: NS,
  }, SkillHubChip))
}

function SkillHubSettings(props: PropsRuntime<'settings.section'> & PropsLocale<'skillhub'>) {
  return (
    <SkillHubPanel
      defaultLayer="global"
      layers={['global']}
      surface="page"
      t={props.t}
    />
  )
}

function SkillHubChip(props: PropsRuntime<'conversation.input.left'> & PropsLocale<'skillhub'>) {
  const sessionId = props.sessionId
  // Store rehydration/reconnect windows can transiently deliver a list
  // slice without byId; a throw here unmounts the whole composer input.
  const folder = props.useSessions((list: { readonly byId?: Readonly<Record<string, { readonly cwd?: string } | undefined>> }) => list.byId?.[sessionId]?.cwd ?? '')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelPosition = usePanelPosition({
    open,
    anchorRef: triggerRef,
    panelRef,
    gap: PANEL_GAP,
    margin: PANEL_MARGIN,
  })

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return
      if (rootRef.current?.contains(event.target) === true) return
      if (panelRef.current?.contains(event.target) === true) return
      if (event.target instanceof Element) {
        const floated = event.target.closest('[role="menu"], [role="dialog"], [role="listbox"]')
        if (floated !== null) return
      }
      setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div className={css.chipWrap} ref={rootRef} data-skillhub-chip="">
      <button
        ref={triggerRef}
        type="button"
        className={css.trigger}
        data-open={open ? '' : undefined}
        aria-expanded={open}
        aria-label={props.t('chip.aria')}
        title={props.t('chip.aria')}
        onClick={() => setOpen(value => !value)}
      >
        <IconSkillOutlineRegular size={16} />
        <span className={css.triggerLabel}>{props.t('chip')}</span>
      </button>
      {open
        ? createPortal(
          <div
            ref={panelRef}
            className={css.menu}
            style={panelPosition ?? UNPLACED}
            role="dialog"
            aria-modal="false"
            aria-label={props.t('chip.aria')}
            data-ud-check="skillhub-chip-panel"
          >
            <SkillHubPanel
              sessionId={sessionId}
              defaultLayer="session"
              layers={['session', 'project']}
              surface="popover"
              t={props.t}
              {...folder !== '' ? { folder } : {}}
            />
          </div>,
          document.body,
        )
        : null}
    </div>
  )
}
