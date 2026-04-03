'use client';

/**
 * ThemeContext
 *
 * Manages the active UI theme (jackbox, spotify, youtube, musicwall).
 * Stores the user's choice in localStorage so it persists between visits.
 * Sets a `data-theme` attribute on <html> which activates the matching CSS.
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { ThemeName } from '@/config/game-config';
import { PHOMU_CONFIG } from '@/config/game-config';

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'phomu-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof localStorage === 'undefined') return PHOMU_CONFIG.DEFAULT_THEME;
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    if (saved && PHOMU_CONFIG.AVAILABLE_THEMES.includes(saved)) return saved;
    return PHOMU_CONFIG.DEFAULT_THEME;
  });

  // Whenever theme changes, update <html> data-theme attribute and save
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access the current theme and the setter function.
 * Must be used inside a <ThemeProvider>.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
