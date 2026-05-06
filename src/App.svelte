<script lang="ts">
  import { search, getNote, saveNote, type Match, type SearchMode } from './lib/api';
  import Editor from './lib/Editor.svelte';

  let query = $state('');
  let mode = $state<SearchMode>('literal');
  let results = $state<Match[]>([]);
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  let currentPath = $state<string | null>(null);
  let currentContent = $state<string>('');
  let savedContent = $state<string>('');
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let saveStatus = $state<'idle' | 'saving' | 'saved'>('idle');
  let savedFlashTimer: ReturnType<typeof setTimeout> | undefined;

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

  async function onKeydown(e: KeyboardEvent) {
    if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      mode = mode === 'literal' ? 'fuzzy' : 'literal';
      runSearch();
      return;
    }
    if (e.key === 'Escape' && currentPath) {
      e.preventDefault();
      await flushSave();
      currentPath = null;
      currentContent = '';
      savedContent = '';
    }
  }

  async function flushSave() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = undefined;
      if (currentPath && currentContent !== savedContent) {
        await saveNote(currentPath, currentContent);
        savedContent = currentContent;
      }
    }
  }

  async function selectResult(path: string) {
    await flushSave();
    const note = await getNote(path);
    if (!note) return;
    currentPath = note.path;
    currentContent = note.content;
    savedContent = note.content;
    query = '';
    results = [];
  }

  function onEditorChange(next: string) {
    if (!currentPath) return;
    currentContent = next;
    if (next === savedContent) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveStatus = 'saving';
    saveTimer = setTimeout(async () => {
      const path = currentPath;
      if (!path) return;
      try {
        await saveNote(path, next);
        savedContent = next;
        saveStatus = 'saved';
        if (savedFlashTimer) clearTimeout(savedFlashTimer);
        savedFlashTimer = setTimeout(() => {
          saveStatus = 'idle';
        }, 1200);
      } catch {
        saveStatus = 'idle';
      } finally {
        saveTimer = undefined;
      }
    }, 500);
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

<main class="shell" class:has-editor={currentPath}>
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
            onclick={() => selectResult(r.path)}
          >
            <div class="path">{r.path}</div>
            <div class="snippet">{@html highlight(r.snippet, r.match_ranges)}</div>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if currentPath && results.length === 0}
    <section class="editor-pane">
      <header class="editor-header">
        <span class="editor-path">{currentPath}</span>
        <span class="save-indicator save-{saveStatus}">
          {#if saveStatus === 'saving'}saving…{:else if saveStatus === 'saved'}saved{:else}&nbsp;{/if}
        </span>
      </header>
      <div class="editor-body">
        <Editor content={currentContent} onChange={onEditorChange} />
      </div>
    </section>
  {/if}

  <div class="hint">
    <span class="key-group">
      <kbd>Ctrl</kbd>
      <span class="sep">+</span>
      <kbd>L</kbd>
      <span>toggle mode</span>
    </span>
    {#if currentPath}
      <span class="key-group">
        <kbd>Esc</kbd>
        <span>close note</span>
      </span>
    {/if}
  </div>
</main>
