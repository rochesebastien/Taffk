import { ArrowUpToLine, CalendarDays, Copy, FolderClosed, ListPlus, Play, Timer, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { usePomodoro } from '../lib/pomodoro';
import { confirm } from '../lib/confirm';
import { prompt } from '../lib/prompt';
import { addDays, ESTIMATE_OPTIONS, formatEstimate, isoDate, todayIso } from '../lib/dates';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from './ui/context-menu';
import type { Task } from '../lib/api';

export function TaskContextMenu({ task, children }: { task: Task; children: React.ReactNode }) {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const addSubtask = useStore((s) => s.addSubtask);
  const duplicateTask = useStore((s) => s.duplicateTask);
  const patchTask = useStore((s) => s.patchTask);
  const moveTaskToTop = useStore((s) => s.moveTaskToTop);
  const deleteTask = useStore((s) => s.deleteTask);
  const startWork = usePomodoro((s) => s.startWork);

  const isSubtask = task.parentId !== null;
  const subtasks = tasks.filter((t) => t.parentId === task.id);
  const hasSubtasks = subtasks.length > 0;
  const locked = task.done;

  async function createSubtask() {
    const title = await prompt({
      title: 'Nouvelle sous-tâche',
      placeholder: 'Titre  (#tag)',
      confirmLabel: 'Ajouter',
    });
    if (title) await addSubtask(task.id, title);
  }

  async function confirmDelete() {
    const ok = await confirm({
      title: hasSubtasks ? 'Supprimer la tâche et ses sous-tâches ?' : 'Supprimer la tâche ?',
      description: `« ${task.title} » sera supprimée.`,
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (ok) void deleteTask(task.id);
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem disabled={locked} onSelect={() => void moveTaskToTop(task.id)}>
          <ArrowUpToLine /> Déplacer en haut
        </ContextMenuItem>

        <ContextMenuSeparator />

        {!isSubtask && (
          <ContextMenuItem disabled={locked} onSelect={() => void createSubtask()}>
            <ListPlus /> Créer une sous-tâche
          </ContextMenuItem>
        )}

        {hasSubtasks ? (
          <ContextMenuSub>
            <ContextMenuSubTrigger className="gap-2" disabled={locked}>
              <Play /> Démarrer un focus
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {subtasks.map((s) => (
                <ContextMenuItem key={s.id} disabled={s.done} onSelect={() => startWork(s.id)}>
                  {s.title}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        ) : (
          <ContextMenuItem disabled={locked} onSelect={() => startWork(task.id)}>
            <Play /> Démarrer un focus
          </ContextMenuItem>
        )}

        <ContextMenuItem onSelect={() => void duplicateTask(task.id)}>
          <Copy /> Dupliquer
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2" disabled={locked}>
            <Timer /> Estimation
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuRadioGroup
              value={String(task.estimateMinutes || 0)}
              onValueChange={(v) => void patchTask({ id: task.id, estimateMinutes: Number(v) })}
            >
              <ContextMenuRadioItem value="0">Aucune</ContextMenuRadioItem>
              {ESTIMATE_OPTIONS.map((m) => (
                <ContextMenuRadioItem key={m} value={String(m)}>
                  {formatEstimate(m)}
                </ContextMenuRadioItem>
              ))}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>

        {!isSubtask && (
          <ContextMenuSub>
            <ContextMenuSubTrigger className="gap-2" disabled={locked}>
              <FolderClosed /> Projet
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuRadioGroup
                value={task.projectId ?? 'none'}
                onValueChange={(v) => void patchTask({ id: task.id, projectId: v === 'none' ? null : v })}
              >
                <ContextMenuRadioItem value="none">Aucun</ContextMenuRadioItem>
                {projects.map((p) => (
                  <ContextMenuRadioItem key={p.id} value={p.id}>
                    {p.name}
                  </ContextMenuRadioItem>
                ))}
              </ContextMenuRadioGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2" disabled={locked}>
            <CalendarDays /> Planifier
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onSelect={() => void patchTask({ id: task.id, scheduledFor: todayIso() })}>
              Aujourd'hui
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => void patchTask({ id: task.id, scheduledFor: isoDate(addDays(new Date(), 1)) })}>
              Demain
            </ContextMenuItem>
            {task.scheduledFor && (
              <ContextMenuItem onSelect={() => void patchTask({ id: task.id, scheduledFor: null })}>
                Retirer
              </ContextMenuItem>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        <ContextMenuItem variant="destructive" onSelect={() => void confirmDelete()}>
          <Trash2 /> Supprimer
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
