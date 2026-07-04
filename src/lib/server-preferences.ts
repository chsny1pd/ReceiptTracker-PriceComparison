import { cookies } from "next/headers";

import { getDictionary } from "@/lib/i18n";
import {
  isLocale,
  isThemePreference,
  LOCALE_COOKIE_NAME,
  THEME_COOKIE_NAME,
  type Locale,
  type ThemePreference,
} from "@/lib/preferences";

export async function getServerPreferences(): Promise<{
  locale: Locale;
  theme: ThemePreference;
}> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)?.value;

  return {
    locale: isLocale(localeCookie) ? localeCookie : "en",
    theme: isThemePreference(themeCookie) ? themeCookie : "system",
  };
}

export async function getServerI18n() {
  const { locale, theme } = await getServerPreferences();
  return {
    locale,
    theme,
    dict: getDictionary(locale),
  };
}
