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

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${
        theme === "dark" ? "dark" : ""
      }`}
    >
      <body className="min-h-full flex flex-col">
        <AppPreferencesProvider initialLocale={locale} initialTheme={theme}>
          {children}
        </AppPreferencesProvider>
      </body>
    </html>
  );
}
