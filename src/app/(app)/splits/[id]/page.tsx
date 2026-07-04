import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { PaymentProofPanel } from "@/components/splits/payment-proof-panel";
import {
  formatSettledAt,
  SettleShareButton,
} from "@/components/splits/settle-share-button";
import { getRequiredUser } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { getServerI18n } from "@/lib/server-preferences";
import type {
  ProfileOption,
  SharePaymentProof,
  SplitDetail,
  SplitShareDetail,
  UserPaymentMethod,
} from "@/lib/types";

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
  const { dict } = await getServerI18n();

  const { data: split, error } = await supabase
    .from("expense_splits")
    .select(
      "id, receipt_id, receipt_item_id, split_method, total_amount, created_at, payer_user_id, receiver_payment_method_id",
    )
    .eq("id", id)
    .single();

  if (error || !split) {
    notFound();
  }

  const { data: shares, error: sharesError } = await supabase
    .from("expense_split_shares")
    .select(
      "id, participant_user_id, owed_amount, settled_at, share_status, latest_payment_proof_id",
    )
    .eq("split_id", split.id)
    .order("created_at");

  if (sharesError) {
    notFound();
  }

  const profileIds = [
    split.payer_user_id,
    ...(shares ?? []).map((share) => share.participant_user_id),
  ];

  const [{ data: profiles }, { data: paymentMethod }, { data: rawProofs }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, github_username")
        .in("id", profileIds),
      split.receiver_payment_method_id
        ? supabase
            .from("user_payment_methods")
            .select(
              "id, label, provider_name, account_name, account_reference, promptpay_id, qr_image_object_key, note, is_default",
            )
            .eq("id", split.receiver_payment_method_id)
            .single()
        : Promise.resolve({ data: null }),
      supabase
        .from("share_payment_proofs")
        .select(
          "id, share_id, uploader_user_id, receiver_user_id, image_object_key, note, review_status, reviewed_at, created_at",
        )
        .in("share_id", (shares ?? []).map((share) => share.id))
        .order("created_at", { ascending: false }),
    ]);

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
      share_status: share.share_status,
      latest_payment_proof_id: share.latest_payment_proof_id,
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
  const proofsByShare = new Map<string, SharePaymentProof[]>();

  for (const proof of (rawProofs ?? []) as SharePaymentProof[]) {
    const existing = proofsByShare.get(proof.share_id) ?? [];
    existing.push(proof);
    proofsByShare.set(proof.share_id, existing);
  }

  return (
    <>
      <PageHeader
        title={dict.splits.splitDetail}
        description={`${dict.splits.created} ${formatDate(splitDetail.created_at.slice(0, 10))}`}
        backHref={`/receipts/${splitDetail.receipt_id}`}
        backLabel={dict.splits.backToReceipt}
        action={
          <Link
            href="/splits"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 px-5 text-sm font-semibold"
          >
            {dict.splits.openSplitHub}
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-300 bg-white p-5">
          <h2 className="text-lg font-semibold">{dict.splits.splitSummary}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-600">{dict.splits.payer}</dt>
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
              <dt className="text-slate-600">{dict.splits.method}</dt>
              <dd className="font-medium capitalize">{splitDetail.split_method}</dd>
            </div>
            <div>
              <dt className="text-slate-600">{dict.splits.target}</dt>
              <dd className="font-medium">
                {receiptItemLabel ?? dict.splits.wholeReceipt}
              </dd>
            </div>
            <div>
              <dt className="text-slate-600">{dict.splits.totalAmount}</dt>
              <dd className="font-medium tabular-nums">
                {formatMoney(splitDetail.total_amount)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-600">{dict.compare.sourceReceipt}</dt>
              <dd>
                <Link
                  href={`/receipts/${splitDetail.receipt_id}`}
                  className="font-medium text-emerald-700"
                >
                  {dict.receipts.openReceipt}
                </Link>
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-slate-300 bg-white p-5">
          <h2 className="text-lg font-semibold">{dict.splits.rules}</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>{dict.splits.rules1}</li>
            <li>{dict.splits.rules2}</li>
            <li>{dict.splits.rules3}</li>
            <li>{dict.splits.rules4}</li>
          </ul>
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-lg border border-slate-300 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold">{dict.splits.participantShares}</h2>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-medium">{dict.splits.participant}</th>
              <th className="px-4 py-3 font-medium">{dict.splits.owes}</th>
              <th className="px-4 py-3 font-medium">{dict.splits.status}</th>
              <th className="px-4 py-3 font-medium">{dict.common.action}</th>
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
                  <span
                    className={
                      share.share_status === "confirmed"
                        ? "text-emerald-700"
                        : share.share_status === "submitted"
                          ? "text-sky-700"
                          : share.share_status === "rejected"
                            ? "text-red-700"
                            : "text-amber-700"
                    }
                  >
                    {share.share_status === "confirmed"
                      ? formatSettledAt(share.settled_at)
                      : share.share_status === "submitted"
                        ? dict.splits.submitted
                        : share.share_status === "rejected"
                          ? dict.splits.proofRejected
                          : dict.splits.unpaid}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {share.share_status !== "confirmed" && canManage ? (
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

      <section className="mt-6 space-y-6">
        {splitDetail.shares.map((share) => (
          <PaymentProofPanel
            key={share.id}
            splitId={split.id}
            share={share}
            currentUserId={user.id}
            receiverPaymentMethod={(paymentMethod as UserPaymentMethod | null) ?? null}
            proofs={proofsByShare.get(share.id) ?? []}
          />
        ))}
      </section>
    </>
  );
}
