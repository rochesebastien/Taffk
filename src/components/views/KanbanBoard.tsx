import { useState } from 'react';
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Circle,
  CircleCheck,
  CircleEllipsis,
  FlagTriangleRight,
  Folder,
  FolderOutput,
  Hammer,
  Tag,
  Timer,
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { formatEstimate } from '../../lib/dates';
import { cn } from '../../lib/utils';
import { QuickAdd } from '../tasks/QuickAdd';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import type { Task, TaskStatus } from '../../lib/api';

const COLUMNS: { status: TaskStatus; label: string; Icon: typeof Circle; color: string }[] = [
  { status: 'todo', label: 'À faire', Icon: Circle, color: 'text-muted-foreground' },
  { status: 'in_progress', label: 'En cours', Icon: CircleEllipsis, color: 'text-primary' },
  { status: 'done', label: 'Terminé', Icon: CircleCheck, color: 'text-emerald-500' },
];

type SortBy = 'manual' | 'estimate' | 'date';

const SORT_LABELS: Record<SortBy, string> = {
  manual: 'Manuel',
  estimate: 'Estimation (court → long)',
  date: 'Échéance (proche → loin)',
};

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

  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>('manual');

  function onDrop(status: TaskStatus) {
    setOverCol(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const task = tasks.find((t) => t.id === id);
    if (task && statusOf(task) !== status) void moveTask(id, status);
  }

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  function compare(a: Task, b: Task) {
    if (sortBy === 'estimate') {
      const ea = a.estimateMinutes > 0 ? a.estimateMinutes : Number.POSITIVE_INFINITY;
      const eb = b.estimateMinutes > 0 ? b.estimateMinutes : Number.POSITIVE_INFINITY;
      if (ea !== eb) return ea - eb;
    } else if (sortBy === 'date') {
      const da = a.scheduledFor ?? '9999-99-99';
      const db = b.scheduledFor ?? '9999-99-99';
      if (da !== db) return da.localeCompare(db);
    }
    return a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt);
  }

  return (
    <div className="flex h-full flex-col px-6">
      <header className="flex items-end justify-between gap-4 pb-4 pt-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Tableau Kanban</h1>
      </header>

      <div className="relative pb-3">
        <div className="absolute left-0 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Tag size={14} />Tags
                {tagFilter.length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 px-1.5">{tagFilter.length}</Badge>
                )}
                <ChevronDown size={14} className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel>Filtrer par tag</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tags.length === 0 ? (
                <DropdownMenuItem disabled>Aucun tag</DropdownMenuItem>
              ) : (
                tags.map((t) => (
                  <DropdownMenuItem
                    key={t.id}
                    onSelect={(e) => {
                      e.preventDefault();
                      setTagFilter((f) => toggle(f, t.id));
                    }}
                  >
                    <span style={t.color ? { color: t.color } : undefined}>#{t.name}</span>
                    {tagFilter.includes(t.id) && <Check size={14} className="ml-auto text-foreground" />}
                  </DropdownMenuItem>
                ))
              )}
              {tagFilter.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTagFilter([])}>Effacer</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Folder size={14} />Projets
                {projectFilter.length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 px-1.5">{projectFilter.length}</Badge>
                )}
                <ChevronDown size={14} className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel>Filtrer par projet</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {projects.length === 0 ? (
                <DropdownMenuItem disabled>Aucun projet</DropdownMenuItem>
              ) : (
                projects.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onSelect={(e) => {
                      e.preventDefault();
                      setProjectFilter((f) => toggle(f, p.id));
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Folder size={13} className="shrink-0" style={p.color ? { color: p.color } : undefined} />
                      {p.name}
                    </span>
                    {projectFilter.includes(p.id) && <Check size={14} className="ml-auto text-foreground" />}
                  </DropdownMenuItem>
                ))
              )}
              {projectFilter.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setProjectFilter([])}>Effacer</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={sortBy === 'manual' ? 'outline' : 'default'} size="sm" className="gap-1.5">
                <ArrowUpDown size={14} /> {sortBy === 'manual' ? 'Trier' : SORT_LABELS[sortBy]}
                <ChevronDown size={14} className={sortBy === 'manual' ? 'text-muted-foreground' : undefined} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-auto min-w-56">
              <DropdownMenuLabel>Trier les colonnes</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                <DropdownMenuRadioItem value="manual" className="whitespace-nowrap">
                  <Hammer size={14} />
                  {SORT_LABELS.manual}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="estimate" className="whitespace-nowrap">
                  <Timer size={14} />
                  {SORT_LABELS.estimate}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="date" className="whitespace-nowrap">
                  <FlagTriangleRight size={14} />
                  {SORT_LABELS.date}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <QuickAdd />
      </div>

      <div className="flex min-h-0 flex-1 gap-3 pb-6">
        {COLUMNS.map((col) => {
          const colTasks = tasks
            .filter((t) => t.parentId === null && statusOf(t) === col.status)
            .filter((t) => tagFilter.length === 0 || t.tagIds.some((id) => tagFilter.includes(id)))
            .filter((t) => projectFilter.length === 0 || (t.projectId !== null && projectFilter.includes(t.projectId)))
            .sort(compare);
          return (
            <div
              key={col.status}
              className={cn(
                'flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-muted/30 transition-colors',
                overCol === col.status ? 'border-ring bg-accent' : 'border-border',
              )}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setOverCol(col.status);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null);
              }}
              onDrop={() => onDrop(col.status)}
            >
              <div className="flex shrink-0 items-center gap-2 px-3.5 pb-2.5 pt-3">
                <col.Icon size={14} className={cn('shrink-0', col.color)} />
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
                    <div
                      key={task.id}
                      role="button"
                      tabIndex={0}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', task.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setDragId(task.id);
                      }}
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
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {project && (
                            <span className="inline-flex items-center gap-1 leading-none">
                              <FolderOutput size={13} className="shrink-0" style={project.color ? { color: project.color } : undefined} />
                              {project.name}
                            </span>
                          )}
                          {taskTags.map((t) => (
                            <Badge key={t.id} variant="secondary" className="text-xs" style={t.color ? { color: t.color } : undefined}>
                              #{t.name}
                            </Badge>
                          ))}
                          {task.estimateMinutes > 0 && (
                            <span className="inline-flex items-center gap-1 font-mono leading-none text-muted-foreground/70">
                              <Timer size={13} className="shrink-0" />
                              {formatEstimate(task.estimateMinutes)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
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
