"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createProduct, createStore } from "@/app/actions/catalog";
import {
  createReceipt,
  type ReceiptLineInput,
} from "@/app/actions/receipts";
import { FormErrorSummary } from "@/components/form-error-summary";
import { formatUnitPrice } from "@/lib/format";
import type { Product, SpendlyUnit, Store } from "@/lib/types";
import {
  normalizeReceiptItem,
  UNITS_BY_CATEGORY,
  unitCategoryForUnit,
} from "@/lib/units";

type DraftLine = {
  key: string;
  productId: string;
  rawName: string;
  quantity: string;
  unit: SpendlyUnit;
  lineTotal: string;
};

type ReceiptFormProps = {
  stores: Store[];
  products: Product[];
};

function emptyLine(products: Product[]): DraftLine {
  const firstProduct = products[0];
  return {
    key: crypto.randomUUID(),
    productId: firstProduct?.id ?? "",
    rawName: firstProduct?.name ?? "",
    quantity: "1",
    unit: firstProduct?.default_unit ?? "each",
    lineTotal: "0",
  };
}

export function ReceiptForm({ stores, products }: ReceiptFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [purchasedAt, setPurchasedAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [subtotal, setSubtotal] = useState("0");
  const [tax, setTax] = useState("0");
  const [total, setTotal] = useState("0");
  const [notes, setNotes] = useState("");
  const [imageObjectKey, setImageObjectKey] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>(() =>
    products.length > 0 ? [emptyLine(products)] : [],
  );
  const [newStoreName, setNewStoreName] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState<
    "mass" | "volume" | "each"
  >("mass");

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function handleProductChange(key: string, productId: string) {
    const product = productMap.get(productId);
    updateLine(key, {
      productId,
      rawName: product?.name ?? "",
      unit: product?.default_unit ?? "each",
    });
  }

  async function handleImageChange(file: File | null) {
    if (!file) {
      setImageObjectKey(null);
      setImageName(null);
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      const presignResponse = await fetch("/api/receipt-images/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          fileSize: file.size,
        }),
      });
      const presignPayload = (await presignResponse.json()) as {
        objectKey?: string;
        uploadUrl?: string;
        error?: string;
      };

      if (!presignResponse.ok || !presignPayload.uploadUrl) {
        throw new Error(presignPayload.error ?? "Could not prepare image upload.");
      }

      const uploadResponse = await fetch(presignPayload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Image upload to R2 failed.");
      }

      setImageObjectKey(presignPayload.objectKey ?? null);
      setImageName(file.name);
    } catch (uploadError) {
      setImageObjectKey(null);
      setImageName(null);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Image upload failed.",
      );
    } finally {
      setUploadingImage(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedItems: ReceiptLineInput[] = lines.map((line) => ({
      productId: line.productId,
      rawName: line.rawName,
      quantity: Number(line.quantity),
      unit: line.unit,
      lineTotal: Number(line.lineTotal),
    }));

    startTransition(async () => {
      const result = await createReceipt({
        storeId,
        purchasedAt,
        subtotal: Number(subtotal),
        tax: Number(tax),
        total: Number(total),
        notes,
        imageObjectKey: imageObjectKey ?? undefined,
        items: parsedItems,
      });

      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <FormErrorSummary message={error} />

      <section className="rounded-lg border border-slate-300 bg-white p-5">
        <h2 className="text-lg font-semibold">Receipt details</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Store</span>
            <select
              value={storeId}
              onChange={(event) => setStoreId(event.target.value)}
              required
              className="h-11 rounded-lg border border-slate-300 px-3"
            >
              <option value="" disabled>
                Select a store
              </option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Purchase date</span>
            <input
              type="date"
              value={purchasedAt}
              onChange={(event) => setPurchasedAt(event.target.value)}
              required
              className="h-11 rounded-lg border border-slate-300 px-3"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Subtotal</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={subtotal}
              onChange={(event) => setSubtotal(event.target.value)}
              required
              className="h-11 rounded-lg border border-slate-300 px-3 tabular-nums"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Tax</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={tax}
              onChange={(event) => setTax(event.target.value)}
              required
              className="h-11 rounded-lg border border-slate-300 px-3 tabular-nums"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Total</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              required
              className="h-11 rounded-lg border border-slate-300 px-3 tabular-nums"
            />
          </label>
          <label className="grid gap-2 text-sm md:col-span-2">
            <span className="font-medium">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="grid gap-2 text-sm md:col-span-2">
            <span className="font-medium">Receipt image (optional)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                void handleImageChange(event.target.files?.[0] ?? null)
              }
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
            {uploadingImage ? (
              <span className="text-sm text-slate-500">Uploading to R2...</span>
            ) : null}
            {imageName ? (
              <span className="text-sm text-emerald-700">
                Uploaded: {imageName}
              </span>
            ) : null}
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-slate-300 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Line items</h2>
          <button
            type="button"
            onClick={() =>
              setLines((current) => [...current, emptyLine(products)])
            }
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium"
          >
            Add item
          </button>
        </div>

        {lines.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            Create a product below before adding line items.
          </p>
        ) : null}

        <div className="mt-4 space-y-4">
          {lines.map((line, index) => {
            const product = productMap.get(line.productId);
            const quantity = Number(line.quantity);
            const lineTotal = Number(line.lineTotal);
            const preview =
              quantity > 0 && lineTotal >= 0
                ? normalizeReceiptItem(quantity, line.unit, lineTotal)
                : null;
            const allowedUnits = product
              ? UNITS_BY_CATEGORY[product.unit_category]
              : (["each"] as SpendlyUnit[]);

            return (
              <div
                key={line.key}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">Item {index + 1}</p>
                  {lines.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setLines((current) =>
                          current.filter((entry) => entry.key !== line.key),
                        )
                      }
                      className="text-sm text-red-600"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium">Product</span>
                    <select
                      value={line.productId}
                      onChange={(event) =>
                        handleProductChange(line.key, event.target.value)
                      }
                      required
                      className="h-11 rounded-lg border border-slate-300 px-3"
                    >
                      {products.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium">Raw item name</span>
                    <input
                      value={line.rawName}
                      onChange={(event) =>
                        updateLine(line.key, { rawName: event.target.value })
                      }
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
                        updateLine(line.key, { quantity: event.target.value })
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
                        updateLine(line.key, {
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
                        updateLine(line.key, { lineTotal: event.target.value })
                      }
                      required
                      className="h-11 rounded-lg border border-slate-300 px-3 tabular-nums"
                    />
                  </label>
                  <div className="grid gap-2 text-sm">
                    <span className="font-medium">Normalized preview</span>
                    <p className="flex h-11 items-center rounded-lg bg-slate-50 px-3 tabular-nums text-slate-700">
                      {preview
                        ? formatUnitPrice(
                            preview.normalizedUnitPrice,
                            preview.normalizedUnit,
                          )
                        : "Enter quantity and total"}
                    </p>
                  </div>
                </div>
                {product &&
                unitCategoryForUnit(line.unit) !== product.unit_category ? (
                  <p className="mt-3 text-sm text-red-600">
                    Unit {line.unit} does not match product category{" "}
                    {product.unit_category}.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-slate-300 bg-white p-5">
          <h2 className="text-lg font-semibold">Quick add store</h2>
          <div className="mt-4 flex gap-3">
            <input
              value={newStoreName}
              onChange={(event) => setNewStoreName(event.target.value)}
              placeholder="Store name"
              className="h-11 flex-1 rounded-lg border border-slate-300 px-3"
            />
            <button
              type="button"
              onClick={() => {
                const formData = new FormData();
                formData.set("name", newStoreName);
                startTransition(async () => {
                  const result = await createStore(formData);
                  if (result.error) {
                    setError(result.error);
                    return;
                  }
                  setNewStoreName("");
                  router.refresh();
                });
              }}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white"
            >
              Add store
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-300 bg-white p-5">
          <h2 className="text-lg font-semibold">Quick add product</h2>
          <div className="mt-4 grid gap-3">
            <input
              value={newProductName}
              onChange={(event) => setNewProductName(event.target.value)}
              placeholder="Product name"
              className="h-11 rounded-lg border border-slate-300 px-3"
            />
            <select
              value={newProductCategory}
              onChange={(event) =>
                setNewProductCategory(
                  event.target.value as "mass" | "volume" | "each",
                )
              }
              className="h-11 rounded-lg border border-slate-300 px-3"
            >
              <option value="mass">Mass (g/kg)</option>
              <option value="volume">Volume (ml/l)</option>
              <option value="each">Each</option>
            </select>
            <button
              type="button"
              onClick={() => {
                const formData = new FormData();
                formData.set("name", newProductName);
                formData.set("unitCategory", newProductCategory);
                startTransition(async () => {
                  const result = await createProduct(formData);
                  if (result.error) {
                    setError(result.error);
                    return;
                  }
                  setNewProductName("");
                  router.refresh();
                });
              }}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white"
            >
              Add product
            </button>
          </div>
        </div>
      </section>

      <button
        type="submit"
        disabled={isPending || uploadingImage || stores.length === 0}
        className="inline-flex h-12 items-center justify-center rounded-lg bg-emerald-700 px-6 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving receipt..." : "Save receipt"}
      </button>
    </form>
  );
}
