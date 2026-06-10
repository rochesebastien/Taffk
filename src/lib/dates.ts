export function isoDate(d: Date): string {
  // Local date (not UTC) → YYYY-MM-DD.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayIso(): string {
  return isoDate(new Date());
}

export function tomorrowIso(): string {
  return isoDate(addDays(new Date(), 1));
}

/** A task is overdue when its planned date is strictly in the past and it isn't done. */
export function isOverdue(scheduledFor: string | null | undefined, done: boolean): boolean {
  if (!scheduledFor || done) return false;
  return scheduledFor < todayIso();
}

/** A date (`YYYY-MM-DD`) → compact `JJ/MM` label. */
export function formatShortDate(date: string): string {
  const [, m, d] = date.split('-');
  return `${d}/${m}`;
}

/** Monday of the week containing `d`. */
export function weekStart(d: Date): Date {
  const out = new Date(d);
  const dow = (out.getDay() + 6) % 7; // 0 = Monday
  out.setDate(out.getDate() - dow);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

const DAY_NAMES = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

export function dayName(d: Date): string {
  return DAY_NAMES[(d.getDay() + 6) % 7];
}

export function formatRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${start.toLocaleDateString('fr-FR', opts)} – ${end.toLocaleDateString('fr-FR', opts)}`;
}

/** Minutes since midnight → `"HH:MM"` (24h, zero-padded). */
export function minutesToTime(minutes: number): string {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  const h = Math.floor(m / 60);
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** `"HH:MM"` → minutes since midnight, or null when malformed. */
export function timeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const h = Number(match[1]);
  const mm = Number(match[2]);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

export function currentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/** Preset durations offered for a task estimate (in minutes). */
export const ESTIMATE_OPTIONS = [5, 10, 15, 30, 60, 120, 180, 240, 480] as const;

/** A stored timestamp (`YYYY-MM-DD HH:MM:SS` UTC, or ISO) → `JJ/MM/AAAA à HH:MM` local. */
export function formatCreatedAt(stored: string): string {
  const norm = stored.includes('T') ? stored : `${stored.replace(' ', 'T')}Z`;
  const d = new Date(norm);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('fr-FR');
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${date} à ${time}`;
}

/** Minutes → compact human label: `0`→`''`, `45`→`45m`, `60`→`1h`, `90`→`1h30`. */
export function formatEstimate(minutes: number): string {
  if (!minutes || minutes <= 0) return '';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}
