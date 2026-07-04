import type { SpendlyUnit } from "@/lib/types";
import { normalizeReceiptItem } from "@/lib/units";

export type CompareCartItem = {
  productId: string;
  productName: string;
  brandName: string;
  quantity: number;
  unit: SpendlyUnit;
  normalizedUnitPrice: number;
};

export type CompareCartReceiptDraft = {
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
let consumedReceiptDraftSearch: string | null = null;

export function compareCartItemKey(productId: string, brandName: string) {
  return `${productId}:${brandName.trim().toLowerCase()}`;
}

export function lineTotalForCartItem(item: CompareCartItem) {
  return Math.round(item.normalizedUnitPrice * item.quantity * 100) / 100;
}

function normalizeLegacyCartItem(item: Record<string, unknown>): CompareCartItem | null {
  const productId = typeof item.productId === "string" ? item.productId : "";
  const productName = typeof item.productName === "string" ? item.productName : "";
  const brandName =
    typeof item.brandName === "string"
      ? item.brandName
      : typeof item.storeName === "string"
        ? item.storeName
        : "";
  const quantity = typeof item.quantity === "number" ? item.quantity : 0;
  const unit = item.unit as SpendlyUnit;
  const normalizedUnitPrice =
    typeof item.normalizedUnitPrice === "number" ? item.normalizedUnitPrice : 0;

  if (!productId || !brandName || quantity <= 0) {
    return null;
  }

  return {
    productId,
    productName,
    brandName,
    quantity,
    unit,
    normalizedUnitPrice,
  };
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

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) =>
        normalizeLegacyCartItem(item as Record<string, unknown>),
      )
      .filter((item): item is CompareCartItem => item !== null);
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

  return {
    lines: items.map((item) => ({
      productId: item.productId,
      rawName: item.brandName,
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

  consumedReceiptDraft = undefined;
  consumedReceiptDraftSearch = null;
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

  const search = window.location.search;
  if (consumedReceiptDraftSearch === search && consumedReceiptDraft !== undefined) {
    return consumedReceiptDraft;
  }

  const params = new URLSearchParams(search);
  if (params.get("from") !== "compare") {
    consumedReceiptDraftSearch = search;
    consumedReceiptDraft = null;
    return null;
  }

  const draft = loadCompareCartReceiptDraft();
  if (draft) {
    window.sessionStorage.removeItem(COMPARE_CART_RECEIPT_DRAFT_KEY);
  }

  consumedReceiptDraftSearch = search;
  consumedReceiptDraft = draft;
  return draft;
}

export function clearCompareCartReceiptDraft() {
  if (typeof window === "undefined") {
    return;
  }

  consumedReceiptDraft = undefined;
  consumedReceiptDraftSearch = null;
  window.sessionStorage.removeItem(COMPARE_CART_RECEIPT_DRAFT_KEY);
}

export type BrandPriceEntry = {
  brandName: string;
  quantity: string;
  unit: SpendlyUnit;
  lineTotal: string;
};

export type DraftBrandLine = BrandPriceEntry & {
  key: string;
};

export type BrandCompareRow = {
  brandName: string;
  quantity: number;
  unit: SpendlyUnit;
  lineTotal: number;
  normalizedUnit: SpendlyUnit;
  normalizedUnitPrice: number;
};

export type BrandCompareOutcome =
  | { kind: "none" }
  | { kind: "same_brand" }
  | { kind: "incomplete" }
  | { kind: "unit_mismatch"; units: SpendlyUnit[] }
  | { kind: "tie"; unit: SpendlyUnit; price: number }
  | {
      kind: "winner";
      winnerBrandName: string;
      savings: number;
      unit: SpendlyUnit;
    };

export function emptyBrandLine(defaultUnit: SpendlyUnit = "each"): DraftBrandLine {
  return {
    key: crypto.randomUUID(),
    brandName: "",
    quantity: "1",
    unit: defaultUnit,
    lineTotal: "",
  };
}

export function buildBrandCompareRow(entry: BrandPriceEntry): BrandCompareRow | null {
  const quantity = Number(entry.quantity);
  const lineTotal = Number(entry.lineTotal);

  if (!entry.brandName.trim() || quantity <= 0 || lineTotal < 0) {
    return null;
  }

  const normalized = normalizeReceiptItem(quantity, entry.unit, lineTotal);

  return {
    brandName: entry.brandName.trim(),
    quantity,
    unit: entry.unit,
    lineTotal,
    normalizedUnit: normalized.normalizedUnit,
    normalizedUnitPrice: normalized.normalizedUnitPrice,
  };
}

export function buildCompareOutcomeFromRows(
  rows: BrandCompareRow[],
): BrandCompareOutcome {
  if (rows.length < 2) {
    return { kind: "incomplete" };
  }

  const brandNames = rows.map((row) => row.brandName.trim().toLowerCase());
  if (new Set(brandNames).size !== brandNames.length) {
    return { kind: "same_brand" };
  }

  const units = [...new Set(rows.map((row) => row.normalizedUnit))];
  if (units.length > 1) {
    return { kind: "unit_mismatch", units };
  }

  const sorted = [...rows].sort(
    (left, right) => left.normalizedUnitPrice - right.normalizedUnitPrice,
  );
  const cheapest = sorted[0]!;
  const mostExpensive = sorted[sorted.length - 1]!;

  if (cheapest.normalizedUnitPrice === mostExpensive.normalizedUnitPrice) {
    return {
      kind: "tie",
      unit: cheapest.normalizedUnit,
      price: cheapest.normalizedUnitPrice,
    };
  }

  return {
    kind: "winner",
    winnerBrandName: cheapest.brandName,
    savings: mostExpensive.normalizedUnitPrice - cheapest.normalizedUnitPrice,
    unit: cheapest.normalizedUnit,
  };
}
