'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type SystemTheme = 'dark' | 'light';

interface ThemeValue {
  [themeName: string]: string;
}

export interface UseThemeProps {
  themes: string[];
  forcedTheme?: string;
  setTheme: (theme: string) => void;
  theme?: string;
  resolvedTheme?: string;
  systemTheme?: SystemTheme;
}

export interface ThemeProviderProps {
  themes?: string[];
  forcedTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  enableColorScheme?: boolean;
  storageKey?: string;
  defaultTheme?: string;
  attribute?: string | 'class';
  value?: ThemeValue;
  children?: React.ReactNode;
}

const DEFAULT_THEMES = ['light', 'dark'];
const MEDIA_QUERY = '(prefers-color-scheme: dark)';
const ThemeContext = createContext<UseThemeProps | undefined>(undefined);

export function ThemeProvider({
  attribute = 'data-theme',
  children,
  defaultTheme,
  disableTransitionOnChange = false,
  enableColorScheme = true,
  enableSystem = true,
  forcedTheme,
  storageKey = 'theme',
  themes = DEFAULT_THEMES,
  value,
}: ThemeProviderProps): JSX.Element {
  const [theme, setThemeState] = useState<string | undefined>(() => getInitialTheme(storageKey, defaultTheme, enableSystem));
  const [systemTheme, setSystemTheme] = useState<SystemTheme | undefined>(() => getSystemTheme());
  const resolvedTheme = resolveTheme(forcedTheme ?? theme, enableSystem, systemTheme);

  const setTheme = useCallback(
    (nextTheme: string) => {
      if (forcedTheme) {
        return;
      }

      setThemeState(nextTheme);

      if (!isBrowser()) {
        return;
      }

      try {
        window.localStorage.setItem(storageKey, nextTheme);
      } catch {
        //
      }
    },
    [forcedTheme, storageKey]
  );

  useEffect(() => {
    if (!isBrowser() || !enableSystem) {
      return;
    }

    const mediaQuery = window.matchMedia(MEDIA_QUERY);

    function handleChange(event: MediaQueryListEvent): void {
      setSystemTheme(event.matches ? 'dark' : 'light');
    }

    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [enableSystem]);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }

    const root = window.document.documentElement;
    const selectedTheme = forcedTheme ?? theme ?? defaultTheme;
    const nextResolvedTheme = resolveTheme(selectedTheme, enableSystem, systemTheme);

    if (!nextResolvedTheme) {
      return;
    }

    const cleanupTransitions = disableTransitionOnChange ? disableTransitions() : undefined;
    const themeValues = value ? Object.values(value) : themes;
    const attributeValue = value?.[nextResolvedTheme] ?? nextResolvedTheme;

    if (attribute === 'class') {
      root.classList.remove(...themeValues);
      root.classList.add(attributeValue);
    }

    if (attribute !== 'class') {
      root.setAttribute(attribute, attributeValue);
    }

    if (enableColorScheme && (nextResolvedTheme === 'dark' || nextResolvedTheme === 'light')) {
      root.style.colorScheme = nextResolvedTheme;
    }

    cleanupTransitions?.();
  }, [
    attribute,
    defaultTheme,
    disableTransitionOnChange,
    enableColorScheme,
    enableSystem,
    forcedTheme,
    systemTheme,
    theme,
    themes,
    value,
  ]);

  const context = useMemo<UseThemeProps>(() => {
    return {
      forcedTheme,
      resolvedTheme,
      setTheme,
      systemTheme,
      theme: forcedTheme ?? theme,
      themes: enableSystem ? [...themes, 'system'] : themes,
    };
  }, [enableSystem, forcedTheme, resolvedTheme, setTheme, systemTheme, theme, themes]);

  return <ThemeContext.Provider value={context}>{children}</ThemeContext.Provider>;
}

export function useTheme(): UseThemeProps {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}

function disableTransitions(): () => void {
  const style = window.document.createElement('style');
  style.appendChild(
    window.document.createTextNode(
      '*{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}'
    )
  );
  window.document.head.appendChild(style);

  return () => {
    window.getComputedStyle(window.document.body);

    window.setTimeout(() => {
      style.remove();
    }, 0);
  };
}

function getInitialTheme(storageKey: string, defaultTheme: string | undefined, enableSystem: boolean): string {
  if (!isBrowser()) {
    return defaultTheme ?? (enableSystem ? 'system' : 'light');
  }

  try {
    const storedTheme = window.localStorage.getItem(storageKey);

    if (storedTheme) {
      return storedTheme;
    }
  } catch {
    //
  }

  return defaultTheme ?? (enableSystem ? 'system' : 'light');
}

function getSystemTheme(): SystemTheme | undefined {
  if (!isBrowser()) {
    return undefined;
  }

  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function resolveTheme(
  theme: string | undefined,
  enableSystem: boolean,
  systemTheme: SystemTheme | undefined
): string | undefined {
  if (!theme) {
    return undefined;
  }

  if (theme !== 'system') {
    return theme;
  }

  if (!enableSystem) {
    return 'light';
  }

  return systemTheme ?? 'light';
}
