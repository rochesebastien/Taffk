import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { addDays, dayName, formatRange, isoDate, todayIso, weekStart } from '../lib/dates';
import type { Task } from '../lib/api';

export function CalendarView() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const patchTask = useStore((s) => s.patchTask);
  const quickAdd = useStore((s) => s.quickAdd);
  const selectTask = useStore((s) => s.selectTask);

  const [anchor, setAnchor] = useState(() => weekStart(new Date()));
  const [dragId, setDragId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [addDayKey, setAddDayKey] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)), [anchor]);
  const today = todayIso();

  const backlog = tasks.filter((t) => !t.done && !t.scheduledFor);
  const byDay = (iso: string) =>
    tasks
      .filter((t) => t.scheduledFor === iso)
      .sort((a, b) => Number(a.done) - Number(b.done) || a.sortOrder - b.sortOrder);

  function drop(target: string | null, key: string) {
    setOverKey(null);
    const id = dragId;
    setDragId(null);
    if (id) {
      const task = tasks.find((t) => t.id === id);
      if (task && task.scheduledFor !== target) void patchTask({ id, scheduledFor: target });
    }
    void key;
  }

  async function submitAdd(iso: string) {
    const raw = draft;
    setDraft('');
    setAddDayKey(null);
    if (raw.trim()) await quickAdd(raw, { date: iso });
  }

  const projectColor = (t: Task) =>
    projects.find((p) => p.id === t.projectId)?.color ?? 'var(--text-faint)';

  function card(t: Task) {
    return (
      <div
        key={t.id}
        className={`cal-card ${t.done ? 'is-done' : ''} ${dragId === t.id ? 'dragging' : ''}`}
        draggable
        onDragStart={() => setDragId(t.id)}
        onDragEnd={() => {
          setDragId(null);
          setOverKey(null);
        }}
        onClick={() => selectTask(t.id)}
      >
        <span className="cal-card-dot" style={{ background: projectColor(t) }} />
        <span className="cal-card-title">{t.title}</span>
      </div>
    );
  }

  return (
    <div className="cal-view">
      <header className="list-header">
        <div className="list-titles">
          <h1 className="list-title">Planning</h1>
          <span className="list-subtitle">{formatRange(days[0], days[6])}</span>
        </div>
        <div className="cal-nav">
          <button onClick={() => setAnchor(addDays(anchor, -7))} title="Semaine précédente">
            ‹
          </button>
          <button onClick={() => setAnchor(weekStart(new Date()))}>Cette semaine</button>
          <button onClick={() => setAnchor(addDays(anchor, 7))} title="Semaine suivante">
            ›
          </button>
        </div>
      </header>

      <div
        className={`cal-backlog ${overKey === 'backlog' ? 'drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOverKey('backlog');
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverKey(null);
        }}
        onDrop={() => drop(null, 'backlog')}
      >
        <span className="cal-backlog-label">Non planifiées · {backlog.length}</span>
        <div className="cal-backlog-items">
          {backlog.map(card)}
          {backlog.length === 0 && <span className="cal-backlog-empty">tout est planifié ✓</span>}
        </div>
      </div>

      <div className="cal-grid">
        {days.map((d) => {
          const iso = isoDate(d);
          const dayTasks = byDay(iso);
          return (
            <div
              key={iso}
              className={`cal-day ${iso === today ? 'is-today' : ''} ${overKey === iso ? 'drag-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOverKey(iso);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverKey(null);
              }}
              onDrop={() => drop(iso, iso)}
            >
              <div className="cal-day-head">
                <span className="cal-day-name">{dayName(d)}</span>
                <span className="cal-day-num">{d.getDate()}</span>
                <button className="cal-day-add" title="Ajouter" onClick={() => setAddDayKey(iso)}>
                  +
                </button>
              </div>
              <div className="cal-day-body">
                {addDayKey === iso && (
                  <input
                    className="cal-add-input"
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => void submitAdd(iso)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void submitAdd(iso);
                      } else if (e.key === 'Escape') {
                        setDraft('');
                        setAddDayKey(null);
                      }
                    }}
                    placeholder="Tâche…"
                  />
                )}
                {dayTasks.map(card)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
