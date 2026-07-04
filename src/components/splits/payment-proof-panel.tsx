"use client";

import { useState, useTransition } from "react";

import {
  reviewPaymentProof,
  submitPaymentProof,
} from "@/app/actions/payment-proofs";
import { useAppPreferences } from "@/components/app-preferences-provider";
import { FormErrorSummary } from "@/components/form-error-summary";
import { compressImageIfNeeded } from "@/lib/client-image";
import { formatDate } from "@/lib/format";
import type { SharePaymentProof, SplitShareDetail, UserPaymentMethod } from "@/lib/types";

type PaymentProofPanelProps = {
  splitId: string;
  share: SplitShareDetail;
  currentUserId: string;
  receiverPaymentMethod: UserPaymentMethod | null;
  proofs: SharePaymentProof[];
};

function statusLabel(
  status: SplitShareDetail["share_status"],
  labels: {
    submitted: string;
    confirmed: string;
    rejected: string;
    unpaid: string;
  },
) {
  switch (status) {
    case "submitted":
      return labels.submitted;
    case "confirmed":
      return labels.confirmed;
    case "rejected":
      return labels.rejected;
    default:
      return labels.unpaid;
  }
}

export function PaymentProofPanel({
  splitId,
  share,
  currentUserId,
  receiverPaymentMethod,
  proofs,
}: PaymentProofPanelProps) {
  const { dict } = useAppPreferences();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [imageObjectKey, setImageObjectKey] = useState("");
  const [imageName, setImageName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const latestProof = proofs[0] ?? null;
  const isParticipant = currentUserId === share.participant_user_id;
  const canSubmit = isParticipant && share.share_status !== "confirmed";
  const canReview =
    currentUserId !== share.participant_user_id &&
    latestProof?.review_status === "submitted";

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);

    try {
      const compressed = await compressImageIfNeeded(file, {
        maxDimension: 1800,
        maxBytes: 5 * 1024 * 1024,
        preferredType: "image/webp",
      });
      const presignResponse = await fetch("/api/payment-proofs/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contentType: compressed.type,
          fileSize: compressed.size,
        }),
      });
      const presignPayload = (await presignResponse.json()) as {
        objectKey?: string;
        uploadUrl?: string;
        error?: string;
      };

      if (!presignResponse.ok || !presignPayload.objectKey || !presignPayload.uploadUrl) {
        throw new Error(presignPayload.error ?? "Could not prepare proof upload.");
      }

      const uploadResponse = await fetch(presignPayload.uploadUrl, {
        method: "PUT",
        headers: {
          "content-type": compressed.type,
        },
        body: compressed,
      });

      if (!uploadResponse.ok) {
        throw new Error("Payment proof upload failed.");
      }

      setImageObjectKey(presignPayload.objectKey);
      setImageName(compressed.name);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Payment proof upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("shareId", share.id);
    formData.set("splitId", splitId);
    formData.set("imageObjectKey", imageObjectKey);
    formData.set("note", note);

    startTransition(async () => {
      const result = await submitPaymentProof(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setNote("");
      setImageObjectKey("");
      setImageName(null);
    });
  }

  function handleReview(action: "confirm" | "reject") {
    if (!latestProof) {
      return;
    }

    const formData = new FormData();
    formData.set("shareId", share.id);
    formData.set("splitId", splitId);
    formData.set("action", action);

    startTransition(async () => {
      await reviewPaymentProof(formData);
    });
  }

  return (
    <section className="rounded-lg border border-slate-300 bg-white p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">{dict.splits.paymentWorkflow}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {dict.splits.status}:{" "}
            <span className="font-medium">
              {statusLabel(share.share_status, {
                submitted: dict.splits.submitted,
                confirmed: dict.splits.confirmed,
                rejected: dict.splits.rejected,
                unpaid: dict.splits.unpaid,
              })}
            </span>
          </p>
        </div>
        <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {dict.splits.shareOwner}{" "}
          {share.participant_display_name ?? share.participant_github_username ?? share.participant_user_id}
        </p>
      </div>

      {receiverPaymentMethod ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm">
          <p className="font-medium text-emerald-900">{dict.splits.payTo}</p>
          <p className="mt-1 text-emerald-900">{receiverPaymentMethod.label}</p>
          <p className="text-emerald-800">
            {[receiverPaymentMethod.provider_name, receiverPaymentMethod.account_reference]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {receiverPaymentMethod.promptpay_id ? (
            <p className="text-emerald-800">
              {dict.settings.promptPayLabel} {receiverPaymentMethod.promptpay_id}
            </p>
          ) : null}
          {receiverPaymentMethod.note ? (
            <p className="mt-2 text-emerald-800">{receiverPaymentMethod.note}</p>
          ) : null}
        </div>
      ) : null}

      {canSubmit ? (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <FormErrorSummary message={error} />
          <label className="grid gap-2 text-sm">
            <span className="font-medium">{dict.splits.uploadPaymentSlip}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleUpload(file);
                }
              }}
              className="text-sm"
              disabled={uploading}
            />
            <span className="text-xs text-slate-500">
              {uploading
                ? dict.splits.uploadingSlip
                : imageName
                  ? `${dict.common.uploaded}: ${imageName}`
                  : dict.splits.compressionHelp}
            </span>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">{dict.common.note}</span>
            <textarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder={dict.splits.notePlaceholder}
            />
          </label>
          <button
            type="submit"
            disabled={isPending || uploading || !imageObjectKey}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? dict.splits.submitting : dict.splits.submitPaymentProof}
          </button>
        </form>
      ) : null}

      {latestProof ? (
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="font-medium">{dict.splits.latestProof}</p>
          <p className="mt-1 text-sm text-slate-600">
            {dict.splits.submittedOn} {formatDate(latestProof.created_at.slice(0, 10))} ·{" "}
            {dict.splits.statusLabel}{" "}
            {latestProof.review_status === "submitted"
              ? dict.splits.submitted
              : latestProof.review_status === "confirmed"
                ? dict.splits.confirmed
                : dict.splits.rejected}
          </p>
          {latestProof.note ? (
            <p className="mt-2 text-sm text-slate-600">{latestProof.note}</p>
          ) : null}
          <a
            href={`/api/payment-proofs/${latestProof.id}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex text-sm font-medium text-emerald-700"
          >
            {dict.splits.openUploadedProof}
          </a>

          {canReview ? (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleReview("confirm")}
                  disabled={isPending}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {dict.splits.confirmPayment}
                </button>
                <button
                  type="button"
                  onClick={() => handleReview("reject")}
                  disabled={isPending}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-red-300 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {dict.splits.rejectProof}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
