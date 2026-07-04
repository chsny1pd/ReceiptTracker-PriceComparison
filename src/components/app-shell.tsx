"use client";

import Link from "next/link";

import { useAppPreferences } from "@/components/app-preferences-provider";

const navItems = [
  { href: "/dashboard", key: "dashboard" as const },
  { href: "/compare", key: "compare" as const },
  { href: "/receipts", key: "receipts" as const },
  { href: "/splits", key: "splits" as const },
  { href: "/settings", key: "settings" as const },
];

type AppShellProps = {
  children: React.ReactNode;
  avatarUrl: string | null;
  displayName: string;
};

export function AppShell({ children, avatarUrl, displayName }: AppShellProps) {
  const { dict, locale, setLocale, theme, setTheme } = useAppPreferences();
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 transition-colors">
      <header className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
            <Link
              href="/dashboard"
              className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700"
            >
              Spendly
            </Link>
            <nav className="flex flex-wrap gap-1 sm:gap-2" aria-label="Main">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  {dict.nav[item.key]}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="grid gap-1 text-xs text-slate-500">
              <span>{dict.nav.theme}</span>
              <select
                value={theme}
                onChange={(event) =>
                  setTheme(event.target.value as "system" | "light" | "dark")
                }
                className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-700"
              >
                <option value="system">{dict.nav.system}</option>
                <option value="light">{dict.nav.light}</option>
                <option value="dark">{dict.nav.dark}</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs text-slate-500">
              <span>{dict.nav.language}</span>
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value as "en" | "th")}
                className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-700"
              >
                <option value="en">EN</option>
                <option value="th">TH</option>
              </select>
            </label>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-9 w-9 rounded-full border border-slate-300 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xs font-semibold text-slate-600"
                aria-label={displayName}
                title={displayName}
              >
                {initials || "?"}
              </span>
            )}
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium transition hover:border-slate-500"
              >
                {dict.nav.signOut}
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}
