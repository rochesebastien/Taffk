/** True when a keystroke should be left to a text field, not treated as a shortcut. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/** Normalize a keydown into an accelerator key token (e.g. 'A', '1', 'Space'),
 *  or null when only a modifier is held. */
export function normalizeKey(e: KeyboardEvent): string | null {
  const code = e.code;
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'Space') return 'Space';
  if (/^(Shift|Control|Alt|Meta)(Left|Right)$/.test(code)) return null;
  return e.key.length === 1 ? e.key.toUpperCase() : e.key;
}

/** Build a Tauri-style accelerator from a keydown, e.g. 'CommandOrControl+Shift+Space'. */
export function accelFromEvent(e: KeyboardEvent): string | null {
  const key = normalizeKey(e);
  if (!key) return null;
  const mods: string[] = [];
  if (e.ctrlKey || e.metaKey) mods.push('CommandOrControl');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  return [...mods, key].join('+');
}

/** Does a keydown match an accelerator string? */
export function matchesAccel(e: KeyboardEvent, accel: string): boolean {
  if (!accel) return false;
  const parts = accel.split('+');
  const key = parts[parts.length - 1];
  const mods = parts.slice(0, -1);
  if (mods.includes('CommandOrControl') !== (e.ctrlKey || e.metaKey)) return false;
  if (mods.includes('Alt') !== e.altKey) return false;
  if (mods.includes('Shift') !== e.shiftKey) return false;
  return normalizeKey(e) === key;
}

/** Human-readable accelerator, e.g. 'CommandOrControl+Shift+Space' → 'Ctrl + Shift + Space'. */
export function formatAccel(accel: string): string {
  return accel
    .split('+')
    .map((p) => (p === 'CommandOrControl' ? 'Ctrl' : p))
    .join(' + ');
}

export const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: '1 – 6', label: 'Aujourd\'hui / Toutes / Tableau / Planning / Temps / Étiquettes' },
  { keys: 'Ctrl + Space', label: 'Nouvelle tâche' },
  { keys: 'A', label: 'Nouvelle tâche' },
  { keys: 'Ctrl + F  ·  /', label: 'Recherche' },
  { keys: 'J / K', label: 'Tâche suivante / précédente' },
  { keys: 'X', label: 'Marquer faite / non faite' },
  { keys: 'Entrée', label: 'Ouvrir le détail' },
  { keys: 'Échap', label: 'Fermer / désélectionner' },
  { keys: '?', label: 'Afficher cette aide' },
];
