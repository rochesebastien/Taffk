<script lang="ts">
  import type { NoteListEntry } from './api';
  import logoDark from '../assets/logo_navbar_dark.png';
  import logoLight from '../assets/logo_navbar_light.png';

  type Theme = 'dark' | 'light';

  let {
    notes,
    activePaths,
    theme,
    onSelect,
    onSearchClick,
    onCollapse,
    onToggleTheme,
    onSettings,
  }: {
    notes: NoteListEntry[];
    activePaths: string[];
    theme: Theme;
    onSelect: (path: string, splitRight: boolean) => void;
    onSearchClick: () => void;
    onCollapse: () => void;
    onToggleTheme: () => void;
    onSettings: () => void;
  } = $props();

  function handleNoteClick(e: MouseEvent, path: string) {
    onSelect(path, e.ctrlKey && e.shiftKey);
  }

  const cmdLabel = navigator.platform.toUpperCase().includes('MAC') ? '⌘' : 'Ctrl';
</script>

<aside class="sidebar">
  <header class="sidebar-head">
    <div class="brand">
      <img class="brand-logo" src={theme === 'dark' ? logoLight : logoDark} alt="Taffk" />
    </div>
    <button
      type="button"
      class="icon-button"
      onclick={onCollapse}
      title="Hide sidebar (Ctrl+B)"
      aria-label="Hide sidebar"
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path
          d="M3.5 2.5h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
        />
        <line x1="6.5" y1="2.5" x2="6.5" y2="13.5" stroke="currentColor" stroke-width="1.2" />
      </svg>
    </button>
  </header>

  <button type="button" class="search-trigger" onclick={onSearchClick}>
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.4" />
      <line x1="10.5" y1="10.5" x2="13.5" y2="13.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
    </svg>
    <span class="search-label">Search</span>
    <span class="search-kbd">
      <kbd>{cmdLabel}</kbd><kbd>K</kbd>
    </span>
  </button>

  <div class="section-label">Notes <span class="count">{notes.length}</span></div>

  <nav class="notes-list" aria-label="Notes">
    {#if notes.length === 0}
      <div class="empty-list">No notes yet</div>
    {/if}
    {#each notes as note (note.path)}
      <button
        type="button"
        class="note-entry"
        class:active={activePaths.includes(note.path)}
        onclick={(e) => handleNoteClick(e, note.path)}
        title={note.path}
      >
        <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" class="file-icon">
          <path
            d="M3.5 2h6l3 3v8.5a.5.5 0 0 1-.5.5h-8.5a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.1"
            stroke-linejoin="round"
          />
          <path d="M9.5 2v3h3" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round" />
        </svg>
        <span class="note-name">{note.name}</span>
      </button>
    {/each}
  </nav>

  <footer class="sidebar-foot">
    <button
      type="button"
      class="icon-button"
      onclick={onToggleTheme}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label="Toggle theme"
    >
      {#if theme === 'dark'}
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.3" />
          <g stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
            <line x1="8" y1="1.5" x2="8" y2="3" />
            <line x1="8" y1="13" x2="8" y2="14.5" />
            <line x1="1.5" y1="8" x2="3" y2="8" />
            <line x1="13" y1="8" x2="14.5" y2="8" />
            <line x1="3.3" y1="3.3" x2="4.3" y2="4.3" />
            <line x1="11.7" y1="11.7" x2="12.7" y2="12.7" />
            <line x1="3.3" y1="12.7" x2="4.3" y2="11.7" />
            <line x1="11.7" y1="4.3" x2="12.7" y2="3.3" />
          </g>
        </svg>
      {:else}
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linejoin="round"
          />
        </svg>
      {/if}
    </button>
    <button
      type="button"
      class="icon-button"
      onclick={onSettings}
      title="Settings (coming soon)"
      aria-label="Settings"
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.3" />
        <path
          d="M13.5 8a5.5 5.5 0 0 0-.13-1.2l1.4-1.1-1.4-2.4-1.7.55a5.5 5.5 0 0 0-2.07-1.2L9.2 1H6.8l-.4 1.65a5.5 5.5 0 0 0-2.07 1.2l-1.7-.55-1.4 2.4 1.4 1.1A5.5 5.5 0 0 0 2.5 8c0 .41.05.81.13 1.2l-1.4 1.1 1.4 2.4 1.7-.55a5.5 5.5 0 0 0 2.07 1.2L6.8 15h2.4l.4-1.65a5.5 5.5 0 0 0 2.07-1.2l1.7.55 1.4-2.4-1.4-1.1c.08-.39.13-.79.13-1.2Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.1"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </footer>
</aside>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--sidebar-bg);
    border-right: 1px solid var(--border);
    width: 100%;
    overflow: hidden;
    user-select: none;
  }

  .sidebar-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px 10px;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .brand-logo {
    height: 22px;
    width: auto;
    display: block;
  }

  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    color: var(--text-faint);
    cursor: pointer;
    transition: color 150ms ease, background-color 150ms ease, border-color 150ms ease;
  }

  .icon-button:hover {
    color: var(--text);
    background: var(--surface-hover);
    border-color: var(--border);
  }

  .search-trigger {
    margin: 4px 10px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: var(--surface-hover);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-faint);
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    transition: all 150ms ease;
  }

  .search-trigger:hover {
    color: var(--text-dim);
    border-color: var(--border-strong);
  }

  .search-label {
    flex: 1;
    text-align: left;
  }

  .search-kbd {
    display: inline-flex;
    gap: 2px;
  }

  .search-kbd kbd {
    font-family: var(--font-mono);
    font-size: 9.5px;
    font-weight: 500;
    padding: 1px 5px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border);
    color: var(--text-whisper);
  }

  .section-label {
    padding: 0 14px 6px;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-whisper);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .section-label .count {
    font-family: var(--font-mono);
    color: var(--text-whisper);
  }

  .notes-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 6px 12px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    scrollbar-width: thin;
    scrollbar-color: var(--border-strong) transparent;
  }

  .notes-list::-webkit-scrollbar {
    width: 8px;
  }

  .notes-list::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 4px;
  }

  .empty-list {
    padding: 12px 14px;
    color: var(--text-whisper);
    font-size: 12px;
    text-align: center;
  }

  .note-entry {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    width: 100%;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: var(--text-dim);
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    letter-spacing: -0.005em;
    transition: background-color 100ms ease, color 100ms ease;
  }

  .note-entry:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  .note-entry.active {
    background: var(--accent-soft);
    color: var(--accent);
  }

  .note-entry.active .file-icon {
    color: var(--accent);
  }

  .file-icon {
    flex-shrink: 0;
    color: var(--text-faint);
  }

  .note-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .sidebar-foot {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 10px 12px;
    border-top: 1px solid var(--border);
  }
</style>
