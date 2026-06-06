import { X } from 'lucide-react';
import { SHORTCUTS } from '../lib/keyboard';

type Props = { onClose: () => void };

export function KeyboardHelp({ onClose }: Props) {
  return (
    <div className="help-backdrop" onClick={onClose}>
      <div className="help-card" onClick={(e) => e.stopPropagation()}>
        <div className="help-head">
          <span className="help-title">Raccourcis clavier</span>
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="help-list">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="help-row">
              <kbd className="help-keys">{s.keys}</kbd>
              <span className="help-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
