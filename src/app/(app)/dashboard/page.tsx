import Link from "next/link";

import { ReceiptCarousel } from "@/components/dashboard/receipt-carousel";
import type { ReceiptCardData } from "@/components/dashboard/receipt-card";
import {
  SpendingOverviewChart,
  type DailySpendingPoint,
} from "@/components/dashboard/spending-overview-chart";
import { PageHeader } from "@/components/page-header";
import { getRequiredUser } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { receiptLabel } from "@/lib/receipt-label";
import { getServerI18n } from "@/lib/server-preferences";

function toReceiptCard(
  receipt: {
    id: string;
    title?: string | null;
    purchased_at: string;
    total: number | string;
    stores?: { name?: string | null } | { name?: string | null }[] | null;
    receipt_items?: { raw_name: string | null; line_number: number }[] | null;
  },
): ReceiptCardData {
  return {
    id: receipt.id,
    purchased_at: receipt.purchased_at,
    total: Number(receipt.total),
    label: receiptLabel(receipt, "Receipt"),
  };
}

function buildDailySpending(receipts: ReceiptCardData[]): DailySpendingPoint[] {
  const byDate = new Map<string, ReceiptCardData[]>();

  for (const receipt of receipts) {
    const existing = byDate.get(receipt.purchased_at) ?? [];
    existing.push(receipt);
    byDate.set(receipt.purchased_at, existing);
  }

  return [...byDate.entries()]
    .map(([date, dayReceipts]) => ({
      date,
      total: dayReceipts.reduce((sum, receipt) => sum + receipt.total, 0),
      receipts: dayReceipts.sort((a, b) => b.total - a.total),
    }))
    .sort(
      (a, b) =>
        new Date(`${a.date}T00:00:00`).getTime() -
        new Date(`${b.date}T00:00:00`).getTime(),
    );
}

export default async function DashboardPage() {
  const { supabase, user } = await getRequiredUser();
  const { dict } = await getServerI18n();

  const [
    { count: receiptCount },
    { data: receipts },
    { data: drafts },
    { data: pendingProofShares },
    { data: balances },
  ] = await Promise.all([
    supabase
      .from("receipts")
      .select("*", { count: "exact", head: true })
      .eq("owner_user_id", user.id),
    supabase
      .from("receipts")
      .select("id, title, purchased_at, total, stores(name), receipt_items(raw_name, line_number)")
      .eq("owner_user_id", user.id)
      .order("purchased_at", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("receipt_drafts")
      .select("id, title, updated_at")
      .eq("owner_user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(3),
    supabase
      .from("expense_split_shares")
      .select("id")
      .eq("share_status", "submitted")
      .limit(20),
    supabase.rpc("get_current_balances"),
  ]);

  const receiptCards = (receipts ?? []).map(toReceiptCard);
  const dailySpending = buildDailySpending(receiptCards);
  const carouselReceipts = receiptCards.slice(0, 10);
  const recentReceipts = receiptCards.slice(0, 3);

  return (
    <>
      <PageHeader
        title={dict.dashboard.title}
        description={dict.dashboard.description}
      />

      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Link
          href="/compare"
          className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
        >
          <p className="text-sm font-medium text-emerald-800">{dict.common.quickCompare}</p>
          <p className="mt-2 text-sm text-emerald-900">{dict.dashboard.compareBlurb}</p>
        </Link>
        <Link
          href="/receipts/new"
          className="rounded-2xl border border-slate-300 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
        >
          <p className="text-sm font-medium text-slate-900">{dict.common.newReceipt}</p>
          <p className="mt-2 text-sm text-slate-600">{dict.dashboard.receiptBlurb}</p>
        </Link>
        <Link
          href={drafts?.[0] ? `/receipts/new?draft=${drafts[0].id}` : "/receipts"}
          className="rounded-2xl border border-slate-300 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
        >
          <p className="text-sm font-medium text-slate-900">{dict.dashboard.resumeDraftTitle}</p>
          <p className="mt-2 text-sm text-slate-600">
            {drafts?.[0]?.title ?? dict.dashboard.resumeDraftBody}
          </p>
        </Link>
        <Link
          href="/splits"
          className="rounded-2xl border border-slate-300 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
        >
          <p className="text-sm font-medium text-slate-900">{dict.common.reviewProofs}</p>
          <p className="mt-2 text-sm text-slate-600">{dict.dashboard.proofBlurb}</p>
        </Link>
        <Link
          href="/splits"
          className="rounded-2xl border border-slate-300 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
        >
          <p className="text-sm font-medium text-slate-900">{dict.common.debts}</p>
          <p className="mt-2 text-sm text-slate-600">{dict.dashboard.debtBlurb}</p>
        </Link>
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-3">
        <article className="rounded-lg border border-slate-300 bg-white p-5">
          <p className="text-sm text-slate-500">{dict.dashboard.receiptsLoggedLabel}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{receiptCount ?? 0}</p>
        </article>
        <article className="rounded-lg border border-slate-300 bg-white p-5">
          <p className="text-sm text-slate-500">{dict.dashboard.draftsReadyLabel}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{drafts?.length ?? 0}</p>
        </article>
        <article className="rounded-lg border border-slate-300 bg-white p-5">
          <p className="text-sm text-slate-500">{dict.dashboard.pendingProofs}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {pendingProofShares?.length ?? 0}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {(balances ?? []).length}{" "}
            {(balances ?? []).length === 1
              ? dict.dashboard.nettedBalanceOpenSingular
              : dict.dashboard.nettedBalanceOpenPlural}
          </p>
        </article>
      </section>

      <section className="mb-8">
        <SpendingOverviewChart dailySpending={dailySpending} />
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">{dict.dashboard.recentReceipts}</h2>
        <ReceiptCarousel receipts={carouselReceipts} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-slate-300 bg-white p-5">
          <h2 className="text-lg font-semibold">{dict.dashboard.recentActivity}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {receiptCount ?? 0} {dict.dashboard.receiptCount}
          </p>
          {recentReceipts.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-200">
              {recentReceipts.map((receipt) => (
                <li key={receipt.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{receipt.label}</p>
                    <p className="text-sm text-slate-600">
                      {formatDate(receipt.purchased_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium tabular-nums">
                      {formatMoney(receipt.total)}
                    </p>
                    <Link
                      href={`/receipts/${receipt.id}`}
                      className="text-sm text-emerald-700"
                    >
                      {dict.common.view}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              {dict.dashboard.noReceipts}{" "}
              <Link href="/receipts/new" className="font-medium text-emerald-700">
                {dict.dashboard.logFirst}
              </Link>
              .
            </p>
          )}
        </div>
        <div className="rounded-lg border border-slate-300 bg-white p-5">
          <h2 className="text-lg font-semibold">{dict.dashboard.pendingProofs}</h2>
          {pendingProofShares && pendingProofShares.length > 0 ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-600">
                {dict.dashboard.submittedProofsWaiting}
              </p>
              <Link
                href="/splits"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white"
              >
                {dict.common.reviewProofs}
              </Link>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              {dict.dashboard.noPendingProofs}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
