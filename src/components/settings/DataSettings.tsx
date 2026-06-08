import { useEffect, useState } from 'react';
import { Download, FolderOpen, Upload, Trash2 } from 'lucide-react';
import {
  api,
  isTauri,
  pickOpenPath,
  pickSavePath,
  revealPath,
  type DataStats,
} from '../../lib/api';
import { useStore } from '../../lib/store';
import { confirm } from '../../lib/confirm';
import { Button } from '../ui/button';
import { SettingsGroup, SettingRow } from './parts';

function formatBytes(n: number): string {
  if (!n) return '—';
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / 1024 / 1024).toFixed(1)} Mo`;
}

export function DataSettings() {
  const load = useStore((s) => s.load);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => void api.dataStats().then(setStats).catch(() => setStats(null));
  useEffect(refresh, []);

  async function onExport() {
    const date = new Date().toISOString().slice(0, 10);
    const path = await pickSavePath(`taffk-backup-${date}.json`);
    if (!path) return;
    setBusy(true);
    try {
      await api.exportData(path);
    } finally {
      setBusy(false);
    }
  }

  async function onImport() {
    const ok = await confirm({
      title: 'Importer des données ?',
      description: 'Le contenu actuel sera entièrement remplacé par celui du fichier choisi.',
      confirmLabel: 'Importer',
      destructive: true,
    });
    if (!ok) return;
    const path = await pickOpenPath();
    if (!path) return;
    setBusy(true);
    try {
      await api.importData(path);
      await load();
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    const ok = await confirm({
      title: 'Tout réinitialiser ?',
      description: 'Toutes les tâches, projets, tags et temps enregistrés seront définitivement supprimés.',
      confirmLabel: 'Tout supprimer',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.resetData();
      await load();
      refresh();
    } finally {
      setBusy(false);
    }
  }

  const counts = stats
    ? [
        { label: 'Projets', value: stats.projects },
        { label: 'Tâches', value: stats.tasks },
        { label: 'Tags', value: stats.tags },
        { label: 'Sessions', value: stats.timeEntries },
      ]
    : [];

  return (
    <>
      <SettingsGroup title="Base de données">
        <SettingRow label="Emplacement" description={stats?.path ?? '…'} stacked>
          {isTauri && stats?.path && (
            <Button variant="outline" size="sm" onClick={() => void revealPath(stats.path)}>
              <FolderOpen /> Ouvrir le dossier
            </Button>
          )}
        </SettingRow>
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
          {counts.map((c) => (
            <div key={c.label} className="bg-card px-4 py-3.5">
              <div className="text-lg font-semibold tabular-nums">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </div>
          ))}
        </div>
        {stats && (
          <SettingRow label="Taille du fichier" description={formatBytes(stats.fileBytes)} />
        )}
      </SettingsGroup>

      <SettingsGroup title="Sauvegarde">
        <SettingRow label="Exporter" description="Enregistrer toutes les données dans un fichier JSON.">
          <Button variant="outline" size="sm" disabled={busy || !isTauri} onClick={() => void onExport()}>
            <Download /> Exporter
          </Button>
        </SettingRow>
        <SettingRow label="Importer" description="Remplacer les données par un fichier de sauvegarde.">
          <Button variant="outline" size="sm" disabled={busy || !isTauri} onClick={() => void onImport()}>
            <Upload /> Importer
          </Button>
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup title="Zone de danger">
        <SettingRow label="Réinitialiser" description="Supprimer définitivement toutes les données.">
          <Button variant="destructive" size="sm" disabled={busy} onClick={() => void onReset()}>
            <Trash2 /> Tout réinitialiser
          </Button>
        </SettingRow>
      </SettingsGroup>
    </>
  );
}
