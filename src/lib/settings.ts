import { create } from 'zustand';
import type { View } from './store';

const KEY = 'taffk.settings';

export const DEFAULT_TOGGLE_SHORTCUT = 'CommandOrControl+Shift+Space';

export type CustomFieldType = 'text' | 'link';

export type CustomField = {
  id: string;
  label: string;
  type: CustomFieldType;
};

export type Settings = {
  startupView: View;
  confirmBeforeDelete: boolean;
  keepSpotlightOpen: boolean;
  pomodoroSliceMinutes: number;
  pomodoroRepeats: number;
  profileName: string;
  profileEmoji: string;
  profileColor: string;
  shortcutToggle: string;
  shortcutQuickAdd: string;
  customFields: CustomField[];
};

const DEFAULTS: Settings = {
  startupView: 'today',
  confirmBeforeDelete: true,
  keepSpotlightOpen: true,
  pomodoroSliceMinutes: 25,
  pomodoroRepeats: 3,
  profileName: '',
  profileEmoji: '',
  profileColor: '#3d44ff',
  shortcutToggle: DEFAULT_TOGGLE_SHORTCUT,
  shortcutQuickAdd: 'A',
  customFields: [],
};

export function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function persist(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

type SettingsStore = Settings & {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
};

export const useSettings = create<SettingsStore>((set, get) => ({
  ...readSettings(),
  set(key, value) {
    set({ [key]: value } as Partial<Settings>);
    const { set: _s, reset: _r, ...data } = get();
    persist(data);
  },
  reset() {
    set({ ...DEFAULTS });
    persist(DEFAULTS);
  },
}));
