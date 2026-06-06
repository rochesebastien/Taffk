import { useEffect, useRef } from 'react';
import { FileText, ListChecks, Sun, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { todayIso } from '../lib/dates';
import { cn } from '../lib/utils';
import { Checkbox } from './ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import type { Project, Tag, Task } from '../lib/api';

type Props = {
  task: Task;
  projects: Project[];
  tags: Tag[];
  focused?: boolean;
};

export function TaskItem({ task, projects, tags, focused = false }: Props) {
  const toggleDone = useStore((s) => s.toggleDone);
  const deleteTask = useStore((s) => s.deleteTask);
  const scheduleForToday = useStore((s) => s.scheduleForToday);
  const selectTask = useStore((s) => s.selectTask);
  const subTotal = useStore((s) => s.tasks.filter((t) => t.parentId === task.id).length);
  const subDone = useStore((s) => s.tasks.filter((t) => t.parentId === task.id && t.done).length);

  const project = projects.find((p) => p.id === task.projectId) ?? null;
  const taskTags = task.tagIds
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is Tag => Boolean(t));

  const isToday = task.scheduledFor === todayIso();

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [focused]);

  return (
    <div
      ref={ref}
      className={cn(
        'group flex items-start gap-3 rounded-xl border bg-card px-4 py-3.5 transition-all',
        focused ? 'border-ring ring-1 ring-ring' : 'border-border hover:shadow-sm',
        task.done && 'bg-muted/40',
      )}
    >
      <Checkbox
        checked={task.done}
        onCheckedChange={(c) => void toggleDone(task.id, c === true)}
        className="mt-0.5 size-[18px]"
        aria-label={task.done ? 'Marquer non faite' : 'Marquer faite'}
      />

      <button
        className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1 text-left"
        onClick={() => selectTask(task.id)}
      >
        <span className={cn('break-words text-[15px] leading-snug', task.done && 'text-muted-foreground line-through')}>
          {task.title}
        </span>
        <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-muted-foreground">
          {project && (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: project.color ?? 'var(--muted-foreground)' }} />
              {project.name}
            </span>
          )}
          {taskTags.map((t) => (
            <span key={t.id} className="font-mono text-xs" style={{ color: t.color ?? undefined }}>
              #{t.name}
            </span>
          ))}
          {task.estimateMinutes > 0 && (
            <span className="font-mono text-xs text-muted-foreground/70">{task.estimateMinutes}m</span>
          )}
          {subTotal > 0 && (
            <span
              className={cn('inline-flex items-center gap-1 font-mono text-xs', subDone === subTotal && 'text-emerald-500')}
            >
              <ListChecks size={13} /> {subDone}/{subTotal}
            </span>
          )}
          {task.notes.trim() && <FileText size={14} className="text-muted-foreground/50" />}
        </div>
      </button>

      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 has-[:focus-visible]:opacity-100">
        {!task.done && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                  isToday && 'text-primary',
                )}
                onClick={() => void scheduleForToday(task.id, !isToday)}
              >
                <Sun size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent>{isToday ? "Retirer d'aujourd'hui" : "Planifier aujourd'hui"}</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              onClick={() => void deleteTask(task.id)}
            >
              <X size={15} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Supprimer</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
