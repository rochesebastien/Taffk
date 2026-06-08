import { X } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { NotesEditor } from './NotesEditor';
import type { Task } from '../../lib/api';

type Props = {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editable?: boolean;
};

export function NotesPopup({ task, open, onOpenChange, editable = true }: Props) {
  const patchTask = useStore((s) => s.patchTask);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[82vh] flex-col gap-0 p-0 sm:max-w-[min(1350px,75vw)]"
      >
        <DialogClose className="absolute right-5 top-4.5 rounded-md p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none">
          <X size={20} />
          <span className="sr-only">Fermer</span>
        </DialogClose>
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="truncate pr-10 text-xl font-bold">
            Note de la tâche : {task.title}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 px-6 py-4">
          {open && (
            <NotesEditor
              key={task.id}
              initial={task.notes}
              editable={editable}
              onSave={(notes) => void patchTask({ id: task.id, notes })}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
