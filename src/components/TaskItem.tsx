import { useStore } from '../lib/store';
import type { Project, Tag, Task } from '../lib/api';

type Props = {
  task: Task;
  projects: Project[];
  tags: Tag[];
};

export function TaskItem({ task, projects, tags }: Props) {
  const toggleDone = useStore((s) => s.toggleDone);
  const deleteTask = useStore((s) => s.deleteTask);
  const scheduleForToday = useStore((s) => s.scheduleForToday);
  const selectTask = useStore((s) => s.selectTask);

  const project = projects.find((p) => p.id === task.projectId) ?? null;
  const taskTags = task.tagIds
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is Tag => Boolean(t));

  const today = new Date().toISOString().slice(0, 10);
  const isToday = task.scheduledFor === today;

  return (
    <div className={`task-item ${task.done ? 'is-done' : ''}`}>
      <button
        className={`task-check ${task.done ? 'checked' : ''}`}
        onClick={() => void toggleDone(task.id, !task.done)}
        aria-label={task.done ? 'Marquer non faite' : 'Marquer faite'}
      >
        {task.done && '✓'}
      </button>

      <div className="task-body" onClick={() => selectTask(task.id)}>
        <span className="task-title">{task.title}</span>
        <div className="task-meta">
          {project && (
            <span className="task-project">
              <span className="project-dot" style={{ background: project.color ?? 'var(--text-faint)' }} />
              {project.name}
            </span>
          )}
          {taskTags.map((t) => (
            <span key={t.id} className="task-tag" style={{ color: t.color ?? undefined }}>
              #{t.name}
            </span>
          ))}
          {task.estimateMinutes > 0 && <span className="task-est">{task.estimateMinutes}m</span>}
          {task.notes.trim() && <span className="task-note-flag" title="Contient des notes">❏</span>}
        </div>
      </div>

      <div className="task-actions">
        {!task.done && (
          <button
            className={`task-action ${isToday ? 'on' : ''}`}
            title={isToday ? "Retirer d'aujourd'hui" : "Planifier aujourd'hui"}
            onClick={() => void scheduleForToday(task.id, !isToday)}
          >
            ◎
          </button>
        )}
        <button className="task-action danger" title="Supprimer" onClick={() => void deleteTask(task.id)}>
          ✕
        </button>
      </div>
    </div>
  );
}
