import { Check, Hourglass, Pause, PanelRight, Play, Repeat1, Settings, TimerReset } from 'lucide-react';
import { usePomodoro } from '../lib/pomodoro';
import { useStore } from '../lib/store';
import { todayIso } from '../lib/dates';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { cn } from '../lib/utils';

const REPEAT_OPTIONS = [1, 2, 3, 4, 5, 6];
const SLICE_OPTIONS = [15, 20, 25, 30, 45, 50, 60];

function bigClock(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
}

export function FocusModeDialog() {
  const focusOpen = usePomodoro((s) => s.focusOpen);
  const closeFocus = usePomodoro((s) => s.closeFocus);
  const running = usePomodoro((s) => s.running);
  const remaining = usePomodoro((s) => s.remaining);
  const current = usePomodoro((s) => s.current);
  const repeats = usePomodoro((s) => s.repeats);
  const sliceMinutes = usePomodoro((s) => s.sliceMinutes);
  const toggle = usePomodoro((s) => s.toggle);
  const reset = usePomodoro((s) => s.reset);
  const setRepeats = usePomodoro((s) => s.setRepeats);
  const setSliceMinutes = usePomodoro((s) => s.setSliceMinutes);

  const tasks = useStore((s) => s.tasks);
  const toggleDone = useStore((s) => s.toggleDone);
  const selectTask = useStore((s) => s.selectTask);

  const today = todayIso();
  const todayTasks = tasks.filter((t) => t.parentId === null && !t.archived && t.scheduledFor === today);
  const doneCount = todayTasks.filter((t) => t.done).length;

  const sliceSeconds = sliceMinutes * 60;
  const elapsedRatio = current === 0 ? 0 : Math.min(1, Math.max(0, (sliceSeconds - remaining) / sliceSeconds));

  function openDetail(id: string) {
    selectTask(id);
    closeFocus();
  }

  return (
    <Dialog open={focusOpen} onOpenChange={(open) => !open && closeFocus()}>
      <DialogContent className="gap-0 rounded-3xl bg-background p-8 sm:max-w-3xl md:p-10">
        <DialogTitle className="sr-only">Mode Focus</DialogTitle>

        <div className="flex gap-1.5">
          {Array.from({ length: repeats }, (_, i) => {
            const step = i + 1;
            const fill = current === 0 ? 0 : step < current ? 1 : step === current ? elapsedRatio : 0;
            return (
              <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${fill * 100}%` }} />
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div
            className={cn(
              'min-w-0 flex-1 font-display text-base font-bold text-foreground',
              running && 'invisible',
            )}
          >
            Étapes {Math.max(current, 1)}/{repeats}
          </div>
          <div className="shrink-0 font-display text-7xl font-bold tabular-nums leading-none text-primary md:text-8xl">
            {bigClock(remaining)}
          </div>
          <div
            className={cn(
              'min-w-0 flex-1 text-right font-display text-base font-bold text-foreground',
              running && 'invisible',
            )}
          >
            Tâches {doneCount}/{todayTasks.length}
          </div>
        </div>

        <div className="mt-10 font-display text-sm font-semibold text-muted-foreground">
          Tâches sur cette session :
        </div>

        <div className="relative mt-3">
          <div className="flex max-h-[45vh] flex-col gap-2 overflow-y-auto pb-24">
            {todayTasks.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Aucune tâche prévue aujourd'hui
              </div>
            ) : (
              todayTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3.5"
                >
                  <Checkbox
                    className="size-5"
                    checked={t.done}
                    onCheckedChange={() => void toggleDone(t.id, !t.done)}
                    aria-label={t.done ? 'Marquer non faite' : 'Marquer faite'}
                  />
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate font-medium',
                      t.done && 'text-muted-foreground line-through',
                    )}
                  >
                    {t.title}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => openDetail(t.id)}
                        className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <PanelRight size={16} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Ouvrir le détail</TooltipContent>
                  </Tooltip>
                </div>
              ))
            )}
          </div>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-3xl bg-background p-2.5 shadow-lg">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => reset()}
                  disabled={current === 0}
                  className="grid size-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  <TimerReset size={20} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Réinitialiser la session</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggle}
                  className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground transition-transform hover:scale-[1.03] active:scale-95"
                >
                  {running ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {running ? 'Mettre en pause' : current > 0 ? 'Reprendre la session' : 'Démarrer la session'}
              </TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="grid size-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Changer le rythme"
                >
                  <Settings size={20} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" side="top" className="w-56">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2 whitespace-nowrap">
                    <Repeat1 /> Répétitions
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {REPEAT_OPTIONS.map((n) => (
                      <DropdownMenuItem key={n} onSelect={() => setRepeats(n)}>
                        {n} session{n > 1 ? 's' : ''}
                        {repeats === n && <Check className="ml-auto text-foreground" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2 whitespace-nowrap">
                    <Hourglass /> Durée d'une tranche
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {SLICE_OPTIONS.map((m) => (
                      <DropdownMenuItem key={m} onSelect={() => setSliceMinutes(m)}>
                        {m} min
                        {sliceMinutes === m && <Check className="ml-auto text-foreground" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
