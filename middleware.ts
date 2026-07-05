import type { NextRequest } from "next/server";

import {
  enforceAdminRouteAccess,
  updateSession,
} from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, userId, role } = await updateSession(request);
  const accessResponse = enforceAdminRouteAccess(request, userId, role);

  return accessResponse ?? response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
