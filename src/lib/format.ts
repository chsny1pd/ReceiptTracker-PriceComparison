import type { SpendlyUnit } from "@/lib/types";

export function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatUnitPrice(amount: number, unit: SpendlyUnit) {
  return `${formatMoney(amount)} / ${unit}`;
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(`${date}T00:00:00`));
}
