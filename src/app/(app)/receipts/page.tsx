import Link from "next/link";

import { deleteReceiptDraft } from "@/app/actions/drafts";
import { PageHeader } from "@/components/page-header";
import { getRequiredUser } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { getServerI18n } from "@/lib/server-preferences";
import { relationName } from "@/lib/supabase-helpers";

export default async function ReceiptsPage() {
  const { supabase, user } = await getRequiredUser();
  const { dict } = await getServerI18n();

  const [{ data: receipts, error }, { data: drafts }] = await Promise.all([
    supabase
      .from("receipts")
      .select("id, purchased_at, total, stores(name)")
      .eq("owner_user_id", user.id)
      .order("purchased_at", { ascending: false }),
    supabase
      .from("receipt_drafts")
      .select("id, title, updated_at")
      .eq("owner_user_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader
        title={dict.receipts.title}
        description={dict.receipts.description}
        action={
          <Link
            href="/receipts/new"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white"
          >
            {dict.common.newReceipt}
          </Link>
        }
      />

      <section className="mb-8 rounded-lg border border-slate-300 bg-white p-5">
        <h2 className="text-lg font-semibold">{dict.receipts.draftsTitle}</h2>
        <p className="mt-1 text-sm text-slate-600">
          Resume saved work from any signed-in device.
        </p>
        {!drafts || drafts.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">{dict.receipts.noDrafts}</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200">
            {drafts.map((draft) => (
              <li
                key={draft.id}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{draft.title ?? "Draft receipt"}</p>
                  <p className="text-sm text-slate-600">
                    Updated {formatDate(draft.updated_at.slice(0, 10))}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/receipts/new?draft=${draft.id}`}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-emerald-300 px-4 text-sm font-medium text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-50"
                  >
                    {dict.receipts.continueDraft}
                  </Link>
                  <form action={deleteReceiptDraft}>
                    <input type="hidden" name="draftId" value={draft.id} />
                    <button
                      type="submit"
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-600 transition hover:border-red-300 hover:text-red-600"
                    >
                      {dict.receipts.discardDraft}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </p>
      ) : null}

      {!receipts || receipts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">{dict.receipts.noReceipts}</p>
          <Link
            href="/receipts/new"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white"
          >
            {dict.receipts.createFirst}
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
