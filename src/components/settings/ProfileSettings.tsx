import { useSettings } from '../../lib/settings';
import { useStore } from '../../lib/store';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import { SettingsGroup, SettingRow } from './parts';

const COLORS = ['#3d44ff', '#22c55e', '#ef4444', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#64748b'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '🙂';
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function ProfileSettings() {
  const s = useSettings();
  const projects = useStore((st) => st.projects);
  const tasks = useStore((st) => st.tasks);
  const timeEntries = useStore((st) => st.timeEntries);

  const top = tasks.filter((t) => t.parentId === null && !t.archived);
  const done = top.filter((t) => t.done).length;
  const totalSeconds = timeEntries
    .filter((e) => e.kind === 'work')
    .reduce((sum, e) => sum + e.durationSeconds, 0);
  const dates = [...projects.map((p) => p.createdAt), ...tasks.map((t) => t.createdAt)].filter(Boolean);
  const since = dates.length ? dates.reduce((a, b) => (a < b ? a : b)).slice(0, 10) : null;

  const avatar = s.profileEmoji.trim() || initials(s.profileName);

  const stats = [
    { label: 'Projets', value: projects.length },
    { label: 'Tâches', value: top.length },
    { label: 'Terminées', value: done },
    { label: 'Temps cumulé', value: formatHours(totalSeconds) },
  ];

  return (
    <>
      <SettingsGroup title="Profil">
        <SettingRow label="Aperçu">
          <div className="flex items-center gap-3">
            <div
              className="grid size-11 place-items-center rounded-full text-base font-semibold text-white"
              style={{ backgroundColor: s.profileColor }}
            >
              {avatar}
            </div>
            <span className="text-sm font-medium">{s.profileName.trim() || 'Sans nom'}</span>
          </div>
        </SettingRow>
        <SettingRow label="Nom d'affichage">
          <Input
            className="w-56"
            placeholder="Votre nom"
            value={s.profileName}
            onChange={(e) => s.set('profileName', e.target.value)}
          />
        </SettingRow>
        <SettingRow label="Emoji" description="Laisser vide pour utiliser vos initiales.">
          <Input
            className="w-20 text-center"
            placeholder="🙂"
            maxLength={2}
            value={s.profileEmoji}
            onChange={(e) => s.set('profileEmoji', e.target.value)}
          />
        </SettingRow>
        <SettingRow label="Couleur">
          <div className="flex items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => s.set('profileColor', c)}
                className={cn(
                  'size-6 rounded-full ring-offset-2 ring-offset-background transition-all',
                  s.profileColor === c && 'ring-2 ring-foreground',
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="Statistiques">
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
          {stats.map((st) => (
            <div key={st.label} className="bg-card px-4 py-3.5">
              <div className="text-lg font-semibold tabular-nums">{st.value}</div>
              <div className="text-xs text-muted-foreground">{st.label}</div>
            </div>
          ))}
        </div>
        {since && (
          <SettingRow label="Membre depuis" description={since} />
        )}
      </SettingsGroup>
    </>
  );
}
