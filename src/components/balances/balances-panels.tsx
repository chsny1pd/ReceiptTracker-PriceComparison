import Link from "next/link";

import { formatMoney } from "@/lib/format";
import { profileLabel } from "@/lib/supabase-helpers";
import type { BalanceRow, UnsettledShareRow } from "@/lib/types";

type BalancesOverviewProps = {
  balances: BalanceRow[];
  currentUserId: string;
  profileMap: Map<
    string,
    { display_name: string | null; github_username: string | null }
  >;
};

function nettedBalanceLabel(
  balance: BalanceRow,
  currentUserId: string,
  profileMap: BalancesOverviewProps["profileMap"],
) {
  const debtorProfile = profileMap.get(balance.debtor_user_id);
  const creditorProfile = profileMap.get(balance.creditor_user_id);
  const debtorName = profileLabel(
    balance.debtor_display_name ?? debtorProfile?.display_name,
    debtorProfile?.github_username,
    balance.debtor_user_id,
  );
  const creditorName = profileLabel(
    balance.creditor_display_name ?? creditorProfile?.display_name,
    creditorProfile?.github_username,
    balance.creditor_user_id,
  );

  if (balance.debtor_user_id === currentUserId) {
    return {
      text: `You owe ${creditorName}`,
      tone: "owe" as const,
    };
  }

  if (balance.creditor_user_id === currentUserId) {
    return {
      text: `${debtorName} owes you`,
      tone: "owed" as const,
    };
  }

  return {
    text: `${debtorName} owes ${creditorName}`,
    tone: "neutral" as const,
  };
}

export function BalancesOverview({
  balances,
  currentUserId,
  profileMap,
}: BalancesOverviewProps) {
  if (balances.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-600">No unsettled netted balances.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {balances.map((balance) => {
        const label = nettedBalanceLabel(balance, currentUserId, profileMap);

        return (
          <article
            key={`${balance.debtor_user_id}-${balance.creditor_user_id}`}
            className="rounded-lg border border-slate-300 bg-white p-5"
          >
            <p
              className={
                label.tone === "owe"
                  ? "text-sm font-medium text-amber-700"
                  : label.tone === "owed"
                    ? "text-sm font-medium text-emerald-700"
                    : "text-sm font-medium text-slate-600"
              }
            >
              {label.text}
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {formatMoney(Number(balance.amount))}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Netted from unsettled split shares. Opposing debts between the same
              pair collapse into one row.
            </p>
          </article>
        );
      })}
    </div>
  );
}

type UnsettledSharesPanelProps = {
  shares: UnsettledShareRow[];
  currentUserId: string;
};

function shareStatusSummary(status: UnsettledShareRow["share_status"]) {
  switch (status) {
    case "submitted":
      return {
        label: "Payment proof submitted",
        tone: "text-sky-700",
      };
    case "rejected":
      return {
        label: "Proof rejected",
        tone: "text-red-700",
      };
    default:
      return {
        label: "Awaiting payment",
        tone: "text-amber-700",
      };
  }
}

export function UnsettledSharesPanel({
  shares,
  currentUserId,
}: UnsettledSharesPanelProps) {
  if (shares.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-600">
          No individual unsettled shares left to settle.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">
          Unsettled split shares with settlement actions
        </caption>
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Summary
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Amount
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Split
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {shares.map((share) => {
            const participantName = profileLabel(
              share.participant_display_name,
              share.participant_github_username,
              share.participant_user_id,
            );
            const payerName = profileLabel(
              share.payer_display_name,
              share.payer_github_username,
              share.payer_user_id,
            );
            const status = shareStatusSummary(share.share_status);

            return (
              <tr key={share.id} className="border-b border-slate-100">
                <td className="px-4 py-3">
                  {share.participant_user_id === currentUserId ? (
                    <p>
                      You owe <span className="font-medium">{payerName}</span>
                    </p>
                  ) : share.payer_user_id === currentUserId ? (
                    <p>
                      <span className="font-medium">{participantName}</span> owes
                      you
                    </p>
                  ) : (
                    <p>
                      {participantName} owes {payerName}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {formatMoney(Number(share.owed_amount))}
                </td>
                <td className="px-4 py-3">
                  <p className={`text-sm font-medium ${status.tone}`}>{status.label}</p>
                  <Link
                    href={`/splits/${share.split_id}`}
                    className="mt-1 inline-flex font-medium text-emerald-700"
                  >
                    Open split
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {share.participant_user_id === currentUserId ? (
                    <span className="text-sm text-slate-600">Submit proof in split</span>
                  ) : share.payer_user_id === currentUserId ? (
                    <span className="text-sm text-slate-600">Review in split</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
