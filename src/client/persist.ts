/**
 * The skill panel reopens on the tab the user left it on. The popover unmounts
 * on every close, so the choice has to outlive the component: a user who was in
 * the middle of something in MCP finds MCP again instead of being dropped back
 * on Skills.
 *
 * The choice is kept per surface. The settings page has three layer buttons the
 * composer popover does not, and one view silently changing the other's tab
 * would be a surprise, so the two remember separately.
 */
export type PanelTab = 'skills' | 'mcp'

const PREFIX = 'dsh-skillhub:tab:'

/**
 * Reading `localStorage` itself can throw (a sandboxed page without storage
 * access throws on property access, not just on use), so even the lookup is
 * guarded.
 */
function storage(): Storage | undefined {
  try {
    return globalThis.localStorage ?? undefined
  } catch {
    return undefined
  }
}

/** The remembered tab for a surface; anything unrecognized falls back to Skills. */
export function readPanelTab(surface: string): PanelTab {
  try {
    return storage()?.getItem(PREFIX + surface) === 'mcp' ? 'mcp' : 'skills'
  } catch {
    return 'skills'
  }
}

/** Remember the tab; a refused write must not turn the click into an error. */
export function writePanelTab(surface: string, tab: PanelTab): void {
  try {
    storage()?.setItem(PREFIX + surface, tab)
  } catch {
    // Quota or a denied storage grant: the panel still switches, it just forgets.
  }
}
