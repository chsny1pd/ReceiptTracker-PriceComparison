import Link from "next/link";

import { formatMoney } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { profileLabel } from "@/lib/supabase-helpers";
import type { BalanceRow, UnsettledShareRow } from "@/lib/types";

type BalancesOverviewProps = {
  balances: BalanceRow[];
  currentUserId: string;
  profileMap: Map<
    string,
    { display_name: string | null; github_username: string | null }
  >;
  dict: Dictionary;
};

function balanceCounterpartyName(
  balance: BalanceRow,
  currentUserId: string,
  profileMap: BalancesOverviewProps["profileMap"],
) {
  if (balance.debtor_user_id === currentUserId) {
    const creditorProfile = profileMap.get(balance.creditor_user_id);
    return profileLabel(
      balance.creditor_display_name ?? creditorProfile?.display_name,
      creditorProfile?.github_username,
      balance.creditor_user_id,
    );
  }

  const debtorProfile = profileMap.get(balance.debtor_user_id);
  return profileLabel(
    balance.debtor_display_name ?? debtorProfile?.display_name,
    debtorProfile?.github_username,
    balance.debtor_user_id,
  );
}

export function BalancesOverview({
  balances,
  currentUserId,
  profileMap,
  dict,
}: BalancesOverviewProps) {
  const youOwe = balances.filter((balance) => balance.debtor_user_id === currentUserId);
  const owedToYou = balances.filter(
    (balance) => balance.creditor_user_id === currentUserId,
  );
  const totalYouOwe = youOwe.reduce(
    (sum, balance) => sum + Number(balance.amount),
    0,
  );
  const totalOwedToYou = owedToYou.reduce(
    (sum, balance) => sum + Number(balance.amount),
    0,
  );

  if (balances.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-600">{dict.splits.noNettedBalances}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-medium text-amber-800">
            {dict.splits.youNeedToPay}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-950">
            {formatMoney(totalYouOwe)}
          </p>
          <p className="mt-2 text-sm text-amber-900/80">
            {youOwe.length === 0
              ? dict.splits.noOneToPay
              : dict.splits.paySummaryCount.replace(
                  "{count}",
                  String(youOwe.length),
                )}
          </p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-medium text-emerald-800">
            {dict.splits.youWillReceive}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-950">
            {formatMoney(totalOwedToYou)}
          </p>
          <p className="mt-2 text-sm text-emerald-900/80">
            {owedToYou.length === 0
              ? dict.splits.noIncomingBalances
              : dict.splits.receiveSummaryCount.replace(
                  "{count}",
                  String(owedToYou.length),
                )}
          </p>
        </article>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-300 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">
            {dict.splits.youNeedToPay}
          </h3>
          {youOwe.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">{dict.splits.noOneToPay}</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-200">
              {youOwe.map((balance) => (
                <li
                  key={`${balance.debtor_user_id}-${balance.creditor_user_id}`}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {balanceCounterpartyName(balance, currentUserId, profileMap)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {dict.splits.balanceExplainOwe}
                    </p>
                  </div>
                  <p className="text-lg font-semibold tabular-nums text-amber-700">
                    {formatMoney(Number(balance.amount))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-300 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">
            {dict.splits.youWillReceive}
          </h3>
          {owedToYou.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              {dict.splits.noIncomingBalances}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-200">
              {owedToYou.map((balance) => (
                <li
                  key={`${balance.debtor_user_id}-${balance.creditor_user_id}`}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {balanceCounterpartyName(balance, currentUserId, profileMap)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {dict.splits.balanceExplainReceive}
                    </p>
                  </div>
                  <p className="text-lg font-semibold tabular-nums text-emerald-700">
                    {formatMoney(Number(balance.amount))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

type UnsettledSharesPanelProps = {
  shares: UnsettledShareRow[];
  currentUserId: string;
  dict: Dictionary;
};

function shareStatusSummary(status: UnsettledShareRow["share_status"], dict: Dictionary) {
  switch (status) {
    case "submitted":
      return {
        label: dict.splits.submitted,
        tone: "text-sky-700",
      };
    case "rejected":
      return {
        label: dict.splits.proofRejected,
        tone: "text-red-700",
      };
    default:
      return {
        label: dict.splits.awaitingPayment,
        tone: "text-amber-700",
      };
  }
}

export function UnsettledSharesPanel({
  shares,
  currentUserId,
  dict,
}: UnsettledSharesPanelProps) {
  const actionableShares = shares.filter((share) => {
    if (share.participant_user_id === currentUserId) {
      return share.share_status === "unpaid" || share.share_status === "rejected";
    }

    if (share.payer_user_id === currentUserId) {
      return share.share_status === "submitted";
    }

    return false;
  });

  if (actionableShares.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-600">
          {dict.splits.noActionItems}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">
          {dict.splits.unsettledSharesCaption}
        </caption>
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              {dict.splits.yourTaskColumn}
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              {dict.splits.amount}
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              {dict.splits.splitColumn}
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              {dict.common.action}
            </th>
          </tr>
        </thead>
        <tbody>
          {actionableShares.map((share) => {
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
            const status = shareStatusSummary(share.share_status, dict);
            const paymentHref = `/splits/${share.split_id}#share-payment-${share.id}`;

            return (
              <tr key={share.id} className="border-b border-slate-100">
                <td className="px-4 py-3">
                  {share.participant_user_id === currentUserId ? (
                    <div>
                      <Link
                        href={paymentHref}
                        className="font-medium text-slate-950 hover:text-emerald-700"
                      >
                        {dict.splits.payTaskTitle.replace("{name}", payerName)}
                      </Link>
                      <p className="text-sm text-slate-600">
                        {share.share_status === "rejected"
                          ? dict.splits.reuploadProofTask
                          : dict.splits.uploadProofTask}
                      </p>
                    </div>
                  ) : share.payer_user_id === currentUserId ? (
                    <div>
                      <Link
                        href={paymentHref}
                        className="font-medium text-slate-950 hover:text-emerald-700"
                      >
                        {dict.splits.reviewTaskTitle.replace(
                          "{name}",
                          participantName,
                        )}
                      </Link>
                      <p className="text-sm text-slate-600">
                        {dict.splits.reviewUploadedSlipTask}
                      </p>
                    </div>
                  ) : (
                    <p>
                      {participantName} {dict.splits.owesGeneric} {payerName}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {formatMoney(Number(share.owed_amount))}
                </td>
                <td className="px-4 py-3">
                  <p className={`text-sm font-medium ${status.tone}`}>{status.label}</p>
                </td>
                <td className="px-4 py-3">
                  {share.participant_user_id === currentUserId ? (
                    <Link
                      href={paymentHref}
                      className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      {share.share_status === "rejected"
                        ? dict.splits.openPaymentStep
                        : dict.splits.openPaymentStep}
                    </Link>
                  ) : share.payer_user_id === currentUserId ? (
                    <Link
                      href={paymentHref}
                      className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      {dict.splits.openReviewStep}
                    </Link>
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
