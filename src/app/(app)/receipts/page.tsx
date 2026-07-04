import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { getRequiredUser } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { relationName } from "@/lib/supabase-helpers";

export default async function ReceiptsPage() {
  const { supabase, user } = await getRequiredUser();

  const { data: receipts, error } = await supabase
    .from("receipts")
    .select("id, purchased_at, total, stores(name)")
    .eq("owner_user_id", user.id)
    .order("purchased_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Receipts"
        description="All receipts you have logged with normalized line items."
        action={
          <Link
            href="/receipts/new"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white"
          >
            New receipt
          </Link>
        }
      />

      {error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </p>
      ) : null}

      {!receipts || receipts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">No receipts yet.</p>
          <Link
            href="/receipts/new"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white"
          >
            Create your first receipt
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium">Store</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((receipt) => (
                <tr key={receipt.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    {relationName(receipt.stores, "Unknown store")}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatDate(receipt.purchased_at)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatMoney(Number(receipt.total))}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/receipts/${receipt.id}`}
                      className="font-medium text-emerald-700"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
