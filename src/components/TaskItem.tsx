import { useEffect, useRef, useState } from 'react';
import { FileText, PanelRight, Pause, Play, Sun, Timer, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { usePomodoro } from '../lib/pomodoro';
import { formatEstimate, todayIso } from '../lib/dates';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { TaskContextMenu } from './TaskContextMenu';
import type { Project, Tag, Task } from '../lib/api';

type Props = {
  task: Task;
  projects: Project[];
  tags: Tag[];
  focused?: boolean;
  nested?: boolean;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
};

const actionBtn =
  'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground';

export function TaskItem({ task, projects, tags, focused = false, nested = false, draggable, onDragStart, onDragEnd }: Props) {
  const toggleDone = useStore((s) => s.toggleDone);
  const scheduleForToday = useStore((s) => s.scheduleForToday);
  const selectTask = useStore((s) => s.selectTask);
  const applyTaskText = useStore((s) => s.applyTaskText);
  const tasks = useStore((s) => s.tasks);
  const isOpen = useStore((s) => s.selectedTaskId === task.id);

  const phase = usePomodoro((s) => s.phase);
  const running = usePomodoro((s) => s.running);
  const focusTaskId = usePomodoro((s) => s.focusTaskId);
  const startWork = usePomodoro((s) => s.startWork);
  const pause = usePomodoro((s) => s.pause);
  const resume = usePomodoro((s) => s.resume);

  const parent = task.parentId ? tasks.find((t) => t.id === task.parentId) ?? null : null;
  const children =
    task.parentId === null
      ? tasks.filter((t) => t.parentId === task.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      : [];
  const subTotal = children.length;

  // Project is inherited from the parent; tags are inherited + own (union).
  const projectSource = parent ?? task;
  const effectiveProject = projects.find((p) => p.id === projectSource.projectId) ?? null;
  const tagIdsToShow = [...new Set([...(parent?.tagIds ?? []), ...task.tagIds])];
  const effectiveTags = tagIdsToShow
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is Tag => Boolean(t));

  const isToday = task.scheduledFor === todayIso();
  const canFocus = subTotal === 0 && !task.done;
  const isFocusTarget = focusTaskId === task.id && phase !== 'idle' && !task.done;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  const startEdit = () => {
    setDraft(task.title);
    setEditing(true);
  };
  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== task.title) void applyTaskText(task.id, trimmed);
  };
  const cancel = () => {
    setDraft(task.title);
    setEditing(false);
  };

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [focused]);

  const rowContent = (
    <div
      className={cn(
        'group flex items-center gap-3 px-4 py-3.5 transition-colors',
        nested && 'pl-10 hover:bg-muted/30',
        task.done && nested && 'opacity-60',
      )}
    >
      <Checkbox
        checked={task.done}
        onCheckedChange={(c) => void toggleDone(task.id, c === true)}
        className="size-[18px]"
        aria-label={task.done ? 'Marquer non faite' : 'Marquer faite'}
      />

      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              else if (e.key === 'Escape') cancel();
            }}
            className="min-w-0 flex-1 bg-transparent text-[15px] leading-snug outline-none"
          />
        ) : (
          <>
            <span
              onClick={() => !task.done && startEdit()}
              className={cn(
                'min-w-0 truncate text-[15px] leading-snug',
                task.done ? 'text-muted-foreground line-through' : 'cursor-text',
              )}
            >
              {task.title}
            </span>
            {effectiveTags.map((t) => (
              <Badge key={t.id} variant="secondary" className="shrink-0 text-xs" style={t.color ? { color: t.color } : undefined}>
                #{t.name}
              </Badge>
            ))}
            <div className="ml-auto flex shrink-0 items-center gap-2.5 text-[13px] text-muted-foreground">
              {effectiveProject && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: effectiveProject.color ?? 'var(--muted-foreground)' }} />
                  {effectiveProject.name}
                </span>
              )}
              {task.estimateMinutes > 0 && (
                <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground/70">
                  <Timer size={13} /> {formatEstimate(task.estimateMinutes)}
                </span>
              )}
              {task.notes.trim() && <FileText size={14} className="text-muted-foreground/50" />}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 has-[:focus-visible]:opacity-100">
          {canFocus && !isFocusTarget && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className={actionBtn} onClick={() => startWork(task.id)}>
                  <Play size={15} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Démarrer un focus</TooltipContent>
            </Tooltip>
          )}
          {!task.done && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className={cn(actionBtn, isToday && 'text-primary')} onClick={() => void scheduleForToday(task.id, !isToday)}>
                  <Sun size={15} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{isToday ? "Retirer d'aujourd'hui" : "Planifier aujourd'hui"}</TooltipContent>
            </Tooltip>
          )}
        </div>

        {isFocusTarget && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className={cn(actionBtn, 'text-primary')} onClick={() => (running ? pause() : resume())}>
                {running ? <Pause size={15} /> : <Play size={15} />}
              </button>
            </TooltipTrigger>
            <TooltipContent>{running ? 'Mettre en pause' : 'Reprendre'}</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <button className={actionBtn} onClick={() => selectTask(isOpen ? null : task.id)}>
              {isOpen ? <X size={15} /> : <PanelRight size={15} />}
            </button>
          </TooltipTrigger>
          <TooltipContent>{isOpen ? 'Fermer le panneau' : 'Ouvrir le panneau'}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );

  const row = <TaskContextMenu task={task}>{rowContent}</TaskContextMenu>;

  if (nested) return row;

  return (
    <div
      ref={ref}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'w-full overflow-hidden rounded-xl border bg-card transition-all',
        focused ? 'border-ring ring-1 ring-ring' : 'border-border hover:shadow-sm',
        task.done && 'bg-muted/40',
        draggable && 'active:cursor-grabbing',
      )}
    >
      {row}
      {children.length > 0 && (
        <div className="border-t border-border/60">
          {children.map((child) => (
            <TaskItem key={child.id} task={child} projects={projects} tags={tags} nested />
          ))}
        </div>
      )}
    </div>
  );
}
