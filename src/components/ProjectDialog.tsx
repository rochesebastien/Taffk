import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import type { Project } from '../lib/api';

const toHandle = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

export function ProjectDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
}) {
  const addProject = useStore((s) => s.addProject);
  const updateProject = useStore((s) => s.updateProject);
  const openProject = useStore((s) => s.openProject);

  const editing = Boolean(project);
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [aliasEdited, setAliasEdited] = useState(false);

  useEffect(() => {
    if (open) {
      setName(project?.name ?? '');
      setAlias(project?.alias ?? '');
      setAliasEdited(Boolean(project?.alias));
    }
  }, [open, project]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const raw = (aliasEdited ? alias : alias || toHandle(trimmed)).trim();
    const handle = raw ? toHandle(raw) : null;
    if (project) {
      await updateProject(project.id, trimmed, project.color, handle);
    } else {
      const p = await addProject(trimmed, null, handle);
      openProject(p.id);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le projet' : 'Nouveau projet'}</DialogTitle>
            {/* <DialogDescription>Le tag de liaison sert à rattacher une tâche au projet via « @ ».</DialogDescription> */}
          </DialogHeader>
          <div className="my-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] text-muted-foreground">Nom du projet</label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!aliasEdited) setAlias(toHandle(e.target.value));
                }}
                placeholder="Projets personnels"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] text-muted-foreground">Tag du projet</label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">@</span>
                <Input
                  value={alias}
                  onChange={(e) => {
                    setAliasEdited(true);
                    setAlias(toHandle(e.target.value));
                  }}
                  placeholder="personnal"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
