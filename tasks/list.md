# Task list — Svelte→React migration + productivity refactor

Branch: `claude/svelte-react-productivity-refactor-NUx7z`

Direction (validated with user before start):
- Storage: **SQLite**, owned by Rust (rusqlite), exposed via IPC commands.
- Notes: **integrated into tasks** (markdown task description, reuse editor/preview).
- Priority: **solid foundation first**, then kanban/calendar/pomodoro incrementally.
- Architecture: **Tauri React + Rust** — keep Rust backend, swap Svelte→React.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked/deferred

---

## Phase 0 — Setup & tracking
- [x] Map existing codebase (Svelte + Rust notes app)
- [x] Confirm direction with user
- [x] Create `/tasks/list.md` + `/tasks/learn.md`

## Phase 1 — Frontend tooling migration (Svelte → React)
- [x] Swap deps in `package.json` (remove svelte, add react/react-dom/@vitejs/plugin-react)
- [x] `vite.config.ts` → React plugin
- [x] `tsconfig.json` → React JSX, drop svelte-specific config
- [x] `index.html` → `/src/main.tsx`
- [x] Remove `svelte.config.js`, `src/*.svelte`, old `main.ts`
- [x] Minimal `main.tsx` + `App.tsx` mounting, app.css preserved (design tokens)
- [x] `npm install` + `vite build` green

## Phase 2 — Rust SQLite backend
- [x] Add `rusqlite` (bundled) + `uuid` to Cargo.toml; drop notes-only deps
- [x] `db.rs` — connection in app_data_dir, schema/migration on startup
- [x] Schema: projects, tags, tasks, task_tags, time_entries
- [x] `models.rs` — structs + DTOs mirroring schema
- [x] `commands.rs` — CRUD: tasks (create/list/update/toggle/delete), projects, tags
- [x] `lib.rs` — wire DB state, drop notes/watcher/search/capture modules; keep tray + shortcut
- [x] `cargo check` green + a unit test on the store

## Phase 3 — React foundation (data + shell)
- [x] `api.ts` — typed invoke wrappers for new commands
- [x] App store (zustand) — tasks/projects/tags state + actions
- [x] App shell layout (sidebar + main) reusing design tokens
- [x] Today view: task list (done toggle, delete, reorder later)
- [x] Keyboard quick-add input (type + Enter, parse `#tag` `@project` later)
- [x] `vite build` + `npm run check` green

## Phase 4 — Projects & tags
- [x] Sidebar project list + create/select
- [x] Tag chips on tasks (quick-add `#tag`, shown on items)
- [x] Filter task list by project (project view)
- [ ] Dedicated tag filter / tag management UI (deferred — revisit with detail panel)

## Phase 5 — Incremental features (depth after foundation)
- [x] Task detail panel + markdown notes (CodeMirror React + preview)
- [x] Kanban board (status columns, native drag/drop)
- [x] Pomodoro timer + time tracking (time_entries)
- [x] Calendar / week planner (drag-to-schedule, per-day quick add)

## Phase 6 — Docs & cleanup
- [x] Rewrite `CLAUDE.md` for new architecture
- [x] Update `DESIGN.md` if layout changes
- [x] Remove dead files (generate_test_notes.py, capture, etc.)
- [x] Final build/check + push

## Phase 7 — SuperProductivity inspiration (post-foundation)
- [x] Subtasks (parent/child, drawer UI, progress badge, cascade)
- [ ] Keyboard navigation & shortcuts (view switch, j/k select, x done, focus add, help)
- [ ] Repeating tasks (recurring) — candidate
- [ ] Eisenhower matrix board layout — candidate
