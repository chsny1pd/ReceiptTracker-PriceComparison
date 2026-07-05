import { formatDate } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";

export function formatSettledAt(value: string | null, dict: Dictionary) {
  if (!value) {
    return dict.splits.unsettledLabel;
  }

  return `${dict.splits.settledOnPrefix} ${formatDate(value.slice(0, 10))}`;
}
