import type { SpendlyUnit, SpendlyUnitCategory } from "@/lib/types";

export const UNITS_BY_CATEGORY: Record<SpendlyUnitCategory, SpendlyUnit[]> = {
  mass: ["g", "kg"],
  volume: ["ml", "l"],
  each: ["each"],
};

export const DEFAULT_UNIT_BY_CATEGORY: Record<
  SpendlyUnitCategory,
  SpendlyUnit
> = {
  mass: "kg",
  volume: "l",
  each: "each",
};

export function unitCategoryForUnit(unit: SpendlyUnit): SpendlyUnitCategory {
  if (unit === "g" || unit === "kg") {
    return "mass";
  }

  if (unit === "ml" || unit === "l") {
    return "volume";
  }

  return "each";
}

export function normalizeReceiptItem(
  quantity: number,
  unit: SpendlyUnit,
  lineTotal: number,
) {
  let normalizedQuantity: number;
  let normalizedUnit: SpendlyUnit;

  if (unit === "g") {
    normalizedQuantity = Math.round((quantity / 1000) * 1000) / 1000;
    normalizedUnit = "kg";
  } else if (unit === "kg") {
    normalizedQuantity = Math.round(quantity * 1000) / 1000;
    normalizedUnit = "kg";
  } else if (unit === "ml") {
    normalizedQuantity = Math.round((quantity / 1000) * 1000) / 1000;
    normalizedUnit = "l";
  } else if (unit === "l") {
    normalizedQuantity = Math.round(quantity * 1000) / 1000;
    normalizedUnit = "l";
  } else {
    normalizedQuantity = Math.round(quantity * 1000) / 1000;
    normalizedUnit = "each";
  }

  const normalizedUnitPrice =
    normalizedQuantity > 0
      ? Math.round((lineTotal / normalizedQuantity) * 10000) / 10000
      : 0;

  return { normalizedQuantity, normalizedUnit, normalizedUnitPrice };
}
