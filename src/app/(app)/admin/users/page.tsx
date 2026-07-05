import { UserRoleSelect } from "@/components/admin/user-role-select";
import { PageHeader } from "@/components/page-header";
import { getRequiredUser, requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getServerI18n } from "@/lib/server-preferences";
import { profileLabel } from "@/lib/supabase-helpers";
import type { AdminProfileRow } from "@/lib/types";

export default async function AdminUsersPage() {
  await requireRole("admin");
  const { supabase, user } = await getRequiredUser();
  const { dict } = await getServerI18n();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, github_username, display_name, role, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (profiles ?? []) as AdminProfileRow[];

  return (
    <>
      <PageHeader
        title={dict.admin.usersTitle}
        description={dict.admin.usersDescription}
        backHref="/admin"
        backLabel={dict.admin.backToAdmin}
      />
      <div className="overflow-x-auto rounded-2xl border border-slate-300 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">{dict.admin.userColumn}</th>
              <th className="px-4 py-3">{dict.admin.githubColumn}</th>
              <th className="px-4 py-3">{dict.admin.joinedColumn}</th>
              <th className="px-4 py-3">{dict.admin.roleColumn}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((profile) => {
              const label = profileLabel(
                profile.display_name,
                profile.github_username,
                profile.id,
              );
              const isSelf = profile.id === user.id;

              return (
                <tr key={profile.id}>
                  <td className="px-4 py-3 font-medium text-slate-950">
                    {label}
                    {isSelf ? (
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        ({dict.admin.youLabel})
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {profile.github_username ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(profile.created_at.slice(0, 10))}
                  </td>
                  <td className="px-4 py-3">
                    <UserRoleSelect
                      userId={profile.id}
                      currentRole={profile.role}
                      disabled={isSelf}
                      labels={dict.admin.roles}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-slate-600">{dict.admin.usersFootnote}</p>
    </>
  );
}
