import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/receipts", label: "Receipts" },
  { href: "/compare", label: "Compare" },
  { href: "/balances", label: "Balances" },
];

type AppShellProps = {
  children: React.ReactNode;
  avatarUrl: string | null;
  displayName: string;
};

export function AppShell({ children, avatarUrl, displayName }: AppShellProps) {
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
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
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
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
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}
