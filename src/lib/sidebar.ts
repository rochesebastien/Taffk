import { useEffect, useState } from 'react';

const WIDTH_KEY = 'taffk.sidebar.width';
const COLLAPSED_KEY = 'taffk.sidebar.collapsed';
const RIGHT_PANEL_WIDTH_KEY = 'taffk.right-panel.width';

export const SIDEBAR_MIN = 220;
export const SIDEBAR_MAX = 380;
export const SIDEBAR_DEFAULT = 240;
export const SIDEBAR_COLLAPSED = 64;
export const RIGHT_PANEL_MIN = 340;
export const RIGHT_PANEL_MAX = 720;
export const RIGHT_PANEL_DEFAULT = 440;

export const clampWidth = (w: number) => Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w));

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function readWidth(key: string, fallback: number, min: number, max: number): number {
  const n = Number(localStorage.getItem(key));
  return Number.isFinite(n) && n > 0 ? clamp(n, min, max) : fallback;
}

function readCollapsed(): boolean {
  return localStorage.getItem(COLLAPSED_KEY) === '1';
}

export function useSidebar() {
  const [width, setWidth] = useState<number>(() => readWidth(WIDTH_KEY, SIDEBAR_DEFAULT, SIDEBAR_MIN, SIDEBAR_MAX));
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

export function useRightPanelWidth() {
  const [width, setWidth] = useState<number>(() =>
    readWidth(RIGHT_PANEL_WIDTH_KEY, RIGHT_PANEL_DEFAULT, RIGHT_PANEL_MIN, RIGHT_PANEL_MAX),
  );

  useEffect(() => {
    localStorage.setItem(RIGHT_PANEL_WIDTH_KEY, String(width));
  }, [width]);

  return {
    width,
    setWidth: (nextWidth: number) => setWidth(clamp(nextWidth, RIGHT_PANEL_MIN, RIGHT_PANEL_MAX)),
  };
}
