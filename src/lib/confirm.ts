import { create } from 'zustand';

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmState = {
  open: boolean;
  options: ConfirmOptions | null;
  resolve: ((ok: boolean) => void) | null;
  request: (options: ConfirmOptions) => Promise<boolean>;
  respond: (ok: boolean) => void;
};

export const useConfirm = create<ConfirmState>((set, get) => ({
  open: false,
  options: null,
  resolve: null,
  request(options) {
    return new Promise<boolean>((resolve) => set({ open: true, options, resolve }));
  },
  respond(ok) {
    get().resolve?.(ok);
    set({ open: false, resolve: null });
  },
}));

/** Imperatively ask the user to confirm an action; resolves true when accepted. */
export const confirm = (options: ConfirmOptions) => useConfirm.getState().request(options);
