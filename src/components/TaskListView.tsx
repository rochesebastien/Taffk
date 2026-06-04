import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { isTypingTarget } from '../lib/keyboard';
import { QuickAdd } from './QuickAdd';
import { TaskItem } from './TaskItem';
import type { Task } from '../lib/api';

const today = () => new Date().toISOString().slice(0, 10);

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

  const filtered = useMemo(() => {
    const t = today();
    let list = tasks.filter((x) => x.parentId === null);
    if (view === 'today') list = list.filter((x) => x.scheduledFor === t);
    else if (view === 'project') list = list.filter((x) => x.projectId === activeProjectId);
    return [...list].sort(sortTasks);
  }, [tasks, view, activeProjectId]);

  const visible = useMemo(
    () => [...filtered].sort((a, b) => Number(a.done) - Number(b.done)),
    [filtered],
  );
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
    <div className="list-view">
      <header className="list-header">
        <div className="list-titles">
          <h1 className="list-title">{title}</h1>
          {subtitle && <span className="list-subtitle">{subtitle}</span>}
        </div>
        <div className="list-stats">
          <span>{open.length} en cours</span>
          {done.length > 0 && <span className="muted">· {done.length} faites</span>}
        </div>
      </header>

      <QuickAdd scheduleToday={view === 'today'} />

      <div className="task-scroll">
        {open.length === 0 && done.length === 0 && (
          <div className="empty-state">
            <p>Rien ici pour l'instant.</p>
            <p className="muted">Ajoute une tâche ci-dessus — appuie sur Entrée.</p>
          </div>
        )}

        <div className="task-group">
          {open.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              projects={projects}
              tags={tags}
              focused={task.id === focusedId}
            />
          ))}
        </div>

        {done.length > 0 && (
          <div className="task-group done-group">
            <div className="group-label">Terminées</div>
            {done.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                projects={projects}
                tags={tags}
                focused={task.id === focusedId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
