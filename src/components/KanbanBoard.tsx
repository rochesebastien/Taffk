import { useState } from 'react';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';
import { QuickAdd } from './QuickAdd';
import type { Task, TaskStatus } from '../lib/api';

const COLUMNS: { status: TaskStatus; label: string; dot: string }[] = [
  { status: 'todo', label: 'À faire', dot: 'bg-muted-foreground' },
  { status: 'in_progress', label: 'En cours', dot: 'bg-primary' },
  { status: 'done', label: 'Terminé', dot: 'bg-emerald-500' },
];

function statusOf(t: Task): TaskStatus {
  if (t.done) return 'done';
  return t.status === 'in_progress' ? 'in_progress' : 'todo';
}

export function KanbanBoard() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const tags = useStore((s) => s.tags);
  const moveTask = useStore((s) => s.moveTask);
  const selectTask = useStore((s) => s.selectTask);

  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);

  function onDrop(status: TaskStatus) {
    setOverCol(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const task = tasks.find((t) => t.id === id);
    if (task && statusOf(task) !== status) void moveTask(id, status);
  }

  return (
    <div className="flex h-full flex-col px-6">
      <header className="flex items-end justify-between gap-4 pb-4 pt-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Tableau Kanban</h1>
        <span className="font-mono text-xs text-muted-foreground">
          {tasks.filter((t) => t.parentId === null && !t.done).length} en cours
        </span>
      </header>

      <div className="pb-3">
        <QuickAdd />
      </div>

      <div className="flex min-h-0 flex-1 gap-3 pb-6">
        {COLUMNS.map((col) => {
          const colTasks = tasks
            .filter((t) => t.parentId === null && statusOf(t) === col.status)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
          return (
            <div
              key={col.status}
              className={cn(
                'flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-muted/30 transition-colors',
                overCol === col.status ? 'border-ring bg-accent' : 'border-border',
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col.status);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null);
              }}
              onDrop={() => onDrop(col.status)}
            >
              <div className="flex shrink-0 items-center gap-2 px-3.5 pb-2.5 pt-3">
                <span className={cn('size-2 rounded-full', col.dot)} />
                <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {col.label}
                </span>
                <span className="font-mono text-xs text-muted-foreground/70">{colTasks.length}</span>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-3">
                {colTasks.map((task) => {
                  const project = projects.find((p) => p.id === task.projectId) ?? null;
                  const taskTags = task.tagIds
                    .map((id) => tags.find((t) => t.id === id))
                    .filter((t): t is NonNullable<typeof t> => Boolean(t));
                  return (
                    <button
                      key={task.id}
                      draggable
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverCol(null);
                      }}
                      onClick={() => selectTask(task.id)}
                      className={cn(
                        'flex cursor-grab flex-col gap-1.5 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-all hover:shadow-sm active:cursor-grabbing',
                        dragId === task.id && 'opacity-45',
                      )}
                    >
                      <span className={cn('break-words text-sm leading-snug', task.done && 'text-muted-foreground line-through')}>
                        {task.title}
                      </span>
                      {(project || taskTags.length > 0 || task.estimateMinutes > 0) && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {project && (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="size-2 rounded-full" style={{ background: project.color ?? 'var(--muted-foreground)' }} />
                              {project.name}
                            </span>
                          )}
                          {taskTags.map((t) => (
                            <span key={t.id} className="font-mono" style={{ color: t.color ?? undefined }}>
                              #{t.name}
                            </span>
                          ))}
                          {task.estimateMinutes > 0 && (
                            <span className="font-mono text-muted-foreground/70">{task.estimateMinutes}m</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
                {colTasks.length === 0 && (
                  <div className="py-5 text-center text-xs text-muted-foreground/40">—</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
