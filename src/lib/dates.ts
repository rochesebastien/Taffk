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
