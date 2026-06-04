import { useState } from 'react';
import { useStore } from '../lib/store';
import { QuickAdd } from './QuickAdd';
import type { Task, TaskStatus } from '../lib/api';

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'todo', label: 'À faire' },
  { status: 'in_progress', label: 'En cours' },
  { status: 'done', label: 'Terminé' },
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
    if (id) {
      const task = tasks.find((t) => t.id === id);
      if (task && statusOf(task) !== status) void moveTask(id, status);
    }
  }

  return (
    <div className="board-view">
      <header className="list-header">
        <div className="list-titles">
          <h1 className="list-title">Tableau</h1>
        </div>
        <div className="list-stats">{tasks.filter((t) => !t.done).length} en cours</div>
      </header>

      <div className="board-quickadd">
        <QuickAdd scheduleToday={false} placeholder="Ajouter une tâche au tableau…  (#tag  @projet)" />
      </div>

      <div className="board-columns">
        {COLUMNS.map((col) => {
          const colTasks = tasks
            .filter((t) => statusOf(t) === col.status)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
          return (
            <div
              key={col.status}
              className={`board-col ${overCol === col.status ? 'drag-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col.status);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null);
              }}
              onDrop={() => onDrop(col.status)}
            >
              <div className="board-col-head">
                <span className={`board-col-dot ${col.status}`} />
                <span className="board-col-label">{col.label}</span>
                <span className="board-col-count">{colTasks.length}</span>
              </div>

              <div className="board-col-body">
                {colTasks.map((task) => {
                  const project = projects.find((p) => p.id === task.projectId) ?? null;
                  const taskTags = task.tagIds
                    .map((id) => tags.find((t) => t.id === id))
                    .filter((t): t is NonNullable<typeof t> => Boolean(t));
                  return (
                    <div
                      key={task.id}
                      className={`board-card ${dragId === task.id ? 'dragging' : ''} ${task.done ? 'is-done' : ''}`}
                      draggable
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverCol(null);
                      }}
                      onClick={() => selectTask(task.id)}
                    >
                      <span className="board-card-title">{task.title}</span>
                      <div className="board-card-meta">
                        {project && (
                          <span className="task-project">
                            <span
                              className="project-dot"
                              style={{ background: project.color ?? 'var(--text-faint)' }}
                            />
                            {project.name}
                          </span>
                        )}
                        {taskTags.map((t) => (
                          <span key={t.id} className="task-tag" style={{ color: t.color ?? undefined }}>
                            #{t.name}
                          </span>
                        ))}
                        {task.estimateMinutes > 0 && (
                          <span className="task-est">{task.estimateMinutes}m</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {colTasks.length === 0 && <div className="board-col-empty">—</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
