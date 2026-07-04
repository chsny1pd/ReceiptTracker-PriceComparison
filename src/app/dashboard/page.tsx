import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const actions = [
  {
    title: "Log a receipt",
    description: "Capture store, date, line items, units, and optional image.",
    href: "/receipts/new",
  },
  {
    title: "Compare prices",
    description: "Compare latest normalized unit prices across two stores.",
    href: "/compare",
  },
  {
    title: "Check balances",
    description: "See netted who-owes-whom balances from unsettled splits.",
    href: "/balances",
  },
];

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-slate-300 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">
              Spendly
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Receipt workspace
            </h1>
          </div>
          <p className="text-sm text-slate-600">{user.email}</p>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-lg border border-slate-300 bg-white p-5 transition hover:border-emerald-500"
            >
              <h2 className="text-lg font-semibold">{action.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {action.description}
              </p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
