import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { profileLabel } from "@/lib/supabase-helpers";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
    <AppShell avatarUrl={avatarUrl} displayName={displayName}>
      {children}
    </AppShell>
  );
}
