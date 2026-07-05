import { relationName } from "@/lib/supabase-helpers";

type ReceiptLabelSource = {
  title?: string | null;
  stores?: { name?: string | null } | { name?: string | null }[] | null;
  receipt_items?: { raw_name: string | null; line_number: number }[] | null;
};

export function receiptLabel(
  receipt: ReceiptLabelSource,
  fallback = "Unknown item",
) {
  if (receipt.title?.trim()) {
    return receipt.title.trim();
  }

  const firstItem = [...(receipt.receipt_items ?? [])].sort(
    (left, right) => left.line_number - right.line_number,
  )[0];

  return firstItem?.raw_name?.trim() || relationName(receipt.stores, fallback);
}
