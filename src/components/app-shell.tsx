import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/receipts", label: "Receipts" },
  { href: "/compare", label: "Compare" },
  { href: "/balances", label: "Balances" },
  { href: "/setup", label: "Setup" },
];

type AppShellProps = {
  children: React.ReactNode;
  email: string;
};

export function AppShell({ children, email }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
            <Link href="/dashboard" className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Spendly
            </Link>
            <nav className="flex flex-wrap gap-2">
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
            <span className="text-sm text-slate-600">{email}</span>
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
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
