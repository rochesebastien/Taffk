import { useEffect } from 'react';
import { Check, Ellipsis, Hourglass, Pause, Play, Repeat1, RotateCcw } from 'lucide-react';
import { usePomodoro } from '../lib/pomodoro';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { cn } from '../lib/utils';

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const REPEAT_OPTIONS = [1, 2, 3, 4, 5, 6];
const SLICE_OPTIONS = [15, 20, 25, 30, 45, 50, 60];

export function PomodoroWidget({ collapsed = false }: { collapsed?: boolean }) {
  const running = usePomodoro((s) => s.running);
  const remaining = usePomodoro((s) => s.remaining);
  const current = usePomodoro((s) => s.current);
  const repeats = usePomodoro((s) => s.repeats);
  const sliceMinutes = usePomodoro((s) => s.sliceMinutes);
  const toggle = usePomodoro((s) => s.toggle);
  const reset = usePomodoro((s) => s.reset);
  const setRepeats = usePomodoro((s) => s.setRepeats);
  const setSliceMinutes = usePomodoro((s) => s.setSliceMinutes);
  const refreshToday = usePomodoro((s) => s.refreshToday);

  useEffect(() => {
    void refreshToday();
  }, [refreshToday]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => usePomodoro.getState().tick(), 1000);
    return () => clearInterval(id);
  }, [running]);

  const active = current > 0;

  const toggleButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={toggle}
          className={cn(
            'grid shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-[1.03] active:scale-95',
            collapsed ? 'size-10' : 'size-14',
          )}
        >
          {running ? (
            <Pause size={collapsed ? 18 : 24} className="fill-current" />
          ) : (
            <Play size={collapsed ? 18 : 24} className="fill-current" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side={collapsed ? 'right' : 'top'}>
        {running ? 'Mettre en pause' : active ? 'Reprendre la session' : 'Démarrer une session focus'}
      </TooltipContent>
    </Tooltip>
  );

  if (collapsed) return <div className="flex justify-center px-1 py-1">{toggleButton}</div>;

  return (
    <div className="flex items-center gap-3 px-1 py-1">
      {toggleButton}

      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-lg font-bold leading-tight text-foreground">
          {active ? `${clock(remaining)}` : 'Focus'}
        </div>
        <div className="text-sm text-muted-foreground">
          {active ? `${current}/${repeats} x ${sliceMinutes}min` : `${repeats} x ${sliceMinutes}min`}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            title="Options de la session"
          >
            <Ellipsis size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
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

          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => reset()} disabled={!active}>
            <RotateCcw /> Réinitialiser la session
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
