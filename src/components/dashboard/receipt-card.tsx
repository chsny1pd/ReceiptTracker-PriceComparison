import Link from "next/link";

import { formatDate, formatMoney } from "@/lib/format";

export type ReceiptCardData = {
  id: string;
  purchased_at: string;
  total: number;
  label: string;
};

type ReceiptCardProps = {
  receipt: ReceiptCardData;
  compact?: boolean;
};

export function ReceiptCard({ receipt, compact = false }: ReceiptCardProps) {
  return (
    <Link
      href={`/receipts/${receipt.id}`}
      className={`flex shrink-0 flex-col rounded-lg border border-slate-300 bg-white transition hover:border-emerald-500 hover:shadow-sm ${
        compact ? "w-52 p-4" : "p-4"
      }`}
    >
      <p className="truncate text-sm font-medium text-slate-500">
        {formatDate(receipt.purchased_at)}
      </p>
      <p className="mt-1 truncate text-base font-semibold">{receipt.label}</p>
      <p className="mt-auto pt-3 text-lg font-semibold tabular-nums text-emerald-700">
        {formatMoney(receipt.total)}
      </p>
    </Link>
  );
}
