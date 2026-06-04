import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { MarkdownNotes } from './MarkdownNotes';
import type { Task } from '../lib/api';

type Props = { task: Task };

export function TaskDetail({ task }: Props) {
  const projects = useStore((s) => s.projects);
  const tags = useStore((s) => s.tags);
  const patchTask = useStore((s) => s.patchTask);
  const setTaskTags = useStore((s) => s.setTaskTags);
  const addTag = useStore((s) => s.addTag);
  const deleteTask = useStore((s) => s.deleteTask);
  const scheduleForToday = useStore((s) => s.scheduleForToday);
  const selectTask = useStore((s) => s.selectTask);

  const [title, setTitle] = useState(task.title);
  const [tagDraft, setTagDraft] = useState('');

  useEffect(() => {
    setTitle(task.title);
  }, [task.id, task.title]);

  const today = new Date().toISOString().slice(0, 10);
  const isToday = task.scheduledFor === today;
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
    <>
      <div className="detail-backdrop" onClick={() => selectTask(null)} />
      <aside className="detail-drawer">
        <header className="detail-head">
          <button className="icon-btn" title="Fermer" onClick={() => selectTask(null)}>
            ✕
          </button>
          <button
            className="detail-del"
            title="Supprimer la tâche"
            onClick={() => void deleteTask(task.id)}
          >
            Supprimer
          </button>
        </header>

        <div className="detail-body">
          <label className="detail-title-row">
            <button
              className={`task-check ${task.done ? 'checked' : ''}`}
              onClick={() => void patchTask({ id: task.id, done: !task.done })}
            >
              {task.done && '✓'}
            </button>
            <textarea
              className="detail-title"
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
            />
          </label>

          <div className="detail-fields">
            <div className="field">
              <span className="field-label">Projet</span>
              <select
                className="field-input"
                value={task.projectId ?? ''}
                onChange={(e) => void patchTask({ id: task.id, projectId: e.target.value || null })}
              >
                <option value="">Aucun</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <span className="field-label">Estimation (min)</span>
              <input
                className="field-input"
                type="number"
                min={0}
                step={5}
                value={task.estimateMinutes || ''}
                onChange={(e) =>
                  void patchTask({ id: task.id, estimateMinutes: Number(e.target.value) || 0 })
                }
              />
            </div>

            <div className="field">
              <span className="field-label">Planification</span>
              <button
                className={`field-toggle ${isToday ? 'on' : ''}`}
                onClick={() => void scheduleForToday(task.id, !isToday)}
              >
                {isToday ? "◎ Aujourd'hui" : "Planifier aujourd'hui"}
              </button>
            </div>
          </div>

          <div className="detail-tags">
            {taskTags.map(
              (t) =>
                t && (
                  <span key={t.id} className="tag-chip" style={{ color: t.color ?? undefined }}>
                    #{t.name}
                    <button
                      onClick={() =>
                        void setTaskTags(
                          task.id,
                          task.tagIds.filter((id) => id !== t.id),
                        )
                      }
                    >
                      ×
                    </button>
                  </span>
                ),
            )}
            <input
              className="tag-add"
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
            />
          </div>

          <MarkdownNotes
            key={task.id}
            initial={task.notes}
            onSave={(notes) => void patchTask({ id: task.id, notes })}
          />
        </div>
      </aside>
    </>
  );
}
