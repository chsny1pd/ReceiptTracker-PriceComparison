import type { SpendlyUnit } from "@/lib/types";

export const LOCAL_RECEIPT_DRAFT_KEY = "spendly:receipt-draft";

export type ReceiptDraftLine = {
  key: string;
  productId: string;
  rawName: string;
  quantity: string;
  unit: SpendlyUnit;
  lineTotal: string;
  imageObjectKey: string | null;
  imageName: string | null;
};

export type ReceiptDraftPayload = {
  storeId: string;
  purchasedAt: string;
  notes: string;
  imageObjectKey: string | null;
  imageName: string | null;
  lines: ReceiptDraftLine[];
};

export function blankReceiptDraftPayload(): ReceiptDraftPayload {
  return {
    storeId: "",
    purchasedAt: new Date().toISOString().slice(0, 10),
    notes: "",
    imageObjectKey: null,
    imageName: null,
    lines: [],
  };
}

export function buildReceiptDraftTitle(payload: ReceiptDraftPayload) {
  const lineCount = payload.lines.length;
  const storeLabel = payload.storeId ? "Saved store" : "Untitled";
  return `${storeLabel} · ${lineCount} item${lineCount === 1 ? "" : "s"}`;
}

export function loadLocalReceiptDraft(): ReceiptDraftPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_RECEIPT_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as ReceiptDraftPayload) : null;
  } catch {
    return null;
  }
}

export function saveLocalReceiptDraft(payload: ReceiptDraftPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCAL_RECEIPT_DRAFT_KEY, JSON.stringify(payload));
}

export function clearLocalReceiptDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LOCAL_RECEIPT_DRAFT_KEY);
}
