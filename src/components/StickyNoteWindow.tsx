import { useEffect } from 'react';
import { CalendarDays, Clock, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import { isTauri, onRemoteDataChanged, type Tag } from '../lib/api';
import { renderMarkdown } from '../lib/markdown';
import { formatEstimate, formatShortDate } from '../lib/dates';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
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

/** Root of a sticky note window: one task, frameless, pinned to the desktop. */
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
    <div className="flex h-screen w-screen flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
      <header
        data-tauri-drag-region
        className="flex shrink-0 cursor-grab items-center gap-2 border-b border-border bg-muted/40 px-3 py-1.5"
      >
        <span
          data-tauri-drag-region
          className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground"
        >
          {project?.name ?? 'Post-it'}
        </span>
        <button
          onClick={() => void closeSelf()}
          className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Fermer"
        >
          <X size={13} />
        </button>
      </header>

      {!loaded ? (
        <div className="grid flex-1 place-items-center text-muted-foreground/60">…</div>
      ) : !task ? (
        <div className="grid flex-1 place-items-center p-4 text-center text-sm text-muted-foreground">
          Cette tâche n'existe plus.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <div className="flex items-start gap-2">
            <Checkbox
              checked={task.done}
              onCheckedChange={(v) => void toggleDone(task.id, v === true)}
              className="mt-0.5"
            />
            <h1
              className={cn(
                'font-display text-sm font-semibold leading-snug',
                task.done && 'text-muted-foreground line-through',
              )}
            >
              {task.title}
            </h1>
          </div>

          {(task.scheduledFor || task.estimateMinutes > 0) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {task.scheduledFor && (
                <span className="flex items-center gap-1">
                  <CalendarDays size={12} />
                  {formatShortDate(task.scheduledFor)}
                  {task.scheduledTime ? ` ${task.scheduledTime}` : ''}
                </span>
              )}
              {task.estimateMinutes > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {formatEstimate(task.spentMinutes) || '0m'} / {formatEstimate(task.estimateMinutes)}
                </span>
              )}
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <Badge
                  key={t.id}
                  variant="secondary"
                  className="shrink-0 text-xs"
                  style={t.color ? { color: t.color } : undefined}
                >
                  #{t.name}
                </Badge>
              ))}
            </div>
          )}

          {task.notes.trim() && (
            <div
              className="preview min-h-0 flex-1 overflow-y-auto text-sm"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(task.notes) }}
            />
          )}
        </div>
      )}
    </div>
  );
}
