import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppPreferencesProvider } from "@/components/app-preferences-provider";
import { getServerPreferences } from "@/lib/server-preferences";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spendly",
  description: "Receipt tracking, price comparison, and shared grocery splits.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, theme } = await getServerPreferences();
  const initialThemeClass = theme === "dark" ? "dark" : theme === "light" ? "light" : "";
  const themeBootstrap = `
    (function () {
      var root = document.documentElement;
      var match = document.cookie.match(/(?:^|; )spendly-theme=([^;]+)/);
      var stored = match ? decodeURIComponent(match[1]) : null;
      var local = window.localStorage.getItem("spendly-theme");
      var theme = stored || local || ${JSON.stringify(theme)};
      var resolved = theme === "system"
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : theme;
      root.classList.toggle("dark", resolved === "dark");
      root.classList.toggle("light", resolved === "light");
      root.dataset.theme = resolved;
      root.style.colorScheme = resolved;
    })();
  `;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${initialThemeClass}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AppPreferencesProvider initialLocale={locale} initialTheme={theme}>
          {children}
        </AppPreferencesProvider>
      </body>
    </html>
  );
}
