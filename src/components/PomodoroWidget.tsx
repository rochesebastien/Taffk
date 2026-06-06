import { useEffect } from 'react';
import { Pause, Play, Square } from 'lucide-react';
import { usePomodoro } from '../lib/pomodoro';
import { useStore } from '../lib/store';

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
  const idle = phase === 'idle';

  return (
    <div className={`pomo ${phase}`}>
      {idle ? (
        <button className="pomo-start" onClick={() => startWork(null)}>
          <span className="pomo-start-icon"><Play size={11} /></span>
          Démarrer le focus
          <span className="pomo-start-time">25:00</span>
        </button>
      ) : (
        <div className="pomo-active">
          <div className="pomo-row">
            <span className="pomo-phase">{phase === 'work' ? 'Focus' : 'Pause'}</span>
            <span className="pomo-time">{clock(remaining)}</span>
          </div>
          <div className="pomo-bar">
            <div className="pomo-bar-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="pomo-controls">
            {running ? (
              <button className="pomo-btn" onClick={pause} title="Pause">
                <Pause size={13} />
              </button>
            ) : (
              <button className="pomo-btn" onClick={resume} title="Reprendre">
                <Play size={13} />
              </button>
            )}
            <button className="pomo-btn" onClick={stop} title="Arrêter">
              <Square size={12} />
            </button>
            {phase === 'work' && focusTitle && <span className="pomo-task">{focusTitle}</span>}
          </div>
        </div>
      )}
      <div className="pomo-today">Aujourd'hui · {humanToday(todaySeconds)}</div>
    </div>
  );
}
