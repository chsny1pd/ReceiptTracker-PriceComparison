import Link from "next/link";

import { formatDate, formatMoney, formatUnitPrice } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import type { ProductHistoryRow, SpendlyUnit } from "@/lib/types";

type PriceHistoryTableProps = {
  rows: ProductHistoryRow[];
  productName: string;
  unit: SpendlyUnit;
  dict: Dictionary;
};

export function PriceHistoryTable({
  rows,
  productName,
  unit,
  dict,
}: PriceHistoryTableProps) {
  return (
    <section
      className="overflow-hidden rounded-lg border border-slate-300 bg-white"
      aria-labelledby="history-table-heading"
    >
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 id="history-table-heading" className="text-lg font-semibold">
          {dict.products.historyTableTitle}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {dict.products.historyTableDescription}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table
          className="min-w-full text-left text-sm"
          aria-describedby="history-table-summary"
        >
          <caption id="history-table-summary" className="px-5 py-3 text-left text-sm text-slate-600">
            {dict.products.historyTableSummary
              .replace("{product}", productName)
              .replace("{unit}", unit)}
          </caption>
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                {dict.products.date}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {dict.products.store}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {dict.products.normalizedPrice}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {dict.products.lineTotal}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {dict.products.receipt}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.receipt_item_id}
                className="border-b border-slate-100"
              >
                <td className="px-4 py-3 tabular-nums">
                  {formatDate(row.purchased_at)}
                </td>
                <td className="px-4 py-3">{row.store_name}</td>
                <td className="px-4 py-3 tabular-nums">
                  {formatUnitPrice(Number(row.normalized_unit_price), unit)}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {formatMoney(Number(row.line_total))}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/receipts/${row.receipt_id}`}
                    className="font-medium text-emerald-700"
                  >
                    {dict.products.openReceipt}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
