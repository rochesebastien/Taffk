import { useMemo } from 'react';
import { useStore } from '../lib/store';
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

  const open = filtered.filter((t) => !t.done);
  const done = filtered.filter((t) => t.done);

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
            <TaskItem key={task.id} task={task} projects={projects} tags={tags} />
          ))}
        </div>

        {done.length > 0 && (
          <div className="task-group done-group">
            <div className="group-label">Terminées</div>
            {done.map((task) => (
              <TaskItem key={task.id} task={task} projects={projects} tags={tags} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
