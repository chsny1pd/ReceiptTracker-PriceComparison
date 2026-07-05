import { cache } from "react";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canAccessAdminArea, isAdminRole } from "@/lib/rbac";
import type { SpendlyUserRole } from "@/lib/types";

export { canAccessAdminArea, isAdminRole };

export const getOptionalUserContext = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
});

export const getUserWithRole = cache(async () => {
  const { supabase, user } = await getOptionalUserContext();

  if (!user) {
    return { supabase, user: null, role: null as SpendlyUserRole | null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role ?? "user") as SpendlyUserRole;

  return { supabase, user, role };
});

export async function getRequiredUser() {
  const { supabase, user } = await getOptionalUserContext();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function requireRole(...roles: SpendlyUserRole[]) {
  const context = await getUserWithRole();

  if (!context.user) {
    redirect("/login");
  }

  if (!context.role || !roles.includes(context.role)) {
    redirect("/dashboard?error=forbidden");
  }

  return context;
}
