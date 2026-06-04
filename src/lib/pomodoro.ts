import { create } from 'zustand';
import { api } from './api';
import { useStore } from './store';

export type Phase = 'idle' | 'work' | 'break';

const DEFAULT_WORK = 25 * 60;

async function logWork(taskId: string | null, seconds: number) {
  if (seconds < 1) return;
  const updated = await api.logTime(taskId, seconds, 'work');
  if (updated) {
    const s = useStore.getState();
    useStore.setState({ tasks: s.tasks.map((t) => (t.id === updated.id ? updated : t)) });
  }
  void usePomodoro.getState().refreshToday();
}

type Pomodoro = {
  phase: Phase;
  running: boolean;
  remaining: number;
  duration: number;
  focusTaskId: string | null;
  completed: number;
  workMinutes: number;
  breakMinutes: number;
  todaySeconds: number;

  startWork: (taskId?: string | null) => void;
  startBreak: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  tick: () => void;
  setDurations: (workMin: number, breakMin: number) => void;
  refreshToday: () => Promise<void>;
};

export const usePomodoro = create<Pomodoro>((set, get) => ({
  phase: 'idle',
  running: false,
  remaining: DEFAULT_WORK,
  duration: DEFAULT_WORK,
  focusTaskId: null,
  completed: 0,
  workMinutes: 25,
  breakMinutes: 5,
  todaySeconds: 0,

  startWork(taskId) {
    const dur = get().workMinutes * 60;
    set({
      phase: 'work',
      running: true,
      duration: dur,
      remaining: dur,
      focusTaskId: taskId ?? get().focusTaskId ?? null,
    });
  },

  startBreak() {
    const dur = get().breakMinutes * 60;
    set({ phase: 'break', running: true, duration: dur, remaining: dur });
  },

  pause() {
    set({ running: false });
  },
  resume() {
    if (get().phase !== 'idle') set({ running: true });
  },

  stop() {
    const { phase, duration, remaining, focusTaskId } = get();
    if (phase === 'work') void logWork(focusTaskId, duration - remaining);
    const dur = get().workMinutes * 60;
    set({ phase: 'idle', running: false, duration: dur, remaining: dur, focusTaskId: null });
  },

  tick() {
    const { running, remaining, phase, duration, focusTaskId } = get();
    if (!running || phase === 'idle') return;
    if (remaining > 1) {
      set({ remaining: remaining - 1 });
      return;
    }
    // Phase finished.
    if (phase === 'work') {
      void logWork(focusTaskId, duration);
      set({ completed: get().completed + 1 });
      get().startBreak();
    } else {
      const dur = get().workMinutes * 60;
      set({ phase: 'idle', running: false, duration: dur, remaining: dur });
    }
  },

  setDurations(workMin, breakMin) {
    set({ workMinutes: workMin, breakMinutes: breakMin });
    if (get().phase === 'idle') set({ duration: workMin * 60, remaining: workMin * 60 });
  },

  async refreshToday() {
    try {
      set({ todaySeconds: await api.timeToday() });
    } catch {
      /* ignore */
    }
  },
}));
