<script lang="ts">
  import { search, type Match, type SearchMode } from './lib/api';
  import NotePane from './lib/NotePane.svelte';

  let query = $state('');
  let mode = $state<SearchMode>('literal');
  let results = $state<Match[]>([]);
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  let panes = $state<{ path: string }[]>([]);
  let paneRefs: Record<string, { flushSave: () => Promise<void> } | null> = {};

  function runSearch() {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      if (!query) {
        results = [];
        return;
      }
      results = await search(query, mode);
    }, 50);
  }

  function onInput(e: Event) {
    query = (e.target as HTMLInputElement).value;
    runSearch();
  }

  async function flushAllPanes() {
    await Promise.all(
      Object.values(paneRefs)
        .filter((r): r is { flushSave: () => Promise<void> } => !!r)
        .map((r) => r.flushSave()),
    );
  }

  async function selectResult(path: string, evt: MouseEvent | KeyboardEvent) {
    const splitRight = evt.ctrlKey && evt.shiftKey;
    if (splitRight) {
      if (panes.some((p) => p.path === path)) {
        query = '';
        results = [];
        return;
      }
      if (panes.length >= 2) {
        const other = panes[0];
        await flushAllPanes();
        panes = [other, { path }];
      } else {
        panes = [...panes, { path }];
      }
    } else {
      await flushAllPanes();
      panes = [{ path }];
    }
    query = '';
    results = [];
  }

  function closePane(path: string) {
    panes = panes.filter((p) => p.path !== path);
    delete paneRefs[path];
  }

  async function onKeydown(e: KeyboardEvent) {
    if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      mode = mode === 'literal' ? 'fuzzy' : 'literal';
      runSearch();
      return;
    }
    if (e.key === 'Escape') {
      if (query) {
        e.preventDefault();
        query = '';
        results = [];
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

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function highlight(text: string, ranges: [number, number][]): string {
    if (ranges.length === 0) return escapeHtml(text);
    const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const [s, e] of sorted) {
      const last = merged[merged.length - 1];
      if (last && s <= last[1]) {
        last[1] = Math.max(last[1], e);
      } else {
        merged.push([s, e]);
      }
    }
    let out = '';
    let cursor = 0;
    for (const [start, end] of merged) {
      out += escapeHtml(text.slice(cursor, start));
      out += '<mark>' + escapeHtml(text.slice(start, end)) + '</mark>';
      cursor = end;
    }
    out += escapeHtml(text.slice(cursor));
    return out;
  }
</script>

<svelte:window onkeydown={onKeydown} />

<main
  class="shell"
  class:has-editor={panes.length > 0}
  class:has-split={panes.length > 1}
>
  <div class="bar">
    <input
      class="search"
      type="text"
      placeholder="Search notes…"
      value={query}
      oninput={onInput}
      autofocus
      spellcheck="false"
      autocomplete="off"
    />
    <span class="mode-badge mode-{mode}" title="Ctrl+L pour basculer">
      {mode === 'literal' ? 'lit' : 'fuzz'}
    </span>
  </div>

  {#if query && results.length === 0}
    <div class="empty">No results for "{query}"</div>
  {/if}

  {#if results.length > 0}
    <ul class="results">
      {#each results as r (r.path)}
        <li>
          <button
            type="button"
            class="result-button"
            onclick={(e) => selectResult(r.path, e)}
          >
            <div class="path">{r.path}</div>
            <div class="snippet">{@html highlight(r.snippet, r.match_ranges)}</div>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if panes.length > 0 && results.length === 0}
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

  <div class="hint">
    <span class="key-group">
      <kbd>Ctrl</kbd>
      <span class="sep">+</span>
      <kbd>L</kbd>
      <span>toggle mode</span>
    </span>
    {#if results.length > 0}
      <span class="key-group">
        <kbd>Ctrl</kbd>
        <span class="sep">+</span>
        <kbd>Shift</kbd>
        <span class="sep">+</span>
        <kbd>Click</kbd>
        <span>open in split</span>
      </span>
    {/if}
    {#if panes.length > 0}
      <span class="key-group">
        <kbd>Esc</kbd>
        <span>close pane</span>
      </span>
    {/if}
  </div>
</main>
