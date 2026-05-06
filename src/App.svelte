<script lang="ts">
  import { search, type Match, type SearchMode } from './lib/api';

  let query = $state('');
  let mode = $state<SearchMode>('literal');
  let results = $state<Match[]>([]);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function runSearch() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
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

  function onKeydown(e: KeyboardEvent) {
    if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      mode = mode === 'literal' ? 'fuzzy' : 'literal';
      runSearch();
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

<main class="shell">
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
          <div class="path">{r.path}</div>
          <div class="snippet">{@html highlight(r.snippet, r.match_ranges)}</div>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="hint">
    <span class="key-group">
      <kbd>Ctrl</kbd>
      <span class="sep">+</span>
      <kbd>L</kbd>
      <span>toggle mode</span>
    </span>
  </div>
</main>
