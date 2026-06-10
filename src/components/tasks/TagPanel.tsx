import { Hash, PanelRightClose } from 'lucide-react';
import { useStore } from '../../lib/store';
import { isOverdue } from '../../lib/dates';
import { cn } from '../../lib/utils';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import type { Tag } from '../../lib/api';

export function TagPanel({ tag }: { tag: Tag }) {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const selectTag = useStore((s) => s.selectTag);
  const selectTask = useStore((s) => s.selectTask);
  const toggleDone = useStore((s) => s.toggleDone);

  const tagged = tasks
    .filter((t) => t.tagIds.includes(tag.id) && !t.archived)
    .sort((a, b) => Number(a.done) - Number(b.done) || a.createdAt.localeCompare(b.createdAt));
  const openCount = tagged.filter((t) => !t.done).length;

  function openTask(id: string) {
    selectTag(null);
    selectTask(id);
  }

  return (
    <aside className="flex w-[440px] shrink-0 flex-col overflow-hidden border-l border-border bg-background duration-200 animate-in slide-in-from-right-8">
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex min-w-0 items-center gap-2 pl-1">
          <Hash size={16} className="shrink-0" style={{ color: tag.color ?? undefined }} />
          <h2 className="truncate font-mono text-sm font-medium">#{tag.name}</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="size-7 p-0 text-muted-foreground hover:text-foreground"
          title="Fermer"
          onClick={() => selectTag(null)}
        >
          <PanelRightClose size={16} />
        </Button>
      </div>

      <div className="border-b px-4 py-2 font-mono text-xs text-muted-foreground">
        {tagged.length} tâche{tagged.length > 1 ? 's' : ''} · {openCount} en cours
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {tagged.length === 0 ? (
          <div className="px-3 py-10 text-center text-sm text-muted-foreground/60">
            Aucune tâche avec ce tag.
          </div>
        ) : (
          tagged.map((t) => {
            const project = projects.find((p) => p.id === t.projectId);
            const overdue = isOverdue(t.scheduledFor, t.done);
            return (
              <div
                key={t.id}
                onClick={() => openTask(t.id)}
                className="group flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-accent/50"
              >
                <span onClick={(e) => e.stopPropagation()} className="flex shrink-0 items-center">
                  <Checkbox
                    checked={t.done}
                    onCheckedChange={(c) => void toggleDone(t.id, c === true)}
                    className="size-4"
                  />
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-sm',
                    t.done ? 'text-muted-foreground line-through' : 'text-foreground/90',
                    overdue && 'text-destructive',
                  )}
                >
                  {t.title}
                </span>
                {project && (
                  <span className="shrink-0 truncate text-xs text-muted-foreground">{project.name}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
