import { Eclipse, Moon, MonitorSmartphone, Sun, type LucideIcon } from 'lucide-react';
import { useThemeStore, type ThemeMode } from '../../lib/theme';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import { SettingsGroup, SettingRow } from './parts';

const MODES: { value: ThemeMode; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Clair', icon: Sun },
  { value: 'dark', label: 'Sombre', icon: Moon },
  { value: 'system', label: 'Système', icon: MonitorSmartphone },
  { value: 'schedule', label: 'Automatique', icon: Eclipse },
];

export function AppearanceSettings() {
  const { mode, scheduleStart, scheduleEnd, setMode, setSchedule } = useThemeStore();

  return (
    <SettingsGroup title="Thème">
      <SettingRow label="Apparence" description="Clair, sombre, ou selon le système." stacked>
        <div className="grid grid-cols-4 gap-2">
          {MODES.map((m) => {
            const active = mode === m.value;
            return (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                )}
              >
                <m.icon size={18} className={active ? 'text-primary' : ''} />
                {m.label}
              </button>
            );
          })}
        </div>
      </SettingRow>

      {mode === 'schedule' && (
        <SettingRow
          label="Plage du thème sombre"
          description="Le thème sombre s'applique automatiquement sur cette plage horaire."
        >
          <div className="flex items-center gap-2">
            <Input
              type="time"
              className="w-28"
              value={scheduleStart}
              onChange={(e) => setSchedule(e.target.value || '20:00', scheduleEnd)}
            />
            <span className="text-sm text-muted-foreground">→</span>
            <Input
              type="time"
              className="w-28"
              value={scheduleEnd}
              onChange={(e) => setSchedule(scheduleStart, e.target.value || '08:00')}
            />
          </div>
        </SettingRow>
      )}
    </SettingsGroup>
  );
}
