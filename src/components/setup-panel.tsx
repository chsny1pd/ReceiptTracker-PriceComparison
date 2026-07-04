"use client";

import { setupStatusLabel, type ServiceStatus } from "@/components/setup-status";

type SetupPanelProps = {
  initialStatus: {
    supabase: ServiceStatus;
    r2: ServiceStatus;
    details: {
      supabase: string;
      r2: string;
    };
  };
};

export function SetupPanel({ initialStatus }: SetupPanelProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-300 bg-white p-5">
        <h2 className="text-lg font-semibold">Service status</h2>
        <dl className="mt-4 space-y-4">
          <div>
            <dt className="text-sm font-medium text-slate-600">Supabase</dt>
            <dd className="mt-1 text-base font-semibold">
              {setupStatusLabel(initialStatus.supabase)}
            </dd>
            <dd className="mt-1 text-sm text-slate-600">
              {initialStatus.details.supabase}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-600">Cloudflare R2</dt>
            <dd className="mt-1 text-base font-semibold">
              {setupStatusLabel(initialStatus.r2)}
            </dd>
            <dd className="mt-1 text-sm text-slate-600">
              {initialStatus.details.r2}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-slate-300 bg-white p-5">
        <h2 className="text-lg font-semibold">Setup checklist</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-700">
          <li>Create a Supabase project and enable GitHub OAuth.</li>
          <li>
            Add callback URL{" "}
            <code className="rounded bg-slate-100 px-1">
              http://localhost:3000/auth/callback
            </code>
            .
          </li>
          <li>Run `supabase/schema.sql` in the Supabase SQL editor.</li>
          <li>Copy `.env.example` to `.env.local` and fill Supabase keys.</li>
          <li>Create a private R2 bucket and API token with read/write access.</li>
          <li>
            Configure R2 CORS for `GET` and `PUT` from your local and production
            origins.
          </li>
          <li>Restart `npm run dev` after updating environment variables.</li>
        </ol>
      </section>
    </div>
  );
}
