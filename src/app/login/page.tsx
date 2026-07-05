import { GitHubIcon, GoogleIcon } from "@/components/auth/oauth-icons";
import { OAuthSignInButton } from "@/components/auth/oauth-sign-in-button";
import { getServerI18n } from "@/lib/server-preferences";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const { dict } = await getServerI18n();

  return (
    <main data-page="login" className="min-h-screen px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <div className="login-card rounded-2xl border p-8">
          <p className="login-brand text-sm font-medium uppercase tracking-[0.2em]">
            Spendly
          </p>
          <h1 className="login-heading mt-4 text-4xl font-semibold tracking-tight">
            {dict.auth.signInTitle}
          </h1>
          <p className="login-body mt-4 text-base leading-7">
            {dict.auth.signInBody}
          </p>

          {params.error === "oauth" ? (
            <p className="login-error mt-6 rounded-lg border px-4 py-3 text-sm">
              {dict.auth.oauthError}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3">
            <OAuthSignInButton
              href="/auth/sign-in"
              label={dict.auth.signInCta}
              icon={<GitHubIcon />}
            />
            <OAuthSignInButton
              href="/auth/sign-in/google"
              label={dict.auth.signInGoogleCta}
              icon={<GoogleIcon />}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
