import { markShareSettled } from "@/app/actions/splits";
import { formatDate } from "@/lib/format";

type SettleShareButtonProps = {
  shareId: string;
  splitId: string;
  disabled?: boolean;
};

export function SettleShareButton({
  shareId,
  splitId,
  disabled = false,
}: SettleShareButtonProps) {
  return (
    <form action={markShareSettled}>
      <input type="hidden" name="shareId" value={shareId} />
      <input type="hidden" name="splitId" value={splitId} />
      <button
        type="submit"
        disabled={disabled}
        className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-300 px-3 text-sm font-medium text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Mark settled
      </button>
    </form>
  );
}

export function formatSettledAt(value: string | null) {
  if (!value) {
    return "Unsettled";
  }

  return `Settled ${formatDate(value.slice(0, 10))}`;
}
