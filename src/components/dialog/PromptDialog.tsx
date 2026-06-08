import { useEffect, useState } from 'react';
import { usePrompt } from '../../lib/prompt';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

export function PromptDialog() {
  const open = usePrompt((s) => s.open);
  const options = usePrompt((s) => s.options);
  const respond = usePrompt((s) => s.respond);

  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) setValue(options?.initialValue ?? '');
  }, [open, options?.initialValue]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) respond(trimmed);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && respond(null)}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{options?.title ?? ''}</DialogTitle>
            {options?.description && <DialogDescription>{options.description}</DialogDescription>}
          </DialogHeader>
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={options?.placeholder}
            className="my-4"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => respond(null)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!value.trim()}>
              {options?.confirmLabel ?? 'Valider'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
