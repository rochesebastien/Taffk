<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { search, type Match, type SearchMode } from './api';

  let {
    onClose,
    onSelect,
  }: {
    onClose: () => void;
    onSelect: (path: string, splitRight: boolean) => void;
  } = $props();

  let query = $state('');
  let mode = $state<SearchMode>('literal');
  let results = $state<Match[]>([]);
  let inputEl: HTMLInputElement | undefined;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  onMount(async () => {
    await tick();
    inputEl?.focus();
  });

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

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      e.stopPropagation();
      mode = mode === 'literal' ? 'fuzzy' : 'literal';
      runSearch();
    }
  }

  function onBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
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

<div
  class="palette-backdrop"
  onclick={onBackdrop}
  onkeydown={onKeydown}
  role="dialog"
  aria-modal="true"
  aria-label="Search palette"
  tabindex="-1"
>
  <div class="palette" role="search">
    <div class="palette-bar">
      <input
        bind:this={inputEl}
        class="palette-input"
        type="text"
        placeholder="Search notes…"
        value={query}
        oninput={onInput}
        spellcheck="false"
        autocomplete="off"
      />
      <span class="mode-badge mode-{mode}" title="Ctrl+L pour basculer">
        {mode === 'literal' ? 'lit' : 'fuzz'}
      </span>
    </div>

    {#if query && results.length === 0}
      <div class="palette-empty">No results for "{query}"</div>
    {/if}

    {#if results.length > 0}
      <ul class="palette-results">
        {#each results as r (r.path)}
          <li>
            <button
              type="button"
              class="result-button"
              onclick={(e) => onSelect(r.path, e.ctrlKey && e.shiftKey)}
            >
              <div class="path">{r.path}</div>
              <div class="snippet">{@html highlight(r.snippet, r.match_ranges)}</div>
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    <div class="palette-hint">
      <span class="key-group"><kbd>Ctrl</kbd><span class="sep">+</span><kbd>L</kbd> toggle mode</span>
      <span class="key-group"><kbd>Ctrl</kbd><span class="sep">+</span><kbd>Shift</kbd><span class="sep">+</span><kbd>Click</kbd> split</span>
      <span class="key-group"><kbd>Esc</kbd> close</span>
    </div>
  </div>
</div>

<style>
  .palette-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.42);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 14vh;
    padding-left: 16px;
    padding-right: 16px;
    z-index: 50;
    animation: fade-in 180ms ease both;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .palette {
    width: 100%;
    max-width: 720px;
    animation: rise 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .palette-bar {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--surface-strong);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    padding: 14px 18px;
    box-shadow: var(--shadow-card);
  }

  .palette-bar:focus-within {
    border-color: var(--border-strong);
    box-shadow: var(--shadow-card), 0 0 0 4px var(--accent-soft);
  }

  .palette-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 16px;
    letter-spacing: -0.012em;
    caret-color: var(--accent);
  }

  .palette-input::placeholder {
    color: var(--text-faint);
  }

  .palette-empty {
    margin-top: 8px;
    padding: 32px 18px;
    text-align: center;
    color: var(--text-faint);
    background: var(--surface-strong);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    font-size: 13px;
  }

  .palette-results {
    list-style: none;
    margin: 8px 0 0;
    padding: 4px;
    background: var(--surface-strong);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    max-height: 50vh;
    overflow-y: auto;
  }

  .palette-results li + li {
    margin-top: 1px;
  }

  .palette-hint {
    margin-top: 12px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: var(--text-whisper);
    font-size: 11px;
    letter-spacing: 0.02em;
    user-select: none;
  }

  .palette-hint .key-group {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .palette-hint kbd {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 500;
    padding: 1px 5px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border);
    color: var(--text-faint);
    letter-spacing: 0.04em;
  }

  .palette-hint .sep {
    color: var(--text-whisper);
  }
</style>
