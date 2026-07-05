import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { getUserWithRole } from "@/lib/auth";
import { getServerI18n } from "@/lib/server-preferences";

export default async function AdminOverviewPage() {
  const { role } = await getUserWithRole();
  const { dict } = await getServerI18n();

  return (
    <>
      <PageHeader
        title={dict.admin.title}
        description={dict.admin.description}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            {dict.admin.currentRoleTitle}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {dict.admin.currentRoleDescription}
          </p>
          <p className="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
            {dict.admin.roles[role ?? "user"]}
          </p>
        </section>
        <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            {dict.admin.quickLinksTitle}
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link
                href="/admin/reports"
                className="font-medium text-emerald-700 hover:text-emerald-800"
              >
                {dict.admin.reportsLink}
              </Link>
            </li>
            {role === "admin" ? (
              <li>
                <Link
                  href="/admin/users"
                  className="font-medium text-emerald-700 hover:text-emerald-800"
                >
                  {dict.admin.usersLink}
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </>
  );
}
