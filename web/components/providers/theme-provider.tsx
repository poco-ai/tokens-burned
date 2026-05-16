"use client";

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { persistClientTheme } from "@/lib/preferences-client";
import {
  resolveThemeAppearance,
  type ThemeAppearance,
  type ThemeMode,
} from "@/lib/theme";

type ThemeContextValue = {
  themeMode: ThemeMode;
  resolvedTheme: ThemeAppearance;
  setThemeMode: (themeMode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(themeMode: ThemeMode) {
  const resolvedTheme = resolveThemeAppearance(
    themeMode,
    getSystemPrefersDark(),
  );

  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.dataset.themeMode = themeMode;
  document.documentElement.style.colorScheme = resolvedTheme;

  void persistClientTheme(themeMode);

  return resolvedTheme;
}

type ThemeProviderProps = {
  initialThemeMode: ThemeMode;
  children: ReactNode;
};

export function ThemeProvider({
  initialThemeMode,
  children,
}: ThemeProviderProps) {
  // react-doctor-disable-next-line react-doctor/no-derived-useState -- server cookie default, root layout never re-renders on navigation
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialThemeMode);
  const [resolvedTheme, setResolvedTheme] = useState<ThemeAppearance>(() =>
    resolveThemeAppearance(initialThemeMode, false),
  );

  useEffect(() => {
    setResolvedTheme(applyTheme(themeMode));

    if (themeMode !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => {
      setResolvedTheme(applyTheme("system"));
    };

    mediaQuery.addEventListener("change", syncTheme);

    return () => {
      mediaQuery.removeEventListener("change", syncTheme);
    };
  }, [themeMode]);

  const setThemeMode = useCallback((nextThemeMode: ThemeMode) => {
    setThemeModeState(nextThemeMode);
  }, []);

  const value = useMemo(
    () => ({
      themeMode,
      resolvedTheme,
      setThemeMode,
    }),
    [resolvedTheme, setThemeMode, themeMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = use(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }

  return context;
}
