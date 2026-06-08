import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { isTypingTarget } from '../lib/keyboard';
import { todayIso } from '../lib/dates';
import { cn } from '../lib/utils';
import { QuickAdd } from './QuickAdd';
import { TaskItem } from './TaskItem';
import type { Task } from '../lib/api';

function sortTasks(a: Task, b: Task) {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return b.createdAt.localeCompare(a.createdAt);
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
  const [dragId, setDragId] = useState<string | null>(null);
  const [overDone, setOverDone] = useState(false);
  const [overOpen, setOverOpen] = useState(false);

  const dragging = dragId ? visible.find((t) => t.id === dragId) ?? null : null;

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
      <header className="flex w-full items-end justify-between gap-4 px-6 pb-4 pt-8">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <span className="text-sm capitalize text-muted-foreground/70">{subtitle}</span>}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="w-full px-6 pb-10">
          <QuickAdd />

          {open.length === 0 && done.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <p>Rien ici pour l'instant.</p>
            </div>
          ) : (
            <div className="mx-auto mt-4 flex w-fit min-w-[72%] max-w-full flex-col gap-2">
              <div
                onDragOver={(e) => {
                  if (!dragging?.done) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setOverOpen(true);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverOpen(false);
                }}
                onDrop={() => {
                  if (dragId && dragging?.done) void toggleDone(dragId, false);
                  setDragId(null);
                  setOverOpen(false);
                }}
                className={cn(
                  'flex flex-col gap-2 rounded-xl transition-colors',
                  overOpen && 'bg-accent/40 ring-2 ring-ring ring-offset-2 ring-offset-background',
                )}
              >
                <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {open.length} en cours
                </div>
                {open.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    projects={projects}
                    tags={tags}
                    focused={task.id === focusedId}
                    draggable
                    onDragStart={() => setDragId(task.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverDone(false);
                      setOverOpen(false);
                    }}
                  />
                ))}
                {open.length === 0 && dragging?.done && (
                  <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground/60">
                    Déposer ici pour rouvrir
                  </div>
                )}
              </div>
              {(done.length > 0 || (dragId && !dragging?.done)) && (
                <div
                  onDragOver={(e) => {
                    if (dragging?.done) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setOverDone(true);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverDone(false);
                  }}
                  onDrop={() => {
                    if (dragId && !dragging?.done) void toggleDone(dragId, true);
                    setDragId(null);
                    setOverDone(false);
                  }}
                  className={cn(
                    'mt-3 flex flex-col gap-2 rounded-xl transition-colors',
                    overDone && 'bg-accent/40 ring-2 ring-ring ring-offset-2 ring-offset-background',
                  )}
                >
                  <div className="px-1 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Terminées
                  </div>
                  {done.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      projects={projects}
                      tags={tags}
                      focused={task.id === focusedId}
                      draggable
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverDone(false);
                        setOverOpen(false);
                      }}
                    />
                  ))}
                  {done.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground/60">
                      Déposer ici pour terminer
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
