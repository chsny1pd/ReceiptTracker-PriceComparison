"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getDictionary } from "@/lib/i18n";
import {
  LOCALE_COOKIE_NAME,
  THEME_COOKIE_NAME,
  type Locale,
  type ThemePreference,
} from "@/lib/preferences";

type PreferencesContextValue = {
  locale: Locale;
  theme: ThemePreference;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemePreference) => void;
  dict: ReturnType<typeof getDictionary>;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

function resolveTheme(theme: ThemePreference) {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  return theme;
}

function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  const resolved = resolveTheme(theme);

  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
}

export function AppPreferencesProvider({
  children,
  initialLocale,
  initialTheme,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialTheme: ThemePreference;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [theme, setThemeState] = useState<ThemePreference>(initialTheme);

  useEffect(() => {
    applyTheme(theme);
    writeCookie(THEME_COOKIE_NAME, theme);
    window.localStorage.setItem(THEME_COOKIE_NAME, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale;
    writeCookie(LOCALE_COOKIE_NAME, locale);
  }, [locale]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, [theme]);

  const value = useMemo(
    () => ({
      locale,
      theme,
      setLocale: setLocaleState,
      setTheme: setThemeState,
      dict: getDictionary(locale),
    }),
    [locale, theme],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("useAppPreferences must be used within AppPreferencesProvider");
  }

  return context;
}
