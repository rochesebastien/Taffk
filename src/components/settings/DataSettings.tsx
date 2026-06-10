import { useEffect, useState } from 'react';
import { Download, FolderOpen, Upload, Trash2 } from 'lucide-react';
import {
  api,
  isTauri,
  pickOpenPath,
  pickSavePath,
  revealPath,
  type BackupSelection,
  type DataStats,
} from '../../lib/api';
import { useStore } from '../../lib/store';
import { confirm } from '../../lib/confirm';
import { Button } from '../ui/button';
import { SettingsGroup, SettingRow } from './parts';
import { DataTransferDialog, type TransferMode } from './DataTransferDialog';

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
  const [transfer, setTransfer] = useState<TransferMode | null>(null);

  const refresh = () => void api.dataStats().then(setStats).catch(() => setStats(null));
  useEffect(refresh, []);

  async function runExport(selection: BackupSelection) {
    const date = new Date().toISOString().slice(0, 10);
    const path = await pickSavePath(`taffk-backup-${date}.json`);
    if (!path) return;
    setBusy(true);
    try {
      await api.exportData(path, selection);
    } finally {
      setBusy(false);
      setTransfer(null);
    }
  }

  async function runImport(selection: BackupSelection) {
    const path = await pickOpenPath();
    if (!path) return;
    setBusy(true);
    try {
      await api.importData(path, selection);
      await load();
      refresh();
    } finally {
      setBusy(false);
      setTransfer(null);
    }
  }

  function onConfirmTransfer(selection: BackupSelection) {
    if (transfer === 'export') void runExport(selection);
    else if (transfer === 'import') void runImport(selection);
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
        <SettingRow label="Exporter" description="Choisir les données à enregistrer dans un fichier JSON.">
          <Button variant="outline" size="sm" disabled={busy || !isTauri} onClick={() => setTransfer('export')}>
            <Download /> Exporter
          </Button>
        </SettingRow>
        <SettingRow label="Importer" description="Choisir les données à restaurer depuis une sauvegarde.">
          <Button variant="outline" size="sm" disabled={busy || !isTauri} onClick={() => setTransfer('import')}>
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

      <DataTransferDialog
        mode={transfer}
        busy={busy}
        onClose={() => setTransfer(null)}
        onConfirm={onConfirmTransfer}
      />
    </>
  );
}
