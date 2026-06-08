import { useEffect, useState } from 'react';

const WIDTH_KEY = 'taffk.sidebar.width';
const COLLAPSED_KEY = 'taffk.sidebar.collapsed';

export const SIDEBAR_MIN = 220;
export const SIDEBAR_MAX = 380;
export const SIDEBAR_DEFAULT = 240;
export const SIDEBAR_COLLAPSED = 64;

export const clampWidth = (w: number) => Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w));

function readWidth(): number {
  const n = Number(localStorage.getItem(WIDTH_KEY));
  return Number.isFinite(n) && n > 0 ? clampWidth(n) : SIDEBAR_DEFAULT;
}

function readCollapsed(): boolean {
  return localStorage.getItem(COLLAPSED_KEY) === '1';
}

export function useSidebar() {
  const [width, setWidth] = useState<number>(readWidth);
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);

  useEffect(() => {
    localStorage.setItem(WIDTH_KEY, String(width));
  }, [width]);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  return {
    width,
    setWidth: (w: number) => setWidth(clampWidth(w)),
    collapsed,
    setCollapsed,
    toggleCollapsed: () => setCollapsed((c) => !c),
  };
}
