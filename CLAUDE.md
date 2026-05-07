# CLAUDE.md

Local-first, RAM-only notes spotlight. Tauri 2 + Svelte 5 + TypeScript.
No DB, no cloud, no persistent index — every search rescans loaded notes.

## Stack

- **Tauri 2.x** (MSVC toolchain on Windows). `crate-type = ["staticlib", "cdylib", "rlib"]`
  is mobile-ready by default; we only ship desktop for now.
- **Frontend**: Svelte 5 (runes mode), TypeScript strict + `verbatimModuleSyntax`, Vite 5.
- **Search core**: `memchr::memmem` for literal, `nucleo-matcher` for fuzzy.
- **Walker**: `ignore` crate with all ignore filters disabled — the notes folder is not a repo,
  hidden files and `.gitignore` rules must NOT exclude content.
- **Watcher**: `notify` + `notify-debouncer-full` (200ms debounce) on `<repo>/notes`.
- **Editor**: CodeMirror 6 (`codemirror`, `@codemirror/lang-markdown`, `@codemirror/theme-one-dark`)
  with custom theme overrides matching the design tokens.
- **Preview**: `markdown-it` (html: true, linkify, typographer) + `mermaid` (lazy-init).
- **HTTP capture**: `tiny_http` (sync, single thread) on `127.0.0.1:51234`.
- **No DB / no SQLite / no persistent index.** Notes load to RAM at startup.

## Where we are

All slices in the original roadmap are landed.

- [x] **0** — load notes, literal search via memmem, IPC plumbing, basic UI.
- [x] **1a** — highlight literal matches (UTF-16 offsets across IPC).
- [x] **1b** — fuzzy via nucleo (filename + content, name boost ×1.5), Ctrl+L toggle.
- [x] **UI redesign** — Geist + warm ambient gradient + frosted-glass palette. See DESIGN.md.
- [x] **2** — global hotkey (Ctrl+Shift+Space), tray icon (Show/Hide/Quit), fs watcher.
- [x] **3** — YAML frontmatter, filterable search (`tag:`, `code:`, `id:`).
- [x] **4** — CodeMirror 6 editor + 500ms debounced autosave (echo-loop guarded via
  Transaction.isUserEvent).
- [x] **5** — markdown-it preview (Mermaid, GFM tables, inline HTML). Edit/Preview toggle
  in the pane header.
- [x] **6** — split view (max 2 panes). Ctrl+Shift+click on a result opens in pane 2.
- [x] **7** — HTTP capture endpoint at `POST /capture` for the Chrome extension.

Roadmap items beyond the original spec live in the issue tracker, not here.

## Constraints

- Volume target: **500–2000 notes × ~5 KB**.
- Latency target: **< 20 ms** per search at full volume.
- Notes are **plain `.md` / `.txt`**. Never invent custom on-disk formats.
- Notes folder: **`<repo>/notes`** (resolved at compile time via
  `env!("CARGO_MANIFEST_DIR")` parent in `lib.rs`). Regenerable via
  `py generate_test_notes.py` at the repo root.

## Architecture

```
src-tauri/src/
  main.rs       — windows_subsystem flag + gdidiot_lib::run()
  lib.rs        — setup, plugins, tray, watcher + capture spawn,
                  window-close intercept (hide instead of close)
  notes.rs      — Note { path, content, body, frontmatter }, NotesStore (RwLock),
                  NoteDto + NoteListEntry for IPC, parse_frontmatter
  query.rs      — ParsedQuery, Filter (Tag/Id/Code), parse(), matches_filters()
  search.rs     — SearchMode { Literal, Fuzzy }, search() entry, UTF-16 offsets,
                  filter-only path when free-text is empty
  commands.rs   — search, get_note, save_note, list_notes (IPC surface)
  watcher.rs    — debounced fs watcher, upserts/removes in the store, emits
                  `notes-updated` Tauri event after each batch with mutations
  capture.rs    — tiny_http server on :51234 for Chrome capture
src/
  App.svelte    — app-shell layout (sidebar + main + palette modal),
                  panes orchestration, theme + sidebar persistence
  app.css       — design tokens (dark + [data-theme='light']) + every rule
                  that styles {@html} content (preview prose) and the shared
                  primitives (.editor-pane, .result-button, etc.)
  lib/
    api.ts          — invoke wrappers + Match/SearchMode/NoteDto/
                      Frontmatter/NoteListEntry types
    Editor.svelte   — CodeMirror 6 wrapper, userEvent-guarded onChange
    Preview.svelte  — markdown-it render + mermaid run on .mermaid nodes
    NotePane.svelte — owns one pane (path, content, save state, view mode);
                      exports flushSave() for the host to call before navigation
    Sidebar.svelte  — logo, search trigger, notes list, theme/collapse/settings
    Palette.svelte  — modal command palette (Ctrl+K), search + mode toggle
```

`src/lib/api.ts` is the only boundary between front and Rust commands.
Types here mirror the Rust structs field-for-field.

## Conventions

- **No comments unless they explain *why*.** Names are enough for *what*.
- **No `--no-verify`, no `--force` to main.** Fix the underlying issue.
- **No backwards-compat shims** during a slice. Just edit the code.
- **Match offsets across IPC are UTF-16** (JS strings are UTF-16). Conversion in Rust.
- **Commit messages**: `<type>(<scope>): <subject>` with a body explaining the *why*
  and any non-obvious decisions. See `git log` for the established pattern.
- **One slice = one or more focused commits.** Split sub-slices (1a/1b) when one
  half ships independently.

## Git policy

- The harness blocks direct push to `main`. Either branch (`feat/slice-N`) or the
  user pushes manually after reviewing local commits.
- Lockfiles (`Cargo.lock`, `package-lock.json`) are committed for reproducibility.

## Common commands

```pwsh
npm install                    # first time only
npm run tauri dev              # dev (cold Rust build ~5 min, then incremental)
npm run check                  # svelte-check
cd src-tauri && cargo check    # Rust-only fast check
py generate_test_notes.py      # regenerate <repo>/notes fixtures
curl -X POST http://127.0.0.1:51234/capture \
  -H 'content-type: application/json' \
  -d '{"title":"hello","body":"# Hi\n\nfrom curl"}'
```

## Gotchas

- **`<repo>/notes`** is gitignored — fixtures are regenerable. Don't commit the folder.
- **Icons**: `src-tauri/icons/icon.ico` is required by `tauri-build` on Windows
  (compile-time, not packaging). To replace the placeholder, swap `_source.png`
  with a real logo and rerun `npx tauri icon src-tauri/icons/_source.png`.
- **`generate_context!()` does NOT need `dist/`** in dev (uses `devUrl`). It does at bundle time.
- **`cargo` not on PATH** in some shells right after rustup install — restart the
  terminal or prepend `~/.cargo/bin` once.
- **Windows `~`** is not expanded by Rust. We use `CARGO_MANIFEST_DIR`; do not
  reintroduce `dirs::home_dir()` for the notes path.
- **CodeMirror onChange must filter for user events** (`Transaction.isUserEvent('input'|'delete'|'move')`),
  otherwise switching notes triggers a save of the new note's content under the
  new path immediately on `setState`. The Editor component already does this.
- **Save flush before navigation** — the host (App.svelte) calls `flushAllPanes()`
  before changing the panes array. NotePane also flushes on `onDestroy`, but only
  best-effort (fire-and-forget).
- **mermaid is lazy-initialized** the first time a preview contains a `.mermaid`
  node. `securityLevel: 'loose'` is required so arrow markers render correctly.
- **Capture port 51234** is hardcoded. If it's in use, the server logs and skips
  silently — the rest of the app stays up. No automatic fallback port.
- **Inline HTML in preview** is allowed (`html: true` in markdown-it). Trust
  assumption: the user is the only writer; this is NOT a multi-tenant app.
- **Tauri 2 plugin permissions**: any plugin (e.g. `tauri-plugin-global-shortcut`)
  needs an entry in `capabilities/default.json` (currently `core:default` and
  `global-shortcut:default`).
- **Palette `stopPropagation` on Esc/Ctrl+L** is required: the window-level
  keydown handler in App.svelte also reacts to Esc (closing the rightmost pane).
  Without stopPropagation, dismissing the palette would also close a pane.
- **CodeMirror in light theme**: the editor still uses `oneDark` regardless of
  `data-theme`. Swapping themes requires plumbing a prop into Editor.svelte and
  a light counterpart (e.g. `@codemirror/theme-quietlight`) — deferred.
- **`notes-updated` event is fire-and-forget**: the watcher emits it after any
  debounced batch that mutated the store. The sidebar listens via
  `@tauri-apps/api/event` and re-fetches `list_notes`. Don't filter by path —
  the sidebar always wants the full list.

## Don'ts

- Don't add a database, persistent index, or migration layer.
- Don't add cloud sync, login, or telemetry.
- Don't add a config file for behavior tuning yet — once we have one need
  (port override, notes dir override, …) we'll do it once for all of them.
- Don't generalize `search` behind a trait until there are 3+ modes.
- Don't introduce error-handling layers for hosted-only invariants —
  `unwrap()` on the lock is fine; the watcher re-reads if the disk changes.
- Don't push frontmatter changes from the editor through anything but
  `save_note(path, content)`. The watcher round-trip is the source of truth.
