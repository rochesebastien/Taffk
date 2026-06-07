import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

const toHandle = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

export function ProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const addProject = useStore((s) => s.addProject);
  const openProject = useStore((s) => s.openProject);

  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [aliasEdited, setAliasEdited] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setAlias('');
      setAliasEdited(false);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const handle = (aliasEdited ? alias : alias || toHandle(trimmed)).trim() || null;
    const p = await addProject(trimmed, null, handle ? toHandle(handle) : null);
    openProject(p.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Nouveau projet</DialogTitle>
            <DialogDescription>Le tag de liaison sert à rattacher une tâche au projet via « @ ».</DialogDescription>
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
                placeholder="Site web"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] text-muted-foreground">Tag de liaison</label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">@</span>
                <Input
                  value={alias}
                  onChange={(e) => {
                    setAliasEdited(true);
                    setAlias(toHandle(e.target.value));
                  }}
                  placeholder="site"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
