import { create } from 'zustand';

export type Theme = 'dark' | 'light';
export type ThemeMode = 'light' | 'dark' | 'system' | 'schedule';

const MODE_KEY = 'taffk.theme.mode';
const START_KEY = 'taffk.theme.scheduleStart';
const END_KEY = 'taffk.theme.scheduleEnd';
const LEGACY_KEY = 'taffk.theme';

function readMode(): ThemeMode {
  const m = localStorage.getItem(MODE_KEY);
  if (m === 'light' || m === 'dark' || m === 'system' || m === 'schedule') return m;
  return localStorage.getItem(LEGACY_KEY) === 'dark' ? 'dark' : 'light';
}

function systemDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function parseHM(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Dark applies when the current time is in [start, end), wrapping past midnight. */
function scheduleDark(start: string, end: string): boolean {
  const d = new Date();
  const n = d.getHours() * 60 + d.getMinutes();
  const s = parseHM(start);
  const e = parseHM(end);
  return s <= e ? n >= s && n < e : n >= s || n < e;
}

function computeEffective(mode: ThemeMode, start: string, end: string): Theme {
  if (mode === 'light' || mode === 'dark') return mode;
  if (mode === 'system') return systemDark() ? 'dark' : 'light';
  return scheduleDark(start, end) ? 'dark' : 'light';
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

type ThemeState = {
  mode: ThemeMode;
  scheduleStart: string;
  scheduleEnd: string;
  theme: Theme;
  setMode: (m: ThemeMode) => void;
  setSchedule: (start: string, end: string) => void;
  toggle: () => void;
  recompute: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => {
  const mode = readMode();
  const scheduleStart = localStorage.getItem(START_KEY) || '20:00';
  const scheduleEnd = localStorage.getItem(END_KEY) || '08:00';
  return {
    mode,
    scheduleStart,
    scheduleEnd,
    theme: computeEffective(mode, scheduleStart, scheduleEnd),
    setMode(m) {
      localStorage.setItem(MODE_KEY, m);
      const theme = computeEffective(m, get().scheduleStart, get().scheduleEnd);
      apply(theme);
      set({ mode: m, theme });
    },
    setSchedule(start, end) {
      localStorage.setItem(START_KEY, start);
      localStorage.setItem(END_KEY, end);
      const theme = computeEffective(get().mode, start, end);
      apply(theme);
      set({ scheduleStart: start, scheduleEnd: end, theme });
    },
    toggle() {
      get().setMode(get().theme === 'dark' ? 'light' : 'dark');
    },
    recompute() {
      const { mode: m, scheduleStart: s, scheduleEnd: e, theme } = get();
      const next = computeEffective(m, s, e);
      if (next !== theme) {
        apply(next);
        set({ theme: next });
      }
    },
  };
});

/** Back-compat hook: components read `{ theme, toggle, ... }` like before. */
export function useTheme() {
  return useThemeStore();
}

if (typeof window !== 'undefined') {
  apply(useThemeStore.getState().theme);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useThemeStore.getState().mode === 'system') useThemeStore.getState().recompute();
  });
  setInterval(() => {
    if (useThemeStore.getState().mode === 'schedule') useThemeStore.getState().recompute();
  }, 30_000);
}
