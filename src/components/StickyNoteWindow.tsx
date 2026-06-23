import { useEffect } from 'react';
import { CalendarDays, Clock, StickyNote, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import { isTauri, onRemoteDataChanged, type Tag } from '../lib/api';
import { renderMarkdown } from '../lib/markdown';
import { formatEstimate, formatShortDate } from '../lib/dates';
import { cn } from '../lib/utils';
import { Checkbox } from './ui/checkbox';
import './tasks/markdown.css';

async function closeSelf() {
  if (isTauri) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().close();
  } else {
    window.close();
  }
}

// Frameless windows have no native resize border, so the grip drives it manually.
async function startResize() {
  if (!isTauri) return;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().startResizeDragging('SouthEast');
}

/** Root of a sticky note window: one task, frameless, floating above other windows. */
export function StickyNoteWindow({ taskId }: { taskId: string }) {
  useTheme();
  const load = useStore((s) => s.load);
  const loaded = useStore((s) => s.loaded);
  const toggleDone = useStore((s) => s.toggleDone);
  const task = useStore((s) => s.tasks.find((t) => t.id === taskId) ?? null);
  const project = useStore((s) => s.projects.find((p) => p.id === task?.projectId) ?? null);
  const allTags = useStore((s) => s.tags);
  const tags: Tag[] = task ? allTags.filter((t) => task.tagIds.includes(t.id)) : [];

  useEffect(() => {
    document.title = 'Taffk Widget';
    // The window is transparent so the 5%-rounded corners show through cleanly.
    const prevHtml = document.documentElement.style.background;
    const prevBody = document.body.style.background;
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    return () => {
      document.documentElement.style.background = prevHtml;
      document.body.style.background = prevBody;
    };
  }, []);

  useEffect(() => {
    void load();
    let unlisten: (() => void) | undefined;
    void onRemoteDataChanged(() => void load()).then((un) => {
      unlisten = un;
    });
    return () => unlisten?.();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void closeSelf();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden rounded-[5%] border border-border bg-card text-card-foreground">
      <header
        data-tauri-drag-region
        className="flex h-8 shrink-0 cursor-grab items-center gap-1.5 bg-primary pl-2.5 pr-2 text-primary-foreground"
      >
        <StickyNote data-tauri-drag-region size={13} className="shrink-0 text-primary-foreground/70" />
        <span data-tauri-drag-region className="min-w-0 flex-1 truncate text-xs font-medium text-primary-foreground/90">
          Taffk Widget
        </span>
        <button
          onClick={() => void closeSelf()}
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-primary-foreground/80 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground"
          title="Fermer"
        >
          <X size={14} />
        </button>
      </header>

      {!loaded ? (
        <div className="grid flex-1 place-items-center text-muted-foreground/60">…</div>
      ) : !task ? (
        <div className="grid flex-1 place-items-center p-4 text-center text-sm text-muted-foreground">
          Cette tâche n'existe plus.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3.5">
          <div className="flex items-start gap-2.5">
            <Checkbox
              checked={task.done}
              onCheckedChange={(v) => void toggleDone(task.id, v === true)}
              className="mt-0.5 size-[18px] shrink-0"
            />
            <h1
              className={cn(
                'min-w-0 text-[15px] font-medium leading-snug',
                task.done && 'text-muted-foreground line-through',
              )}
            >
              {task.title}
            </h1>
          </div>

          {(project || task.scheduledFor || task.estimateMinutes > 0) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
              {project && (
                <span className="flex items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color ?? 'var(--muted-foreground)' }}
                  />
                  <span className="truncate text-foreground/80">{project.name}</span>
                </span>
              )}
              {task.scheduledFor && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={13} className="shrink-0" />
                  {formatShortDate(task.scheduledFor)}
                  {task.scheduledTime ? ` · ${task.scheduledTime}` : ''}
                </span>
              )}
              {task.estimateMinutes > 0 && (
                <span className="flex items-center gap-1.5">
                  <Clock size={13} className="shrink-0" />
                  <span className="font-mono">
                    {formatEstimate(task.spentMinutes) || '0m'} / {formatEstimate(task.estimateMinutes)}
                  </span>
                </span>
              )}
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 font-mono text-xs"
                  style={t.color ? { color: t.color } : undefined}
                >
                  #{t.name}
                </span>
              ))}
            </div>
          )}

          {task.notes.trim() && (
            <div
              className="preview min-h-0 flex-1 overflow-y-auto border-t border-border/60 pt-3 text-sm"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(task.notes) }}
            />
          )}
        </div>
      )}

      {isTauri && (
        <button
          onMouseDown={() => void startResize()}
          title="Redimensionner"
          className="absolute bottom-0 right-0 z-20 flex size-4 cursor-nwse-resize items-end justify-end p-[3px] text-muted-foreground/40 transition-colors hover:text-muted-foreground"
        >
          <span className="block size-2 border-b-2 border-r-2 border-current" />
        </button>
      )}
    </div>
  );
}
