import { PageHeader } from "@/components/page-header";
import {
  BalancesOverview,
  UnsettledSharesPanel,
} from "@/components/balances/balances-panels";
import { getRequiredUser } from "@/lib/auth";
import { getServerI18n } from "@/lib/server-preferences";
import { profileLabel } from "@/lib/supabase-helpers";
import type {
  BalanceRow,
  ProfileOption,
  ReceiptSplitSummary,
  UnsettledShareRow,
} from "@/lib/types";

type RawShareRow = {
  id: string;
  split_id: string;
  owed_amount: number | string;
  share_status: UnsettledShareRow["share_status"];
  latest_payment_proof_id: string | null;
  participant_user_id: string;
  expense_splits:
    | {
        payer_user_id: string;
        receipt_id: string;
      }
    | {
        payer_user_id: string;
        receipt_id: string;
      }[]
    | null;
};

type RawSplitSummary = ReceiptSplitSummary & {
  payer_user_id: string;
};

export default async function SplitsPage() {
  const { supabase, user } = await getRequiredUser();
  const { dict } = await getServerI18n();

  const [{ data: balances }, { data: rawShares }, { data: rawSplits }] =
    await Promise.all([
      supabase.rpc("get_current_balances"),
      supabase
        .from("expense_split_shares")
        .select(
          "id, split_id, owed_amount, share_status, latest_payment_proof_id, participant_user_id, expense_splits(payer_user_id, receipt_id)",
        )
        .in("share_status", ["unpaid", "submitted", "rejected"])
        .order("created_at", { ascending: false }),
      supabase
        .from("expense_splits")
        .select("id, split_method, total_amount, created_at, receipt_item_id, payer_user_id")
        .or(`payer_user_id.eq.${user.id},created_by_user_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const profileIds = new Set<string>();
  for (const balance of ((balances ?? []) as BalanceRow[])) {
    profileIds.add(balance.debtor_user_id);
    profileIds.add(balance.creditor_user_id);
  }

  for (const share of (rawShares ?? []) as RawShareRow[]) {
    profileIds.add(share.participant_user_id);
    const split = Array.isArray(share.expense_splits)
      ? share.expense_splits[0]
      : share.expense_splits;
    if (split) {
      profileIds.add(split.payer_user_id);
    }
  }

  const { data: profiles } =
    profileIds.size > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, github_username")
          .in("id", [...profileIds])
      : { data: [] };

  const profileMap = new Map(
    ((profiles ?? []) as ProfileOption[]).map((profile) => [
      profile.id,
      {
        display_name: profile.display_name,
        github_username: profile.github_username,
      },
    ]),
  );

  const unsettledShares: UnsettledShareRow[] = ((rawShares ?? []) as RawShareRow[])
    .map((share) => {
      const split = Array.isArray(share.expense_splits)
        ? share.expense_splits[0]
        : share.expense_splits;
      if (!split) {
        return null;
      }

      const participant = profileMap.get(share.participant_user_id);
      const payer = profileMap.get(split.payer_user_id);

      return {
        id: share.id,
        split_id: share.split_id,
        owed_amount: Number(share.owed_amount),
        share_status: share.share_status,
        participant_user_id: share.participant_user_id,
        participant_display_name: participant?.display_name ?? null,
        participant_github_username: participant?.github_username ?? null,
        payer_user_id: split.payer_user_id,
        payer_display_name: payer?.display_name ?? null,
        payer_github_username: payer?.github_username ?? null,
        receipt_id: split.receipt_id,
      };
    })
    .filter((share): share is UnsettledShareRow => share !== null);

  const actionQueueShares = unsettledShares.filter((share) => {
    if (share.participant_user_id === user.id) {
      return share.share_status === "unpaid" || share.share_status === "rejected";
    }

    if (share.payer_user_id === user.id) {
      return share.share_status === "submitted";
    }

    return false;
  });

  const openSplits = (rawSplits ?? []) as RawSplitSummary[];

  return (
    <>
      <PageHeader
        title={dict.splits.title}
        description={dict.splits.description}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-slate-300 bg-white p-5">
          <p className="text-sm text-slate-500">{dict.splits.openBalances}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {(balances ?? []).length}
          </p>
        </article>
        <article className="rounded-lg border border-slate-300 bg-white p-5">
          <p className="text-sm text-slate-500">{dict.splits.yourPaymentsToSend}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {
              actionQueueShares.filter(
                (share) => share.participant_user_id === user.id,
              ).length
            }
          </p>
        </article>
        <article className="rounded-lg border border-slate-300 bg-white p-5">
          <p className="text-sm text-slate-500">{dict.splits.yourProofReviews}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {
              actionQueueShares.filter((share) => share.payer_user_id === user.id)
                .length
            }
          </p>
        </article>
        <article className="rounded-lg border border-slate-300 bg-white p-5">
          <p className="text-sm text-slate-500">{dict.splits.recentSplits}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{openSplits.length}</p>
        </article>
      </section>

      <section id="balances" className="mt-8 scroll-mt-24">
        <h2 className="mb-4 text-lg font-semibold">{dict.splits.nettedBalances}</h2>
        <BalancesOverview
          balances={(balances ?? []) as BalanceRow[]}
          currentUserId={user.id}
          profileMap={profileMap}
          dict={dict}
        />
      </section>

      <section id="action-queue" className="mt-8 scroll-mt-24">
        <h2 className="mb-4 text-lg font-semibold">{dict.splits.actionQueue}</h2>
        <UnsettledSharesPanel
          shares={actionQueueShares}
          currentUserId={user.id}
          dict={dict}
        />
      </section>

      <section className="mt-8 rounded-lg border border-slate-300 bg-white p-5">
        <h2 className="text-lg font-semibold">{dict.splits.recentSplitRecords}</h2>
        {openSplits.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            {dict.splits.noSplitRecords}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200">
            {openSplits.map((split) => {
              const payer = profileMap.get(split.payer_user_id);
              return (
                <li
                  key={split.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium capitalize">
                      {split.split_method} {dict.receipts.splitRecordLabel}
                    </p>
                    <p className="text-sm text-slate-600">
                      {profileLabel(
                        payer?.display_name ?? null,
                        payer?.github_username ?? null,
                        split.payer_user_id,
                      )}{" "}
                      · {split.receipt_item_id ? dict.splits.lineItem : dict.splits.wholeReceipt}
                    </p>
                  </div>
                  <a href={`/splits/${split.id}`} className="text-sm font-medium text-emerald-700">
                    {dict.splits.openSplit}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
