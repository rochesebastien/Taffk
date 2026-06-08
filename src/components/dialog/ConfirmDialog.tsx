import { useConfirm } from '../../lib/confirm';
import { cn } from '../../lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

export function ConfirmDialog() {
  const open = useConfirm((s) => s.open);
  const options = useConfirm((s) => s.options);
  const respond = useConfirm((s) => s.respond);

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && respond(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options?.title ?? 'Confirmer'}</AlertDialogTitle>
          {options?.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => respond(false)}>{options?.cancelLabel ?? 'Annuler'}</AlertDialogCancel>
          <AlertDialogAction
            className={cn(options?.destructive && 'bg-destructive text-white hover:bg-destructive/90')}
            onClick={() => respond(true)}
          >
            {options?.confirmLabel ?? 'Confirmer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
