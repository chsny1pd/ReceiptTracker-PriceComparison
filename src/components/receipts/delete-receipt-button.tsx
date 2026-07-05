"use client";

import { useTransition } from "react";

import { deleteReceipt } from "@/app/actions/receipts";
import { useAppPreferences } from "@/components/app-preferences-provider";
import { PendingNotice } from "@/components/ui/pending-notice";
import { Spinner } from "@/components/ui/spinner";

type DeleteReceiptButtonProps = {
  receiptId: string;
};

export function DeleteReceiptButton({ receiptId }: DeleteReceiptButtonProps) {
  const { dict } = useAppPreferences();
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <PendingNotice show={isPending} message={dict.receipts.deletingReceipt} />
      <form
        action={(formData) => {
          startTransition(() => deleteReceipt(formData));
        }}
      >
        <input type="hidden" name="receiptId" value={receiptId} />
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-300 px-5 text-sm font-medium text-red-700 transition hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Spinner size="sm" />
              {dict.receipts.deleting}
            </>
          ) : (
            dict.common.deleteReceipt
          )}
        </button>
      </form>
    </>
  );
}
