import { PageHeader } from "@/components/page-header";
import { getRequiredUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import type { BalanceRow } from "@/lib/types";

export default async function BalancesPage() {
  const { supabase } = await getRequiredUser();

  const { data, error } = await supabase.rpc("get_current_balances");
  const balances = (data ?? []) as BalanceRow[];

  return (
    <>
      <PageHeader
        title="Balances"
        description="Netted unsettled balances from receipt splits. Zero-net pairs are hidden."
      />

      {error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </p>
      ) : null}

      {balances.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">
            No unsettled balances yet. Create a split from a receipt to see
            netted balances here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium">Debtor</th>
                <th className="px-4 py-3 font-medium">Creditor</th>
                <th className="px-4 py-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((balance) => (
                <tr
                  key={`${balance.debtor_user_id}-${balance.creditor_user_id}`}
                  className="border-b border-slate-100"
                >
                  <td className="px-4 py-3">
                    {balance.debtor_display_name ?? balance.debtor_user_id}
                  </td>
                  <td className="px-4 py-3">
                    {balance.creditor_display_name ?? balance.creditor_user_id}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatMoney(Number(balance.amount))}
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
