export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

export function hasSupabaseEnv() {
  return (
    hasEnv("NEXT_PUBLIC_SUPABASE_URL") &&
    hasEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}

export function hasR2Env() {
  return (
    hasEnv("CLOUDFLARE_R2_ACCOUNT_ID") &&
    hasEnv("CLOUDFLARE_R2_ACCESS_KEY_ID") &&
    hasEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY") &&
    hasEnv("CLOUDFLARE_R2_BUCKET")
  );
}

export function getSupabaseEnv() {
  return {
    url: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getR2Env() {
  const accountId = getRequiredEnv("CLOUDFLARE_R2_ACCOUNT_ID");

  return {
    accountId,
    accessKeyId: getRequiredEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
    secretAccessKey: getRequiredEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
    bucket: getRequiredEnv("CLOUDFLARE_R2_BUCKET"),
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  };
}
