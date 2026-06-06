import { useEffect, useRef } from 'react';
import { Check, FileText, ListChecks, Sun, X } from 'lucide-react';
import { useStore } from '../lib/store';
import type { Project, Tag, Task } from '../lib/api';

type Props = {
  task: Task;
  projects: Project[];
  tags: Tag[];
  focused?: boolean;
};

export function TaskItem({ task, projects, tags, focused = false }: Props) {
  const toggleDone = useStore((s) => s.toggleDone);
  const deleteTask = useStore((s) => s.deleteTask);
  const scheduleForToday = useStore((s) => s.scheduleForToday);
  const selectTask = useStore((s) => s.selectTask);
  const subTotal = useStore((s) => s.tasks.filter((t) => t.parentId === task.id).length);
  const subDone = useStore((s) => s.tasks.filter((t) => t.parentId === task.id && t.done).length);
  const sub = subTotal > 0 ? { done: subDone, total: subTotal } : null;

  const project = projects.find((p) => p.id === task.projectId) ?? null;
  const taskTags = task.tagIds
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is Tag => Boolean(t));

  const today = new Date().toISOString().slice(0, 10);
  const isToday = task.scheduledFor === today;

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [focused]);

  return (
    <div ref={ref} className={`task-item ${task.done ? 'is-done' : ''} ${focused ? 'focused' : ''}`}>
      <button
        className={`task-check ${task.done ? 'checked' : ''}`}
        onClick={() => void toggleDone(task.id, !task.done)}
        aria-label={task.done ? 'Marquer non faite' : 'Marquer faite'}
      >
        {task.done && <Check size={13} strokeWidth={3} />}
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
          {sub && (
            <span className={`task-sub ${sub.done === sub.total ? 'complete' : ''}`} title="Sous-tâches">
              <ListChecks size={13} /> {sub.done}/{sub.total}
            </span>
          )}
          {task.notes.trim() && (
            <span className="task-note-flag" title="Contient des notes">
              <FileText size={14} />
            </span>
          )}
        </div>
      </div>

      <div className="task-actions">
        {!task.done && (
          <button
            className={`task-action ${isToday ? 'on' : ''}`}
            title={isToday ? "Retirer d'aujourd'hui" : "Planifier aujourd'hui"}
            onClick={() => void scheduleForToday(task.id, !isToday)}
          >
            <Sun size={15} />
          </button>
        )}
        <button className="task-action danger" title="Supprimer" onClick={() => void deleteTask(task.id)}>
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
