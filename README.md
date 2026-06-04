# Taffk

<p align="center">
  <img src="./git_cover.png" alt="Taffk" width="100%" />
</p>

> Local-first personal work manager. Your tasks, projects, focus time — on your
> machine, in a single SQLite file. No cloud, no login, no telemetry.

Taffk is a keyboard-first desktop app for managing personal work, in the spirit
of SuperProductivity: plan your day, organise tasks into projects and tags,
work them on a Kanban board or a weekly planner, and track focus time with a
built-in Pomodoro timer.

## Features

- **Quick capture** — type a task and hit Enter. Inline `#tag` and `@projet`
  syntax creates tags/projects on the fly.
- **Today / All / Projects** — a daily plan (tasks scheduled for today), the
  full backlog, and per-project lists. Done tasks group at the bottom.
- **Task detail** — a drawer to edit title, project, tags, estimate, schedule,
  and **markdown notes** (CodeMirror 6 editor + markdown-it preview).
- **Kanban board** — three status columns (À faire / En cours / Terminé) with
  drag-and-drop between them.
- **Week planner** — a 7-day calendar; drag tasks between days to reschedule,
  or to/from an "unscheduled" backlog. Per-day quick add.
- **Pomodoro + time tracking** — focus sessions (25/5 by default), per-task or
  global, persisted to `time_entries`; a task accumulates its "temps passé".
- **Global hotkey + tray** — summon with `Ctrl+Shift+Space`; tray with
  Show / Hide / Quit. Closing the window hides it instead of quitting.
- **Dark / light theme** — single brand-blue accent, persisted locally.

## Stack

- **[Tauri 2](https://tauri.app/)** (MSVC toolchain on Windows) — desktop shell.
- **Frontend** — [React 19](https://react.dev/) + TypeScript strict, Vite 5,
  [Zustand](https://github.com/pmndrs/zustand) for state.
- **Storage** — SQLite via [`rusqlite`](https://github.com/rusqlite/rusqlite)
  (bundled), owned by the Rust backend and exposed through Tauri IPC commands.
- **Editor / preview** — CodeMirror 6 (`@uiw/react-codemirror`) + `markdown-it`.

The Rust side owns the database and business logic; the React frontend talks to
it exclusively through the typed wrappers in `src/lib/api.ts`. Running outside
the Tauri shell (a plain browser) transparently falls back to an in-memory mock
backend, so the UI can be previewed without the desktop runtime.

## Getting started

```sh
npm install            # first time only
npm run tauri dev      # dev (cold Rust build ~5 min, then incremental)
```

Other commands:

```sh
npm run check                 # tsc --noEmit (frontend typecheck)
npm run build                 # typecheck + vite build
cd src-tauri && cargo check   # Rust-only fast check
cd src-tauri && cargo test    # Rust unit tests (db round-trips)
```

The SQLite database lives in the platform app-data directory (`taffk.db`),
created automatically on first run.

## Design

- **Volume target** — hundreds to a few thousand tasks; a global lock over a
  single connection is plenty.
- **Single-accent UI** built on brand blue `#1218FC`, with dark (default) and
  light themes. See [DESIGN.md](./DESIGN.md) for tokens and rationale, and
  [CLAUDE.md](./CLAUDE.md) for architecture.

## Non-goals

No cloud sync, no login, no telemetry, no multi-tenant server. Taffk is a
local-first tool over a single SQLite file — and stays that way.
