<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Editor from './Editor.svelte';
  import Preview from './Preview.svelte';
  import { getNote, saveNote } from './api';

  type ViewMode = 'edit' | 'preview';
  type SaveStatus = 'idle' | 'saving' | 'saved';

  let { path, onClose }: { path: string; onClose: () => void } = $props();

  let content = $state('');
  let savedContent = $state('');
  let viewMode = $state<ViewMode>('edit');
  let saveStatus = $state<SaveStatus>('idle');

  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let savedFlashTimer: ReturnType<typeof setTimeout> | undefined;

  let body = $derived(stripFrontmatter(content));

  function stripFrontmatter(input: string): string {
    const m = input.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
    if (!m) return input;
    return input.slice(m[0].length);
  }

  onMount(async () => {
    const note = await getNote(path);
    if (note) {
      content = note.content;
      savedContent = note.content;
    }
  });

  onDestroy(() => {
    if (savedFlashTimer) clearTimeout(savedFlashTimer);
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = undefined;
      if (content !== savedContent) {
        // Best-effort flush — fire and forget; the host is unmounting.
        void saveNote(path, content);
      }
    }
  });

  export async function flushSave(): Promise<void> {
    if (!saveTimer) return;
    clearTimeout(saveTimer);
    saveTimer = undefined;
    if (content !== savedContent) {
      await saveNote(path, content);
      savedContent = content;
    }
  }

  function onEditorChange(next: string) {
    content = next;
    if (next === savedContent) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveStatus = 'saving';
    saveTimer = setTimeout(async () => {
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
</script>

<section class="editor-pane">
  <header class="editor-header">
    <span class="editor-path" title={path}>{path}</span>
    <div class="view-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={viewMode === 'edit'}
        class:active={viewMode === 'edit'}
        onclick={() => (viewMode = 'edit')}
      >
        edit
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={viewMode === 'preview'}
        class:active={viewMode === 'preview'}
        onclick={() => (viewMode = 'preview')}
      >
        preview
      </button>
    </div>
    <span class="save-indicator save-{saveStatus}">
      {#if saveStatus === 'saving'}saving…{:else if saveStatus === 'saved'}saved{:else}&nbsp;{/if}
    </span>
    <button type="button" class="pane-close" aria-label="Close pane" onclick={onClose}>
      ✕
    </button>
  </header>
  <div class="editor-body">
    {#if viewMode === 'edit'}
      <Editor content={content} onChange={onEditorChange} />
    {:else}
      <Preview content={body} />
    {/if}
  </div>
</section>

<style>
  .pane-close {
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-faint);
    font-size: 12px;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    transition: color 150ms ease, background-color 150ms ease, border-color 150ms ease;
  }

  .pane-close:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.04);
    border-color: var(--border);
  }
</style>
