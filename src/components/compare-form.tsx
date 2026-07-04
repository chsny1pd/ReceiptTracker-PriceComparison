"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";

import { formatUnitPrice } from "@/lib/format";
import type { CompareRow, Product, Store } from "@/lib/types";

type CompareFormProps = {
  products: Product[];
  stores: Store[];
  initialProductId?: string;
  initialStoreAId?: string;
  initialStoreBId?: string;
  rows: CompareRow[];
};

export function CompareForm({
  products,
  stores,
  initialProductId = "",
  initialStoreAId = "",
  initialStoreBId = "",
  rows,
}: CompareFormProps) {
  const [productId, setProductId] = useState(initialProductId);
  const [storeAId, setStoreAId] = useState(initialStoreAId);
  const [storeBId, setStoreBId] = useState(initialStoreBId);
  const [, startTransition] = useTransition();

  const winner = useMemo(() => {
    const priced = rows.filter(
      (row) => row.normalized_unit_price !== null && row.receipt_id,
    );
    if (priced.length < 2) {
      return null;
    }

    const [first, second] = priced;
    if (first.normalized_unit_price === second.normalized_unit_price) {
      return "tie";
    }

    return first.normalized_unit_price! < second.normalized_unit_price!
      ? first.store_name
      : second.store_name;
  }, [rows]);

  return (
    <div className="space-y-6">
      <form
        className="grid gap-4 rounded-lg border border-slate-300 bg-white p-5 md:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(() => {
            const params = new URLSearchParams();
            if (productId) params.set("productId", productId);
            if (storeAId) params.set("storeAId", storeAId);
            if (storeBId) params.set("storeBId", storeBId);
            window.location.href = `/compare?${params.toString()}`;
          });
        }}
      >
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Product</span>
          <select
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            required
            className="h-11 rounded-lg border border-slate-300 px-3"
          >
            <option value="" disabled>
              Select product
            </option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Store A</span>
          <select
            value={storeAId}
            onChange={(event) => setStoreAId(event.target.value)}
            required
            className="h-11 rounded-lg border border-slate-300 px-3"
          >
            <option value="" disabled>
              Select store
            </option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Store B</span>
          <select
            value={storeBId}
            onChange={(event) => setStoreBId(event.target.value)}
            required
            className="h-11 rounded-lg border border-slate-300 px-3"
          >
            <option value="" disabled>
              Select store
            </option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="md:col-span-3 inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white"
        >
          Compare latest prices
        </button>
      </form>

      {productId ? (
        <Link
          href={`/products/${productId}/history`}
          className="inline-flex text-sm font-medium text-emerald-700"
        >
          View price history for selected product
        </Link>
      ) : null}

      {rows.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((row) => (
            <article
              key={row.store_id}
              className="rounded-lg border border-slate-300 bg-white p-5"
            >
              <p className="text-sm font-medium uppercase tracking-[0.15em] text-slate-500">
                Store {row.store_label.toUpperCase()}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">{row.store_name}</h2>
              {row.normalized_unit_price !== null && row.normalized_unit ? (
                <>
                  <p className="mt-4 text-3xl font-semibold tabular-nums text-emerald-700">
                    {formatUnitPrice(
                      row.normalized_unit_price,
                      row.normalized_unit,
                    )}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Latest purchase: {row.purchased_at}
                  </p>
                  {row.receipt_id ? (
                    <Link
                      href={`/receipts/${row.receipt_id}`}
                      className="mt-4 inline-flex text-sm font-medium text-emerald-700"
                    >
                      View source receipt
                    </Link>
                  ) : null}
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-600">
                  No receipt data for this product at this store yet.
                </p>
              )}
            </article>
          ))}
        </div>
      ) : null}

      {winner === "tie" ? (
        <p className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm">
          Both stores have the same normalized unit price.
        </p>
      ) : null}
      {winner && winner !== "tie" ? (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {winner} is cheaper based on normalized unit price.
        </p>
      ) : null}
    </div>
  );
}
