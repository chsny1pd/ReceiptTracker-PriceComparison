"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createStore } from "@/app/actions/catalog";
import { saveReceiptDraft } from "@/app/actions/drafts";
import {
  createReceipt,
  type ReceiptLineInput,
} from "@/app/actions/receipts";
import { AddProductModal } from "@/components/add-product-modal";
import { FormErrorSummary } from "@/components/form-error-summary";
import { Modal } from "@/components/ui/modal";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { PendingNotice } from "@/components/ui/pending-notice";
import { Spinner } from "@/components/ui/spinner";
import { consumeCompareCartReceiptDraft } from "@/lib/compare-cart";
import { compressImageIfNeeded } from "@/lib/client-image";
import { formatMoney, formatUnitPrice } from "@/lib/format";
import {
  blankReceiptDraftPayload,
  clearLocalReceiptDraft,
  loadLocalReceiptDraft,
  saveLocalReceiptDraft,
  type ReceiptDraftLine,
  type ReceiptDraftPayload,
} from "@/lib/receipt-drafts";
import type { Product, SpendlyUnit, Store } from "@/lib/types";
import {
  normalizeReceiptItem,
  UNITS_BY_CATEGORY,
  unitCategoryForUnit,
} from "@/lib/units";
import { useAppPreferences } from "@/components/app-preferences-provider";

const secondaryActionButtonClassName =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-300 px-3 text-sm font-medium text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50";

type DraftLine = {
  key: string;
  productId: string;
  rawName: string;
  quantity: string;
  unit: SpendlyUnit;
  lineTotal: string;
  imageObjectKey: string | null;
  imageName: string | null;
  imagePreviewUrl: string | null;
};

type ReceiptFormProps = {
  stores: Store[];
  products: Product[];
  initialDraft?: ReceiptDraftPayload | null;
  initialDraftId?: string | null;
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
    imageObjectKey: null,
    imageName: null,
    imagePreviewUrl: null,
  };
}

function lineFromDraft(line: ReceiptDraftLine): DraftLine {
  return {
    key: line.key || crypto.randomUUID(),
    productId: line.productId,
    rawName: line.rawName,
    quantity: line.quantity,
    unit: line.unit,
    lineTotal: line.lineTotal,
    imageObjectKey: line.imageObjectKey,
    imageName: line.imageName,
    imagePreviewUrl: null,
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
    imageObjectKey: null,
    imageName: null,
    imagePreviewUrl: null,
  }));
}

export function ReceiptForm({
  stores,
  products,
  initialDraft,
  initialDraftId,
}: ReceiptFormProps) {
  const { dict } = useAppPreferences();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAddingStore, startAddStoreTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const compareDraft = consumeCompareCartReceiptDraft();
  const localDraft =
    initialDraft || compareDraft ? null : loadLocalReceiptDraft();
  const effectiveInitialDraft =
    initialDraft ??
    (compareDraft
      ? {
          ...blankReceiptDraftPayload(),
          title: compareDraft.title,
          lines: draftLineToState(compareDraft),
        }
      : null) ??
    localDraft;

  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [title, setTitle] = useState(effectiveInitialDraft?.title ?? "");
  const [storeId, setStoreId] = useState(
    () => effectiveInitialDraft?.storeId || stores[0]?.id || "",
  );
  const [purchasedAt, setPurchasedAt] = useState(
    effectiveInitialDraft?.purchasedAt ?? new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState(effectiveInitialDraft?.notes ?? "");
  const [imageObjectKey, setImageObjectKey] = useState<string | null>(
    effectiveInitialDraft?.imageObjectKey ?? null,
  );
  const [imageName, setImageName] = useState<string | null>(
    effectiveInitialDraft?.imageName ?? null,
  );
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingLineKey, setUploadingLineKey] = useState<string | null>(null);
  const [lines, setLines] = useState<DraftLine[]>(() => {
    if (effectiveInitialDraft?.lines.length) {
      return effectiveInitialDraft.lines.map(lineFromDraft);
    }
    return products.length > 0 ? [emptyLine(products)] : [];
  });
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productModalLineKey, setProductModalLineKey] = useState<string | null>(
    null,
  );
  const [newStoreName, setNewStoreName] = useState("");
  const lastSerializedDraft = useRef<string>("");

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
    isPending || isAddingStore || uploadingImage || uploadingLineKey !== null;

  const draftPayload = useMemo<ReceiptDraftPayload>(
    () => ({ 
      title,
      storeId,
      purchasedAt,
      notes,
      imageObjectKey,
      imageName,
      lines: lines.map((line) => ({
        key: line.key,
        productId: line.productId,
        rawName: line.rawName,
        quantity: line.quantity,
        unit: line.unit,
        lineTotal: line.lineTotal,
        imageObjectKey: line.imageObjectKey,
        imageName: line.imageName,
      })),
    }),
    [title, storeId, purchasedAt, notes, imageObjectKey, imageName, lines],
  );

  const hasMeaningfulDraftContent = useMemo(
    () =>
      Boolean(
        title.trim() ||
          notes.trim() ||
          imageObjectKey ||
          lines.some(
            (line) =>
              line.rawName.trim() ||
              Number(line.lineTotal) > 0 ||
              line.imageObjectKey ||
              line.quantity !== "1",
          ),
      ),
    [title, notes, imageObjectKey, lines],
  );

  useEffect(() => {
    if (!hasMeaningfulDraftContent) {
      return;
    }

    saveLocalReceiptDraft(draftPayload);
    const serialized = JSON.stringify(draftPayload);
    if (serialized === lastSerializedDraft.current) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setIsSavingDraft(true);
      const result = await saveReceiptDraft({
        draftId,
        payload: draftPayload,
      });
      if (result.data?.id) {
        setDraftId(result.data.id);
        lastSerializedDraft.current = serialized;
      }
      setIsSavingDraft(false);
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [draftPayload, draftId, hasMeaningfulDraftContent]);

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

  function handleProductCreated(product: Product) {
    const lineKey = productModalLineKey;
    if (lineKey) {
      updateLine(lineKey, {
        productId: product.id,
        unit: product.default_unit,
      });
    } else if (lines.length === 0) {
      setLines([
        {
          key: crypto.randomUUID(),
          productId: product.id,
          rawName: "",
          quantity: "1",
          unit: product.default_unit,
          lineTotal: "0",
          imageObjectKey: null,
          imageName: null,
          imagePreviewUrl: null,
        },
      ]);
    }

    setProductModalLineKey(null);
    router.refresh();
  }

  async function prepareUploadFile(file: File, maxDimension: number) {
    return compressImageIfNeeded(file, {
      maxDimension,
      maxBytes: 4.5 * 1024 * 1024,
    });
  }

  function clearReceiptImage() {
    if (imagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
    setImageObjectKey(null);
    setImageName(null);
  }

  async function handleImageChange(file: File | null) {
    if (!file) {
      clearReceiptImage();
      return;
    }

    if (imagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(URL.createObjectURL(file));
    setUploadingImage(true);
    setError(null);

    try {
      const compressedFile = await prepareUploadFile(file, 1800);
      const presignResponse = await fetch("/api/receipt-images/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: compressedFile.type,
          fileSize: compressedFile.size,
        }),
      });
      const presignPayload = (await presignResponse.json()) as {
        objectKey?: string;
        uploadUrl?: string;
        error?: string;
      };

      if (!presignResponse.ok || !presignPayload.uploadUrl || !presignPayload.objectKey) {
        throw new Error(presignPayload.error ?? "Could not prepare image upload.");
      }

      const uploadResponse = await fetch(presignPayload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": compressedFile.type },
        body: compressedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Image upload to R2 failed.");
      }

      setImageObjectKey(presignPayload.objectKey ?? null);
      setImageName(compressedFile.name);
    } catch (uploadError) {
      clearReceiptImage();
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : dict.common.imageUploadFailed,
      );
    } finally {
      setUploadingImage(false);
    }
  }

  function clearLineImage(lineKey: string) {
    const line = lines.find((entry) => entry.key === lineKey);
    if (line?.imagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(line.imagePreviewUrl);
    }
    updateLine(lineKey, {
      imageObjectKey: null,
      imageName: null,
      imagePreviewUrl: null,
    });
  }

  async function handleLineImageChange(lineKey: string, file: File | null) {
    if (!file) {
      clearLineImage(lineKey);
      return;
    }

    const line = lines.find((entry) => entry.key === lineKey);
    if (line?.imagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(line.imagePreviewUrl);
    }
    updateLine(lineKey, {
      imagePreviewUrl: URL.createObjectURL(file),
    });
    setUploadingLineKey(lineKey);
    setError(null);

    try {
      const compressedFile = await prepareUploadFile(file, 1600);
      const presignResponse = await fetch("/api/item-images/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: compressedFile.type,
          fileSize: compressedFile.size,
        }),
      });
      const presignPayload = (await presignResponse.json()) as {
        objectKey?: string;
        uploadUrl?: string;
        error?: string;
      };

      if (!presignResponse.ok || !presignPayload.uploadUrl) {
        throw new Error(
          presignPayload.error ?? "Could not prepare item image upload.",
        );
      }

      const uploadResponse = await fetch(presignPayload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": compressedFile.type },
        body: compressedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Item image upload to R2 failed.");
      }

      updateLine(lineKey, {
        imageObjectKey: presignPayload.objectKey ?? null,
        imageName: compressedFile.name,
      });
    } catch (uploadError) {
      clearLineImage(lineKey);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : dict.common.imageUploadFailed,
      );
    } finally {
      setUploadingLineKey(null);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!storeId) {
      setError(dict.receipts.selectOrAddStore);
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
        imageObjectKey: line.imageObjectKey ?? undefined,
      }));

    if (parsedItems.length === 0) {
      setError(dict.receipts.addLineItemWithProduct);
      return;
    }

    startTransition(async () => {
      clearLocalReceiptDraft();
      const result = await createReceipt({
        draftId: draftId ?? undefined,
        title,
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

  let pendingMessage: string = dict.receipts.savingReceipt;
  if (isSavingDraft) {
    pendingMessage = dict.receipts.savingDraft;
  } else if (uploadingImage) {
    pendingMessage = dict.receipts.uploadingReceiptImage;
  } else if (uploadingLineKey) {
    pendingMessage = dict.receipts.uploadingItemImage;
  } else if (isAddingStore) {
    pendingMessage = dict.receipts.addingStore;
  }

  return (
    <>
      <PendingNotice show={isBusy || isSavingDraft} message={pendingMessage} />

      <form
        onSubmit={handleSubmit}
        className="space-y-8"
        aria-busy={isBusy || isSavingDraft}
      >
        <FormErrorSummary message={error} />

        <section className="rounded-lg border border-slate-300 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{dict.receipts.details}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {dict.receipts.autosaveBody}
              </p>
            </div>
            <span className="text-sm text-slate-500">
              {isSavingDraft
                ? dict.receipts.savingDraft
                : draftId
                  ? dict.receipts.draftSaved
                  : dict.receipts.autosaveStarts}
            </span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm md:col-span-2">
              <span className="font-medium">{dict.receipts.itemName}</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={dict.receipts.itemNamePlaceholder}
                className="h-11 rounded-lg border border-slate-300 px-3"
              />
              <p className="text-xs text-slate-500">
                {dict.receipts.itemNameHelp}
              </p>
            </label>
            <label className="grid gap-2 text-sm">
              <span className="flex items-center justify-between gap-3">
                <span className="font-medium">{dict.receipts.store}</span>
                <button
                  type="button"
                  onClick={() => setStoreModalOpen(true)}
                  className={secondaryActionButtonClassName}
                >
                  {dict.receipts.addStore}
                </button>
              </span>
              <select
                value={storeId || ""}
                onChange={(event) => handleStoreSelect(event.target.value)}
                required
                className="h-11 rounded-lg border border-slate-300 px-3"
              >
                <option value="" disabled>
                  {dict.receipts.selectStore}
                </option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium">{dict.receipts.purchaseDate}</span>
              <input
                type="date"
                value={purchasedAt}
                onChange={(event) => setPurchasedAt(event.target.value)}
                required
                className="h-11 rounded-lg border border-slate-300 px-3"
              />
            </label>
            <div className="grid gap-2 text-sm">
              <span className="font-medium">{dict.common.subtotal}</span>
              <p className="flex h-11 items-center rounded-lg bg-slate-50 px-3 tabular-nums text-slate-700">
                {formatMoney(computedSubtotal)}
              </p>
              <p className="text-xs text-slate-500">
                {dict.receipts.subtotalHelp}
              </p>
            </div>
            <div className="grid gap-2 text-sm">
              <span className="font-medium">{dict.receipts.tax}</span>
              <p className="flex h-11 items-center rounded-lg bg-slate-50 px-3 tabular-nums text-slate-700">
                {formatMoney(computedTax)}
              </p>
              <p className="text-xs text-slate-500">{dict.receipts.taxHelp}</p>
            </div>
            <div className="grid gap-2 text-sm">
              <span className="font-medium">{dict.common.total}</span>
              <p className="flex h-11 items-center rounded-lg bg-slate-50 px-3 tabular-nums font-semibold text-slate-900">
                {formatMoney(computedTotal)}
              </p>
              <p className="text-xs text-slate-500">
                {dict.receipts.totalHelp}
              </p>
            </div>
            <label className="grid gap-2 text-sm md:col-span-2">
              <span className="font-medium">{dict.receipts.notes}</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <div className="grid gap-2 text-sm md:col-span-2">
              <span className="font-medium">{dict.receipts.receiptImage}</span>
              <ImageUploadField
                fileInputId="receipt-image-upload"
                disabled={isPending}
                uploading={uploadingImage}
                previewUrl={imagePreviewUrl}
                imageName={imageName}
                onFileSelect={(file) => void handleImageChange(file)}
                onRemove={clearReceiptImage}
                chooseLabel={dict.receipts.chooseReceiptImage}
                replaceLabel={dict.receipts.replaceReceiptImage}
                uploadingLabel={dict.receipts.compressingUpload}
                removeLabel={dict.common.removeImage}
                helpText={dict.receipts.receiptImageHelp}
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-300 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">{dict.receipts.lineItems}</h2>
            <button
              type="button"
              onClick={() =>
                setLines((current) => [...current, emptyLine(products)])
              }
              className={secondaryActionButtonClassName}
            >
              {dict.receipts.addItem}
            </button>
          </div>

          {lines.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center">
              <p className="text-sm text-slate-600">
                {dict.receipts.noLineItems}
              </p>
              <button
                type="button"
                onClick={() => setLines([emptyLine(products)])}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium transition hover:bg-slate-50"
              >
                {dict.receipts.addFirstItem}
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
                    <p className="text-sm font-medium">{dict.receipts.item} {index + 1}</p>
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
                        {dict.common.remove}
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm">
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-medium">{dict.compare.product}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setProductModalLineKey(line.key);
                            setProductModalOpen(true);
                          }}
                          className={secondaryActionButtonClassName}
                        >
                          {dict.compare.addProduct}
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
                          {dict.compare.selectProduct}
                        </option>
                        {products.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm">
                      <span className="font-medium">{dict.receipts.brand}</span>
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
                      <span className="font-medium">{dict.common.quantity}</span>
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
                      <span className="font-medium">{dict.common.unit}</span>
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
                      <span className="font-medium">{dict.receipts.lineTotal}</span>
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
                      <p className="text-xs text-slate-500">{dict.compare.includesVat}</p>
                    </label>
                    <div className="grid gap-2 text-sm">
                      <span className="font-medium">{dict.compare.normalizedPreview}</span>
                      <p className="flex h-11 items-center rounded-lg bg-slate-50 px-3 tabular-nums text-slate-700">
                        {preview
                          ? formatUnitPrice(
                              preview.normalizedUnitPrice,
                              preview.normalizedUnit,
                            )
                          : dict.receipts.enterQuantityAndTotal}
                      </p>
                    </div>
                    <div className="grid gap-2 text-sm md:col-span-2">
                      <span className="font-medium">{dict.receipts.itemImage}</span>
                      <ImageUploadField
                        fileInputId={`line-image-${line.key}`}
                        disabled={isPending}
                        uploading={uploadingLineKey === line.key}
                        previewUrl={line.imagePreviewUrl}
                        imageName={line.imageName}
                        onFileSelect={(file) => void handleLineImageChange(line.key, file)}
                        onRemove={() => clearLineImage(line.key)}
                        chooseLabel={dict.receipts.chooseItemImage}
                        replaceLabel={dict.receipts.replaceItemImage}
                        uploadingLabel={dict.receipts.compressingUpload}
                        removeLabel={dict.common.removeImage}
                        helpText={dict.receipts.itemImageHelp}
                      />
                    </div>
                  </div>
                  {product &&
                  unitCategoryForUnit(line.unit) !== product.unit_category ? (
                    <p className="mt-3 text-sm text-red-600">
                      {dict.receipts.unitMismatch
                        .replace("{unit}", line.unit)
                        .replace("{category}", product.unit_category)}
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
              {dict.receipts.savingReceipt}
            </>
          ) : (
            dict.receipts.saveReceipt
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
        title={dict.receipts.addStoreTitle}
      >
        <div className="space-y-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium">{dict.receipts.storeName}</span>
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
                {dict.receipts.addingStoreButton}
              </>
            ) : (
              dict.receipts.addStore
            )}
          </button>
        </div>
      </Modal>

      <AddProductModal
        open={productModalOpen}
        onClose={() => {
          setProductModalOpen(false);
          setProductModalLineKey(null);
        }}
        onSuccess={handleProductCreated}
        onError={(message) => setError(message || null)}
      />
    </>
  );
}
