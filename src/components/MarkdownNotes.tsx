import { useEffect, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { renderMarkdown } from '../lib/markdown';
import { cn } from '../lib/utils';
import './markdown.css';

type Props = {
  /** Stable per task — the parent keys this component by task id. */
  initial: string;
  onSave: (notes: string) => void;
};

type Mode = 'write' | 'preview';

const editorTheme = EditorView.theme({
  '&': { backgroundColor: 'transparent', fontSize: '13.5px' },
  '.cm-gutters': { backgroundColor: 'transparent', border: 'none' },
  '.cm-content': { fontFamily: 'var(--font-mono)' },
  '&.cm-focused': { outline: 'none' },
});

export function MarkdownNotes({ initial, onSave }: Props) {
  const [value, setValue] = useState(initial);
  const [mode, setMode] = useState<Mode>(initial.trim() ? 'preview' : 'write');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(initial);

  const flush = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (latest.current !== initial) onSave(latest.current);
  };

  useEffect(() => flush, []); // eslint-disable-line react-hooks/exhaustive-deps

  function onChange(next: string) {
    setValue(next);
    latest.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSave(next), 500);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Notes</span>
        <div className="flex gap-0.5 rounded-md bg-muted p-0.5">
          {(['write', 'preview'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                if (m === 'preview') flush();
                setMode(m);
              }}
              className={cn(
                'rounded px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide transition-colors',
                mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {m === 'write' ? 'Écrire' : 'Aperçu'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'write' ? (
        <CodeMirror
          value={value}
          onChange={onChange}
          theme={oneDark}
          extensions={[markdown(), editorTheme, EditorView.lineWrapping]}
          basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false }}
          placeholder="Markdown supporté…"
          className="overflow-hidden rounded-lg border border-border [&_.cm-editor]:min-h-40 [&_.cm-editor]:py-1.5"
        />
      ) : value.trim() ? (
        <div
          className="preview min-h-28 cursor-text rounded-lg border border-border bg-muted/40 px-3.5 py-3"
          onClick={() => setMode('write')}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
        />
      ) : (
        <div
          className="cursor-text rounded-lg border border-dashed border-border px-3.5 py-5 text-center text-sm text-muted-foreground/50"
          onClick={() => setMode('write')}
        >
          Aucune note — clique pour en ajouter.
        </div>
      )}
    </div>
  );
}
