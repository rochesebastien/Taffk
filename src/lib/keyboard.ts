/** True when a keystroke should be left to a text field, not treated as a shortcut. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: '1 – 5', label: 'Aujourd\'hui / Toutes / Tableau / Planning / Temps' },
  { keys: 'Ctrl + Space', label: 'Nouvelle tâche' },
  { keys: 'A', label: 'Nouvelle tâche' },
  { keys: 'Ctrl + F  ·  /', label: 'Recherche' },
  { keys: 'J / K', label: 'Tâche suivante / précédente' },
  { keys: 'X', label: 'Marquer faite / non faite' },
  { keys: 'Entrée', label: 'Ouvrir le détail' },
  { keys: 'Échap', label: 'Fermer / désélectionner' },
  { keys: '?', label: 'Afficher cette aide' },
];
