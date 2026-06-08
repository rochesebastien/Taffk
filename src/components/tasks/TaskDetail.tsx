import { useEffect, useState } from 'react';
import { Archive, ArchiveRestore, ArrowLeft, CornerLeftUp, Maximize, PanelRightClose, Pause, Play, Sun, Trash2, X } from 'lucide-react';
import { fr } from 'date-fns/locale';
import { useStore } from '../../lib/store';
import { usePomodoro } from '../../lib/pomodoro';
import { confirm } from '../../lib/confirm';
import { useSettings } from '../../lib/settings';
import { ESTIMATE_OPTIONS, formatCreatedAt, formatEstimate, isoDate, todayIso } from '../../lib/dates';
import { cn } from '../../lib/utils';
import { NotesPopup } from './NotesPopup';
import { TaskCustomProps } from './TaskCustomProps';
import { renderMarkdown } from '../../lib/markdown';
import { Checkbox } from '../ui/checkbox';
import './markdown.css';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import type { Task } from '../../lib/api';

type Props = { task: Task };

function parseLocalDate(iso: string | null): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

const SECTION_LABEL = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60';

export function TaskDetail({ task }: Props) {
  const projects = useStore((s) => s.projects);
  const tags = useStore((s) => s.tags);
  const tasks = useStore((s) => s.tasks);
  const patchTask = useStore((s) => s.patchTask);
  const toggleDone = useStore((s) => s.toggleDone);
  const addSubtask = useStore((s) => s.addSubtask);
  const setTaskTags = useStore((s) => s.setTaskTags);
  const addTag = useStore((s) => s.addTag);
  const deleteTask = useStore((s) => s.deleteTask);
  const archiveTask = useStore((s) => s.archiveTask);
  const promoteSubtask = useStore((s) => s.promoteSubtask);
  const scheduleForToday = useStore((s) => s.scheduleForToday);
  const selectTask = useStore((s) => s.selectTask);
  const openProject = useStore((s) => s.openProject);
  const applyTaskText = useStore((s) => s.applyTaskText);
  const startWork = usePomodoro((s) => s.start);
  const pausePomodoro = usePomodoro((s) => s.pause);
  const resumePomodoro = usePomodoro((s) => s.resume);
  const current = usePomodoro((s) => s.current);
  const sliceMinutes = usePomodoro((s) => s.sliceMinutes);
  const running = usePomodoro((s) => s.running);
  const focusTaskId = usePomodoro((s) => s.focusTaskId);

  const isFocusTarget = focusTaskId === task.id && current > 0;
  const readOnly = task.archived;
  const archivable = task.done && !task.archived;
  const locked = task.done;

  const [title, setTitle] = useState(task.title);
  const [tagDraft, setTagDraft] = useState('');
  const [subDraft, setSubDraft] = useState('');
  const [planOpen, setPlanOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const isSubtask = task.parentId !== null;
  const parent = isSubtask ? tasks.find((t) => t.id === task.parentId) : undefined;

  const subtasks = tasks
    .filter((t) => t.parentId === task.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const subDone = subtasks.filter((t) => t.done).length;

  useEffect(() => setTitle(task.title), [task.id, task.title]);

  const isToday = task.scheduledFor === todayIso();

  const inheritedTagIds = isSubtask ? (parent?.tagIds ?? []) : [];
  const inheritedTags = inheritedTagIds.map((id) => tags.find((t) => t.id === id)).filter(Boolean);
  const ownTags = task.tagIds
    .filter((id) => !inheritedTagIds.includes(id))
    .map((id) => tags.find((t) => t.id === id))
    .filter(Boolean);

  const projectId = isSubtask ? (parent?.projectId ?? null) : task.projectId;
  const project = projects.find((p) => p.id === projectId);

  const estimate = task.estimateMinutes || 0;
  const estimateOptions: number[] =
    estimate > 0 && !(ESTIMATE_OPTIONS as readonly number[]).includes(estimate)
      ? [estimate, ...ESTIMATE_OPTIONS]
      : [...ESTIMATE_OPTIONS];

  function commitTitle() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) void applyTaskText(task.id, trimmed);
    else setTitle(task.title);
  }

  async function addTagFromDraft() {
    const name = tagDraft.trim().replace(/^#/, '').toLowerCase();
    setTagDraft('');
    if (!name) return;
    const tag = await addTag(name);
    if (!task.tagIds.includes(tag.id)) await setTaskTags(task.id, [...task.tagIds, tag.id]);
  }

  async function confirmDelete() {
    const ok =
      !useSettings.getState().confirmBeforeDelete ||
      (await confirm({
        title: 'Supprimer la tâche ?',
        description: subtasks.length > 0 ? `« ${task.title} » et ses ${subtasks.length} sous-tâches seront supprimées.` : `« ${task.title} » sera supprimée.`,
        confirmLabel: 'Supprimer',
        destructive: true,
      }));
    if (ok) void deleteTask(task.id);
  }

  async function confirmDeleteSub(sub: Task) {
    const ok = await confirm({
      title: 'Supprimer la sous-tâche ?',
      description: `« ${sub.title} » sera supprimée.`,
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (ok) void deleteTask(sub.id);
  }

  function planLabel() {
    if (isToday) return "Aujourd'hui";
    if (task.scheduledFor) {
      return parseLocalDate(task.scheduledFor)!.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return 'Planifier';
  }

  return (
    <aside className="flex w-[440px] shrink-0 flex-col overflow-hidden border-l border-border bg-background duration-200 animate-in slide-in-from-right-8">
      <div className="flex flex-row items-center justify-between border-b p-3">
        <h2 className="sr-only">Détail de la tâche</h2>
          <Button
            variant="ghost"
            size="sm"
            className="size-7 p-0 text-muted-foreground hover:text-foreground"
            title="Fermer"
            onClick={() => selectTask(null)}
          >
            <PanelRightClose size={16} />
          </Button>
          <div className="flex items-center gap-0.5">
            {archivable && (
              <Button
                variant="ghost"
                size="sm"
                className="size-7 p-0 text-muted-foreground hover:text-foreground"
                title="Archiver"
                onClick={() => void archiveTask(task.id, true)}
              >
                <Archive size={16} />
              </Button>
            )}
            {task.archived && (
              <Button
                variant="ghost"
                size="sm"
                className="size-7 p-0 text-muted-foreground hover:text-foreground"
                title="Restaurer"
                onClick={() => void archiveTask(task.id, false)}
              >
                <ArchiveRestore size={16} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="size-7 p-0 text-muted-foreground hover:text-destructive"
              title="Supprimer"
              onClick={() => void confirmDelete()}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={task.done}
              disabled={readOnly}
              onCheckedChange={(c) => void toggleDone(task.id, c === true)}
              className="mt-1 size-[18px]"
            />
            <textarea
              value={title}
              readOnly={locked}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              rows={1}
              className={cn(
                'flex-1 resize-none bg-transparent text-lg font-medium leading-snug outline-none [field-sizing:content]',
                locked && 'text-muted-foreground line-through',
              )}
            />
          </div>

          <div className="flex flex-col gap-3">
            <Field label="Projet">
              <div className="flex items-center gap-1.5">
                {project && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          openProject(project.id);
                          selectTask(null);
                        }}
                        className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <ArrowLeft size={15} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Ouvrir le projet</TooltipContent>
                  </Tooltip>
                )}
                {isSubtask ? (
                <span className="inline-flex items-center gap-2 text-sm text-foreground/80">
                  {project ? (
                    <>
                      <span className="size-2 rounded-full" style={{ backgroundColor: project.color ?? 'var(--muted-foreground)' }} />
                      {project.name}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Aucun</span>
                  )}
                </span>
              ) : (
                <Select
                  value={task.projectId ?? 'none'}
                  disabled={locked}
                  onValueChange={(v) => void patchTask({ id: task.id, projectId: v === 'none' ? null : v })}
                >
                  <SelectTrigger size="sm" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                )}
              </div>
            </Field>

            <Field label="Estimation">
              <Select value={String(estimate)} disabled={locked} onValueChange={(v) => void patchTask({ id: task.id, estimateMinutes: Number(v) })}>
                <SelectTrigger size="sm" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Aucune</SelectItem>
                  {estimateOptions.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {formatEstimate(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Planification">
              <DropdownMenu open={planOpen} onOpenChange={setPlanOpen}>
                <DropdownMenuTrigger asChild disabled={locked}>
                  <Button variant="outline" size="sm" className={cn('gap-1.5', isToday && 'text-primary')}>
                    {isToday && <Sun size={14} />}
                    {planLabel()}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-auto p-2" onCloseAutoFocus={(e) => e.preventDefault()}>
                  <DropdownMenuItem
                    onClick={() => {
                      void scheduleForToday(task.id, true);
                      setPlanOpen(false);
                    }}
                  >
                    <Sun size={14} /> Aujourd'hui
                  </DropdownMenuItem>
                  {task.scheduledFor && (
                    <DropdownMenuItem
                      onClick={() => {
                        void patchTask({ id: task.id, scheduledFor: null });
                        setPlanOpen(false);
                      }}
                    >
                      <X size={14} /> Retirer
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <Calendar
                    mode="single"
                    locale={fr}
                    selected={parseLocalDate(task.scheduledFor)}
                    onSelect={(d) => {
                      if (d) {
                        void patchTask({ id: task.id, scheduledFor: isoDate(d) });
                        setPlanOpen(false);
                      }
                    }}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </Field>

            <Field label={`Temps passé${task.spentMinutes > 0 ? ` · ${task.spentMinutes} min` : ''}`}>
              {isFocusTarget ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 text-primary"
                  onClick={() => (running ? pausePomodoro() : resumePomodoro())}
                >
                  {running ? <Pause size={13} /> : <Play size={13} />}
                  {running ? 'En focus…' : 'Reprendre'}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={locked}
                  onClick={() => startWork(task.id)}
                >
                  <Play size={13} className="fill-current" /> Focus {sliceMinutes} min
                </Button>
              )}
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {inheritedTags.map(
              (t) =>
                t && (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 rounded-md border border-dashed border-border bg-muted/30 px-2 py-0.5 font-mono text-xs text-muted-foreground"
                    style={{ color: t.color ?? undefined }}
                    title="Tag hérité du parent"
                  >
                    #{t.name}
                  </span>
                ),
            )}
            {ownTags.map(
              (t) =>
                t && (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 py-0.5 pl-2 pr-1 font-mono text-xs"
                    style={{ color: t.color ?? undefined }}
                  >
                    #{t.name}
                    {!locked && (
                      <button
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => void setTaskTags(task.id, task.tagIds.filter((id) => id !== t.id))}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </span>
                ),
            )}
            {!locked && (
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void addTagFromDraft();
                  }
                }}
                onBlur={() => void addTagFromDraft()}
                placeholder="+ tag"
                className="w-20 rounded-md border border-dashed border-border bg-transparent px-2 py-1 text-xs outline-none focus:border-solid focus:border-ring"
              />
            )}
          </div>

          <TaskCustomProps task={task} readOnly={readOnly} />

          {isSubtask ? (
            <div className="flex flex-col gap-2">
              <span className={SECTION_LABEL}>Tâche parent</span>
              {parent && (
                <button
                  className="inline-flex items-center gap-1.5 self-start text-sm text-foreground/80 hover:underline"
                  onClick={() => selectTask(parent.id)}
                >
                  <CornerLeftUp size={14} className="text-muted-foreground" />
                  {parent.title}
                </button>
              )}
              <Button variant="outline" size="sm" className="self-start" disabled={locked} onClick={() => void promoteSubtask(task.id)}>
                Convertir en tâche
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className={SECTION_LABEL}>Sous-tâches</span>
                {subtasks.length > 0 && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {subDone}/{subtasks.length}
                  </span>
                )}
              </div>
              {subtasks.length > 0 && (
                <div className="h-1 overflow-hidden rounded-full bg-accent">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-[width]"
                    style={{ width: `${(subDone / subtasks.length) * 100}%` }}
                  />
                </div>
              )}
              <div className="flex flex-col">
                {subtasks.map((s) => (
                  <div key={s.id} className="group/sub flex items-center gap-2.5 rounded-md px-1 py-1.5 hover:bg-accent/50">
                    <Checkbox checked={s.done} disabled={readOnly} onCheckedChange={(c) => void toggleDone(s.id, c === true)} className="size-4" />
                    <span className={cn('min-w-0 flex-1 truncate text-sm', s.done ? 'text-muted-foreground line-through' : 'text-foreground/80')}>
                      {s.title}
                    </span>
                    {!readOnly && (
                      <button
                        className="text-muted-foreground/40 opacity-0 transition hover:text-destructive group-hover/sub:opacity-100"
                        onClick={() => void confirmDeleteSub(s)}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {!locked && (
                <input
                  value={subDraft}
                  onChange={(e) => setSubDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void addSubtask(task.id, subDraft);
                      setSubDraft('');
                    }
                  }}
                  placeholder="+ sous-tâche"
                  className="rounded-md border border-dashed border-border bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-solid focus:border-ring"
                />
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className={SECTION_LABEL}>Notes</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setNotesOpen(true)}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Maximize size={15} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Ouvrir les notes</TooltipContent>
              </Tooltip>
            </div>
            {task.notes.trim() ? (
              <div
                className="preview cursor-pointer rounded-lg border border-border bg-muted/40 px-3.5 py-3"
                onClick={() => setNotesOpen(true)}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(task.notes) }}
              />
            ) : readOnly ? (
              <div className="rounded-lg border border-dashed border-border px-3.5 py-5 text-center text-sm text-muted-foreground/50">
                Aucune note.
              </div>
            ) : (
              <button
                onClick={() => setNotesOpen(true)}
                className="rounded-lg border border-dashed border-border px-3.5 py-5 text-center text-sm text-muted-foreground/50 transition-colors hover:text-muted-foreground"
              >
                Aucune note — cliquez pour en ajouter.
              </button>
            )}
          </div>

          <p className="mt-auto pt-2 text-xs text-muted-foreground/60">Créé le {formatCreatedAt(task.createdAt)}</p>
        </div>

        <NotesPopup task={task} open={notesOpen} onOpenChange={setNotesOpen} editable={!task.archived} />
      </aside>
  );
}
