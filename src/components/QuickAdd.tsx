import { Plus } from 'lucide-react';
import { useStore } from '../lib/store';
import { Kbd } from './ui/kbd';

export function QuickAdd() {
  const openSpotlight = useStore((s) => s.openSpotlight);

  return (
    <button
      onClick={openSpotlight}
      className="mx-auto flex items-center gap-2.5 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
    >
      <Plus size={18} className="shrink-0" />
      <span className="text-base">Ajouter une nouvelle tâche</span>
      <Kbd>Ctrl+Space</Kbd>
    </button>
  );
}
