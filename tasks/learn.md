# Learnings & decisions log

Running notes: decisions, gotchas, and things to remember. Newest at top of each section.

## Key decisions

- **Storage = SQLite owned by Rust (rusqlite, bundled feature).** User picked
  "SQLite" in Q1 and clarified Q4 as "keep Rust, just React instead of Svelte".
  So instead of `tauri-plugin-sql` (frontend-facing), the Rust backend owns the
  DB and exposes IPC commands — matches the existing `commands.rs` pattern and
  honors "keep Rust for business logic". `bundled` feature ships SQLite so no
  system dependency (important for Windows MSVC target).
- **IDs + timestamps in Rust.** UUIDv4 via `uuid` crate; timestamps via SQLite
  `datetime('now')`. Avoids a chrono dependency and keeps the backend authoritative.
- **Notes → task descriptions.** The markdown editor (CodeMirror) + markdown-it
  preview get reused as the task "notes" field. Standalone notes/search/capture/
  watcher Rust modules are dropped.
- **State management = Zustand.** Minimal, idiomatic, avoids prop-drilling and
  Context re-render pitfalls. Not over-engineered (no Redux). User maîtrise React.
- **No router.** Few top-level views (Today/Projects/Kanban/Calendar) switched via
  a `view` field in the store. A desktop app with a handful of views doesn't need
  react-router.
- **CodeMirror in React via `@uiw/react-codemirror`** (clean React wrapper) rather
  than hand-wiring the raw `codemirror` package in a useEffect.
- **Full schema up front.** projects/tags/tasks/task_tags/time_entries all created
  in the first migration so planned features (kanban status, pomodoro time_entries,
  scheduling) don't need later migrations. CLAUDE.md says "no migration layer" — we
  keep a single idempotent `CREATE TABLE IF NOT EXISTS` bootstrap, not a framework.

## Gotchas encountered

- Original app was RAM-only, no persistence by design (CLAUDE.md "Don'ts"). This
  refactor intentionally reverses that — the app's purpose changed from notes
  spotlight to work manager, so persistence is now required. Documented in new CLAUDE.md.
- Cannot run `tauri dev` in this headless env (needs a display + ~5min cold Rust
  build). Verification relies on `cargo check`/`cargo test` (Rust) and
  `vite build`/`tsc`/`svelte-check`→ now `tsc` (frontend).

## User follow-up requirements (added after kickoff)

- **Screenshot each finished feature.** Headless env has no Tauri GUI, so: the
  `api.ts` layer falls back to an in-memory mock when `window.__TAURI__` is
  absent → the app runs in a plain browser (Vite dev server) and I screenshot
  it with headless Chromium (Playwright, installed ad-hoc, NOT a project dep).
  The mock is a genuine dev affordance (browser preview without the desktop shell).
- **Commit + push after each finished task.**
- **If foundations + extra features are done**, study SuperProductivity's main
  features and take inspiration for further work.

## Parallelism strategy

- User asked to parallelize agents (referenced an Anthropic "ultracode/workflow"
  feature — not a product I can confirm by name; interpreting as subagent
  orchestration via the Agent tool).
- Parallelize only on **disjoint file sets** to avoid working-tree races. Good
  splits: Rust backend (`src-tauri/`) vs React frontend (`src/`); later
  kanban/pomodoro/calendar feature modules once the foundation contract is locked.
- Delegated agents must NOT run git or touch files outside their scope — the
  orchestrator (me) owns commits/pushes and integration.
- The locked contract that makes parallelism safe is `src/lib/api.ts` (command
  names, arg shapes, DTO field names). Backend and frontend both target it.

## Open follow-ups / known divergences

- **`status` vs `done` — RESOLVED in kanban phase.** The store is now the single
  source of truth: `toggleDone` sends `{done, status: done?'done':'todo'}` and
  `moveTask` sends `{status, done: status==='done'}`. Both backends apply both
  columns, so `done` and `status` never drift. `statusOf(task)` in KanbanBoard
  treats `done` as authoritative (done ⇒ 'done' column).
- **Native HTML5 drag-and-drop** for the board (no @dnd-kit dep). Note: Playwright
  can't reliably simulate native DnD, so the board's drag was verified by reading
  the handlers, not an automated drag test. Static render screenshotted.
- **`create_task` sets `sort_order = 0`** for all new tasks (orders fall back to
  `created_at`). Mock uses `tasks.length`. Fine until drag-reorder; `reorder_tasks`
  sets explicit orders. Revisit when implementing kanban/list drag.
- Dead notes-era CSS (`.editor-*`, `.view-tabs`, `.mode-badge`, `.result-button`,
  `.path`, `.snippet`, `.save-indicator`) still in app.css. `.preview` prose styles
  kept on purpose for task markdown notes. Prune the rest in Phase 6.

## Conventions kept from the old codebase

- Commit style: `<type>(<scope>): <subject>` + body explaining *why*.
- Design tokens in `app.css` — never hardcode colors; use CSS vars.
- Keep `lib.rs` tray + global shortcut (Ctrl+Shift+Space toggle) + hide-on-close.
