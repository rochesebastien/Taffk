import { create } from 'zustand';
import { api } from './api';
import { useStore } from './store';
import { readSettings } from './settings';

const settings = readSettings();
const DEFAULT_REPEATS = settings.pomodoroRepeats;
const DEFAULT_SLICE = settings.pomodoroSliceMinutes; // minutes per Pomodoro slice

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
  running: boolean;
  remaining: number; // seconds left in the current slice
  current: number; // 0 = idle, 1..repeats = active slice index
  sliceMinutes: number;
  repeats: number;
  focusTaskId: string | null;
  todaySeconds: number;

  toggle: () => void;
  start: (taskId?: string | null) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  tick: () => void;
  setRepeats: (n: number) => void;
  setSliceMinutes: (m: number) => void;
  refreshToday: () => Promise<void>;
};

export const usePomodoro = create<Pomodoro>((set, get) => ({
  running: false,
  remaining: DEFAULT_SLICE * 60,
  current: 0,
  sliceMinutes: DEFAULT_SLICE,
  repeats: DEFAULT_REPEATS,
  focusTaskId: null,
  todaySeconds: 0,

  toggle() {
    const { current, running, sliceMinutes } = get();
    if (current === 0) {
      set({ current: 1, running: true, remaining: sliceMinutes * 60 });
    } else {
      set({ running: !running });
    }
  },

  start(taskId) {
    const { current, sliceMinutes, remaining, focusTaskId } = get();
    if (current > 0) void logWork(focusTaskId, sliceMinutes * 60 - remaining);
    set({ focusTaskId: taskId ?? null, current: 1, running: true, remaining: sliceMinutes * 60 });
  },

  pause() {
    set({ running: false });
  },

  resume() {
    if (get().current > 0) set({ running: true });
  },

  reset() {
    const { current, sliceMinutes, remaining, focusTaskId } = get();
    if (current > 0) void logWork(focusTaskId, sliceMinutes * 60 - remaining);
    set({ current: 0, running: false, remaining: sliceMinutes * 60, focusTaskId: null });
  },

  tick() {
    const { running, current, remaining, sliceMinutes, repeats, focusTaskId } = get();
    if (!running || current === 0) return;
    if (remaining > 1) {
      set({ remaining: remaining - 1 });
      return;
    }
    // Slice finished — bank the full slice and advance, or end the session.
    void logWork(focusTaskId, sliceMinutes * 60);
    if (current < repeats) {
      set({ current: current + 1, remaining: sliceMinutes * 60 });
    } else {
      set({ current: 0, running: false, remaining: sliceMinutes * 60, focusTaskId: null });
    }
  },

  setRepeats(n) {
    set({ repeats: Math.max(1, n) });
  },

  setSliceMinutes(m) {
    set({ sliceMinutes: m });
    if (get().current === 0) set({ remaining: m * 60 });
  },

  async refreshToday() {
    try {
      set({ todaySeconds: await api.timeToday() });
    } catch {
      /* ignore */
    }
  },
}));
