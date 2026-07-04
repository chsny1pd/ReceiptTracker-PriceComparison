"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AddProductModal } from "@/components/add-product-modal";
import { CompareCartPanel } from "@/components/compare/compare-cart-panel";
import {
  buildBrandCompareRow,
  buildCompareOutcomeFromRows,
  buildReceiptDraftFromCart,
  compareCartItemKey,
  emptyBrandLine,
  loadCompareCart,
  saveCompareCart,
  saveCompareCartReceiptDraft,
  type BrandCompareOutcome,
  type BrandCompareRow,
  type CompareCartItem,
  type DraftBrandLine,
} from "@/lib/compare-cart";
import { formatMoney, formatUnitPrice } from "@/lib/format";
import type { Product, SpendlyUnit } from "@/lib/types";
import { normalizeReceiptItem, UNITS_BY_CATEGORY } from "@/lib/units";

const secondaryActionButtonClassName =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-300 px-3 text-sm font-medium text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50";

type CompareFormProps = {
  products: Product[];
};

function CompareSummary({
  outcome,
  productName,
}: {
  outcome: BrandCompareOutcome;
  productName: string | null;
}) {
  if (
    outcome.kind === "none" ||
    outcome.kind === "incomplete" ||
    outcome.kind === "same_brand"
  ) {
    return null;
  }

  if (outcome.kind === "unit_mismatch") {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900">
        <p className="font-semibold">Different units across brands</p>
        <p className="mt-1">
          Use the same unit type on every brand row to compare fairly.
        </p>
      </div>
    );
  }

  if (outcome.kind === "tie") {
    return (
      <div className="rounded-lg border border-slate-300 bg-white px-4 py-4 text-sm text-slate-700">
        <p className="font-semibold">Same normalized price</p>
        <p className="mt-1">
          Every brand works out to{" "}
          <strong>{formatUnitPrice(outcome.price, outcome.unit)}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
      <p className="font-semibold">{outcome.winnerBrandName} is cheapest</p>
      <p className="mt-1">
        Save up to{" "}
        <strong>{formatUnitPrice(outcome.savings, outcome.unit)}</strong> per{" "}
        {outcome.unit}
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

export function CompareForm({ products }: CompareFormProps) {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [brandLines, setBrandLines] = useState<DraftBrandLine[]>(() => [
    emptyBrandLine(),
    emptyBrandLine(),
  ]);
  const [compared, setCompared] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CompareCartItem[]>(() =>
    loadCompareCart(),
  );

  const selectedProduct = products.find((product) => product.id === productId);
  const allowedUnits = selectedProduct
    ? UNITS_BY_CATEGORY[selectedProduct.unit_category]
    : (["each"] as SpendlyUnit[]);

  const compareRows = useMemo(() => {
    if (!compared) {
      return [] as BrandCompareRow[];
    }

    return brandLines
      .map((line) => buildBrandCompareRow(line))
      .filter((row): row is BrandCompareRow => row !== null);
  }, [brandLines, compared]);

  const outcome = useMemo(() => {
    if (!compared) {
      return { kind: "none" } as BrandCompareOutcome;
    }

    return buildCompareOutcomeFromRows(compareRows);
  }, [compareRows, compared]);

  const showCart = cartItems.length > 0;

  function handleProductChange(nextProductId: string) {
    setProductId(nextProductId);
    const product = products.find((entry) => entry.id === nextProductId);
    const defaultUnit = product?.default_unit ?? "each";

    setBrandLines((current) =>
      current.map((line) => ({ ...line, unit: defaultUnit })),
    );
  }

  function updateBrandLine(key: string, patch: Partial<DraftBrandLine>) {
    setBrandLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function addBrandLine() {
    const defaultUnit = selectedProduct?.default_unit ?? "each";
    setBrandLines((current) => [...current, emptyBrandLine(defaultUnit)]);
  }

  function addToCart(row: BrandCompareRow) {
    if (!productId || !selectedProduct) {
      return;
    }

    const key = compareCartItemKey(productId, row.brandName);

    setCartItems((current) => {
      const existing = current.find(
        (item) => compareCartItemKey(item.productId, item.brandName) === key,
      );

      const next = existing
        ? current.map((item) =>
            compareCartItemKey(item.productId, item.brandName) === key
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          )
        : [
            ...current,
            {
              productId,
              productName: selectedProduct.name,
              brandName: row.brandName,
              quantity: 1,
              unit: row.normalizedUnit,
              normalizedUnitPrice: row.normalizedUnitPrice,
            },
          ];

      saveCompareCart(next);
      return next;
    });
  }

  function updateCartQuantity(key: string, quantity: number) {
    setCartItems((current) => {
      const next = current.map((item) =>
        compareCartItemKey(item.productId, item.brandName) === key
          ? { ...item, quantity }
          : item,
      );
      saveCompareCart(next);
      return next;
    });
  }

  function removeCartItem(key: string) {
    setCartItems((current) => {
      const next = current.filter(
        (item) => compareCartItemKey(item.productId, item.brandName) !== key,
      );
      saveCompareCart(next);
      return next;
    });
  }

  function handleCreateReceipt() {
    const draft = buildReceiptDraftFromCart(cartItems);
    if (!draft) {
      return;
    }

    saveCompareCartReceiptDraft(draft);
    saveCompareCart([]);
    setCartItems([]);
    router.push("/receipts/new?from=compare");
  }

  function handleCompare(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!productId) {
      setFormError("Select a product.");
      return;
    }

    const trimmedNames = brandLines.map((line) => line.brandName.trim());
    if (trimmedNames.some((name) => !name)) {
      setFormError("Enter a brand name on every row.");
      return;
    }

    if (brandLines.length < 2) {
      setFormError("Add at least two brands to compare.");
      return;
    }

    const normalizedNames = trimmedNames.map((name) => name.toLowerCase());
    if (new Set(normalizedNames).size !== normalizedNames.length) {
      setFormError("Each brand name must be unique.");
      return;
    }

    setBrandLines((current) =>
      current.map((line) => ({
        ...line,
        brandName: line.brandName.trim(),
      })),
    );
    setCompared(true);
  }

  return (
    <div
      className={`space-y-6 ${showCart ? "lg:flex lg:items-start lg:gap-6 lg:space-y-0" : ""}`}
    >
      <div className={`space-y-6 ${showCart ? "min-w-0 flex-1" : ""}`}>
        <div className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">How this works</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Pick a product and enter shelf prices for each brand.</li>
            <li>Add more brands if you are comparing more than two options.</li>
            <li>
              Compare normalized unit prices, then add the winner to your cart.
            </li>
          </ol>
        </div>

        {products.length === 0 ? (
          <div className="rounded-lg border border-slate-300 bg-white px-4 py-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">No products yet</p>
            <p className="mt-1">
              Add a product to start comparing shelf prices across brands.
            </p>
            {formError ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setProductModalOpen(true)}
              className={`mt-3 ${secondaryActionButtonClassName}`}
            >
              Add product
            </button>
          </div>
        ) : null}

        {products.length > 0 ? (
        <form onSubmit={handleCompare} className="space-y-8">
          {formError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </p>
          ) : null}

          <section className="rounded-lg border border-slate-300 bg-white p-5">
            <h2 className="text-lg font-semibold">Compare details</h2>
            <div className="mt-4">
              <label className="grid gap-2 text-sm">
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium">Product</span>
                  <button
                    type="button"
                    onClick={() => setProductModalOpen(true)}
                    className={secondaryActionButtonClassName}
                  >
                    Add product
                  </button>
                </span>
                <select
                  value={productId}
                  onChange={(event) => handleProductChange(event.target.value)}
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
            </div>
          </section>

          <section className="rounded-lg border border-slate-300 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Brands</h2>
              <button
                type="button"
                onClick={addBrandLine}
                className={secondaryActionButtonClassName}
              >
                More brand
              </button>
            </div>

            {compared ? (
              <div className="mt-4">
                <CompareSummary
                  outcome={outcome}
                  productName={selectedProduct?.name ?? null}
                />
              </div>
            ) : null}

            <div className="mt-4 space-y-4">
              {brandLines.map((line, index) => {
                const row = buildBrandCompareRow(line);
                const preview =
                  Number(line.quantity) > 0 && Number(line.lineTotal) >= 0
                    ? normalizeReceiptItem(
                        Number(line.quantity),
                        line.unit,
                        Number(line.lineTotal) || 0,
                      )
                    : null;
                const isWinner =
                  compared &&
                  outcome.kind === "winner" &&
                  row?.brandName === outcome.winnerBrandName;
                const isTie = compared && outcome.kind === "tie" && row !== null;
                const isHigher =
                  compared &&
                  outcome.kind === "winner" &&
                  row !== null &&
                  row.brandName !== outcome.winnerBrandName;

                return (
                  <div
                    key={line.key}
                    className={`rounded-lg border p-4 ${
                      isWinner
                        ? "border-emerald-400 bg-emerald-50/60"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">Brand {index + 1}</p>
                        {isWinner ? (
                          <span className="inline-flex rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
                            Cheapest
                          </span>
                        ) : null}
                        {isTie ? (
                          <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                            Same price
                          </span>
                        ) : null}
                        {isHigher ? (
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Higher
                          </span>
                        ) : null}
                      </div>
                      {brandLines.length > 2 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setBrandLines((current) =>
                              current.filter((entry) => entry.key !== line.key),
                            )
                          }
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium">Brand</span>
                        <input
                          value={line.brandName}
                          onChange={(event) =>
                            updateBrandLine(line.key, {
                              brandName: event.target.value,
                            })
                          }
                          placeholder="e.g. Brand A"
                          required
                          className="h-11 rounded-lg border border-slate-300 px-3"
                        />
                      </label>
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium">Quantity</span>
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={line.quantity}
                          onChange={(event) =>
                            updateBrandLine(line.key, {
                              quantity: event.target.value,
                            })
                          }
                          required
                          className="h-11 rounded-lg border border-slate-300 px-3 tabular-nums"
                        />
                      </label>
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium">Unit</span>
                        <select
                          value={line.unit}
                          onChange={(event) =>
                            updateBrandLine(line.key, {
                              unit: event.target.value as SpendlyUnit,
                            })
                          }
                          required
                          className="h-11 rounded-lg border border-slate-300 px-3"
                        >
                          {allowedUnits.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm">
                        <span className="font-medium">Line total</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.lineTotal}
                          onChange={(event) =>
                            updateBrandLine(line.key, {
                              lineTotal: event.target.value,
                            })
                          }
                          placeholder="Shelf price"
                          required
                          className="h-11 rounded-lg border border-slate-300 px-3 tabular-nums"
                        />
                        <p className="text-xs text-slate-500">Includes 7% VAT.</p>
                      </label>
                      <div className="grid gap-2 text-sm md:col-span-2">
                        <span className="font-medium">Normalized preview</span>
                        <p
                          className={`flex h-11 items-center rounded-lg bg-slate-50 px-3 tabular-nums ${
                            isWinner ? "text-emerald-800" : "text-slate-700"
                          }`}
                        >
                          {preview
                            ? formatUnitPrice(
                                preview.normalizedUnitPrice,
                                preview.normalizedUnit,
                              )
                            : "Enter quantity and line total"}
                        </p>
                      </div>
                    </div>

                    {compared && row ? (
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => addToCart(row)}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-300 px-3 text-sm font-medium text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-sm"
                        >
                          Add to Cart
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Compare prices
            </button>
          </section>
        </form>
        ) : null}

        {products.length > 0 && compared && outcome.kind === "winner" ? (
          <p className="text-sm text-slate-600">
            Largest gap: {formatMoney(outcome.savings)} per {outcome.unit}{" "}
            between the cheapest and most expensive brand.
          </p>
        ) : null}

        {products.length > 0 && compared && productId ? (
          <Link
            href={`/products/${productId}/history`}
            className="inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800"
          >
            View full price history for {selectedProduct?.name ?? "this product"}
          </Link>
        ) : null}
      </div>

      {showCart ? (
        <CompareCartPanel
          items={cartItems}
          onUpdateQuantity={updateCartQuantity}
          onRemove={removeCartItem}
          onCreateReceipt={handleCreateReceipt}
        />
      ) : null}

      <AddProductModal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        onSuccess={(product) => {
          setProductId(product.id);
          handleProductChange(product.id);
          router.refresh();
        }}
        onError={(message) => setFormError(message || null)}
      />
    </div>
  );
}
