<script lang="ts">
  import { search, type Match } from './lib/api';

  let query = $state('');
  let results = $state<Match[]>([]);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function onInput(e: Event) {
    query = (e.target as HTMLInputElement).value;
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      if (!query) {
        results = [];
        return;
      }
      results = await search(query);
    }, 50);
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
    let out = '';
    let cursor = 0;
    for (const [start, end] of sorted) {
      if (start < cursor) continue;
      out += escapeHtml(text.slice(cursor, start));
      out += '<mark>' + escapeHtml(text.slice(start, end)) + '</mark>';
      cursor = end;
    }
    out += escapeHtml(text.slice(cursor));
    return out;
  }
</script>

<input
  class="search"
  type="text"
  placeholder="Rechercher dans ~/notes…"
  value={query}
  oninput={onInput}
  autofocus
/>

{#if query && results.length === 0}
  <div class="empty">Aucun résultat.</div>
{/if}

<ul class="results">
  {#each results as r (r.path)}
    <li>
      <div class="path">{r.path}</div>
      <div class="snippet">{@html highlight(r.snippet, r.match_ranges)}</div>
    </li>
  {/each}
</ul>
