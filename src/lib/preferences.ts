export type ThemePreference = "system" | "light" | "dark";
export type Locale = "en" | "th";

export const THEME_COOKIE_NAME = "spendly-theme";
export const LOCALE_COOKIE_NAME = "spendly-locale";

export function isThemePreference(value: string | undefined): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "th";
}
