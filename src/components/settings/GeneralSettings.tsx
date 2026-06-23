import { Volume2 } from 'lucide-react';
import { useSettings } from '../../lib/settings';
import { usePomodoro } from '../../lib/pomodoro';
import { playTestSound } from '../../lib/sound';
import type { View } from '../../lib/store';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';
import { CustomFieldsManager } from './CustomFieldsManager';
import { SettingsGroup, SettingRow } from './parts';

const STARTUP: { value: View; label: string }[] = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'all', label: 'Toutes les tâches' },
  { value: 'board', label: 'Tableau' },
  { value: 'calendar', label: 'Planning' },
];

export function GeneralSettings() {
  const s = useSettings();
  const setSlice = usePomodoro((p) => p.setSliceMinutes);
  const setRepeats = usePomodoro((p) => p.setRepeats);

  return (
    <>
      <SettingsGroup title="Démarrage">
        <SettingRow label="Vue de démarrage" description="La vue affichée à l'ouverture de Taffk.">
          <Select value={s.startupView} onValueChange={(v) => s.set('startupView', v as View)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STARTUP.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="Pomodoro">
        <SettingRow label="Durée d'un cycle" description="En minutes.">
          <Input
            type="number"
            min={1}
            max={180}
            className="w-24"
            value={s.pomodoroSliceMinutes}
            onChange={(e) => {
              const n = Math.max(1, Number(e.target.value) || 1);
              s.set('pomodoroSliceMinutes', n);
              setSlice(n);
            }}
          />
        </SettingRow>
        <SettingRow label="Nombre de cycles" description="Cycles enchaînés dans une session.">
          <Input
            type="number"
            min={1}
            max={12}
            className="w-24"
            value={s.pomodoroRepeats}
            onChange={(e) => {
              const n = Math.max(1, Number(e.target.value) || 1);
              s.set('pomodoroRepeats', n);
              setRepeats(n);
            }}
          />
        </SettingRow>
        <SettingRow
          label="Notification sonore"
          description="Jouer un son à la fin de chaque cycle et de la session."
        >
          <Switch checked={s.pomodoroSound} onCheckedChange={(v) => s.set('pomodoroSound', v)} />
        </SettingRow>
        <SettingRow label="Volume" description="Volume de la notification sonore.">
          <div className="flex items-center gap-3">
            <Slider
              className="w-40"
              min={0}
              max={100}
              step={5}
              disabled={!s.pomodoroSound}
              value={[Math.round(s.pomodoroVolume * 100)]}
              onValueChange={([v]) => s.set('pomodoroVolume', v / 100)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Tester le son"
              onClick={() => playTestSound()}
            >
              <Volume2 />
            </Button>
          </div>
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="Tâches">
        <SettingRow
          label="Confirmer avant suppression"
          description="Demander une confirmation avant de supprimer une tâche."
        >
          <Switch checked={s.confirmBeforeDelete} onCheckedChange={(v) => s.set('confirmBeforeDelete', v)} />
        </SettingRow>
        <SettingRow
          label="Garder la saisie ouverte"
          description="Après avoir créé une tâche, garder la barre de saisie rapide ouverte pour en ajouter d'autres."
        >
          <Switch checked={s.keepSpotlightOpen} onCheckedChange={(v) => s.set('keepSpotlightOpen', v)} />
        </SettingRow>
      </SettingsGroup>

      <CustomFieldsManager />

      <SettingsGroup title="Expérimental">
        <SettingRow
          label="Mode expérimental"
          description="Active les fonctionnalités en cours de test, ou qui ne sont pas encore complètement stables."
        >
          <Switch checked={s.experimental} onCheckedChange={(v) => s.set('experimental', v)} />
        </SettingRow>
      </SettingsGroup>
    </>
  );
}
