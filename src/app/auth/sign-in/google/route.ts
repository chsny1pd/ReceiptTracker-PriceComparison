import { NextResponse, type NextRequest } from "next/server";

import { startOAuthSignIn } from "@/lib/oauth-sign-in";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const origin = new URL(request.url).origin;

  const { data, error } = await startOAuthSignIn(supabase, "google", origin);

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  return NextResponse.redirect(data.url);
}
