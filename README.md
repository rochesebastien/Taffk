# Taffk

<p align="center">
  <img src="./git_cover.png" alt="Taffk" width="100%" />
</p>

> Local-first, RAM-only notes spotlight. No database, no cloud, no persistent
> index — every search rescans the notes already loaded in memory.

Taffk is a desktop spotlight for your plain-text notes. Hit a global hotkey,
type, and it fuzzy- or literal-searches every loaded `.md`/`.txt` note in under
20 ms. Open a note in a built-in editor, preview it (Markdown + Mermaid), or
split two side by side. Notes stay on disk as plain files you fully own.

## Features

- **Instant search** — literal (`memchr::memmem`) or fuzzy (`nucleo-matcher`,
  filename-boosted), toggle with `Ctrl+L`. Matches highlighted inline.
- **Filterable queries** — narrow by YAML frontmatter with `tag:`, `code:`,
  and `id:` filters, combined with free-text.
- **Global hotkey + tray** — summon with `Ctrl+Shift+Space`; tray icon with
  Show / Hide / Quit. Closing the window hides it instead of quitting.
- **Editor + preview** — CodeMirror 6 with 500 ms debounced autosave, and a
  `markdown-it` preview supporting GFM tables, inline HTML, and Mermaid.
- **Split view** — open two notes side by side (`Ctrl+Shift+click` a result).
- **Live filesystem watch** — edits made outside the app show up automatically
  (200 ms debounced `notify` watcher).
- **HTTP capture** — `POST /capture` on `127.0.0.1:51234` for a browser
  extension to drop clippings straight into your notes.

## Stack

- **[Tauri 2](https://tauri.app/)** (MSVC toolchain on Windows) — desktop shell.
- **Frontend** — [Svelte 5](https://svelte.dev/) (runes mode), TypeScript strict,
  Vite 5.
- **Search core** — `memchr::memmem` (literal) and `nucleo-matcher` (fuzzy).
- **Walker** — the `ignore` crate with every ignore filter disabled (your notes
  folder is not a repo; hidden files and `.gitignore` rules must not exclude it).
- **Watcher** — `notify` + `notify-debouncer-full`.
- **Editor / preview** — CodeMirror 6, `markdown-it`, `mermaid`.
- **Capture** — `tiny_http` (single-threaded, sync).

No SQLite, no persistent index, no migration layer. Notes load to RAM at
startup and every search rescans them.

## Getting started

```sh
npm install            # first time only
npm run tauri dev      # dev (cold Rust build ~5 min, then incremental)
```

Other commands:

```sh
npm run check          # svelte-check
cd src-tauri && cargo check   # Rust-only fast check
py generate_test_notes.py     # regenerate the <repo>/notes fixtures
```

Notes live in `<repo>/notes` (resolved at compile time from `CARGO_MANIFEST_DIR`).
The folder is gitignored — fixtures are regenerable.

Drop a clipping in from the command line:

```sh
curl -X POST http://127.0.0.1:51234/capture \
  -H 'content-type: application/json' \
  -d '{"title":"hello","body":"# Hi\n\nfrom curl"}'
```

## Design

- **Volume target** — 500–2000 notes × ~5 KB.
- **Latency target** — < 20 ms per search at full volume.
- Notes are **plain `.md` / `.txt`** — Taffk never invents an on-disk format.
- **Single-accent UI** built on brand blue `#1218FC`, with dark (default) and
  light themes. See [DESIGN.md](./DESIGN.md) for tokens and rationale, and
  [CLAUDE.md](./CLAUDE.md) for architecture.

## Non-goals

No database, no persistent index, no cloud sync, no login, no telemetry. Taffk
is a local-first tool over plain files — and stays that way.
