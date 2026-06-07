import { create } from 'zustand';

export type PromptOptions = {
  title: string;
  description?: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
};

type PromptState = {
  open: boolean;
  options: PromptOptions | null;
  resolve: ((value: string | null) => void) | null;
  request: (options: PromptOptions) => Promise<string | null>;
  respond: (value: string | null) => void;
};

export const usePrompt = create<PromptState>((set, get) => ({
  open: false,
  options: null,
  resolve: null,
  request(options) {
    return new Promise<string | null>((resolve) => set({ open: true, options, resolve }));
  },
  respond(value) {
    get().resolve?.(value);
    set({ open: false, resolve: null });
  },
}));

/** Imperative text prompt (replaces window.prompt, which Tauri's webview blocks). */
export const prompt = (options: PromptOptions) => usePrompt.getState().request(options);
