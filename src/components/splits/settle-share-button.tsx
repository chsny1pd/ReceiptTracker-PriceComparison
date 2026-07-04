"use client";

import { useTransition } from "react";

import { markShareSettled } from "@/app/actions/splits";
import { formatDate } from "@/lib/format";
import { PendingNotice } from "@/components/ui/pending-notice";
import { Spinner } from "@/components/ui/spinner";

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
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <PendingNotice show={isPending} message="Marking share as settled..." />
      <form
        action={(formData) => {
          startTransition(() => markShareSettled(formData));
        }}
      >
        <input type="hidden" name="shareId" value={shareId} />
        <input type="hidden" name="splitId" value={splitId} />
        <button
          type="submit"
          disabled={disabled || isPending}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-300 px-3 text-sm font-medium text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Spinner size="sm" />
              Settling...
            </>
          ) : (
            "Mark settled"
          )}
        </button>
      </form>
    </>
  );
}

export function formatSettledAt(value: string | null) {
  if (!value) {
    return "Unsettled";
  }

  return `Settled ${formatDate(value.slice(0, 10))}`;
}
