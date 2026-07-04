import { cache } from "react";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const getOptionalUserContext = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
});

export async function getRequiredUser() {
  const { supabase, user } = await getOptionalUserContext();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}
