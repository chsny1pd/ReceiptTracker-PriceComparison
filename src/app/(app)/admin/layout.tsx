import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { getServerI18n } from "@/lib/server-preferences";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { role } = await requireRole("staff", "admin");
  const { dict } = await getServerI18n();

  return (
    <div className="space-y-6">
      <nav
        aria-label={dict.admin.navLabel}
        className="flex flex-wrap gap-2 border-b border-slate-300 pb-4"
      >
        <Link
          href="/admin"
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
        >
          {dict.admin.overview}
        </Link>
        <Link
          href="/admin/reports"
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
        >
          {dict.admin.reports}
        </Link>
        {role === "admin" ? (
          <Link
            href="/admin/users"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          >
            {dict.admin.users}
          </Link>
        ) : null}
      </nav>
      {children}
    </div>
  );
}
