import { useEffect, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { renderMarkdown } from '../lib/markdown';

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
    <div className="notes">
      <div className="notes-head">
        <span className="notes-label">Notes</span>
        <div className="view-tabs">
          <button className={mode === 'write' ? 'active' : ''} onClick={() => setMode('write')}>
            Écrire
          </button>
          <button
            className={mode === 'preview' ? 'active' : ''}
            onClick={() => {
              flush();
              setMode('preview');
            }}
          >
            Aperçu
          </button>
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
          className="notes-editor"
        />
      ) : value.trim() ? (
        <div
          className="notes-preview preview"
          onClick={() => setMode('write')}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
        />
      ) : (
        <div className="notes-empty" onClick={() => setMode('write')}>
          Aucune note — clique pour en ajouter.
        </div>
      )}
    </div>
  );
}
