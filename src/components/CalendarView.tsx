import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, Clock, List, Plus } from 'lucide-react';
import { useStore } from '../lib/store';
import {
  addDays,
  currentMinutes,
  dayName,
  formatRange,
  isoDate,
  minutesToTime,
  timeToMinutes,
  todayIso,
  weekStart,
} from '../lib/dates';
import type { Task } from '../lib/api';

const HOUR_PX = 48;
const PX_PER_MIN = HOUR_PX / 60;
const SNAP_MIN = 15;
const DEFAULT_DURATION = 30;
const SCROLL_TO_HOUR = 7;
const DAY_MINUTES = 24 * 60;

type Mode = 'grid' | 'list';

/** Snap a pixel offset inside a day column to a minute-of-day on the SNAP grid. */
function offsetToMinutes(clientY: number, columnTop: number): number {
  const raw = (clientY - columnTop) / PX_PER_MIN;
  const snapped = Math.round(raw / SNAP_MIN) * SNAP_MIN;
  return Math.max(0, Math.min(DAY_MINUTES - SNAP_MIN, snapped));
}

/** Greedy lane assignment so overlapping events sit side by side. */
function assignLanes(events: { task: Task; start: number; end: number }[]) {
  const sorted = [...events].sort((a, b) => a.start - b.start || a.end - b.end);
  const laneEnds: number[] = [];
  const placed = sorted.map((ev) => {
    let lane = laneEnds.findIndex((end) => end <= ev.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(ev.end);
    } else {
      laneEnds[lane] = ev.end;
    }
    return { ...ev, lane };
  });
  return { placed, lanes: Math.max(1, laneEnds.length) };
}

export function CalendarView() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const patchTask = useStore((s) => s.patchTask);
  const quickAdd = useStore((s) => s.quickAdd);
  const selectTask = useStore((s) => s.selectTask);

  const [mode, setMode] = useState<Mode>('grid');
  const [anchor, setAnchor] = useState(() => weekStart(new Date()));
  const [dragId, setDragId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<{ iso: string; minutes: number } | null>(null);
  const [hover, setHover] = useState<{ iso: string; minutes: number } | null>(null);
  const [addDayKey, setAddDayKey] = useState<string | null>(null);
  const [addAt, setAddAt] = useState<{ iso: string; minutes: number } | null>(null);
  const [draft, setDraft] = useState('');

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)), [anchor]);
  const today = todayIso();
  const nowMin = currentMinutes();

  useEffect(() => {
    if (mode === 'grid' && scrollRef.current) {
      scrollRef.current.scrollTop = SCROLL_TO_HOUR * HOUR_PX;
    }
  }, [mode]);

  const topLevel = tasks.filter((t) => t.parentId === null);
  const backlog = topLevel.filter((t) => !t.done && !t.scheduledFor);
  const byDay = (iso: string) =>
    topLevel
      .filter((t) => t.scheduledFor === iso)
      .sort((a, b) => Number(a.done) - Number(b.done) || a.sortOrder - b.sortOrder);

  const projectColor = (t: Task) =>
    projects.find((p) => p.id === t.projectId)?.color ?? 'var(--text-faint)';
  const duration = (t: Task) => (t.estimateMinutes > 0 ? t.estimateMinutes : DEFAULT_DURATION);

  function applyDrop(target: { iso: string; minutes: number } | null) {
    const id = dragId;
    setDragId(null);
    setOverKey(null);
    setDropAt(null);
    if (!id) return;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const nextFor = target ? target.iso : null;
    const nextTime = target ? minutesToTime(target.minutes) : null;
    if (task.scheduledFor !== nextFor || (task.scheduledTime ?? null) !== nextTime) {
      void patchTask({ id, scheduledFor: nextFor, scheduledTime: nextTime });
    }
  }

  async function submitAddDay(iso: string) {
    const raw = draft;
    setDraft('');
    setAddDayKey(null);
    if (raw.trim()) await quickAdd(raw, { date: iso });
  }

  async function submitAddAt() {
    const at = addAt;
    const raw = draft;
    setDraft('');
    setAddAt(null);
    if (at && raw.trim()) await quickAdd(raw, { date: at.iso, time: minutesToTime(at.minutes) });
  }

  // ── compact card (backlog + list mode) ─────────────────────────────────
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
          setDropAt(null);
        }}
        onClick={() => selectTask(t.id)}
      >
        <span className="cal-card-dot" style={{ background: projectColor(t) }} />
        <span className="cal-card-title">{t.title}</span>
      </div>
    );
  }

  const backlogBar = (
    <div
      className={`cal-backlog ${overKey === 'backlog' ? 'drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOverKey('backlog');
        setDropAt(null);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverKey(null);
      }}
      onDrop={() => applyDrop(null)}
    >
      <span className="cal-backlog-label">Non planifiées · {backlog.length}</span>
      <div className="cal-backlog-items">
        {backlog.map(card)}
        {backlog.length === 0 && <span className="cal-backlog-empty">tout est planifié ✓</span>}
      </div>
    </div>
  );

  return (
    <div className="cal-view">
      <header className="list-header">
        <div className="list-titles">
          <h1 className="list-title">Planning</h1>
          <span className="list-subtitle">{formatRange(days[0], days[6])}</span>
        </div>
        <div className="cal-nav">
          <div className="cal-modes">
            <button
              className={mode === 'grid' ? 'is-active' : ''}
              onClick={() => setMode('grid')}
              title="Vue horaire"
            >
              <CalendarClock size={15} />
            </button>
            <button
              className={mode === 'list' ? 'is-active' : ''}
              onClick={() => setMode('list')}
              title="Vue liste"
            >
              <List size={15} />
            </button>
          </div>
          <button onClick={() => setAnchor(addDays(anchor, -7))} title="Semaine précédente">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setAnchor(weekStart(new Date()))}>Cette semaine</button>
          <button onClick={() => setAnchor(addDays(anchor, 7))} title="Semaine suivante">
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      {backlogBar}

      {mode === 'list' ? (
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
                onDrop={() => applyDrop({ iso, minutes: timeToMinutes('09:00') ?? 540 })}
              >
                <div className="cal-day-head">
                  <span className="cal-day-name">{dayName(d)}</span>
                  <span className="cal-day-num">{d.getDate()}</span>
                  <button className="cal-day-add" title="Ajouter" onClick={() => setAddDayKey(iso)}>
                    <Plus size={14} />
                  </button>
                </div>
                <div className="cal-day-body">
                  {addDayKey === iso && (
                    <input
                      className="cal-add-input"
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={() => void submitAddDay(iso)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void submitAddDay(iso);
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
      ) : (
        <TimeGrid
          days={days}
          today={today}
          nowMin={nowMin}
          scrollRef={scrollRef}
          byDay={byDay}
          duration={duration}
          projectColor={projectColor}
          dragId={dragId}
          hover={hover}
          dropAt={dropAt}
          addAt={addAt}
          draft={draft}
          onSelect={selectTask}
          onDragStart={setDragId}
          onDragEnd={() => {
            setDragId(null);
            setOverKey(null);
            setDropAt(null);
          }}
          onHover={setHover}
          onDropAt={setDropAt}
          onDrop={applyDrop}
          onOpenAdd={(at) => {
            setHover(null);
            setDraft('');
            setAddAt(at);
          }}
          onDraftChange={setDraft}
          onSubmitAdd={submitAddAt}
          onCancelAdd={() => {
            setDraft('');
            setAddAt(null);
          }}
        />
      )}
    </div>
  );
}

type TimeGridProps = {
  days: Date[];
  today: string;
  nowMin: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  byDay: (iso: string) => Task[];
  duration: (t: Task) => number;
  projectColor: (t: Task) => string;
  dragId: string | null;
  hover: { iso: string; minutes: number } | null;
  dropAt: { iso: string; minutes: number } | null;
  addAt: { iso: string; minutes: number } | null;
  draft: string;
  onSelect: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onHover: (h: { iso: string; minutes: number } | null) => void;
  onDropAt: (h: { iso: string; minutes: number } | null) => void;
  onDrop: (target: { iso: string; minutes: number } | null) => void;
  onOpenAdd: (at: { iso: string; minutes: number }) => void;
  onDraftChange: (v: string) => void;
  onSubmitAdd: () => void;
  onCancelAdd: () => void;
};

function TimeGrid(props: TimeGridProps) {
  const { days, today, nowMin, scrollRef } = props;
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const canvasHeight = DAY_MINUTES * PX_PER_MIN;

  return (
    <div className="cal-tg">
      <div className="cal-tg-head">
        <div className="cal-tg-corner" />
        {days.map((d) => {
          const iso = isoDate(d);
          return (
            <div key={iso} className={`cal-tg-dayhead ${iso === today ? 'is-today' : ''}`}>
              <span className="cal-day-name">{dayName(d)}</span>
              <span className="cal-day-num">{d.getDate()}</span>
            </div>
          );
        })}
      </div>

      <div className="cal-tg-scroll" ref={scrollRef}>
        <div className="cal-tg-canvas" style={{ height: canvasHeight }}>
          <div className="cal-tg-gutter">
            {hours.map((h) =>
              h === 0 ? null : (
                <span key={h} className="cal-tg-hour" style={{ top: h * HOUR_PX }}>
                  {String(h).padStart(2, '0')}:00
                </span>
              ),
            )}
          </div>

          {days.map((d) => {
            const iso = isoDate(d);
            const isToday = iso === today;
            const events = props.byDay(iso).map((t) => {
              const start = timeToMinutes(t.scheduledTime) ?? -1;
              return { task: t, start, end: start + props.duration(t) };
            });
            const timed = events.filter((e) => e.start >= 0);
            const untimed = events.filter((e) => e.start < 0).map((e) => e.task);
            const { placed, lanes } = assignLanes(timed);

            return (
              <div
                key={iso}
                className={`cal-tg-col ${isToday ? 'is-today' : ''}`}
                onMouseMove={(e) => {
                  if (props.dragId || props.addAt) return;
                  const top = e.currentTarget.getBoundingClientRect().top;
                  props.onHover({ iso, minutes: offsetToMinutes(e.clientY, top) });
                }}
                onMouseLeave={() => {
                  if (!props.dragId) props.onHover(null);
                }}
                onClick={(e) => {
                  if (props.dragId) return;
                  const top = e.currentTarget.getBoundingClientRect().top;
                  props.onOpenAdd({ iso, minutes: offsetToMinutes(e.clientY, top) });
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  const top = e.currentTarget.getBoundingClientRect().top;
                  props.onDropAt({ iso, minutes: offsetToMinutes(e.clientY, top) });
                }}
                onDrop={() => props.onDrop(props.dropAt)}
              >
                {untimed.length > 0 && (
                  <div className="cal-tg-untimed">
                    {untimed.map((t) => (
                      <div
                        key={t.id}
                        className={`cal-card ${t.done ? 'is-done' : ''}`}
                        draggable
                        onDragStart={() => props.onDragStart(t.id)}
                        onDragEnd={props.onDragEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          props.onSelect(t.id);
                        }}
                      >
                        <span className="cal-card-dot" style={{ background: props.projectColor(t) }} />
                        <span className="cal-card-title">{t.title}</span>
                      </div>
                    ))}
                  </div>
                )}

                {placed.map(({ task: t, start, lane }) => {
                  const width = `calc((100% - 6px) / ${lanes})`;
                  return (
                    <div
                      key={t.id}
                      className={`cal-ev ${t.done ? 'is-done' : ''} ${props.dragId === t.id ? 'dragging' : ''}`}
                      style={{
                        top: start * PX_PER_MIN,
                        height: Math.max(18, props.duration(t) * PX_PER_MIN - 2),
                        left: `calc(3px + ${lane} * ${width})`,
                        width,
                        borderLeftColor: props.projectColor(t),
                      }}
                      draggable
                      onDragStart={() => props.onDragStart(t.id)}
                      onDragEnd={props.onDragEnd}
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onSelect(t.id);
                      }}
                    >
                      <span className="cal-ev-time">{minutesToTime(start)}</span>
                      <span className="cal-ev-title">{t.title}</span>
                    </div>
                  );
                })}

                {props.hover && props.hover.iso === iso && !props.addAt && (
                  <div className="cal-tg-ghost" style={{ top: props.hover.minutes * PX_PER_MIN }}>
                    <span className="cal-tg-ghost-time"><Clock size={12} /> {minutesToTime(props.hover.minutes)}</span>
                    <span className="cal-tg-ghost-label">+ créer une tâche</span>
                  </div>
                )}

                {props.dragId && props.dropAt && props.dropAt.iso === iso && (
                  <div className="cal-tg-dropline" style={{ top: props.dropAt.minutes * PX_PER_MIN }}>
                    <span>{minutesToTime(props.dropAt.minutes)}</span>
                  </div>
                )}

                {props.addAt && props.addAt.iso === iso && (
                  <div
                    className="cal-tg-add"
                    style={{ top: props.addAt.minutes * PX_PER_MIN }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="cal-tg-add-time">{minutesToTime(props.addAt.minutes)}</span>
                    <input
                      className="cal-add-input"
                      autoFocus
                      value={props.draft}
                      onChange={(e) => props.onDraftChange(e.target.value)}
                      onBlur={props.onSubmitAdd}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          props.onSubmitAdd();
                        } else if (e.key === 'Escape') {
                          props.onCancelAdd();
                        }
                      }}
                      placeholder="Tâche…"
                    />
                  </div>
                )}

                {isToday && nowMin >= 0 && (
                  <div className="cal-tg-now" style={{ top: nowMin * PX_PER_MIN }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
