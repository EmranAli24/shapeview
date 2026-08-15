import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

/** Also read by the inline bootstrap script in index.html — keep the two in sync. */
export const THEME_KEY = 'shapeview:theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Private-mode Safari throws on both read and write, and a theme is not worth a crash. */
function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export interface UseThemeResult {
  theme: Theme;
  toggle: () => void;
}

/**
 * The OS preference is the default; an explicit toggle overrides it from then on, in this and
 * every later session. Whether a choice has been made is not tracked in state — localStorage
 * already answers that, and a second piece of state could disagree with it.
 */
export function useTheme(): UseThemeResult {
  const [theme, setTheme] = useState<Theme>(() => readStored() ?? systemTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      // A stored choice outranks the OS; re-read it rather than capturing it, so the listener
      // does not need re-registering when the user toggles.
      if (readStored() === null) setTheme(event.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    // Computed outside the updater: React may invoke an updater more than once, so persisting
    // from inside one would be a side effect running twice.
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* storage unavailable — the toggle still works for this session */
    }
  }, [theme]);

  return { theme, toggle };
}
