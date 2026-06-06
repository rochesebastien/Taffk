import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const KEY = 'taffk.theme';

function read(): Theme {
  const stored = localStorage.getItem(KEY);
  return stored === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(read);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return { theme, toggle };
}
