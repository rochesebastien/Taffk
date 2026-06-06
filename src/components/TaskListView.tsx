import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { isTypingTarget } from '../lib/keyboard';
import { todayIso } from '../lib/dates';
import { QuickAdd } from './QuickAdd';
import { TaskItem } from './TaskItem';
import type { Task } from '../lib/api';

function sortTasks(a: Task, b: Task) {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.createdAt.localeCompare(b.createdAt);
}

export function TaskListView() {
  const view = useStore((s) => s.view);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const tags = useStore((s) => s.tags);
  const toggleDone = useStore((s) => s.toggleDone);
  const selectTask = useStore((s) => s.selectTask);
  const drawerOpen = useStore((s) => s.selectedTaskId !== null);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  const title =
    view === 'today' ? "Aujourd'hui" : view === 'all' ? 'Toutes les tâches' : (activeProject?.name ?? 'Projet');

  const subtitle =
    view === 'today'
      ? new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      : null;

  const visible = useMemo(() => {
    const t = todayIso();
    let list = tasks.filter((x) => x.parentId === null);
    if (view === 'today') list = list.filter((x) => x.scheduledFor === t);
    else if (view === 'project') list = list.filter((x) => x.projectId === activeProjectId);
    return [...list].sort((a, b) => Number(a.done) - Number(b.done) || sortTasks(a, b));
  }, [tasks, view, activeProjectId]);

  const open = visible.filter((t) => !t.done);
  const done = visible.filter((t) => t.done);

  const [focusedId, setFocusedId] = useState<string | null>(null);

  useEffect(() => {
    if (focusedId && !visible.some((t) => t.id === focusedId)) setFocusedId(null);
  }, [visible, focusedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (drawerOpen || isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const ids = visible.map((t) => t.id);
      if (ids.length === 0) return;
      const idx = focusedId ? ids.indexOf(focusedId) : -1;
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedId(ids[Math.min(idx + 1, ids.length - 1)]);
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedId(ids[Math.max(idx - 1, 0)]);
      } else if (e.key === 'x' && focusedId) {
        const t = visible.find((v) => v.id === focusedId);
        if (t) void toggleDone(t.id, !t.done);
      } else if (e.key === 'Enter' && focusedId) {
        e.preventDefault();
        selectTask(focusedId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, focusedId, drawerOpen, toggleDone, selectTask]);

  return (
    <div className="flex h-full flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-end justify-between gap-4 px-6 pb-4 pt-8">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <span className="text-sm capitalize text-muted-foreground/70">{subtitle}</span>}
        </div>
        <div className="whitespace-nowrap font-mono text-xs text-muted-foreground">
          {open.length} en cours
          {done.length > 0 && <span className="text-muted-foreground/50"> · {done.length} faites</span>}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 pb-10">
          <QuickAdd scheduleToday={view === 'today'} />

          {open.length === 0 && done.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <p>Rien ici pour l'instant.</p>
              <p className="mt-1 text-sm text-muted-foreground/60">Ajoute une tâche ci-dessus — appuie sur Entrée.</p>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {open.map((task) => (
                <TaskItem key={task.id} task={task} projects={projects} tags={tags} focused={task.id === focusedId} />
              ))}
            </div>
          )}

          {done.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              <div className="px-1 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Terminées
              </div>
              {done.map((task) => (
                <TaskItem key={task.id} task={task} projects={projects} tags={tags} focused={task.id === focusedId} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
