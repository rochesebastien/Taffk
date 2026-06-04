# CLAUDE.md

Local-first personal work manager (SuperProductivity-style). Tauri 2 + React 19
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
- **Storage**: **SQLite** via `rusqlite` (bundled feature → no system SQLite).
  The Rust backend owns the connection and exposes IPC commands. No ORM, no
  migration framework — one idempotent `CREATE TABLE IF NOT EXISTS` bootstrap.
- **Editor / preview**: CodeMirror 6 (`@uiw/react-codemirror`, `@codemirror/lang-markdown`,
  `oneDark`) for task notes; `markdown-it` for the preview.

## Where we are

Migration + refactor complete. Landed slices:

- [x] **Foundation** — Svelte→React migration, SQLite backend, Today/All/Project
  views, keyboard quick-add (`#tag` / `@projet`), done/delete/schedule.
- [x] **Task detail drawer** — title/project/tags/estimate/schedule + markdown notes.
- [x] **Kanban board** — status columns with native drag-and-drop.
- [x] **Pomodoro + time tracking** — focus timer (sidebar), `time_entries`,
  per-task `spent_minutes`.
- [x] **Week planner** — 7-day calendar, drag-to-reschedule, backlog, per-day add.

Roadmap items beyond this live in `/tasks/list.md` and the issue tracker.

## Architecture

```
src-tauri/src/
  main.rs       — windows_subsystem flag + taffk_lib::run()
  lib.rs        — Tauri setup: opens the DB in app_data_dir, manages Db state,
                  tray, global shortcut (Ctrl+Shift+Space), hide-on-close
  db.rs         — Db { Arc<Mutex<Connection>> }, schema bootstrap, all queries,
                  unit tests (open_in_memory helper)
  models.rs     — serde DTOs (camelCase) + input structs (NewTask, TaskPatch)
  commands.rs   — #[tauri::command] CRUD surface (tasks/projects/tags/time)
src/
  App.tsx           — shell (sidebar + main), view switch, detail drawer, Esc
  app.css           — design tokens (dark + [data-theme='light']) + every rule
                      (sidebar/list/board/calendar/detail/pomodoro + .preview prose)
  main.tsx          — React root
  lib/
    api.ts          — THE boundary. Typed invoke wrappers + DTO types mirroring
                      Rust field-for-field. Falls back to mockBackend outside Tauri.
    mockBackend.ts  — in-memory Backend impl for browser preview/screenshots
    store.ts        — Zustand data store (tasks/projects/tags + UI state, quick-add)
    pomodoro.ts     — Zustand timer store (separate; survives view changes)
    theme.ts        — dark/light, persisted in localStorage (taffk.theme)
    markdown.ts     — markdown-it instance
    dates.ts        — local-date (non-UTC) helpers for scheduling
  components/
    Sidebar / TaskListView / TaskItem / QuickAdd / TaskDetail / MarkdownNotes /
    KanbanBoard / CalendarView / PomodoroWidget
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
- **Design tokens**: use the CSS variables in `app.css`; never hardcode colors.

## Git policy

- The harness blocks direct push to `main`. Work on a feature branch.
- Lockfiles (`Cargo.lock`, `package-lock.json`) are committed for reproducibility.

## Common commands

```sh
npm install                    # first time only
npm run tauri dev              # dev (cold Rust build ~5 min, then incremental)
npm run check                  # tsc --noEmit
npm run build                  # tsc + vite build
cd src-tauri && cargo check    # Rust-only fast check
cd src-tauri && cargo test     # Rust unit tests
```

## Gotchas

- **`cargo check` needs the Tauri Linux libs** (webkit2gtk-4.1, gtk-3, libsoup-3,
  librsvg2, libayatana-appindicator3) on Linux. `tauri dev` also needs a display.
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
- **CodeMirror stays `oneDark`** in both themes (light editor theme deferred).

## Don'ts

- Don't add an ORM, a migration framework, or a second persistence layer — the
  single bootstrapped SQLite file is the whole story.
- Don't add cloud sync, login, or telemetry.
- Don't add a config file for behavior tuning until there's a real second need.
- Don't bypass `src/lib/api.ts` to call `invoke` directly from components.
- Don't set `done` without `status` (or vice-versa) — go through the store actions.
