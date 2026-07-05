import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { receiptLabel } from "@/lib/receipt-label";
import { getServerI18n } from "@/lib/server-preferences";
import { profileLabel, relationName } from "@/lib/supabase-helpers";
import type { AdminReceiptRow } from "@/lib/types";

export default async function AdminReportsPage() {
  const { supabase } = await requireRole("staff", "admin");
  const { dict } = await getServerI18n();

  const { data: receipts, error } = await supabase
    .from("receipts")
    .select(
      "id, title, purchased_at, total, owner_user_id, stores(name), owner:profiles!receipts_owner_user_id_fkey(display_name, github_username)",
    )
    .order("purchased_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (receipts ?? []) as unknown as AdminReceiptRow[];

  return (
    <>
      <PageHeader
        title={dict.admin.reportsTitle}
        description={dict.admin.reportsDescription}
        backHref="/admin"
        backLabel={dict.admin.backToAdmin}
      />
      <div className="overflow-x-auto rounded-2xl border border-slate-300 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">{dict.admin.receiptColumn}</th>
              <th className="px-4 py-3">{dict.admin.ownerColumn}</th>
              <th className="px-4 py-3">{dict.admin.storeColumn}</th>
              <th className="px-4 py-3">{dict.admin.dateColumn}</th>
              <th className="px-4 py-3">{dict.admin.totalColumn}</th>
              <th className="px-4 py-3">{dict.common.view}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  {dict.admin.reportsEmpty}
                </td>
              </tr>
            ) : (
              rows.map((receipt) => {
                const ownerLabel = profileLabel(
                  receipt.owner?.display_name ?? null,
                  receipt.owner?.github_username ?? null,
                  receipt.owner_user_id,
                );

                return (
                  <tr key={receipt.id}>
                    <td className="px-4 py-3 font-medium text-slate-950">
                      {receiptLabel(receipt, dict.receipts.receiptTitleFallback)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ownerLabel}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {relationName(receipt.stores, "—")}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(receipt.purchased_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-950">
                      {formatMoney(receipt.total)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/receipts/${receipt.id}`}
                        className="font-medium text-emerald-700 hover:text-emerald-800"
                      >
                        {dict.common.open}
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-slate-600">
        {dict.admin.reportsFootnote}
      </p>
    </>
  );
}
