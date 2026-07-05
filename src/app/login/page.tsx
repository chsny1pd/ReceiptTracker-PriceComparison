import Link from "next/link";

import { getServerI18n } from "@/lib/server-preferences";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const { dict } = await getServerI18n();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
          Spendly
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          {dict.auth.signInTitle}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          {dict.auth.signInBody}
        </p>

        {params.error === "oauth" ? (
          <p className="mt-6 rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {dict.auth.oauthError}
          </p>
        ) : null}

        <Link
          href="/auth/sign-in"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-emerald-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          {dict.auth.signInCta}
        </Link>
      </div>
    </main>
  );
}
