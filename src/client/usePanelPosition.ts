import { useEffect, useState, type CSSProperties, type RefObject } from 'react'

/** Panel placement resolved from the trigger's viewport rect; `undefined` until measured. */
export interface PanelPositionOptions {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  panelRef: RefObject<HTMLElement | null>
  gap: number
  margin: number
}

/**
 * Place a fixed panel against its trigger without the host's `useAnchoredPosition`, which dsh 0.2.2
 * removed. The trigger sits in the composer, so the panel opens upward and falls below only when the
 * viewport has no room left above it. Content-sized: width and height stay with the stylesheet, and
 * only the offsets (plus a right-edge cap) are written here, so a tab switch cannot resize the box.
 * The panel mounts hidden (the caller's `UNPLACED`) until the first placement, so nothing flashes.
 */
export function usePanelPosition({ open, anchorRef, panelRef, gap, margin }: PanelPositionOptions): CSSProperties | undefined {
  const [position, setPosition] = useState<CSSProperties | undefined>(undefined)

  useEffect(() => {
    if (!open) {
      setPosition(undefined)
      return
    }
    let frame = 0
    const place = () => {
      const anchor = anchorRef.current
      const panel = panelRef.current
      if (anchor === null || panel === null) return
      const trigger = anchor.getBoundingClientRect()
      const box = panel.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const widestLeft = viewportWidth - margin - box.width
      const left = Math.max(margin, Math.min(trigger.left, widestLeft))
      const above = trigger.top - gap - box.height
      const highestTop = viewportHeight - margin - box.height
      const top = above >= margin
        ? above
        : Math.max(margin, Math.min(trigger.bottom + gap, highestTop))
      setPosition({ left, top, maxWidth: viewportWidth - margin - left, visibility: 'visible' })
    }
    const schedule = () => {
      if (frame !== 0) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        place()
      })
    }
    place()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : undefined
    if (panelRef.current !== null) observer?.observe(panelRef.current)
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
    }
  }, [open, anchorRef, panelRef, gap, margin])

  return position
}
