import { X } from 'lucide-react';
import { SHORTCUTS } from '../lib/keyboard';

type Props = { onClose: () => void };

export function KeyboardHelp({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 grid animate-in fade-in-0 place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-[420px] max-w-[92vw] overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <span className="text-sm font-medium">Raccourcis clavier</span>
          <button
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-2 pb-3">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center gap-3.5 rounded-md px-2.5 py-2 hover:bg-accent/60">
              <kbd className="min-w-16 rounded-md border border-border bg-muted px-2 py-0.5 text-center font-mono text-xs">
                {s.keys}
              </kbd>
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
