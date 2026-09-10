# AGENTS.md

Local-first personal work manager. Tauri 2 + React 19
+ TypeScript. Tasks/projects/tags/focus-time persisted in a single local SQLite
file owned by the Rust backend.

> History: Taffk began as a RAM-only notes spotlight (Svelte). It was migrated to
> React and refocused into a work manager; persistence (SQLite) was added on
> purpose because the product's job changed from *searching notes* to *managing
> work*. The old notes editor/preview live on as a task's markdown description.

## Stack

- **Tauri 2.x** (MSVC toolchain on Windows). `crate-type = ["staticlib", "cdylib", "rlib"]`
  is mobile-ready by default; we ship desktop only.
- **Frontend**: React 19 + TypeScript strict + `verbatimModuleSyntax`, Vite 5.
  State via **Zustand**. No router — top-level views switch on a `view` field
  in the store.
- **Styling**: **Tailwind CSS v4** (Vite plugin, CSS-first config in `index.css`)
  + **shadcn/ui** (`components/ui/*`, new-york style, Radix under the hood). Design
  direction is flat & light (Notion/Codex). `lucide-react` for icons. Bricolage
  Grotesque (`font-display`) for view titles, Geist for body, Geist Mono for code.
- **Storage**: **SQLite** via `rusqlite` (bundled feature → no system SQLite).
  The Rust backend owns the connection and exposes IPC commands. No ORM, no
  migration framework — one idempotent `CREATE TABLE IF NOT EXISTS` bootstrap.
- **Editor / preview**: CodeMirror 6 (`@uiw/react-codemirror`, `@codemirror/lang-markdown`,
  `oneDark`) for task notes; `markdown-it` for the preview.
- **Calendar**: `react-big-calendar` + the drag-and-drop addon (week/day views,
  drag-to-move and resize-to-extend events), localized with `date-fns` (fr).
- **CLI + MCP**: `taffk-cli` (clap) shares the data layer with the app through
  the `taffk-core` crate and embeds a stdio MCP server (`taffk-cli mcp`,
  hand-rolled JSON-RPC, no async runtime). Same SQLite file as the app.

## Where we are

Migration + refactor complete. Landed slices:

- [x] **Foundation** — Svelte→React migration, SQLite backend, Today/All/Project
  views, keyboard quick-add (`#tag` / `@projet`), done/delete/schedule.
- [x] **Task detail drawer** — title/project/tags/estimate/schedule + markdown notes.
- [x] **Kanban board** — status columns with native drag-and-drop.
- [x] **Pomodoro + time tracking** — focus timer (sidebar), `time_entries`,
  per-task `spent_minutes`.
- [x] **Week planner** — `react-big-calendar` week/day grid: drag-to-move,
  resize-to-extend, click-empty-slot to create, click event to open detail.
- [x] **UI refonte** — Tailwind v4 + shadcn/ui, flat light/dark theme (Notion/Codex),
  centered task cards. `app.css` removed; tokens live in `index.css`.
- [x] **CLI, MCP & docs** — `taffk-core` crate (db + models + shared `ops`),
  `taffk-cli` binary (terminal + `--json` + `taffk-cli mcp` server), in-app
  Documentation view (`docs/*.md` rendered from markdown), `skills/taffk/SKILL.md`.

Roadmap items beyond this live in `/tasks/list.md` and the issue tracker.

## Architecture

```
src-tauri/                — Cargo workspace root (app crate + crates/*)
  src/
    main.rs       — windows_subsystem flag + taffk_lib::run()
    lib.rs        — Tauri setup: opens the DB in app_data_dir, manages Db state,
                    tray, global shortcut (Ctrl+Shift+Space), hide-on-close,
                    polls `PRAGMA data_version` to notice CLI/MCP writes
    commands.rs   — #[tauri::command] CRUD surface (tasks/projects/tags/time)
  crates/taffk-core/src/  — shared data layer (no Tauri dependency)
    db.rs         — Db { Arc<Mutex<Connection>> }, schema bootstrap, all queries,
                    unit tests (open_in_memory helper)
    models.rs     — serde DTOs (camelCase) + input structs (NewTask, TaskPatch)
    ops.rs        — rules shared by CLI + MCP: handle resolution (id prefix /
                    name / alias / title), `#tag @projet` parsing, done/status
                    sync with subtask cascade, filters, resolved views
    paths.rs      — platform DB path mirroring Tauri's app_data_dir, TAFFK_DB
  crates/taffk-cli/src/   — `taffk-cli` binary
    main.rs       — clap commands (task/project/tag/time/stats/export/import/
                    db/mcp/skill), `--json`, embeds skills/taffk/SKILL.md
    mcp.rs        — stdio MCP server: initialize / tools/list / tools/call
    render.rs     — human output
docs/                     — user docs (markdown), rendered in-app by DocsView
  overview.md · agents.md · cli.md · skill.md
skills/taffk/SKILL.md     — agent skill, installed by `taffk-cli skill install`
src/
  App.tsx           — shell (sidebar + main, flat), view switch, detail drawer, Esc
  index.css         — Tailwind entry: @theme tokens + shadcn palette (:root + .dark,
                      flat Notion/Codex), fonts, base layer. THE styling source.
  main.tsx          — React root (imports index.css only)
  lib/
    api.ts          — THE boundary. Typed invoke wrappers + DTO types mirroring
                      Rust field-for-field. Falls back to mockBackend outside Tauri.
    mockBackend.ts  — in-memory Backend impl for browser preview/screenshots
    store.ts        — Zustand data store (tasks/projects/tags + UI state, quick-add)
    pomodoro.ts     — Zustand timer store (separate; survives view changes)
    theme.ts        — dark/light via `.dark` class on <html>, persisted (taffk.theme)
    markdown.ts     — markdown-it instance
    dates.ts        — local-date (non-UTC) helpers for scheduling
    utils.ts        — `cn()` (clsx + tailwind-merge)
  components/
    ui/             — shadcn primitives (button, input, checkbox, select, sheet,
                      dropdown-menu, scroll-area, separator, tooltip, badge, progress)
    Sidebar / TaskListView / TaskItem / QuickAdd / TaskDetail / MarkdownNotes /
    KanbanBoard / CalendarView / PomodoroWidget / KeyboardHelp
    DocsSidebar / views/DocsView — Documentation view: `docs/*.md?raw` →
                      `renderDocs()` (heading ids + "on this page" rail),
                      copy buttons on code blocks, `.md` links map to sections
    markdown.css        — rendered-markdown (.preview) prose, themed via shadcn tokens
    calendar-theme.css  — react-big-calendar overrides, themed via shadcn tokens
```

`src/lib/api.ts` is the only seam between front and Rust. Types here mirror the
Rust DTO structs (which use `#[serde(rename_all = "camelCase")]`).

### Data model (SQLite)

`projects`, `tags`, `tasks`, `task_tags` (join), `time_entries`. The full schema
is created up front so planned features need no migration. A task carries
`done` + `status` (kept in sync by the store), `scheduled_for` (daily/calendar),
`estimate_minutes` / `spent_minutes`, `parent_id` (subtasks, reserved).

## Conventions

- **No comments unless they explain *why*.** Names carry the *what*.
- **DTOs are camelCase across IPC** (serde `rename_all`); Tauri auto-maps
  camelCase JS command args to snake_case Rust params.
- **`done` and `status` never drift**: the store is the single source of truth —
  `toggleDone` sends both `done` and `status`; `moveTask` derives `done` from the
  target column. Don't set one without the other.
- **No backwards-compat shims** during a slice — just edit the code.
- **Commit messages**: `<type>(<scope>): <subject>` + body explaining the *why*.
- **Styling**: Tailwind utilities + shadcn tokens (`bg-background`, `text-muted-foreground`,
  `border-border`, `bg-primary`…). Never hardcode colors. Tokens are defined in
  `index.css`; add a new shadcn component with `npx shadcn@latest add <name>`.

## Git policy

- The harness blocks direct push to `main`. Work on a feature branch.
- Lockfiles (`Cargo.lock`, `package-lock.json`) are committed for reproducibility.

## Common commands

```sh
npm install                    # first time only
npm run tauri dev              # dev (cold Rust build ~5 min, then incremental)
npm run check                  # tsc --noEmit
npm run build                  # tsc + vite build
cd src-tauri && cargo check    # Rust-only fast check (needs Tauri libs)
cd src-tauri && cargo test --workspace          # all Rust unit tests
cd src-tauri && cargo test -p taffk-core -p taffk-cli   # no Tauri libs needed
cd src-tauri && cargo run -p taffk-cli -- --db /tmp/t.db task list
```

## Gotchas

- **`cargo check` needs the Tauri Linux libs** (webkit2gtk-4.1, gtk-3, libsoup-3,
  librsvg2, libayatana-appindicator3) on Linux. `tauri dev` also needs a display.
  `taffk-core` and `taffk-cli` build without them (`-p`), so the data layer and
  the CLI/MCP can be tested anywhere.
- **The CLI binary is `taffk-cli`**, not `taffk`: the app binary already owns
  that name in `target/`, and a GUI-subsystem exe has no console for MCP stdio.
- **External writes**: the app notices CLI/MCP commits by polling SQLite's
  `data_version` (1s) and emits the same `taffk://data-changed` event the sticky
  windows use, so the store reloads. `busy_timeout` is set so concurrent access
  waits instead of failing.
- **Docs are markdown** imported with `?raw` from `docs/` (outside `src/`, fine
  for Vite). The first `# Title` is hidden in-app (shown in the header) so the
  files still read well on GitHub. Cross-page links are `cli.md#anchor`.
- **DB location**: `app_data_dir()/taffk.db`, created in `.setup()` before
  `app.manage(db)`. Not in the repo.
- **Tauri 2 plugin permissions**: any plugin (e.g. `global-shortcut`) needs an
  entry in `capabilities/default.json` (`core:default` + `global-shortcut:default`).
- **Browser preview**: when `window.__TAURI_INTERNALS__` is absent, `api.ts`
  uses `mockBackend` (reseeded each load, not persisted). Lets `vite dev` run in
  a plain browser for screenshots.
- **CodeMirror notes save** is debounced (500ms), flushed on preview/close/unmount.
  The `MarkdownNotes` component is keyed by task id so switching tasks remounts
  it cleanly (no cross-task save).
- **Pomodoro interval** runs in the always-mounted `PomodoroWidget` (one
  `setInterval` gated on `running`); the timer store is separate from the data
  store so it survives view changes.
- **Dates**: use `lib/dates.ts` (local Y-M-D), not `toISOString().slice(0,10)`
  in new code paths — the latter is UTC and can be off by a day near midnight.
- **CodeMirror stays `oneDark`** in both themes (light editor theme deferred) — a
  dark notes box on the light theme is a known, accepted gap.
- **Theme** toggles the `.dark` class on `<html>` (shadcn convention); light is the
  default. Path alias `@/*` → `src/*` (tsconfig + vite).

## Don'ts

- Don't add an ORM, a migration framework, or a second persistence layer — the
  single bootstrapped SQLite file is the whole story.
- Don't add cloud sync, login, or telemetry.
- Don't add a config file for behavior tuning until there's a real second need.
- Don't bypass `src/lib/api.ts` to call `invoke` directly from components.
- Don't let `ops.rs` and `store.ts` drift: quick-add parsing, project/tag
  reuse and the done/status cascade exist in both (Rust for CLI/MCP, TS for
  the app). Change one, change the other.
- Don't set `done` without `status` (or vice-versa) — go through the store actions.
