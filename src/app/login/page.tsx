import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
          Spendly
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Sign in to track receipts and split grocery runs.
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-300">
          GitHub OAuth is handled by Supabase Auth. Receipt images stay in
          Cloudflare R2, and Spendly stores only object keys in Postgres.
        </p>
        <Link
          href="/auth/sign-in"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-emerald-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          Continue with GitHub
        </Link>
      </div>
    </main>
  );
}
