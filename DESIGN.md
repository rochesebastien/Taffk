# DESIGN.md

Visual identity & design system for the Taffk frontend.

> This document describes the **post-refonte** UI: Tailwind CSS v4 (CSS-first
> config in `src/index.css`) + shadcn/ui (new-york style, Radix under the hood),
> flat light/dark theme. The earlier frosted-glass / `app.css` / dark-only
> system is gone — if you find a reference to `--bg-glow-primary`,
> `[data-theme='light']`, or `src/app.css`, it is stale.

## Direction

Flat, light-first, restrained. The reference points are Notion, Linear, and
OpenAI's Codex — productivity tools, not dashboard SaaS or "AI launchpad"
templates. Character comes from typography, spacing, and a single confident
brand accent, not from chrome, gradients, or animation.

The app reads as a **tool**. Light is the default and the design is tuned for
it; dark is a faithful inversion of the same layout, not a separate skin.

### What we are NOT

- No frosted glass, no ambient gradient glow, no neumorphism, no skeuomorphic depth.
- No stacked or heavy shadows. Surfaces are flat; elevation is a hairline border.
- No Inter / Roboto / system-font default look.
- No scattered micro-interactions (button bounces, input wiggles).
- No second brand hue. Blue is the only accent (with disciplined exceptions, below).

## Tokens

All tokens live in **`src/index.css`** as CSS custom properties, exposed to
Tailwind via `@theme inline`. Use the shadcn utility names (`bg-background`,
`text-muted-foreground`, `border-border`, `bg-primary`…) — **never hardcode a
color**. The palette is built on `oklch()`; the brand blue is the one literal hex.

### Color — light (`:root`, default)

```
--background          oklch(1 0 0)             pure white, page base
--foreground          oklch(0.24 0.006 285)    near-black text
--card / --popover    oklch(1 0 0)             flat surfaces (= background)
--secondary           oklch(0.968 …)           alt surface fills
--muted               oklch(0.97 …)            muted backgrounds
--muted-foreground    oklch(0.55 …)            secondary / dim text
--accent              oklch(0.965 …)           hover/active surface tint
--destructive         oklch(0.58 0.22 27)      red — delete / overdue only
--border / --input    oklch(0.922 …)           hairline borders
--primary             #1218fc                  Taffk brand blue — THE accent
--ring                #1218fc                  focus outline (= primary)
--sidebar*            near-white set           dedicated sidebar surface tokens
```

### Color — dark (`.dark`)

A straight inversion of the same token table — the layout and component
classes never change, only the values:

```
--background   oklch(0.17 …)      very dark canvas
--foreground   oklch(0.96 …)      off-white text
--card         oklch(0.205 …)     raised-but-flat surface
--muted        oklch(0.26 …)
--border       oklch(1 0 0 / 9%)  white at 9% opacity
--primary      #1218fc            same brand blue in both themes
```

**Single-accent rule.** Brand blue `#1218fc` is the only hue used decoratively.
If something needs to stand out, reach for text contrast, weight, or a border
before introducing a second color. Unlike the old dark-only system, the blue is
**not** brightened in dark mode — `#1218fc` is used verbatim in both themes.

### Disciplined exceptions to single-accent

These exist on purpose; don't add more without a design discussion:

- `--destructive` (red) — delete actions and the overdue-task badge/ring.
- `text-emerald-500` / `bg-emerald-500` — the "Done" / completion signal
  (Kanban done column icon, subtask progress bar). Green = finished.
- **`ProjectPie` / Time view** — a deliberate 10-color categorical palette
  (cyan, orange, green, red, purple, pink, teal, slate, …). Data viz needs
  distinguishable slices; the single-accent rule does not apply to charts.

### Radii

`--radius: 0.625rem` (10px) is the base; the scale derives from it.

```
--radius-sm   6px   badges, kbd, small chips
--radius-md   8px   inputs, code blocks
--radius-lg   10px  default
--radius-xl   14px  cards, columns, drop zones
```

In practice: cards/columns use `rounded-xl`, task & kanban cards `rounded-lg`,
small inline elements `rounded-md`/`rounded-sm`.

### Shadow

Effectively none. Flat surfaces sit on a `border`. The only shadow is a
**subtle `hover:shadow-sm`** on draggable cards to signal grab-ability. Do not
stack shadows or introduce harder drops — elevation is communicated by borders
and background tint (`bg-muted/30`, `bg-accent`), not depth.

### Spacing rhythm

Tailwind's scale, used consistently:

- `gap-0.5` between nav items · `gap-1.5` inline · `gap-2.5`–`gap-3` groups · `gap-4`+ page-level
- Cards: `px-3 py-2.5` compact · detail panel `px-5`
- Page padding: `px-6 pt-8 pb-*` standard across views
- Scroll pattern: `min-h-0 flex-1 overflow-y-auto` for every scrollable main area

## Typography

Three variable fonts, loaded via `@fontsource-variable/*` in `index.css`:

- **Display** — `Bricolage Grotesque Variable` (`font-display`). View titles only:
  `font-display text-3xl font-bold tracking-tight`.
- **Body / UI** — `Geist Variable` (`font-sans`). Distinctive but restrained;
  not SF, not Inter. Base **15px**, `letter-spacing: -0.005em`.
- **Mono** — `Geist Mono Variable` (`font-mono`). Counts, time values (`MM:SS`),
  kbd, code, anything that reads as "data".

Details that matter:

- `font-feature-settings: 'ss01', 'cv11'` — Geist's open digits & alternate
  lowercase, applied on `body`.
- Anti-aliasing: `-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale`.
- Section labels: `text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60`.
- Field labels: `text-[13px] text-muted-foreground`.
- Task body: `text-[15px] leading-snug`. Avoid bold on body text.

## Theme

Light is default. `lib/theme.ts` (`useThemeStore`, Zustand) toggles the `.dark`
class on `<html>` — shadcn convention. Four modes:

- **light** / **dark** — explicit.
- **system** — follows the OS `prefers-color-scheme`.
- **schedule** — dark between `scheduleStart` (default `20:00`) and
  `scheduleEnd` (`08:00`); re-evaluated every 30s.

Persisted in `localStorage`: `taffk.theme.mode`, `taffk.theme.scheduleStart`,
`taffk.theme.scheduleEnd`. Configured in **Settings → Appearance** (a 4-up
button grid; active = `border-primary bg-primary/5`).

> **Known gap:** CodeMirror / the notes editor does not yet swap its editor
> theme alongside the body theme. Rendered markdown (`.preview`) and the rest of
> the UI are fully themed via tokens.

## Layout

Full-window app shell — a **resizable sidebar** + a swappable main view, plus
overlays. Root: `flex h-screen w-screen overflow-hidden bg-background text-foreground`.

```
┌────────────┬─────────────────────────────────────┐
│ Sidebar    │  Main view                          │
│ (resizable │   ┌─ header (font-display title) ─┐  │
│  ~280px,   │   │ quick-add / view content      │  │
│  collapses │   │ scrollable area               │  │
│  to ~52px) │   └───────────────────────────────┘  │
│            │                                       │
│ pomodoro   │                                       │
│ profile    │                                       │
└────────────┴─────────────────────────────────────┘
   + Task detail panel (right, w-440px, slide-in)
   + Spotlight overlays (search / new-task, centered modal)
   + Sticky-note windows (separate frameless Tauri windows)
```

- **Sidebar** is its own surface (`bg-sidebar` token set). A drag handle on its
  right edge resizes it (min ~240px); it collapses to a ~52px icon rail. Width
  state in `lib/sidebar.ts`.
- **Main** (`flex min-w-0 flex-1 flex-col overflow-hidden`) renders exactly one
  view. Each view opens with a header: `h1.font-display.text-3xl.font-bold` +
  optional `text-muted-foreground/70` subtitle, then a `min-h-0 flex-1 overflow-y-auto` body.
- **Settings** swaps the whole shell for its own sidebar (`SettingsSidebar`) +
  settings view, same resizable/collapsible behavior.

## Components & views

### Sidebar (`Sidebar.tsx`)

Brand mark → **Quick Add** button (`SquarePen`, `text-primary`) → nav (Today /
All / Board / Calendar, each with a count + `kbd` hint) → collapsible **Projects**
section (with a sort dropdown) → Search / Tags / Time nav → foot: Pomodoro
widget, profile (emoji + name), Settings.

- Active item: `bg-sidebar-accent font-medium text-sidebar-accent-foreground`,
  icon `text-primary`.
- Hover: `bg-sidebar-accent/60`.

### Task list (`TaskListView.tsx` / `TaskItem.tsx`)

Open tasks grouped above completed ("N en cours" / "N complétées"); rows drag
between groups. Keyboard: `j`/`k` navigate, `x` toggle done, `Enter` open detail.

A task card: `rounded-xl border bg-card px-3 py-2.5`, `text-[15px] leading-snug`
— checkbox + inline-editable title + meta badges (project pill with folder icon,
`#tag` `variant="secondary"` badges, estimate) + hover action buttons
(`opacity-0 group-hover:opacity-100`: pomodoro play, schedule-today, notes, archive).

- Focused: `border-ring ring-1 ring-ring`.
- Overdue: `border-destructive/40 ring-1 ring-destructive/20` + `ClockAlert` badge.
- Done: `bg-muted/40`, title struck through and muted.

### Quick-add & spotlights

- **QuickAdd** parses `#tag` and `@projet` inline as you type.
- **TaskSpotlight** (new-task modal) — title + date/time/estimate pickers, with
  autocomplete chips for `#tag` / `@project` (suggests creating when no match).
- **SearchSpotlight** (Cmd/Ctrl+F) — input + ranked results (title > project/tag >
  notes), match highlighted with `bg-primary/20`; icons per match type.

### Task detail (`TaskDetail.tsx`)

Right-side panel, `w-[440px]`, `animate-in slide-in-from-right-8`. Stacked
fields (`flex flex-col gap-5`): title textarea, project, estimate, schedule
(with date-picker calendar), time-spent (primary pomodoro button), tags
(inherited = dashed border, own = solid), subtasks (progress bar `bg-emerald-500`,
collapsible), notes (markdown preview / editor), created timestamp.

### Kanban (`KanbanBoard.tsx`)

Three columns (`rounded-xl border bg-muted/30`); drag-over lights the column
`border-ring bg-accent`. Cards: `rounded-lg border bg-card px-3 py-2.5`,
`cursor-grab`, `hover:shadow-sm`. Status icons — Todo `text-muted-foreground`,
In-Progress `text-primary`, Done `text-emerald-500`.

### Calendar (`CalendarView.tsx` + `calendar-theme.css`)

`react-big-calendar` + drag-drop addon, Month/Week/Day via a `ButtonGroup`.
Themed entirely through tokens: flat `var(--border)` grid at `--radius-lg`,
today cell a 6% primary tint, current-time line 2px primary, events filled
`var(--primary)` with a darker 3px left border and white text, done events
`opacity .55` + strikethrough.

### Time / data views

- **TimeView** — totals, a 7×52 activity heatmap (`bg-primary` at 5 opacity
  steps), and a project pie. **TagsView** — editable tag rows + inline color
  picker. **ProjectPie** — custom SVG donut, 10-color categorical palette.

### Pomodoro (`PomodoroWidget.tsx`)

Lives in the sidebar foot. Big primary play button (`bg-primary`, `size-14`,
`rounded-2xl`, `hover:scale-[1.03] active:scale-95`) + `MM:SS` mono timer,
progress, and today's total; collapses to an icon button. Repeat count (1–6)
and slice length (15–60 min) via dropdowns.

### Sticky note (`StickyNoteWindow.tsx`)

A separate **frameless, always-on-top Tauri window** pinning one task.
`rounded-[5%] border bg-card`, a primary-blue draggable header
(`data-tauri-drag-region`), task body, SE resize grip; window background is
transparent so the rounded corners reveal the desktop.

## shadcn/ui primitives

Generated into `components/ui/` (new-york style). Present: `button`,
`button-group`*, `input`, `select`, `checkbox`, `switch`, `slider`, `calendar`,
`dialog`, `alert-dialog`, `sheet`, `dropdown-menu`, `context-menu`, `tooltip`,
`progress`, `badge`, `separator`, `scroll-area`, `kbd`*.

`button-group` and `kbd` are the notable custom-ish additions. Add new
primitives with `npx shadcn@latest add <name>` — don't hand-roll what shadcn
ships.

## CSS files (the only non-Tailwind styling)

Four `.css` files; everything else is Tailwind utilities + tokens.

- **`src/index.css`** — the source of truth: Tailwind entry, `@theme` tokens,
  `:root` / `.dark` palettes, fonts, base layer.
- **`components/tasks/markdown.css`** (`.preview`) — rendered-markdown prose
  (13.5px, headings, code, blockquotes with a primary left-border, tables,
  mermaid, kbd). Fully token-themed, no hardcoded colors.
- **`components/tasks/notes-editor.css`** — TipTap/ProseMirror editor: task-list
  checkboxes (`accent-color: var(--primary)`), done = muted + strikethrough,
  muted placeholder.
- **`components/views/calendar-theme.css`** — `react-big-calendar` overrides
  (see Calendar, above).

## Animation principles

- Entrance: `animate-in` (e.g. detail panel `slide-in-from-right-8`). No
  per-item stagger.
- Hover/focus transitions ~120–200ms, `ease`. No springy/bouncy easings.
- The one playful touch is the pomodoro button's `hover:scale` / `active:scale`.
  Reserve motion for genuine feedback; never decorate.

## When to break the rules

If the current system can't express a new feature:

- prefer **adding a token** to redefining an existing one;
- prefer **adding a shadcn component** to overloading an existing one;
- prefer **extending** the radius / spacing scale to a one-off value;
- if you reach for a new hue (beyond blue, destructive-red, done-green, or the
  chart palette), **stop and propose a token** in the design discussion first.
