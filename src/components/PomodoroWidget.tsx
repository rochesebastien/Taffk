import { useEffect } from 'react';
import { Pause, Play } from 'lucide-react';
import { usePomodoro } from '../lib/pomodoro';
import { FocusModeDialog } from './FocusModeDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { cn } from '../lib/utils';

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function PomodoroWidget({ collapsed = false }: { collapsed?: boolean }) {
  const running = usePomodoro((s) => s.running);
  const remaining = usePomodoro((s) => s.remaining);
  const current = usePomodoro((s) => s.current);
  const repeats = usePomodoro((s) => s.repeats);
  const sliceMinutes = usePomodoro((s) => s.sliceMinutes);
  const openFocus = usePomodoro((s) => s.openFocus);
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

  const focusButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={openFocus}
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
      <TooltipContent side={collapsed ? 'right' : 'top'}>Mode Focus</TooltipContent>
    </Tooltip>
  );

  return (
    <>
      {collapsed ? (
        <div className="flex justify-center px-1 py-1">{focusButton}</div>
      ) : (
        <div className="flex items-center gap-3 px-1 py-1">
          {focusButton}

          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-lg font-bold leading-tight text-foreground">
              {active ? `${clock(remaining)}` : 'Mode Focus'}
            </div>
            <div className="text-sm text-muted-foreground">
              {active ? `${current}/${repeats} x ${sliceMinutes}min` : `${repeats} x ${sliceMinutes}min`}
            </div>
          </div>
        </div>
      )}

      <FocusModeDialog />
    </>
  );
}
