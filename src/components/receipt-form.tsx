"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createProduct, createStore } from "@/app/actions/catalog";
import {
  createReceipt,
  type ReceiptLineInput,
} from "@/app/actions/receipts";
import { FormErrorSummary } from "@/components/form-error-summary";
import { Modal } from "@/components/ui/modal";
import { PendingNotice } from "@/components/ui/pending-notice";
import { Spinner } from "@/components/ui/spinner";
import { consumeCompareCartReceiptDraft } from "@/lib/compare-cart";
import { formatMoney, formatUnitPrice } from "@/lib/format";
import type { Product, SpendlyUnit, Store } from "@/lib/types";
import {
  normalizeReceiptItem,
  UNITS_BY_CATEGORY,
  unitCategoryForUnit,
} from "@/lib/units";

const secondaryActionButtonClassName =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-300 px-3 text-sm font-medium text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50";

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
    rawName: "",
    quantity: "1",
    unit: firstProduct?.default_unit ?? "each",
    lineTotal: "0",
  };
}

const RECEIPT_TAX_RATE = 0.07;

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function splitTaxInclusiveTotal(grossTotal: number) {
  const roundedGross = roundMoney(grossTotal);
  const subtotal = roundMoney(roundedGross / (1 + RECEIPT_TAX_RATE));
  const tax = roundMoney(roundedGross - subtotal);

  return { subtotal, tax, total: roundedGross };
}

function draftLineToState(
  draft: NonNullable<ReturnType<typeof consumeCompareCartReceiptDraft>>,
): DraftLine[] {
  return draft.lines.map((line) => ({
    key: crypto.randomUUID(),
    productId: line.productId,
    rawName: line.rawName,
    quantity: line.quantity,
    unit: line.unit,
    lineTotal: line.lineTotal,
  }));
}

export function ReceiptForm({ stores, products }: ReceiptFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAddingStore, startAddStoreTransition] = useTransition();
  const [isAddingProduct, startAddProductTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState(() => stores[0]?.id ?? "");
  const [purchasedAt, setPurchasedAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [imageObjectKey, setImageObjectKey] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>(() => {
    const draft = consumeCompareCartReceiptDraft();
    if (draft) {
      return draftLineToState(draft);
    }

    return products.length > 0 ? [emptyLine(products)] : [];
  });
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productModalLineKey, setProductModalLineKey] = useState<string | null>(
    null,
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

  const computedGrossTotal = useMemo(
    () =>
      roundMoney(
        lines.reduce((sum, line) => sum + (Number(line.lineTotal) || 0), 0),
      ),
    [lines],
  );

  const { subtotal: computedSubtotal, tax: computedTax, total: computedTotal } =
    useMemo(
      () => splitTaxInclusiveTotal(computedGrossTotal),
      [computedGrossTotal],
    );

  const isBusy =
    isPending || isAddingStore || isAddingProduct || uploadingImage;

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function handleStoreSelect(value: string) {
    setStoreId(value);
  }

  function handleProductSelect(lineKey: string, productId: string) {
    const product = productMap.get(productId);
    updateLine(lineKey, {
      productId,
      unit: product?.default_unit ?? "each",
    });
  }

  function handleAddStore() {
    setError(null);
    const formData = new FormData();
    formData.set("name", newStoreName);

    startAddStoreTransition(async () => {
      const result = await createStore(formData);
      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data) {
        setStoreId(result.data.id);
      }

      setNewStoreName("");
      setStoreModalOpen(false);
      router.refresh();
    });
  }

  function handleAddProduct() {
    setError(null);
    const formData = new FormData();
    formData.set("name", newProductName);
    formData.set("unitCategory", newProductCategory);

    startAddProductTransition(async () => {
      const result = await createProduct(formData);
      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data) {
        const lineKey = productModalLineKey;
        if (lineKey) {
          updateLine(lineKey, {
            productId: result.data.id,
            unit: result.data.default_unit,
          });
        } else if (lines.length === 0) {
          setLines([
            {
              key: crypto.randomUUID(),
              productId: result.data.id,
              rawName: "",
              quantity: "1",
              unit: result.data.default_unit,
              lineTotal: "0",
            },
          ]);
        }
      }

      setNewProductName("");
      setProductModalOpen(false);
      setProductModalLineKey(null);
      router.refresh();
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

    if (!storeId) {
      setError("Select or add a store.");
      return;
    }

    const parsedItems: ReceiptLineInput[] = lines
      .filter((line) => line.productId)
      .map((line) => ({
        productId: line.productId,
        rawName: line.rawName,
        quantity: Number(line.quantity),
        unit: line.unit,
        lineTotal: Number(line.lineTotal),
      }));

    if (parsedItems.length === 0) {
      setError("Add at least one line item with a product.");
      return;
    }

    startTransition(async () => {
      const result = await createReceipt({
        storeId,
        purchasedAt,
        subtotal: computedSubtotal,
        tax: computedTax,
        total: computedTotal,
        notes,
        imageObjectKey: imageObjectKey ?? undefined,
        items: parsedItems,
      });

      if (result?.error) {
        setError(result.error);
      }
    });
  }

  let pendingMessage = "Saving receipt...";
  if (uploadingImage) {
    pendingMessage = "Uploading receipt image...";
  } else if (isAddingStore) {
    pendingMessage = "Adding store...";
  } else if (isAddingProduct) {
    pendingMessage = "Adding product...";
  }

  return (
    <>
      <PendingNotice show={isBusy} message={pendingMessage} />

      <form onSubmit={handleSubmit} className="space-y-8" aria-busy={isBusy}>
        <FormErrorSummary message={error} />

        <section className="rounded-lg border border-slate-300 bg-white p-5">
          <h2 className="text-lg font-semibold">Receipt details</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="flex items-center justify-between gap-3">
                <span className="font-medium">Store</span>
                <button
                  type="button"
                  onClick={() => setStoreModalOpen(true)}
                  className={secondaryActionButtonClassName}
                >
                  Add store
                </button>
              </span>
              <select
                value={storeId || ""}
                onChange={(event) => handleStoreSelect(event.target.value)}
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
            <div className="grid gap-2 text-sm">
              <span className="font-medium">Subtotal</span>
              <p className="flex h-11 items-center rounded-lg bg-slate-50 px-3 tabular-nums text-slate-700">
                {formatMoney(computedSubtotal)}
              </p>
              <p className="text-xs text-slate-500">
                Pre-tax amount extracted from line totals (VAT inclusive).
              </p>
            </div>
            <div className="grid gap-2 text-sm">
              <span className="font-medium">Tax (7%)</span>
              <p className="flex h-11 items-center rounded-lg bg-slate-50 px-3 tabular-nums text-slate-700">
                {formatMoney(computedTax)}
              </p>
              <p className="text-xs text-slate-500">
                VAT portion of line totals.
              </p>
            </div>
            <div className="grid gap-2 text-sm">
              <span className="font-medium">Total</span>
              <p className="flex h-11 items-center rounded-lg bg-slate-50 px-3 tabular-nums font-semibold text-slate-900">
                {formatMoney(computedTotal)}
              </p>
              <p className="text-xs text-slate-500">
                Sum of line totals (subtotal + tax).
              </p>
            </div>
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
                disabled={uploadingImage}
                onChange={(event) =>
                  void handleImageChange(event.target.files?.[0] ?? null)
                }
                className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-60"
              />
              {uploadingImage ? (
                <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                  <Spinner size="sm" />
                  Uploading to R2...
                </span>
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
              className={secondaryActionButtonClassName}
            >
              Add item
            </button>
          </div>

          {lines.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center">
              <p className="text-sm text-slate-600">
                No line items yet. Add an item, then use{" "}
                <strong>Add product</strong> if you need a new product.
              </p>
              <button
                type="button"
                onClick={() => setLines([emptyLine(products)])}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium transition hover:bg-slate-50"
              >
                Add first item
              </button>
            </div>
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
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm">
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-medium">Product</span>
                        <button
                          type="button"
                          onClick={() => {
                            setProductModalLineKey(line.key);
                            setProductModalOpen(true);
                          }}
                          className={secondaryActionButtonClassName}
                        >
                          Add product
                        </button>
                      </span>
                      <select
                        value={line.productId || ""}
                        onChange={(event) =>
                          handleProductSelect(line.key, event.target.value)
                        }
                        required
                        className="h-11 rounded-lg border border-slate-300 px-3"
                      >
                        <option value="" disabled>
                          Select product
                        </option>
                        {products.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm">
                      <span className="font-medium">Brand</span>
                      <input
                        value={line.rawName}
                        onChange={(event) =>
                          updateLine(line.key, { rawName: event.target.value })
                        }
                        required
                        placeholder="e.g. Brand A"
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
                      <p className="text-xs text-slate-500">
                        Includes 7% VAT.
                      </p>
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

        <button
          type="submit"
          disabled={isBusy || !storeId || lines.length === 0}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Spinner size="sm" className="border-white/30 border-t-white" />
              Saving receipt...
            </>
          ) : (
            "Save receipt"
          )}
        </button>
      </form>

      <Modal
        open={storeModalOpen}
        onClose={() => {
          if (!isAddingStore) {
            setStoreModalOpen(false);
            setNewStoreName("");
          }
        }}
        title="Add store"
      >
        <div className="space-y-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Store name</span>
            <input
              value={newStoreName}
              onChange={(event) => setNewStoreName(event.target.value)}
              placeholder="e.g. Fresh Market"
              autoFocus
              className="h-11 rounded-lg border border-slate-300 px-3"
            />
          </label>
          <button
            type="button"
            disabled={isAddingStore || !newStoreName.trim()}
            onClick={handleAddStore}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAddingStore ? (
              <>
                <Spinner size="sm" className="border-white/30 border-t-white" />
                Adding store...
              </>
            ) : (
              "Add store"
            )}
          </button>
        </div>
      </Modal>

      <Modal
        open={productModalOpen}
        onClose={() => {
          if (!isAddingProduct) {
            setProductModalOpen(false);
            setNewProductName("");
            setProductModalLineKey(null);
          }
        }}
        title="Add product"
      >
        <div className="space-y-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Product name</span>
            <input
              value={newProductName}
              onChange={(event) => setNewProductName(event.target.value)}
              placeholder="e.g. Milk"
              autoFocus
              className="h-11 rounded-lg border border-slate-300 px-3"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Unit category</span>
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
          </label>
          <button
            type="button"
            disabled={isAddingProduct || !newProductName.trim()}
            onClick={handleAddProduct}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAddingProduct ? (
              <>
                <Spinner size="sm" className="border-white/30 border-t-white" />
                Adding product...
              </>
            ) : (
              "Add product"
            )}
          </button>
        </div>
      </Modal>
    </>
  );
}
