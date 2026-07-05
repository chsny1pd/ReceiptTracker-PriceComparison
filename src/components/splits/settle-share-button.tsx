"use client";

import { useState, useTransition } from "react";

import { markShareSettled } from "@/app/actions/splits";
import { useAppPreferences } from "@/components/app-preferences-provider";
import { FormErrorSummary } from "@/components/form-error-summary";
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
  const { dict } = useAppPreferences();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <PendingNotice show={isPending} message={dict.splits.markingSettled} />
      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const result = await markShareSettled(formData);
            if (result?.error) {
              setError(result.error);
            }
          });
        }}
      >
        <FormErrorSummary message={error} />
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
              {dict.splits.settling}
            </>
          ) : (
            dict.splits.markSettled
          )}
        </button>
      </form>
    </>
  );
}
