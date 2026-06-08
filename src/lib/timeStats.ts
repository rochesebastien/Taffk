import type { Task, TimeEntry } from './api';
import { isoDate } from './dates';

/** A stored timestamp (`YYYY-MM-DD HH:MM:SS` UTC, or ISO) → local `YYYY-MM-DD`. */
export function localDay(stored: string): string {
  const norm = stored.includes('T') ? stored : `${stored.replace(' ', 'T')}Z`;
  return isoDate(new Date(norm));
}

/** Seconds → compact label: `0`→`–`, `2700`→`45m`, `3600`→`1h`, `6000`→`1h 40m`. */
export function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m <= 0) return '–';
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h === 0) return `${mm}m`;
  return mm === 0 ? `${h}h` : `${h}h ${mm}m`;
}

/** A number formatted to one decimal, or `–` when null/zero. */
export function formatNumber(value: number | null): string {
  if (value === null || value === 0) return '–';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export type DateRange = { start: string; end: string };

export type TimeStats = {
  spentSeconds: number;
  estimateMinutes: number;
  doneCount: number;
  createdCount: number;
  daysWorked: number;
  avgTasksPerDay: number | null;
  avgBreaksPerDay: number | null;
  avgSpentPerDay: number | null;
  avgSpentPerTask: number | null;
  avgSpentPerTaskWithSubtasks: number | null;
  avgBreakPerDay: number | null;
};

const inRange = (day: string, r: DateRange) => day >= r.start && day <= r.end;

/** `null` projectId means "all projects". */
function taskMatches(task: Task, projectId: string | null): boolean {
  return projectId === null || task.projectId === projectId;
}

export function computeStats(
  tasks: Task[],
  entries: TimeEntry[],
  range: DateRange,
  projectId: string | null,
): TimeStats {
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const entryMatches = (e: TimeEntry) => {
    if (projectId === null) return true;
    const t = e.taskId ? taskById.get(e.taskId) : null;
    return t ? t.projectId === projectId : false;
  };

  const work = entries.filter(
    (e) => e.kind === 'work' && inRange(localDay(e.startedAt), range) && entryMatches(e),
  );
  const breaks = entries.filter(
    (e) => e.kind === 'break' && inRange(localDay(e.startedAt), range) && entryMatches(e),
  );

  const spentSeconds = work.reduce((s, e) => s + e.durationSeconds, 0);
  const breakSeconds = breaks.reduce((s, e) => s + e.durationSeconds, 0);
  const daysWorked = new Set(work.map((e) => localDay(e.startedAt))).size;

  const scoped = tasks.filter((t) => taskMatches(t, projectId));
  const createdTop = scoped.filter(
    (t) => t.parentId === null && inRange(localDay(t.createdAt), range),
  );
  const createdAll = scoped.filter((t) => inRange(localDay(t.createdAt), range));
  const doneTop = createdTop.filter((t) => t.done);

  const estimateMinutes = createdTop.reduce((s, t) => s + t.estimateMinutes, 0);
  const createdCount = createdTop.length;
  const doneCount = doneTop.length;

  const div = (a: number, b: number): number | null => (b > 0 ? a / b : null);

  return {
    spentSeconds,
    estimateMinutes,
    doneCount,
    createdCount,
    daysWorked,
    avgTasksPerDay: div(doneCount, daysWorked),
    avgBreaksPerDay: div(breaks.length, daysWorked),
    avgSpentPerDay: div(spentSeconds, daysWorked),
    avgSpentPerTask: div(spentSeconds, createdCount),
    avgSpentPerTaskWithSubtasks: div(spentSeconds, createdAll.length),
    avgBreakPerDay: div(breakSeconds, daysWorked),
  };
}

export type HeatCell = {
  day: string;
  seconds: number;
  doneCount: number;
  level: 0 | 1 | 2 | 3 | 4;
  inYear: boolean;
};

function level(seconds: number): 0 | 1 | 2 | 3 | 4 {
  const m = seconds / 60;
  if (m <= 0) return 0;
  if (m < 30) return 1;
  if (m < 120) return 2;
  if (m < 240) return 3;
  return 4;
}

/** Work seconds per local day for `year`, scoped to `projectId` (null = all). */
function secondsByDay(
  entries: TimeEntry[],
  tasks: Task[],
  year: number,
  projectId: string | null,
): Map<string, number> {
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const out = new Map<string, number>();
  for (const e of entries) {
    if (e.kind !== 'work') continue;
    if (projectId !== null) {
      const t = e.taskId ? taskById.get(e.taskId) : null;
      if (!t || t.projectId !== projectId) continue;
    }
    const day = localDay(e.startedAt);
    if (!day.startsWith(String(year))) continue;
    out.set(day, (out.get(day) ?? 0) + e.durationSeconds);
  }
  return out;
}

/**
 * GitHub-style contribution grid for a calendar year: an array of week columns,
 * each holding 7 day cells (Mon→Sun). Cells outside the year are flagged.
 */
export function buildHeatmap(
  entries: TimeEntry[],
  tasks: Task[],
  year: number,
  projectId: string | null,
): HeatCell[][] {
  const perDay = secondsByDay(entries, tasks, year, projectId);

  const donePerDay = new Map<string, number>();
  for (const t of tasks) {
    if (!t.done || !t.completedAt) continue;
    if (projectId !== null && t.projectId !== projectId) continue;
    const day = localDay(t.completedAt);
    if (!day.startsWith(String(year))) continue;
    donePerDay.set(day, (donePerDay.get(day) ?? 0) + 1);
  }

  // Start on the Monday on/before Jan 1, end on the Sunday on/after Dec 31.
  const start = new Date(year, 0, 1);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(year, 11, 31);
  end.setDate(end.getDate() + (7 - ((end.getDay() + 6) % 7) - 1));

  const weeks: HeatCell[][] = [];
  let col: HeatCell[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = isoDate(d);
    const seconds = perDay.get(day) ?? 0;
    col.push({
      day,
      seconds,
      doneCount: donePerDay.get(day) ?? 0,
      level: level(seconds),
      inYear: d.getFullYear() === year,
    });
    if (col.length === 7) {
      weeks.push(col);
      col = [];
    }
  }
  if (col.length) weeks.push(col);
  return weeks;
}

export const MONTH_LABELS = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc',
];
