/** True when a keystroke should be left to a text field, not treated as a shortcut. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: '1 – 4', label: 'Aujourd\'hui / Toutes / Tableau / Planning' },
  { keys: 'A', label: 'Aller au champ d\'ajout' },
  { keys: 'J / K', label: 'Tâche suivante / précédente' },
  { keys: 'X', label: 'Marquer faite / non faite' },
  { keys: 'Entrée', label: 'Ouvrir le détail' },
  { keys: 'Échap', label: 'Fermer / désélectionner' },
  { keys: '?', label: 'Afficher cette aide' },
];
