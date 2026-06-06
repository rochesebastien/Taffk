import { useEffect, useState } from 'react';
import { Play, Sun, Trash2, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { usePomodoro } from '../lib/pomodoro';
import { todayIso } from '../lib/dates';
import { cn } from '../lib/utils';
import { MarkdownNotes } from './MarkdownNotes';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Task } from '../lib/api';

type Props = { task: Task };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

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
  const scheduleForToday = useStore((s) => s.scheduleForToday);
  const selectTask = useStore((s) => s.selectTask);
  const startWork = usePomodoro((s) => s.startWork);

  const [title, setTitle] = useState(task.title);
  const [tagDraft, setTagDraft] = useState('');
  const [subDraft, setSubDraft] = useState('');

  const subtasks = tasks
    .filter((t) => t.parentId === task.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const subDone = subtasks.filter((t) => t.done).length;

  useEffect(() => setTitle(task.title), [task.id, task.title]);

  const isToday = task.scheduledFor === todayIso();
  const taskTags = task.tagIds.map((id) => tags.find((t) => t.id === id)).filter(Boolean);

  function commitTitle() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) void patchTask({ id: task.id, title: trimmed });
    else setTitle(task.title);
  }

  async function addTagFromDraft() {
    const name = tagDraft.trim().replace(/^#/, '').toLowerCase();
    setTagDraft('');
    if (!name) return;
    const tag = await addTag(name);
    if (!task.tagIds.includes(tag.id)) await setTaskTags(task.id, [...task.tagIds, tag.id]);
  }

  return (
    <Sheet open onOpenChange={(o) => !o && selectTask(null)}>
      <SheetContent className="w-[440px] gap-0 p-0 sm:max-w-[440px]">
        <SheetHeader className="flex-row items-center justify-between border-b p-3 pr-12">
          <SheetTitle className="sr-only">Détail de la tâche</SheetTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-muted-foreground hover:text-destructive"
            onClick={() => void deleteTask(task.id)}
          >
            <Trash2 size={14} /> Supprimer
          </Button>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={task.done}
              onCheckedChange={(c) => void patchTask({ id: task.id, done: c === true })}
              className="mt-1 size-[18px]"
            />
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              rows={1}
              className="flex-1 resize-none bg-transparent text-lg font-medium leading-snug outline-none [field-sizing:content]"
            />
          </div>

          <div className="flex flex-col gap-3">
            <Field label="Projet">
              <Select
                value={task.projectId ?? 'none'}
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
            </Field>

            <Field label="Estimation (min)">
              <Input
                type="number"
                min={0}
                step={5}
                value={task.estimateMinutes || ''}
                onChange={(e) => void patchTask({ id: task.id, estimateMinutes: Number(e.target.value) || 0 })}
                className="h-8 w-40"
              />
            </Field>

            <Field label="Planification">
              <Button
                variant={isToday ? 'secondary' : 'outline'}
                size="sm"
                className={cn('gap-1.5', isToday && 'text-primary')}
                onClick={() => void scheduleForToday(task.id, !isToday)}
              >
                {isToday && <Sun size={14} />}
                {isToday ? "Aujourd'hui" : 'Planifier'}
              </Button>
            </Field>

            <Field label={`Temps passé${task.spentMinutes > 0 ? ` · ${task.spentMinutes} min` : ''}`}>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => startWork(task.id)}>
                <Play size={13} /> Focus 25 min
              </Button>
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {taskTags.map(
              (t) =>
                t && (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 py-0.5 pl-2 pr-1 font-mono text-xs"
                    style={{ color: t.color ?? undefined }}
                  >
                    #{t.name}
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => void setTaskTags(task.id, task.tagIds.filter((id) => id !== t.id))}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ),
            )}
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
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Sous-tâches
              </span>
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
                  <Checkbox checked={s.done} onCheckedChange={(c) => void toggleDone(s.id, c === true)} className="size-4" />
                  <span className={cn('min-w-0 flex-1 truncate text-sm', s.done ? 'text-muted-foreground line-through' : 'text-foreground/80')}>
                    {s.title}
                  </span>
                  <button
                    className="text-muted-foreground/40 opacity-0 transition hover:text-destructive group-hover/sub:opacity-100"
                    onClick={() => void deleteTask(s.id)}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
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
          </div>

          <MarkdownNotes key={task.id} initial={task.notes} onSave={(notes) => void patchTask({ id: task.id, notes })} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
