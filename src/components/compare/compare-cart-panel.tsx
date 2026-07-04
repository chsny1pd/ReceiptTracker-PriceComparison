"use client";

import { formatMoney, formatUnitPrice } from "@/lib/format";
import {
  compareCartItemKey,
  lineTotalForCartItem,
  type CompareCartItem,
} from "@/lib/compare-cart";

type CompareCartPanelProps = {
  items: CompareCartItem[];
  onUpdateQuantity: (key: string, quantity: number) => void;
  onRemove: (key: string) => void;
  onCreateReceipt: () => void;
};

export function CompareCartPanel({
  items,
  onUpdateQuantity,
  onRemove,
  onCreateReceipt,
}: CompareCartPanelProps) {
  const subtotal = items.reduce(
    (sum, item) => sum + lineTotalForCartItem(item),
    0,
  );

  return (
    <aside className="w-full">
      <div className="rounded-lg border border-slate-300 bg-white p-5">
        <h2 className="text-lg font-semibold">Cart</h2>
        <p className="mt-1 text-sm text-slate-600">
          Items from your compare results.
        </p>

        <ul className="mt-4 space-y-3">
          {items.map((item) => {
            const key = compareCartItemKey(item.productId, item.brandName);

            return (
              <li
                key={key}
                className="rounded-lg border border-slate-200 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">
                      {item.productName}
                    </p>
                    <p className="mt-0.5 text-slate-600">{item.brandName}</p>
                    <p className="mt-1 tabular-nums text-slate-700">
                      {formatUnitPrice(item.normalizedUnitPrice, item.unit)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(key)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center rounded-lg border border-slate-300">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateQuantity(key, Math.max(1, item.quantity - 1))
                      }
                      className="inline-flex h-8 w-8 items-center justify-center text-slate-700 transition hover:bg-slate-50"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="inline-flex h-8 min-w-8 items-center justify-center border-x border-slate-300 px-2 tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(key, item.quantity + 1)}
                      className="inline-flex h-8 w-8 items-center justify-center text-slate-700 transition hover:bg-slate-50"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <span className="tabular-nums font-medium text-slate-900">
                    {formatMoney(lineTotalForCartItem(item))}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 text-sm">
          <span className="font-medium text-slate-700">Subtotal</span>
          <span className="tabular-nums font-semibold text-slate-900">
            {formatMoney(subtotal)}
          </span>
        </div>

        <button
          type="button"
          onClick={onCreateReceipt}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          Create Receipt
        </button>
      </div>
    </aside>
  );
}
