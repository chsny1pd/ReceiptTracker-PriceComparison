export const dynamic = "force-dynamic";

import Link from "next/link";

import { SetupPanel } from "@/components/setup-panel";
import { getHealthStatus } from "@/lib/health";

export default async function SetupPage() {
  const status = await getHealthStatus();

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          Back to home
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Service setup
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Verify Supabase and Cloudflare R2 before signing in and logging
          receipts.
        </p>
        <div className="mt-8">
          <SetupPanel initialStatus={status} />
        </div>
      </div>
    </main>
  );
}
