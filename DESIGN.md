---
version: alpha
name: SkillHub
description: Native DSH viewer for skills already on disk in Agent home and DSH home
colors:
  primary: "var(--dsw-static-deepseek-450)"
  surface: "var(--dsw-alias-bg-overlay)"
  on-surface: "var(--dsw-alias-label-primary)"
  on-surface-secondary: "var(--dsw-alias-label-secondary)"
  on-surface-tertiary: "var(--dsw-alias-label-tertiary)"
  border: "var(--dsw-alias-border-l2)"
  hover: "var(--dsw-alias-interactive-bg-hover)"
  error: "var(--dsw-alias-state-error-primary)"
  warn: "var(--dsw-alias-state-warn-primary)"
  track-off: "var(--dsw-alias-bg-layer-2)"
  thumb: "var(--dsw-alias-label-primary-foreground)"
typography:
  title-md:
    fontFamily: "var(--dsw-font-family)"
    fontSize: 17px
    fontWeight: 600
    lineHeight: 24px
  body-md:
    fontFamily: "var(--dsw-font-family)"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 20px
  label-md:
    fontFamily: "var(--dsw-font-family)"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 20px
  meta-sm:
    fontFamily: "var(--dsw-font-family)"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 18px
rounded:
  none: 0px
  sm: 6px
  md: 8px
  lg: 12px
  pill: 18px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
components:
  composer-trigger:
    backgroundColor: transparent
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.pill}"
    height: 32px
    border: "1px solid {colors.border}"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    border: "1px solid {colors.border}"
  gate-switch:
    width: 32px
    height: 18px
    rounded: "{rounded.full}"
  tree-row:
    min-height: 36px
    rounded: "{rounded.md}"
    typography: "{typography.body-md}"
---

# Design System

## Overview

SkillHub is a DSH operator tool. It lists user skills from Agent home and DSH home, and the current workspace's own agent-config roots (`.agents/skills`, `.opencode/skills`, `.claude/skills`). Settings edits Global Defaults; the composer panel edits Project or Chat overrides.

It lives in two seats: a settings page for Global Defaults and a composer chip for Project and Chat. Quiet DSH density. Inherit `--dsw-*`. Do not invent a theme.

The tree is the product. Effective Visibility resolves Chat → Project → Global. Project and Chat store sparse overrides and expose Follow parent; Global owns the base default, including future Skills. Folders are the other axis: home, origin pack, author group, and nested skill each switch every skill inside. When a home entry is a symlink whose real path sits under `<origin>/skills/...`, SkillHub rebuilds that author tree. Expand a folder to switch one child. Off is a switch, not delete.

Project roots are their own home sections, labelled by folder name. `.opencode` and `.claude` carry a `SkillHub only` tag because DSH itself never reads them; `.agents` does not, because DSH reads that root too. Project roots appear only in the composer panel's Project and Chat scopes — a Global read has no folder and shows no project section. One level deep, matching what the model can actually load.

## Colors

All color is host tokens. DeepSeek 450 marks the active layer, an On switch, and an open composer chip. Warn and error tokens mark collision and broken rows. Color never carries meaning alone: On/Off also has switch position and `aria-checked`; collision also has the word Collision.

## Typography

Inherit `--dsw-font-family`. UI copy is 13/20. Meta, counts, and home paths are 12/18 with tabular figures. The panel title is 17/24 semibold, one line. No new font files. Long pack names wrap; home paths ellipsize with the full path in `title`.

## Layout

Page surface max-width 720px in the settings column. Popover is 400px, max-height `min(640px, 100vh - 24px)`, clamped to the viewport.

Vertical stack: header (title, counts, bulk actions) → scope → search → banners → tree. Spacing is 4/8/12. Tree indent is 16px per depth. Homes start expanded. Packs and groups start collapsed. No cards inside cards. No wrap toolbar of unrelated buttons.

At 320px the popover uses the viewport clamp. The composer chip hides its text label when the tool row is under 460px, leaving the 32px icon control.

## Elevation & Depth

The popover uses the host's prominent elevation and hairline stroke over an opaque surface, in the same family as the host's own floating panels; the settings page is flat in the host column. Tree rows use hover fill, not extra chrome. No glass, no gradient, no drop shadow on rows. The surface is deliberately opaque: the host's frosted menu fill carries alpha (94% in the default themes, 58% in another) and is only legible because the host pairs it with `backdrop-filter: blur(40px) saturate(150%)`. This panel uses no backdrop blur, so the fill is layered over `{colors.surface}` — the documented opaque overlay background — which keeps the host's menu tone without letting the chat read through.

## Shapes

Composer chip and layer segments use pill 18px. The popover and dialogs use 12px. Tree rows and search use 8px. The gate switch is a 32×18 pill with a 14px thumb.

## Components

**Composer chip.** Height 32px, 1px border, radius 18px. Skill outline icon 16px plus the label Skills. Open state uses ghost-active fill and DeepSeek 450. Accessible name is SkillHub. Escape and outside pointer close the popover. Focus returns to the chip.

**Panel.** Role `dialog` when portaled, `region` on the settings page. Header answers what this is, which layer writes, and how many skills are on. `data-ud-check` zones: `skillhub-header`, `skillhub-layer`, `skillhub-tree`.

**Scope control.** Settings shows one non-editable Global Defaults label. The composer segment has This Chat and This Project only. Project is disabled without a workspace folder. The helper line names inheritance and the write target.

**Gate switch.** `role="switch"` with `aria-checked` true, false, or mixed. Mixed thumb sits in the center. Clicking mixed turns the group On. Disabled when the chosen layer cannot write.

**Tree row.** One switch per row. Project and Chat rows name the effective source and show Follow when that scope owns an override. A folder with only one skill is a skill row: no chevron, no count, no link badge. A folder with two or more skills has a chevron, a folder switch, and a count. Expanding it shows children. The popover hides the home chrome when only one home has skills — except a project root, which keeps its header even alone, because `.opencode` / `.claude` skills reach the model only through SkillHub and that label is the user's only signal for it. Flattened `pstack-*` names cluster under `pstack` in the client until the host catalog already grouped them.

**MCP declared row.** A project-declared server that is not running shows a `Declared` tag, one line per source with its exact command line, and a warning tag plus a problem list when it cannot start. A row that carries a recorded approval also shows an `Approved` tag, so a remembered trust is visible instead of having to be inferred from the action label. A start that failed shows a `Start failed` tag and its reason in that same problem list: the row must never report a server as running just because a fiber exists. Its action is `Trust and start` the first time and `Start` afterwards; a running SkillHub-owned server shows `Started by SkillHub` and `Stop`. While it is not running its gate switch reads **Off and disabled**: nothing was spawned, so an On switch would claim a service that does not exist, and writing a visibility value there would mean nothing. Once it runs, the switch reports the stored value exactly as for a live server, and bulk actions skip services that are only declared.

**Declared scope line.** The tab names the folder whose declarations it is showing (the folder's own name, full path in the title). An approval is recorded per folder and bound to one declaration's content, so this line is what tells the user whether the service they trusted a moment ago is the one on screen, or the same service declared in another workspace.

**Trust confirmation.** `RiskConfirmation` from the host primitives, listing every declared command line for that name. The primary action stays disabled until the acknowledgement box is checked. Copy states what runs, not that something risky happens, and says that confirming remembers the command so it starts by itself the next time a session opens in this project. A service the user stops stays stopped for that session.

**Search.** Visible label Search skills. Filters the tree and keeps ancestor packs of matches. Critical names wrap rather than vanish.

## Do's and Don'ts

- Do reuse `--dsw-*`, Button, Input, and `useAnchoredPosition`.
- Do keep Off as a visibility switch. Do not add Install or Delete to this UI.
- Do let a multi-skill folder switch as a batch. A one-skill folder is just that skill.
- Do show mixed groups as mixed, not On or Off.
- Do keep Global editing in Settings and Project/Chat editing in the composer panel.
- Do show whether the effective state follows Global, comes from Project, or comes from Chat.
- Do show both collision rows and the word Collision.
- Do show a project root by its folder name and tag the roots DSH cannot read.
- Do show the exact command line before a project-declared MCP service starts.
- Do keep a declared, unstarted service Off and unswitchable instead of showing the stored default.
- Do not use a native `<select>` for layer or a checkbox forest for the tree.
- Do not hardcode `#121722`, `#6ea8ff`, or any other invented palette.
- Do not list Host skills.
- Do not start a project-declared MCP service without the user's acknowledgement.
- Do not make the settings page a second product with a different visual system.

## Agent Execution Rules

- Read this file before changing SkillHub UI.
- Use defined colors, typography, rounded, spacing, and components first.
- Do not invent persistent visual tokens without updating this file.
- Return a short self-check for meaningful UI changes.

## Request Anchor

- Original user request: A DSH plugin that manages user skills across Agent home and DSH home, with Session / Project / Global visibility, recursive packs, and a settings UI plus composer entry.
- Latest user override: Global is configured only in Settings. Project and Chat can change on the fly in the composer panel. They inherit live and store explicit overrides only.
- Deliverable: SkillHub client panel and composer chip in DSH chrome, plus this contract.
- Primary audience: A DSH user who already lives in the Web session and settings.
- Core job to be done: See which installed Skills the current scope will offer, understand where each state comes from, and override or resume following the parent.
- Success criteria: The panel looks like DSH, not a debug form. Entry ownership, inheritance source, Follow actions, home/pack/group switches, expanded leaf switches, search, empty, error, mixed, and collision are usable by keyboard and pointer.
- Non-goals: Glance Hub. Managing Host/plugin skills. Install or delete UI. Starting a project-declared MCP service without approval. Shipping a new color system. Restarting an adopted Host.
- Must preserve: Two homes. Chat > Project > Global. Missing overrides inherit. Off leaves files. Collisions both show. Project visibility is user-local.
- Validation must check against: Native chrome, layer semantics, folder batch toggles including mixed, a child toggled alone, search, empty/error, composer chip open/close, keyboard/focus, reduced-motion still works.

## Content Model

- User intent: See which local Skills DSH can offer, change Global Defaults in Settings, and override Project or Chat from the composer.
- Message hierarchy: What scope I am editing → where each effective state comes from → which Skills are on → what is broken or colliding.
- First-screen answers: This is SkillHub. Settings owns Global Defaults. The composer owns Project and Chat overrides. Follow removes an override. Off leaves files in place.
- Primary action meaning: Turning a switch On offers that skill or every skill in that folder to the model catalog and slash menu for the selected layer.
- Voice and tone: Direct operator copy. Short sentences. No cheerleading. Chrome follows the Host locale (zh / en); skill names stay as they are on disk.
- Terminology rules: Skill, Pack, Group, Visibility, Off, Delete, Agent home, DSH home, Global, Project, Session, Collision, Host skill. Never call Off Delete. Never call Agent home Global.
- State language rules:
  - Loading: Loading skills
  - Empty home: Nothing in this home yet.
  - Error: Couldn't load SkillHub. {reason} Retry.
  - Mixed: switch `aria-checked="mixed"` plus the group still listed
  - Collision: Same name in more than one pack. DSH can bind only one name at invoke.
  - Disabled Session: This Session needs an open chat.
  - Disabled Project: Open a workspace to edit Project visibility.
- Trust, risk, and help content: Off is not uninstall. Files stay in the home.
- Content risks: Implying this UI installs or deletes packs. Implying Host skills are listed. Implying a collision is auto-resolved.

## OKF Preflight

### Active OKF Concepts

- `design-okf/governance/request-integrity.md`
- `design-okf/content/message-model.md`
- `design-okf/content/ux-writing.md`
- `design-okf/content/state-language.md`
- `design-okf/content/semantic-binding.md`
- `design-okf/foundations/visual-hierarchy.md`
- `design-okf/foundations/necessary-design-judgment.md`
- `design-okf/systems/taste-engine.md`
- `design-okf/systems/typography-system.md`
- `design-okf/digital/accessibility-usability.md`
- `design-okf/digital/responsive-interaction.md`
- `design-okf/systems/motion-language.md`

### Support References

- `references/branch-web-product.md`
- `references/design-contract.md`
- `references/content-model.md`
- `references/visual-verification.md`
- `references/quality-gates.md`
- `references/design-okf/index.md`
- Glance Hub `DESIGN.md` as host-chrome evidence, not as product scope

### Execution Mode

- `single-agent`. One panel in existing DSH chrome. No specialist split.

### Decision Record

- Constraints extracted: Host `--dsw-*` only. Settings owns Global Defaults. The composer owns Project and Chat overrides. Adopted Host must not be restarted by dshx.
- Deliberate exceptions: Composer chip is a 32px capsule (tool row), not the 32×32 header circle Glance uses. Same tokens, different seat.
- Verification hooks: live DSH Web. Keyboard, focus, empty/error, Project disablement, inheritance source, Follow, mixed switch, composer open/close.

## OKF Decision Bindings

| Reference | Decision | Artifact target | Verification |
|---|---|---|---|
| `request-integrity.md` | Keep SkillHub as the skill manager. Do not restyle Glance or invent a dashboard. | Panel + chip | First view still answers layer + tree + Off≠Delete |
| `message-model.md` | Header, then scope, then tree. | `skillhub-header` / scope / tree | First-paint order |
| `ux-writing.md` | Canonical terms. CTAs are All off, All on, Follow parent for all, and Follow. | Copy in `SkillHubPanel.tsx` | Snapshot text |
| `state-language.md` | Loading, empty, error, mixed, collision, disabled Project, inherited, and overridden are designed states. | Panel states | Exercise each state |
| `semantic-binding.md` | Layer is radiogroup. Switches are `role="switch"`. Search has a visible label. Dialogs use host Modal. | Controls | Accessibility tree |
| `visual-hierarchy.md` | Tree is primary. Layer is the one secondary control. Install is tertiary footer. | Layout | Screenshot: tree dominates |
| `necessary-design-judgment.md` | Remove native select/checkbox dump and freeform folder field. Keep layer, tree, confirm. | Panel | No `<select>` for layer |
| `taste-engine.md` | Quiet DSH operator. Memory is the layer segment + mixed switches + skill-icon chip. | Chrome | Side-by-side with Session log / Glance tokens |
| `typography-system.md` | 13/20 UI, 12/18 meta, 17/24 title. Inherit host family. | Type | Rendered sizes |
| `accessibility-usability.md` | WCAG 2.2 AA. Visible focus. Keyboard. Delete confirms. 32px chip target. | Chip, switches, dialog | Keyboard pass |
| `responsive-interaction.md` | Popover clamps. Chip label collapses under 460px. No page-level horizontal scroll. | Popover + chip | Narrow viewport screenshot |
| `motion-language.md` | Micro budget. Panel enter 180ms opacity/translate. Switch thumb 140ms. Reduced motion: none. | Popover, switch | `prefers-reduced-motion` still operable |

## Information Architecture

- Core user tasks: Change Global Defaults. Override Project or Chat. Resume following a parent. Find a Skill.
- Screen inventory: Settings section SkillHub. Composer popover.
- Navigation model: Settings nav owns the page. Composer chip toggles the popover. No extra routes.
- Content hierarchy: Scope → counts → search → tree (Agent home, then DSH home).
- Primary CTA rules: The switch changes the selected scope. Follow removes that scope's override.

## Taste Signature

- Design read: Dense desktop operator UI inside DSH Web, settings + composer.
- Necessary judgment: Removed the form dump. Inevitable relationship is layer-above-tree. Care states are empty, error, mixed, collision, delete. Material honesty: empty homes stay empty. Scene fit is quiet DSH density.
- Taste dials: variance 3, density 7, motion 2, distinction 4, type 1, experiment 2.
- Category defaults avoided: Native form toolbar, SaaS card stack, invented dark theme, glass, gradient, unlabeled icon soup.
- Layout families: Tool-row chip. Header + segmented control + filter + tree. Footer install. Modal confirm.
- Visual memory feature: Project / Chat segment plus visible inheritance sources on a mixed-capable switch tree.
- Type personality: Host utility type recedes.
- Asset/reference policy: Reuse DSH primitives and Glance/Watcher chrome rules. Do not copy Glance's eye or Watcher's live motion.
- Anti-default locks: No checkbox forest. No wrap toolbar. No cards-in-cards. No hex palette. No Host skills in the tree.
- Intentional exceptions: Composer chip may show the word Skills because the tool row is labeled chrome, unlike header utilities.

## Motion Strategy

- Motion purpose: Continuity for the popover appearing from the chip. Feedback for the switch thumb.
- Motion budget: Micro.
- Primary motion focus: Panel enter. Switch thumb.
- Do-not-move zones: Tree text, counts, error copy, delete dialog body.
- Trigger model: Open chip, toggle switch.
- Duration and easing rules: 180ms panel `cubic-bezier(.2, .8, .2, 1)`. 140ms thumb. 100ms press scale on the chip.
- Direction and causality rules: Panel eases from the chip. Thumb travels toward the On side.
- Scroll behavior: User-controlled tree scroll. No scroll-linked motion.
- Reduced-motion fallback: Instant open. Instant thumb. No press scale.
- Performance risks: Transform and opacity only.

## Page Or Asset Specs

### Settings page

- Goal: Canonical SkillHub.
- Primary user task: Edit Global Defaults.
- Primary content: Global Defaults label + tree.
- Primary CTA: Row switches.
- Required states: loading, empty, error, mixed, collision, and broken.
- Responsive notes: Max-width 720px. Tree rows wrap names.
- Accessibility notes: Page is a region labelled SkillHub. Scope is named. Live error region.

### Composer popover

- Goal: Override this Project or Chat without leaving chat.
- Primary user task: Override Chat or Project visibility, or resume following the parent.
- Primary CTA: Row switches and Follow. Default scope is This Chat.
- Required states: same tree states, plus closed chip.
- Responsive notes: 400px, viewport clamp, open from composer (usually upward via clamp).
- Accessibility notes: `role="dialog"` `aria-modal="false"`. Escape closes. Focus returns to chip.

## Quality Gates

- Request Anchor fit: Native SkillHub, not a form dump, not Glance.
- Visual: ego-browser screenshots of settings and composer, desktop and a narrow composer.
- Accessibility: names, roles, focus, Escape, switch mixed.
- Responsive: popover clamp, chip label collapse.
- Interaction: scoped write, search, all off/on, Follow parent for all, and per-row Follow.
- Motion: reduced-motion still usable.
- Motion contract: not used. No SVG draw or scroll-linked claim.
- Performance: panel CSS only. Catalog payload already exists.
- Print or export: n/a
- Data visualization: n/a
- I18n/legal: English operator copy. Canonical terms from `skillhub/CONTEXT.md`.
- Contract consistency: this file matches the client.

## Implementation And Governance

- CSS architecture: `SkillHubPanel.module.css` plus host primitives.
- Token implementation: CSS `var(--dsw-*)` only.
- Component naming: chip, panel, scope, switch, source, Follow, tree.
- State naming: `gate` on/off/mixed. `source` Global/Project/Chat. `surface` page/popover.
- Theme strategy: follow host light/dark.
- Dark mode: host tokens.
- Framework notes: React client slot. Primitives are bundled.
- Rendered UI Audit: ego-browser visible review. Pinned Playwright audit not used for this host-plugin surface.
- Accessibility testing: ego-browser snapshotText + keyboard.

## Assumptions

- Live Web is the adopted host on the current machine port. Client rebuild is the `client` activation branch. Catalog HTTP may still be stale until the user re-applies Host.
- Workspace folder comes from the current session `cwd`. The user does not type a project path.

## Open Questions

- Whether a later pass should browse the filesystem instead of pasting a pack path.
- Whether root-level `name.md` skills should grow their own Delete action. Hub delete is pack-scoped today.

## Review Log

| Version | Date | Change | Reason | Reviewer |
|---|---|---|---|---|
| 0.1 | 2026-08-21 | Bootstrap SkillHub contract from ultimate-design YOLO | Replace the ugly native form dump | agent |
| 0.2 | 2026-08-21 | Collapse packs by default; drop redundant home badge; quieter popover | ego-browser first tree pass | agent |
| 0.3 | 2026-08-21 | Popover z-index under Modal; HTML catalog error copy; pack switch names | ego-browser delete dialog and error | agent |
| 0.4 | 2026-08-21 | Remove install and delete from the UI | User: agent manages those; SkillHub only shows local homes | agent |
| 0.5 | 2026-08-21 | Home/pack/group folder switches; expand to toggle a child | User: folder-dimension batch plus individual | agent |
| 0.6 | 2026-08-21 | Rebuild author trees from symlink real paths | Matt Pocock / pstack installs flatten names; folders live on the target | agent |
| 0.7 | 2026-08-21 | Host locale zh/en dictionaries | SkillHub chrome follows DSH language | agent |
| 0.8 | 2026-08-21 | One switch per skill; cluster flattened pstack-* ; quieter badges | User: too many switches, messy tree | agent |
| 0.9 | 2026-10-02 | Project roots as their own home sections; declared project MCP rows with command lines and a trust confirmation | User: manage the workspace's `.agents` / `.opencode` / `.claude` skills and its `.mcp.json` MCP | agent |
