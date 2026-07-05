import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/env";
import type { SpendlyUserRole } from "@/lib/types";

type SessionUpdateResult = {
  response: NextResponse;
  userId: string | null;
  role: SpendlyUserRole | null;
};

export async function updateSession(
  request: NextRequest,
): Promise<SessionUpdateResult> {
  const { url, anonKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });
  let userId: string | null = null;
  let role: SpendlyUserRole | null = null;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    userId = user.id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    role = (profile?.role ?? "user") as SpendlyUserRole;
  }

  return { response, userId, role };
}

export function enforceAdminRouteAccess(
  request: NextRequest,
  userId: string | null,
  role: SpendlyUserRole | null,
) {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith("/admin")) {
    return null;
  }

  if (!userId) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (role !== "staff" && role !== "admin") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.searchParams.set("error", "forbidden");
    return NextResponse.redirect(dashboardUrl);
  }

  if (pathname.startsWith("/admin/users") && role !== "admin") {
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = "/admin";
    adminUrl.searchParams.set("error", "forbidden");
    return NextResponse.redirect(adminUrl);
  }

  return null;
}
