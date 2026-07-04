import { PageHeader } from "@/components/page-header";
import {
  BalancesOverview,
  UnsettledSharesPanel,
} from "@/components/balances/balances-panels";
import { getRequiredUser } from "@/lib/auth";
import type { BalanceRow, ProfileOption, UnsettledShareRow } from "@/lib/types";

type RawUnsettledShare = {
  id: string;
  split_id: string;
  owed_amount: number;
  participant_user_id: string;
  expense_splits: {
    id: string;
    payer_user_id: string;
    receipt_id: string;
  } | {
    id: string;
    payer_user_id: string;
    receipt_id: string;
  }[] | null;
};

export default async function BalancesPage() {
  const { supabase, user } = await getRequiredUser();

  const [{ data: balances, error }, { data: rawShares, error: sharesError }] =
    await Promise.all([
      supabase.rpc("get_current_balances"),
      supabase
        .from("expense_split_shares")
        .select(
          "id, split_id, owed_amount, participant_user_id, expense_splits(id, payer_user_id, receipt_id)",
        )
        .is("settled_at", null)
        .order("created_at", { ascending: false }),
    ]);

  const balanceRows = (balances ?? []) as BalanceRow[];

  const profileIds = new Set<string>();
  for (const balance of balanceRows) {
    profileIds.add(balance.debtor_user_id);
    profileIds.add(balance.creditor_user_id);
  }

  for (const share of (rawShares ?? []) as RawUnsettledShare[]) {
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

  const unsettledShares: UnsettledShareRow[] = ((rawShares ?? []) as RawUnsettledShare[])
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

  const hasAnyActivity = balanceRows.length > 0 || unsettledShares.length > 0;

  return (
    <>
      <PageHeader
        title="Balances"
        description="Netted unsettled balances from receipt splits. Zero-net pairs are hidden automatically."
      />

      {error ? (
        <p className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </p>
      ) : null}

      {sharesError ? (
        <p className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {sharesError.message}
        </p>
      ) : null}

      {!hasAnyActivity ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">
            No unsettled balances yet. Create a split from a receipt to see
            netted balances here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-lg font-semibold">Netted balances</h2>
            <BalancesOverview
              balances={balanceRows}
              currentUserId={user.id}
              profileMap={profileMap}
            />
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">Unsettled shares</h2>
            <p className="mb-4 text-sm text-slate-600">
              Mark individual shares settled after payment. Netted balances above
              update automatically.
            </p>
            <UnsettledSharesPanel
              shares={unsettledShares}
              currentUserId={user.id}
            />
          </section>
        </div>
      )}
    </>
  );
}
