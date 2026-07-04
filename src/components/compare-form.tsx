"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";

import { PendingNotice } from "@/components/ui/pending-notice";
import { Spinner } from "@/components/ui/spinner";
import { formatDate, formatMoney, formatUnitPrice } from "@/lib/format";
import type { CompareRow, Product, SpendlyUnit, Store } from "@/lib/types";

type CompareFormProps = {
  products: Product[];
  stores: Store[];
  initialProductId?: string;
  initialStoreAId?: string;
  initialStoreBId?: string;
  compared?: boolean;
  rows: CompareRow[];
};

type CompareOutcome =
  | { kind: "none" }
  | { kind: "same_store" }
  | { kind: "incomplete"; missingStoreNames: string[] }
  | { kind: "unit_mismatch"; units: SpendlyUnit[] }
  | { kind: "tie"; unit: SpendlyUnit; price: number }
  | {
      kind: "winner";
      winnerStoreId: string;
      winnerStoreName: string;
      savings: number;
      unit: SpendlyUnit;
    };

function hasPrice(row: CompareRow) {
  return row.normalized_unit_price !== null && row.normalized_unit !== null;
}

function buildCompareOutcome(rows: CompareRow[]): CompareOutcome {
  const priced = rows.filter(hasPrice);

  if (priced.length === 0) {
    return { kind: "none" };
  }

  if (priced.length < 2) {
    const missingStoreNames = rows
      .filter((row) => !hasPrice(row))
      .map((row) => row.store_name);
    return { kind: "incomplete", missingStoreNames };
  }

  const [first, second] = priced;
  const firstUnit = first.normalized_unit!;
  const secondUnit = second.normalized_unit!;

  if (firstUnit !== secondUnit) {
    return { kind: "unit_mismatch", units: [firstUnit, secondUnit] };
  }

  const firstPrice = first.normalized_unit_price!;
  const secondPrice = second.normalized_unit_price!;

  if (firstPrice === secondPrice) {
    return { kind: "tie", unit: firstUnit, price: firstPrice };
  }

  const winner = firstPrice < secondPrice ? first : second;
  return {
    kind: "winner",
    winnerStoreId: winner.store_id,
    winnerStoreName: winner.store_name,
    savings: Math.abs(firstPrice - secondPrice),
    unit: firstUnit,
  };
}

function CompareSummary({
  outcome,
  productName,
}: {
  outcome: CompareOutcome;
  productName: string | null;
}) {
  if (outcome.kind === "none") {
    return null;
  }

  if (outcome.kind === "same_store") {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900">
        Choose two different stores to compare prices.
      </div>
    );
  }

  if (outcome.kind === "incomplete") {
    const storeList = outcome.missingStoreNames.join(" and ");
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900">
        <p className="font-semibold">Not enough receipt data yet</p>
        <p className="mt-1">
          {productName ? (
            <>
              No receipts logged for <strong>{productName}</strong> at{" "}
              <strong>{storeList}</strong> yet.
            </>
          ) : (
            <>No receipts logged at {storeList} yet.</>
          )}{" "}
          Add a receipt to compare prices here.
        </p>
        <Link
          href="/receipts/new"
          className="mt-3 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          Log a receipt
        </Link>
      </div>
    );
  }

  if (outcome.kind === "unit_mismatch") {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900">
        <p className="font-semibold">Different units at each store</p>
        <p className="mt-1">
          Latest receipts use {outcome.units.join(" and ")}. Log receipts with
          the same unit type to compare fairly.
        </p>
      </div>
    );
  }

  if (outcome.kind === "tie") {
    return (
      <div className="rounded-lg border border-slate-300 bg-white px-4 py-4 text-sm text-slate-700">
        <p className="font-semibold">Same price at both stores</p>
        <p className="mt-1">
          Your latest receipts show{" "}
          <strong>{formatUnitPrice(outcome.price, outcome.unit)}</strong> at
          each store.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
      <p className="font-semibold">
        {outcome.winnerStoreName} is cheaper
      </p>
      <p className="mt-1">
        Save{" "}
        <strong>{formatUnitPrice(outcome.savings, outcome.unit)}</strong> based
        on your latest receipts
        {productName ? (
          <>
            {" "}
            for <strong>{productName}</strong>
          </>
        ) : null}
        .
      </p>
    </div>
  );
}

export function CompareForm({
  products,
  stores,
  initialProductId = "",
  initialStoreAId = "",
  initialStoreBId = "",
  compared = false,
  rows,
}: CompareFormProps) {
  const [productId, setProductId] = useState(initialProductId);
  const [storeAId, setStoreAId] = useState(initialStoreAId);
  const [storeBId, setStoreBId] = useState(initialStoreBId);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedProduct = products.find((product) => product.id === productId);
  const outcome = useMemo(() => {
    if (compared && storeAId && storeBId && storeAId === storeBId) {
      return { kind: "same_store" } as CompareOutcome;
    }

    if (!compared || rows.length === 0) {
      return { kind: "none" } as CompareOutcome;
    }

    return buildCompareOutcome(rows);
  }, [compared, rows, storeAId, storeBId]);

  const showResults = compared && rows.length > 0;

  return (
    <div className="space-y-6" aria-busy={isPending}>
      <PendingNotice show={isPending} message="Comparing prices..." />
      {!compared ? (
        <div className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">How this works</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Pick a product you buy at two stores.</li>
            <li>Choose the two stores to compare.</li>
            <li>
              We show the latest price per unit from your receipts — not live
              store prices.
            </li>
          </ol>
        </div>
      ) : null}

      <form
        className="grid gap-4 rounded-lg border border-slate-300 bg-white p-5 md:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          setFormError(null);

          if (storeAId === storeBId) {
            setFormError("Choose two different stores.");
            return;
          }

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
          <span className="font-medium">First store</span>
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
          <span className="font-medium">Second store</span>
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
        {formError ? (
          <p className="md:col-span-3 text-sm text-red-700">{formError}</p>
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          className="md:col-span-3 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Spinner size="sm" className="border-white/30 border-t-white" />
              Comparing...
            </>
          ) : (
            "Compare prices"
          )}
        </button>
      </form>

      {products.length === 0 || stores.length < 2 ? (
        <div className="rounded-lg border border-slate-300 bg-white px-4 py-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Setup needed</p>
          <p className="mt-1">
            {products.length === 0
              ? "Add a receipt with line items to create products."
              : "Add at least two stores before comparing prices."}
          </p>
          <Link
            href="/receipts/new"
            className="mt-3 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800"
          >
            Log a receipt
          </Link>
        </div>
      ) : null}

      {showResults ? (
        <>
          <CompareSummary
            outcome={outcome}
            productName={selectedProduct?.name ?? null}
          />

          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((row) => {
              const rowHasPrice = hasPrice(row);
              const isWinner =
                outcome.kind === "winner" &&
                row.store_id === outcome.winnerStoreId;
              const isTie = outcome.kind === "tie";

              return (
                <article
                  key={row.store_id}
                  className={`rounded-lg border p-5 ${
                    isWinner
                      ? "border-emerald-400 bg-emerald-50/60"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-2xl font-semibold">{row.store_name}</h2>
                    {isWinner ? (
                      <span className="inline-flex rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
                        Cheaper
                      </span>
                    ) : null}
                    {isTie && rowHasPrice ? (
                      <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                        Same price
                      </span>
                    ) : null}
                    {!isWinner &&
                    !isTie &&
                    rowHasPrice &&
                    outcome.kind === "winner" ? (
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Higher
                      </span>
                    ) : null}
                  </div>

                  {rowHasPrice ? (
                    <>
                      <p
                        className={`mt-4 text-3xl font-semibold tabular-nums ${
                          isWinner ? "text-emerald-800" : "text-slate-900"
                        }`}
                      >
                        {formatUnitPrice(
                          row.normalized_unit_price!,
                          row.normalized_unit!,
                        )}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        Latest receipt
                        {row.purchased_at
                          ? `: ${formatDate(row.purchased_at)}`
                          : ""}
                      </p>
                      {row.receipt_id ? (
                        <Link
                          href={`/receipts/${row.receipt_id}`}
                          className="mt-4 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800"
                        >
                          View source receipt
                        </Link>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <p className="mt-4 text-sm text-slate-600">
                        No receipts for this product here yet.
                      </p>
                      <Link
                        href="/receipts/new"
                        className="mt-4 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800"
                      >
                        Log a receipt
                      </Link>
                    </>
                  )}
                </article>
              );
            })}
          </div>

          {outcome.kind === "winner" ? (
            <p className="text-sm text-slate-600">
              Difference: {formatMoney(outcome.savings)} per {outcome.unit}{" "}
              between the two latest receipts.
            </p>
          ) : null}

          {productId ? (
            <Link
              href={`/products/${productId}/history`}
              className="inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              View full price history for {selectedProduct?.name ?? "this product"}
            </Link>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
