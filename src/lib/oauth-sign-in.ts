import type { Provider, SupabaseClient } from "@supabase/supabase-js";

export const OAUTH_SIGN_IN_PROVIDERS = ["github", "google"] as const;

export type OAuthSignInProvider = (typeof OAUTH_SIGN_IN_PROVIDERS)[number];

export function isOAuthSignInProvider(
  value: string,
): value is OAuthSignInProvider {
  return OAUTH_SIGN_IN_PROVIDERS.includes(value as OAuthSignInProvider);
}

export async function startOAuthSignIn(
  supabase: SupabaseClient,
  provider: Provider,
  origin: string,
) {
  return supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });
}
