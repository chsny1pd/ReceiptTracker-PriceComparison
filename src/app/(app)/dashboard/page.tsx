import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { getRequiredUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { relationName } from "@/lib/supabase-helpers";

const actions = [
  {
    title: "Log a receipt",
    description: "Capture store, date, line items, units, and optional image.",
    href: "/receipts/new",
  },
  {
    title: "Compare prices",
    description: "See which store is cheaper for a product from your receipts.",
    href: "/compare",
  },
  {
    title: "Check balances",
    description: "See netted who-owes-whom balances from unsettled splits.",
    href: "/balances",
  },
  {
    title: "Service setup",
    description: "Verify Supabase and Cloudflare R2 connection status.",
    href: "/setup",
  },
];

export default async function DashboardPage() {
  const { supabase, user } = await getRequiredUser();

  const { count: receiptCount } = await supabase
    .from("receipts")
    .select("*", { count: "exact", head: true })
    .eq("owner_user_id", user.id);

  const { data: recentReceipts } = await supabase
    .from("receipts")
    .select("id, purchased_at, total, stores(name)")
    .eq("owner_user_id", user.id)
    .order("purchased_at", { ascending: false })
    .limit(3);

  return (
    <>
      <PageHeader
        title="Receipt workspace"
        description="Start with a receipt, then compare prices or review balances."
      />

      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <section className="rounded-lg border border-slate-300 bg-white p-5">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        <p className="mt-2 text-sm text-slate-600">
          {receiptCount ?? 0} receipt{(receiptCount ?? 0) === 1 ? "" : "s"}{" "}
          logged so far.
        </p>
        {recentReceipts && recentReceipts.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-200">
            {recentReceipts.map((receipt) => (
              <li key={receipt.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">
                    {relationName(receipt.stores, "Unknown store")}
                  </p>
                  <p className="text-sm text-slate-600">{receipt.purchased_at}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium tabular-nums">
                    {formatMoney(Number(receipt.total))}
                  </p>
                  <Link
                    href={`/receipts/${receipt.id}`}
                    className="text-sm text-emerald-700"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            No receipts yet.{" "}
            <Link href="/receipts/new" className="font-medium text-emerald-700">
              Log your first receipt
            </Link>
            .
          </p>
        )}
      </section>
    </>
  );
}
