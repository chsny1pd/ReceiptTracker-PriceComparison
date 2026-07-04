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
import { relationName } from "@/lib/supabase-helpers";

function toReceiptCard(
  receipt: {
    id: string;
    purchased_at: string;
    total: number | string;
    stores: unknown;
  },
): ReceiptCardData {
  return {
    id: receipt.id,
    purchased_at: receipt.purchased_at,
    total: Number(receipt.total),
    storeName: relationName(receipt.stores, "Unknown store"),
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

  const { count: receiptCount } = await supabase
    .from("receipts")
    .select("*", { count: "exact", head: true })
    .eq("owner_user_id", user.id);

  const { data: receipts } = await supabase
    .from("receipts")
    .select("id, purchased_at, total, stores(name)")
    .eq("owner_user_id", user.id)
    .order("purchased_at", { ascending: false })
    .order("created_at", { ascending: false });

  const receiptCards = (receipts ?? []).map(toReceiptCard);
  const dailySpending = buildDailySpending(receiptCards);
  const carouselReceipts = receiptCards.slice(0, 10);
  const recentReceipts = receiptCards.slice(0, 3);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your spending and recent receipts."
      />

      <section className="mb-8">
        <SpendingOverviewChart dailySpending={dailySpending} />
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Recent receipts</h2>
        <ReceiptCarousel receipts={carouselReceipts} />
      </section>

      <section className="rounded-lg border border-slate-300 bg-white p-5">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        <p className="mt-2 text-sm text-slate-600">
          {receiptCount ?? 0} receipt{(receiptCount ?? 0) === 1 ? "" : "s"}{" "}
          logged so far.
        </p>
        {recentReceipts.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-200">
            {recentReceipts.map((receipt) => (
              <li key={receipt.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{receipt.storeName}</p>
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
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            No receipts yet.{" "}
            <Link href="/receipts/new" className="font-medium text-emerald-700">
              Log your first receipt
            </Link>
            .
          </p>
        )}
      </section>
    </>
  );
}
