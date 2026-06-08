import { useEffect, useState } from 'react';
import { useSettings } from '../../lib/settings';
import { setToggleShortcut } from '../../lib/api';
import { SHORTCUTS, accelFromEvent, formatAccel } from '../../lib/keyboard';
import { cn } from '../../lib/utils';
import { SettingsGroup, SettingRow } from './parts';

function ShortcutCapture({ value, onChange }: { value: string; onChange: (accel: string) => void }) {
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setListening(false);
        return;
      }
      const accel = accelFromEvent(e);
      if (accel) {
        onChange(accel);
        setListening(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [listening, onChange]);

  return (
    <button
      onClick={() => setListening((l) => !l)}
      className={cn(
        'min-w-28 rounded-md border px-3 py-1.5 text-center font-mono text-xs transition-colors',
        listening
          ? 'border-primary bg-primary/5 text-primary'
          : 'border-border bg-muted text-foreground hover:bg-accent',
      )}
    >
      {listening ? 'Appuyez sur une touche…' : formatAccel(value)}
    </button>
  );
}

export function ShortcutsSettings() {
  const s = useSettings();

  return (
    <>
      <SettingsGroup title="Personnalisables">
        <SettingRow label="Ouvrir / masquer Taffk" description="Raccourci global, actif même hors de l'application.">
          <ShortcutCapture
            value={s.shortcutToggle}
            onChange={(accel) => {
              s.set('shortcutToggle', accel);
              void setToggleShortcut(accel);
            }}
          />
        </SettingRow>
        <SettingRow label="Nouvelle tâche" description="Ouvre la saisie rapide.">
          <ShortcutCapture value={s.shortcutQuickAdd} onChange={(accel) => s.set('shortcutQuickAdd', accel)} />
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="Autres raccourcis">
        {SHORTCUTS.map((sc) => (
          <SettingRow key={sc.keys} label={sc.label}>
            <kbd className="rounded-md border border-border bg-muted px-2 py-1 font-mono text-xs">
              {sc.keys}
            </kbd>
          </SettingRow>
        ))}
      </SettingsGroup>
    </>
  );
}
