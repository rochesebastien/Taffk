import { useEffect, useState } from 'react';
import { Download, TriangleAlert, Upload } from 'lucide-react';
import type { BackupSelection } from '../../lib/api';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

export type TransferMode = 'export' | 'import';

const CATEGORIES: { key: keyof BackupSelection; label: string; description: string }[] = [
  { key: 'projects', label: 'Projets', description: 'Les projets et leurs réglages.' },
  { key: 'tags', label: 'Tags', description: 'Toutes les étiquettes.' },
  { key: 'tasks', label: 'Tâches', description: 'Tâches, sous-tâches, notes et propriétés.' },
  { key: 'timeEntries', label: 'Sessions de temps', description: 'Historique du suivi du temps.' },
];

const ALL_ON: BackupSelection = { projects: true, tags: true, tasks: true, timeEntries: true };

type Props = {
  mode: TransferMode | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (selection: BackupSelection) => void;
};

export function DataTransferDialog({ mode, busy, onClose, onConfirm }: Props) {
  const [selection, setSelection] = useState<BackupSelection>(ALL_ON);

  useEffect(() => {
    if (mode) setSelection(ALL_ON);
  }, [mode]);

  const isImport = mode === 'import';
  const none = !Object.values(selection).some(Boolean);
  // Tasks reference projects and tags; importing them without their referents drops the links.
  const danglingLinks = isImport && selection.tasks && (!selection.projects || !selection.tags);

  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isImport ? 'Importer des données' : 'Exporter des données'}</DialogTitle>
          <DialogDescription>
            {isImport
              ? 'Les catégories sélectionnées seront remplacées par le contenu du fichier choisi.'
              : 'Choisissez les catégories à enregistrer dans le fichier de sauvegarde.'}
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {CATEGORIES.map((c) => (
            <label
              key={c.key}
              className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium">{c.label}</div>
                <div className="text-xs text-muted-foreground">{c.description}</div>
              </div>
              <Switch
                checked={selection[c.key]}
                onCheckedChange={(v) => setSelection((s) => ({ ...s, [c.key]: v }))}
              />
            </label>
          ))}
        </div>

        {danglingLinks && (
          <p className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-500">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" />
            Les tâches importées sans leurs projets ou tags perdront ces liens.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button
            variant={isImport ? 'destructive' : 'default'}
            size="sm"
            disabled={busy || none}
            onClick={() => onConfirm(selection)}
          >
            {isImport ? <Upload /> : <Download />}
            {isImport ? 'Importer' : 'Exporter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
