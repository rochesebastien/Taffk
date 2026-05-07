<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { listen } from '@tauri-apps/api/event';
  import { listNotes, type NoteListEntry } from './lib/api';
  import NotePane from './lib/NotePane.svelte';
  import Sidebar from './lib/Sidebar.svelte';
  import Palette from './lib/Palette.svelte';

  type Theme = 'dark' | 'light';

  let panes = $state<{ path: string }[]>([]);
  let paneRefs: Record<string, { flushSave: () => Promise<void> } | null> = {};

  let notesList = $state<NoteListEntry[]>([]);
  let sidebarOpen = $state(true);
  let paletteOpen = $state(false);
  let theme = $state<Theme>('dark');
  let activePaths = $derived(panes.map((p) => p.path));

  const THEME_KEY = 'gdidiot.theme';
  const SIDEBAR_KEY = 'gdidiot.sidebar';

  let unlistenNotesUpdated: (() => void) | undefined;

  onMount(async () => {
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme === 'dark' || storedTheme === 'light') theme = storedTheme;
    const storedSidebar = localStorage.getItem(SIDEBAR_KEY);
    if (storedSidebar === 'collapsed') sidebarOpen = false;

    await refreshNotes();

    unlistenNotesUpdated = await listen('notes-updated', () => {
      refreshNotes();
    });
  });

  onDestroy(() => {
    unlistenNotesUpdated?.();
  });

  $effect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  });

  $effect(() => {
    localStorage.setItem(SIDEBAR_KEY, sidebarOpen ? 'open' : 'collapsed');
  });

  async function refreshNotes() {
    try {
      notesList = await listNotes();
    } catch (e) {
      console.error('listNotes failed', e);
    }
  }

  async function flushAllPanes() {
    await Promise.all(
      Object.values(paneRefs)
        .filter((r): r is { flushSave: () => Promise<void> } => !!r)
        .map((r) => r.flushSave()),
    );
  }

  async function openNote(path: string, splitRight: boolean) {
    if (splitRight) {
      if (panes.some((p) => p.path === path)) return;
      if (panes.length >= 2) {
        const left = panes[0];
        await flushAllPanes();
        panes = [left, { path }];
      } else if (panes.length === 0) {
        panes = [{ path }];
      } else {
        panes = [...panes, { path }];
      }
    } else {
      await flushAllPanes();
      panes = [{ path }];
    }
  }

  function closePane(path: string) {
    panes = panes.filter((p) => p.path !== path);
    delete paneRefs[path];
  }

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
  }

  function openSettings() {
    // Placeholder — surface a tooltip via title="" for now.
  }

  function openPalette() {
    paletteOpen = true;
  }

  function closePalette() {
    paletteOpen = false;
  }

  async function onPaletteSelect(path: string, splitRight: boolean) {
    await openNote(path, splitRight);
    paletteOpen = false;
  }

  async function onKeydown(e: KeyboardEvent) {
    const cmd = e.ctrlKey || e.metaKey;
    if (cmd && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      paletteOpen = !paletteOpen;
      return;
    }
    if (cmd && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      sidebarOpen = !sidebarOpen;
      return;
    }
    if (e.key === 'Escape') {
      if (paletteOpen) {
        e.preventDefault();
        paletteOpen = false;
        return;
      }
      if (panes.length > 0) {
        e.preventDefault();
        const last = panes[panes.length - 1];
        await flushAllPanes();
        closePane(last.path);
      }
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="app" class:sidebar-collapsed={!sidebarOpen}>
  <div class="sidebar-slot">
    <Sidebar
      notes={notesList}
      activePaths={activePaths}
      theme={theme}
      onSelect={openNote}
      onSearchClick={openPalette}
      onCollapse={() => (sidebarOpen = false)}
      onToggleTheme={toggleTheme}
      onSettings={openSettings}
    />
  </div>

  <main class="main-area">
    <div class="topbar">
      {#if !sidebarOpen}
        <button
          type="button"
          class="topbar-icon"
          onclick={() => (sidebarOpen = true)}
          title="Show sidebar (Ctrl+B)"
          aria-label="Show sidebar"
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
      {/if}
      <button
        type="button"
        class="topbar-search"
        onclick={openPalette}
        title="Search (Ctrl+K)"
      >
        <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.4" />
          <line x1="10.5" y1="10.5" x2="13.5" y2="13.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
        </svg>
        <span>Search</span>
      </button>
    </div>

    {#if panes.length === 0}
      <div class="welcome">
        <div class="welcome-mark">g</div>
        <p class="welcome-title">gdidiot</p>
        <p class="welcome-sub">
          Pick a note from the sidebar, or press
          <kbd>Ctrl</kbd><span class="sep">+</span><kbd>K</kbd> to search.
        </p>
      </div>
    {:else}
      <div class="panes" class:split={panes.length > 1}>
        {#each panes as pane (pane.path)}
          <NotePane
            path={pane.path}
            onClose={() => closePane(pane.path)}
            bind:this={paneRefs[pane.path]}
          />
        {/each}
      </div>
    {/if}
  </main>
</div>

{#if paletteOpen}
  <Palette onClose={closePalette} onSelect={onPaletteSelect} />
{/if}

<style>
  .app {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .sidebar-slot {
    flex: 0 0 260px;
    height: 100%;
    transition: flex-basis 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
    overflow: hidden;
  }

  .app.sidebar-collapsed .sidebar-slot {
    flex-basis: 0;
  }

  .main-area {
    flex: 1;
    min-width: 0;
    height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .topbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--surface-faint);
    flex-shrink: 0;
  }

  .topbar-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    color: var(--text-faint);
    cursor: pointer;
    transition: color 150ms ease, background-color 150ms ease, border-color 150ms ease;
  }

  .topbar-icon:hover {
    color: var(--text);
    background: var(--surface-hover);
    border-color: var(--border);
  }

  .topbar-search {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px 4px 8px;
    background: var(--surface-hover);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-faint);
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
    transition: all 150ms ease;
  }

  .topbar-search:hover {
    color: var(--text);
    border-color: var(--border-strong);
  }

  .welcome {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 48px 24px;
    color: var(--text-faint);
    text-align: center;
  }

  .welcome-mark {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--accent), #ffb27a);
    color: #1a1a1a;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 30px;
    margin-bottom: 6px;
    box-shadow: 0 12px 32px -10px rgba(255, 138, 76, 0.55);
  }

  .welcome-title {
    margin: 0;
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.02em;
    color: var(--text);
  }

  .welcome-sub {
    margin: 0;
    max-width: 420px;
    font-size: 13.5px;
    line-height: 1.6;
    color: var(--text-dim);
  }

  .welcome-sub kbd {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 500;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--surface-hover);
    border: 1px solid var(--border);
    color: var(--text-faint);
    margin: 0 1px;
  }

  .welcome-sub .sep {
    color: var(--text-whisper);
    margin: 0 2px;
  }

  .panes {
    flex: 1;
    min-height: 0;
    display: flex;
    gap: 12px;
    padding: 18px;
  }

  .panes :global(.editor-pane) {
    flex: 1;
    min-width: 0;
    margin: 0;
  }
</style>
