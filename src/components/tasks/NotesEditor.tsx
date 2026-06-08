import { useEffect, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { Bold, CaseLower, CaseUpper, Code, Eye, FolderSync, Type } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';
import './markdown.css';
import './notes-editor.css';

type Props = {
  /** Markdown — the parent keys this component by task id, so it loads once. */
  initial: string;
  onSave: (markdown: string) => void;
  editable?: boolean;
};

const bubbleBtn =
  'grid size-8 place-items-center rounded-md text-foreground/80 transition-colors hover:bg-accent hover:text-foreground';

function BubbleButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Bold;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button onClick={onClick} className={cn(bubbleBtn, active && 'bg-accent text-foreground')}>
          <Icon size={16} />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function SelectionMenu({ editor }: { editor: Editor }) {
  const transformCase = (fn: (s: string) => string) => {
    const { from, to, empty } = editor.state.selection;
    if (empty) return;
    const text = editor.state.doc.textBetween(from, to, ' ');
    editor.chain().focus().insertContentAt({ from, to }, fn(text)).run();
  };

  return (
    <BubbleMenu
      editor={editor}
      className="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-md"
    >
      <BubbleButton icon={Bold} label="Gras" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
      <BubbleButton icon={CaseLower} label="Minuscule" onClick={() => transformCase((s) => s.toLowerCase())} />
      <BubbleButton icon={CaseUpper} label="Majuscule" onClick={() => transformCase((s) => s.toUpperCase())} />
      <BubbleButton icon={Code} label="Bloc de code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} />
    </BubbleMenu>
  );
}

/** A Notion-style WYSIWYG editor that reads and writes Markdown. */
export function NotesEditor({ initial, onSave, editable = true }: Props) {
  const latest = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    editable,
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Écrivez… le markdown est rendu en direct (# titre, - liste, [ ] tâche).' }),
      Markdown.configure({ html: false, transformPastedText: true, transformCopiedText: true }),
    ],
    content: initial,
    editorProps: { attributes: { class: 'preview min-h-full' } },
    onUpdate({ editor }) {
      if (!editable) return;
      latest.current = (editor.storage as unknown as { markdown: { getMarkdown(): string } }).markdown.getMarkdown();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => onSave(latest.current), 500);
    },
  });

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (editable && latest.current !== initial) onSave(latest.current);
    };
  }, [initial, onSave, editable]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {editor && editable && <SelectionMenu editor={editor} />}
      <EditorContent
        editor={editor}
        className={cn(
          'tiptap-notes min-h-0 flex-1 overflow-y-auto text-[15px] leading-relaxed',
          editable && 'cursor-text',
        )}
        onClick={() => editable && editor?.chain().focus().run()}
      />
      <div className="flex items-center justify-end gap-5 pt-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Type size={16} /> Markdown
        </span>
        <span className="inline-flex items-center gap-1.5">
          {editable ? (
            <>
              <FolderSync size={16} /> Synchronisation auto
            </>
          ) : (
            <>
              <Eye size={16} /> Lecture seule
            </>
          )}
        </span>
      </div>
    </div>
  );
}
