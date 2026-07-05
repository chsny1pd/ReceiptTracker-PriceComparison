import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getOptionalUserContext, getUserWithRole } from "@/lib/auth";
import { profileLabel } from "@/lib/supabase-helpers";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { supabase, user } = await getOptionalUserContext();

  if (!user) {
    redirect("/login");
  }

  const { role } = await getUserWithRole();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, github_username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const avatarUrl =
    profile?.avatar_url ??
    (typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null);

  const displayName = profileLabel(
    profile?.display_name,
    profile?.github_username,
    user.email ?? "Signed in",
  );

  return (
    <AppShell avatarUrl={avatarUrl} displayName={displayName} role={role}>
      {children}
    </AppShell>
  );
}
