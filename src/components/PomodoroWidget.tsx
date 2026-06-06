import { useEffect } from 'react';
import { Pause, Play, Square } from 'lucide-react';
import { usePomodoro } from '../lib/pomodoro';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function humanToday(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}`;
}

export function PomodoroWidget() {
  const phase = usePomodoro((s) => s.phase);
  const running = usePomodoro((s) => s.running);
  const remaining = usePomodoro((s) => s.remaining);
  const duration = usePomodoro((s) => s.duration);
  const focusTaskId = usePomodoro((s) => s.focusTaskId);
  const todaySeconds = usePomodoro((s) => s.todaySeconds);
  const startWork = usePomodoro((s) => s.startWork);
  const pause = usePomodoro((s) => s.pause);
  const resume = usePomodoro((s) => s.resume);
  const stop = usePomodoro((s) => s.stop);
  const refreshToday = usePomodoro((s) => s.refreshToday);

  const focusTitle = useStore((s) => s.tasks.find((t) => t.id === focusTaskId)?.title ?? null);

  useEffect(() => {
    void refreshToday();
  }, [refreshToday]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => usePomodoro.getState().tick(), 1000);
    return () => clearInterval(id);
  }, [running]);

  const progress = duration > 0 ? 1 - remaining / duration : 0;
  const isWork = phase === 'work';

  return (
    <div className="px-1 pb-1">
      {phase === 'idle' ? (
        <button
          onClick={() => startWork(null)}
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-ring hover:bg-accent hover:text-foreground"
        >
          <Play size={11} className="text-primary" />
          Démarrer le focus
          <span className="ml-auto font-mono text-xs text-muted-foreground/70">25:00</span>
        </button>
      ) : (
        <div className={cn('rounded-lg border border-border bg-muted/40 px-3 py-2', isWork && 'border-ring/50')}>
          <div className="flex items-baseline justify-between">
            <span className={cn('text-[10px] font-semibold uppercase tracking-widest', isWork ? 'text-primary' : 'text-muted-foreground')}>
              {isWork ? 'Focus' : 'Pause'}
            </span>
            <span className="font-mono text-lg font-medium tabular-nums">{clock(remaining)}</span>
          </div>
          <div className="my-2 h-1 overflow-hidden rounded-full bg-accent">
            <div className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={running ? pause : resume}
              title={running ? 'Pause' : 'Reprendre'}
              className="grid size-6 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-border/70 hover:bg-accent hover:text-foreground"
            >
              {running ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button
              onClick={stop}
              title="Arrêter"
              className="grid size-6 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-border/70 hover:bg-accent hover:text-foreground"
            >
              <Square size={12} />
            </button>
            {isWork && focusTitle && <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{focusTitle}</span>}
          </div>
        </div>
      )}
      <div className="mt-2 px-1 font-mono text-[10.5px] text-muted-foreground/60">
        Aujourd'hui · {humanToday(todaySeconds)}
      </div>
    </div>
  );
}
