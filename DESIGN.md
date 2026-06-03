# DESIGN.md

Visual identity for the Taffk frontend.

## Direction

Refined minimal. Closer to Apple's own apps, Linear, Capacities, OpenAI's
ChatGPT desktop than to dashboard SaaS. Restraint is the point — character
comes from typography, spacing, and atmosphere, not from heavy chrome or
loud animation.

The app reads as a tool, not a brand showcase. The single bold choice is
an electric-blue ambient gradient (brand `#1218FC`) that anchors the dark
canvas and gives the whole surface a soft glow.

## What we are NOT

- No Inter / Roboto / system-font default look.
- No purple gradient on white. No "AI launchpad" template.
- No skeuomorphic depth. No glassy buttons. No neumorphism.
- No scattered micro-interactions (button bounces, input wiggles, etc.).

## Tokens

Defined in `src/app.css`. Use the variables; never hardcode.

### Color

```
--bg-base          #0b0b0c               page base
--bg-glow-primary  brand-blue/0.16       ambient glow, bottom-left
--bg-glow-secondary violet/0.06          ambient glow, top-right (counterweight)

--surface          rgba(22,22,24,0.62)   floating cards (frosted)
--surface-strong   rgba(28,28,30,0.88)   reserved for modals
--surface-hover    rgba(255,255,255,0.035)

--border           rgba(255,255,255,0.07)  default
--border-strong    rgba(255,255,255,0.12)  emphasis
--border-focus     rgba(61,68,255,0.5)     focused inputs

--text             rgba(255,255,255,0.94)
--text-dim         rgba(255,255,255,0.62)
--text-faint       rgba(255,255,255,0.38)
--text-whisper     rgba(255,255,255,0.22)

--accent           #3d44ff               brand blue (dark theme) — single accent
--accent-soft      rgba(61,68,255,0.16)  soft fills, focus rings, mark
```

Brand color is `#1218FC`. It's used verbatim in the light theme; the dark
theme brightens it to `#3d44ff` for legibility on near-black (same pattern
as any accent that has to read as text on the dark canvas).

**Single-accent rule**: brand blue only. If something needs to stand out, lean
on text contrast or borders before introducing a second hue. Status colors
(error red, success green) wait until a feature genuinely needs them.

### Typography

- **UI / body**: `Geist Variable` — distinctive but restrained. Fits the
  Apple/Linear feel without being SF or Inter.
- **Mono**: `Geist Mono Variable` — paths, kbd, mode badge, anything that
  reads as "data" or "code".
- `letter-spacing: -0.005em` baseline; `-0.012em` on the search input
  (display-sized text reads tighter).
- `font-feature-settings: "ss01", "cv11"` — Geist's open digits and
  alternate lowercase. Subtle but worth it.
- Avoid bold on body text; weight range is **350 / 400 / 500**.

### Radii

```
--radius-card    14px   floating surfaces
--radius-pill    6px    badges, kbd
items inside cards  10px (slightly less than the card)
```

### Shadow

One shadow recipe for every floating surface:

```
0 1px 0 rgba(255,255,255,0.04) inset,    /* top edge highlight */
0 24px 60px -20px rgba(0,0,0,0.55)        /* long, soft drop */
```

Don't stack multiple shadows. Don't introduce harder shadows.

### Spacing rhythm

Loose, but consistent.

- 24px gutter on the shell
- 8px between bar and results
- 14px / 18px paddings inside cards
- 16px above the hint footer
- `14vh` top margin on the shell — leaves headroom; not vertically centered.

## Theme

Two themes share the same accent and the same component layout — only
the token table swaps.

- **Dark** (default): `#0b0b0c` base, brand-blue ambient glow, frosted
  surfaces over near-black. Accent brightened to `#3d44ff`.
- **Light** (`[data-theme='light']`): cool off-white `#f4f5fb` base, the
  same blue radial glow at lower opacity, white frosted surfaces with a
  shorter softer drop shadow, accent set to the exact brand `#1218fc`.

Toggling lives in the sidebar foot. State persists in `localStorage`
under `taffk.theme`. CodeMirror still ships oneDark in both themes —
swapping editor themes alongside the body theme is a known gap.

## Layout

Full-window app shell:

```
┌─────────┬─────────────────────────┐
│ Sidebar │ Top bar (search + open) │
│ 260 px  ├─────────────────────────┤
│         │                         │
│  Notes  │   Welcome   |   Panes   │
│  list   │  (no panes) | (1 or 2)  │
│         │                         │
└─────────┴─────────────────────────┘
```

The sidebar collapses to 0 (slot still in DOM). When collapsed, a small
toggle appears in the top bar. `Ctrl+B` toggles either way. State persists
in `localStorage` under `taffk.sidebar`.

The command palette is a fixed-position modal (`Ctrl+K`), centered with a
backdrop blur. It hosts the search input, the literal/fuzzy mode badge,
and the result list. Click a result → palette closes and the note opens.
`Ctrl+Shift+click` opens in a second pane (split). Escape closes the
palette without touching the panes.

## Components

- **`.app`** — flex shell, `100vh × 100vw`, `overflow: hidden`. Holds the
  sidebar slot and the main area.
- **Sidebar** — flex column, frosted on `--sidebar-bg`. Brand mark at the
  top, search trigger, section label + notes list (scrollable), bottom
  controls (theme toggle, settings).
- **`.search-trigger`** — pill-shaped button mimicking an input; opens
  the palette modal. Right side shows `⌘K` / `Ctrl+K` kbd hint.
- **`.note-entry`** — sidebar list item. `.active` paints the accent
  background and accent text — used for any path currently in a pane.
- **`.topbar`** — main-area header with the sidebar toggle (only when
  collapsed) and a small "Search" pill that mirrors the sidebar trigger.
- **`.palette-backdrop`** — fixed full-screen, `rgba(0,0,0,0.42)` with a
  soft blur. Click outside the palette card or Esc to close.
- **`.palette`** — frosted card, max-width 720px. Same primitives
  (input, mode badge, results) as the slice-1 palette, just modal now.
- **`.editor-pane`** — frosted card. Header with path, edit/preview tabs,
  save indicator, close button. Body holds Editor or Preview.
- **`.mode-badge`** — mono pill. `.mode-literal` (gray) / `.mode-fuzzy`
  (brand blue). Shown inside the palette only.
- **`.path`** — mono, faint, ellipsis on overflow.
- **`.snippet`** — line-height 1.55. `<mark>` uses a bottom-up gradient
  (highlighter, not box).
- **`.welcome`** — initial empty state in the main area. Large brand
  gradient mark + tagline + Ctrl+K hint.

## Animation principles

- One entrance animation on the shell. No per-item stagger (yet).
- All hover/focus transitions are **120–200ms, ease**.
- No springy / bouncy easings. Cubic-bezier(0.2, 0.8, 0.2, 1) for entrance,
  ease for state changes.
- Reserve elaborate motion for moments of genuine delight (first run,
  command-execution feedback). Never decorate.

## When to break the rules

If you're adding a feature the current system can't express:

- prefer **adding a new token** to redefining an existing one
- prefer **adding a component** to overloading an existing one
- prefer **extending** the radii / spacing scale to one-off values
- never duplicate the blue/violet gradient — it is the canvas signature

If you find yourself reaching for a green checkmark or a red error blob,
stop and propose a token in the design discussion before adding it.
