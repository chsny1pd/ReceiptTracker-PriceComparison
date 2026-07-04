import { hasR2Env, hasSupabaseEnv } from "@/lib/env";
import { checkR2Connection } from "@/lib/r2";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ServiceStatus = "ok" | "missing" | "error";

export type HealthStatus = {
  supabase: ServiceStatus;
  r2: ServiceStatus;
  details: {
    supabase: string;
    r2: string;
  };
};

export async function getHealthStatus(): Promise<HealthStatus> {
  const status: HealthStatus = {
    supabase: "missing",
    r2: "missing",
    details: {
      supabase: "",
      r2: "",
    },
  };

  if (hasSupabaseEnv()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.from("profiles").select("id").limit(1);
      status.supabase = error ? "error" : "ok";
      status.details.supabase = error?.message ?? "Connected to Supabase.";
    } catch (error) {
      status.supabase = "error";
      status.details.supabase =
        error instanceof Error ? error.message : "Supabase check failed.";
    }
  } else {
    status.details.supabase =
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  }

  if (hasR2Env()) {
    try {
      await checkR2Connection();
      status.r2 = "ok";
      status.details.r2 = "Connected to Cloudflare R2 bucket.";
    } catch (error) {
      status.r2 = "error";
      status.details.r2 =
        error instanceof Error ? error.message : "R2 check failed.";
    }
  } else {
    status.details.r2 =
      "Set CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, and CLOUDFLARE_R2_BUCKET.";
  }

  return status;
}
