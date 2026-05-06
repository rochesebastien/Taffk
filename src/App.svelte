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
      <div class="snippet">{r.snippet}</div>
    </li>
  {/each}
</ul>
