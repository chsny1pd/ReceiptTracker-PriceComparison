import type { SpendlyUnit } from "@/lib/types";

export type CompareCartItem = {
  productId: string;
  productName: string;
  storeId: string;
  storeName: string;
  quantity: number;
  unit: SpendlyUnit;
  normalizedUnitPrice: number;
};

export type CompareCartReceiptDraft = {
  storeId: string;
  lines: Array<{
    productId: string;
    rawName: string;
    quantity: string;
    unit: SpendlyUnit;
    lineTotal: string;
  }>;
};

export const COMPARE_CART_STORAGE_KEY = "spendly:compare-cart";
export const COMPARE_CART_RECEIPT_DRAFT_KEY = "spendly:compare-cart-receipt-draft";

let consumedReceiptDraft: CompareCartReceiptDraft | null | undefined;

export function compareCartItemKey(productId: string, storeId: string) {
  return `${productId}:${storeId}`;
}

export function lineTotalForCartItem(item: CompareCartItem) {
  return Math.round(item.normalizedUnitPrice * item.quantity * 100) / 100;
}

export function loadCompareCart(): CompareCartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(COMPARE_CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as CompareCartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCompareCart(items: CompareCartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(COMPARE_CART_STORAGE_KEY, JSON.stringify(items));
}

export function buildReceiptDraftFromCart(
  items: CompareCartItem[],
): CompareCartReceiptDraft | null {
  if (items.length === 0) {
    return null;
  }

  const storeCounts = new Map<string, number>();
  for (const item of items) {
    storeCounts.set(
      item.storeId,
      (storeCounts.get(item.storeId) ?? 0) + item.quantity,
    );
  }

  let storeId = items[0]!.storeId;
  let highestCount = 0;
  for (const [candidateStoreId, count] of storeCounts) {
    if (count > highestCount) {
      highestCount = count;
      storeId = candidateStoreId;
    }
  }

  return {
    storeId,
    lines: items.map((item) => ({
      productId: item.productId,
      rawName: item.productName,
      quantity: String(item.quantity),
      unit: item.unit,
      lineTotal: String(lineTotalForCartItem(item)),
    })),
  };
}

export function saveCompareCartReceiptDraft(draft: CompareCartReceiptDraft) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    COMPARE_CART_RECEIPT_DRAFT_KEY,
    JSON.stringify(draft),
  );
}

export function loadCompareCartReceiptDraft(): CompareCartReceiptDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(COMPARE_CART_RECEIPT_DRAFT_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as CompareCartReceiptDraft;
  } catch {
    return null;
  }
}

export function consumeCompareCartReceiptDraft(): CompareCartReceiptDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (consumedReceiptDraft !== undefined) {
    return consumedReceiptDraft;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("from") !== "compare") {
    consumedReceiptDraft = null;
    return null;
  }

  const draft = loadCompareCartReceiptDraft();
  if (draft) {
    window.sessionStorage.removeItem(COMPARE_CART_RECEIPT_DRAFT_KEY);
  }

  consumedReceiptDraft = draft;
  return draft;
}

export function clearCompareCartReceiptDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(COMPARE_CART_RECEIPT_DRAFT_KEY);
}
