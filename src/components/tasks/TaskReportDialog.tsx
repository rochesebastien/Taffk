import { useEffect, useState } from 'react';
import { Check, FileDown, FolderClosed, Layers3 } from 'lucide-react';
import type { Project } from '../../lib/api';
import type { TaskReportScope } from '../../lib/taskReport';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

type Props = {
  open: boolean;
  project: Project | null;
  allCount: number;
  projectCount: number;
  busy: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onExport: (scope: TaskReportScope) => void;
};

export function TaskReportDialog({
  open,
  project,
  allCount,
  projectCount,
  busy,
  error,
  onOpenChange,
  onExport,
}: Props) {
  const [scope, setScope] = useState<TaskReportScope>(project ? 'current' : 'all');

  useEffect(() => {
    if (open) setScope(project ? 'current' : 'all');
  }, [open, project]);

  const choices = [
    ...(project
      ? [{ scope: 'current' as const, icon: FolderClosed, label: project.name, count: projectCount }]
      : []),
    { scope: 'all' as const, icon: Layers3, label: 'Tous les projets', count: allCount },
  ];

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exporter un rapport</DialogTitle>
          <DialogDescription>
            Le fichier Markdown regroupe la progression, les tâches, les échéances et le temps suivi.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {choices.map(({ scope: value, icon: Icon, label, count }) => (
            <button
              key={value}
              type="button"
              onClick={() => setScope(value)}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                scope === value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-accent/50',
              )}
            >
              <Icon className="size-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">
                  {count} tâche{count === 1 ? '' : 's'}{value === 'all' ? ', tâches sans projet incluses' : ''}
                </span>
              </span>
              {scope === value && <Check className="size-4 shrink-0 text-primary" />}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-destructive">Impossible d’exporter le rapport : {error}</p>}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button size="sm" disabled={busy} onClick={() => onExport(scope)}>
            <FileDown /> {busy ? 'Export…' : 'Exporter en Markdown'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
