import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import {
  formatSettledAt,
  SettleShareButton,
} from "@/components/splits/settle-share-button";
import { getRequiredUser } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import type { ProfileOption, SplitDetail, SplitShareDetail } from "@/lib/types";

type SplitDetailPageProps = {
  params: Promise<{ id: string }>;
};

function profileLabel(
  displayName: string | null,
  githubUsername: string | null,
  fallback: string,
) {
  return displayName ?? githubUsername ?? fallback;
}

export default async function SplitDetailPage({ params }: SplitDetailPageProps) {
  const { id } = await params;
  const { supabase, user } = await getRequiredUser();

  const { data: split, error } = await supabase
    .from("expense_splits")
    .select(
      "id, receipt_id, receipt_item_id, split_method, total_amount, created_at, payer_user_id",
    )
    .eq("id", id)
    .single();

  if (error || !split) {
    notFound();
  }

  const { data: shares, error: sharesError } = await supabase
    .from("expense_split_shares")
    .select("id, participant_user_id, owed_amount, settled_at")
    .eq("split_id", split.id)
    .order("created_at");

  if (sharesError) {
    notFound();
  }

  const profileIds = [
    split.payer_user_id,
    ...(shares ?? []).map((share) => share.participant_user_id),
  ];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, github_username")
    .in("id", profileIds);

  const profileMap = new Map(
    ((profiles ?? []) as ProfileOption[]).map((profile) => [profile.id, profile]),
  );

  const payerProfile = profileMap.get(split.payer_user_id);
  const shareDetails: SplitShareDetail[] = (shares ?? []).map((share) => {
    const participant = profileMap.get(share.participant_user_id);
    return {
      id: share.id,
      participant_user_id: share.participant_user_id,
      owed_amount: Number(share.owed_amount),
      settled_at: share.settled_at,
      participant_display_name: participant?.display_name ?? null,
      participant_github_username: participant?.github_username ?? null,
    };
  });

  const splitDetail: SplitDetail = {
    id: split.id,
    receipt_id: split.receipt_id,
    receipt_item_id: split.receipt_item_id,
    split_method: split.split_method,
    total_amount: Number(split.total_amount),
    created_at: split.created_at,
    payer_user_id: split.payer_user_id,
    payer_display_name: payerProfile?.display_name ?? null,
    payer_github_username: payerProfile?.github_username ?? null,
    shares: shareDetails,
  };

  let receiptItemLabel: string | null = null;
  if (split.receipt_item_id) {
    const { data: receiptItem } = await supabase
      .from("receipt_items")
      .select("raw_name, line_total")
      .eq("id", split.receipt_item_id)
      .single();

    if (receiptItem) {
      receiptItemLabel = `${receiptItem.raw_name} (${formatMoney(Number(receiptItem.line_total))})`;
    }
  }

  const canManage = split.payer_user_id === user.id;

  return (
    <>
      <PageHeader
        title="Split detail"
        description={`Created ${formatDate(splitDetail.created_at.slice(0, 10))}`}
        backHref={`/receipts/${splitDetail.receipt_id}`}
        backLabel="Back to receipt"
        action={
          <Link
            href="/balances"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 px-5 text-sm font-semibold"
          >
            View balances
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-300 bg-white p-5">
          <h2 className="text-lg font-semibold">Split summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-600">Payer</dt>
              <dd className="font-medium">
                {profileLabel(
                  splitDetail.payer_display_name,
                  splitDetail.payer_github_username,
                  splitDetail.payer_user_id,
                )}
                {splitDetail.payer_user_id === user.id ? " (you)" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-slate-600">Method</dt>
              <dd className="font-medium capitalize">{splitDetail.split_method}</dd>
            </div>
            <div>
              <dt className="text-slate-600">Target</dt>
              <dd className="font-medium">
                {receiptItemLabel ?? "Whole receipt"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-600">Total amount</dt>
              <dd className="font-medium tabular-nums">
                {formatMoney(splitDetail.total_amount)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-600">Source receipt</dt>
              <dd>
                <Link
                  href={`/receipts/${splitDetail.receipt_id}`}
                  className="font-medium text-emerald-700"
                >
                  Open receipt
                </Link>
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-slate-300 bg-white p-5">
          <h2 className="text-lg font-semibold">Rules</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>The payer never gets an `expense_split_shares` row.</li>
            <li>Only listed participants owe the payer.</li>
            <li>Unsettled shares appear in netted balances.</li>
          </ul>
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-lg border border-slate-300 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold">Participant shares</h2>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-medium">Participant</th>
              <th className="px-4 py-3 font-medium">Owes</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {splitDetail.shares.map((share) => (
              <tr key={share.id} className="border-b border-slate-100">
                <td className="px-4 py-3">
                  {profileLabel(
                    share.participant_display_name,
                    share.participant_github_username,
                    share.participant_user_id,
                  )}
                  {share.participant_user_id === user.id ? " (you)" : ""}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {formatMoney(share.owed_amount)}
                </td>
                <td className="px-4 py-3">
                  {share.settled_at ? (
                    <span className="text-emerald-700">
                      {formatSettledAt(share.settled_at)}
                    </span>
                  ) : (
                    <span className="text-amber-700">Unsettled</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {!share.settled_at && canManage ? (
                    <SettleShareButton shareId={share.id} splitId={split.id} />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
