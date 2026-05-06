<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorState } from '@codemirror/state';
  import { EditorView, keymap } from '@codemirror/view';
  import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
  import { markdown } from '@codemirror/lang-markdown';
  import { oneDark } from '@codemirror/theme-one-dark';

  let {
    content,
    onChange,
  }: { content: string; onChange: (next: string) => void } = $props();

  let container: HTMLDivElement;
  let view: EditorView | null = null;
  let lastAppliedContent = '';

  function buildState(initial: string): EditorState {
    return EditorState.create({
      doc: initial,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        markdown(),
        oneDark,
        EditorView.lineWrapping,
        EditorView.theme({
          '&': {
            backgroundColor: 'transparent',
            color: 'var(--text)',
            height: '100%',
            fontSize: '14px',
          },
          '&.cm-focused': {
            outline: 'none',
          },
          '.cm-content': {
            fontFamily: 'var(--font-mono)',
            padding: '18px 22px',
            caretColor: 'var(--accent)',
            lineHeight: '1.65',
          },
          '.cm-scroller': {
            fontFamily: 'var(--font-mono)',
          },
          '.cm-gutters': {
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--text-whisper)',
          },
          '.cm-activeLine, .cm-activeLineGutter': {
            backgroundColor: 'rgba(255, 255, 255, 0.025)',
          },
        }),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          const userTransaction = update.transactions.some(
            (tr) => tr.isUserEvent('input') || tr.isUserEvent('delete') || tr.isUserEvent('move'),
          );
          if (!userTransaction) return;
          const next = update.state.doc.toString();
          lastAppliedContent = next;
          onChange(next);
        }),
      ],
    });
  }

  onMount(() => {
    lastAppliedContent = content;
    view = new EditorView({
      state: buildState(content),
      parent: container,
    });
  });

  onDestroy(() => {
    view?.destroy();
    view = null;
  });

  $effect(() => {
    if (!view) return;
    if (content === lastAppliedContent) return;
    lastAppliedContent = content;
    view.setState(buildState(content));
  });
</script>

<div class="editor" bind:this={container}></div>

<style>
  .editor {
    height: 100%;
    width: 100%;
  }

  .editor :global(.cm-editor) {
    height: 100%;
  }
</style>
