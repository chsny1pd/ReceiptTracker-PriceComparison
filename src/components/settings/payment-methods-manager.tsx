"use client";

import { useState, useTransition } from "react";

import {
  deletePaymentMethod,
  savePaymentMethod,
} from "@/app/actions/payment-methods";
import { FormErrorSummary } from "@/components/form-error-summary";
import { compressImageIfNeeded } from "@/lib/client-image";
import type { UserPaymentMethod } from "@/lib/types";

type PaymentMethodsManagerProps = {
  methods: UserPaymentMethod[];
};

const inputClassName =
  "h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm";

export function PaymentMethodsManager({
  methods,
}: PaymentMethodsManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [providerName, setProviderName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountReference, setAccountReference] = useState("");
  const [promptpayId, setPromptpayId] = useState("");
  const [note, setNote] = useState("");
  const [isDefault, setIsDefault] = useState(methods.length === 0);
  const [qrImageObjectKey, setQrImageObjectKey] = useState("");
  const [qrImageName, setQrImageName] = useState<string | null>(null);
  const [uploadingQr, setUploadingQr] = useState(false);

  async function handleQrUpload(file: File) {
    setError(null);
    setUploadingQr(true);

    try {
      const compressed = await compressImageIfNeeded(file, {
        maxDimension: 1400,
        maxBytes: 3 * 1024 * 1024,
        preferredType: "image/webp",
      });
      const presignResponse = await fetch("/api/payment-method-images/presign", {
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
        throw new Error(presignPayload.error ?? "Could not prepare QR upload.");
      }

      const uploadResponse = await fetch(presignPayload.uploadUrl, {
        method: "PUT",
        headers: {
          "content-type": compressed.type,
        },
        body: compressed,
      });

      if (!uploadResponse.ok) {
        throw new Error("QR upload failed.");
      }

      setQrImageObjectKey(presignPayload.objectKey);
      setQrImageName(compressed.name);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "QR upload failed.",
      );
    } finally {
      setUploadingQr(false);
    }
  }

  function resetForm() {
    setLabel("");
    setProviderName("");
    setAccountName("");
    setAccountReference("");
    setPromptpayId("");
    setNote("");
    setIsDefault(methods.length === 0);
    setQrImageObjectKey("");
    setQrImageName(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("label", label);
    formData.set("providerName", providerName);
    formData.set("accountName", accountName);
    formData.set("accountReference", accountReference);
    formData.set("promptpayId", promptpayId);
    formData.set("note", note);
    formData.set("qrImageObjectKey", qrImageObjectKey);
    if (isDefault) {
      formData.set("isDefault", "on");
    }

    startTransition(async () => {
      const result = await savePaymentMethod(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      resetForm();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-300 bg-white p-5">
        <h2 className="text-lg font-semibold">Payment receiving methods</h2>
        <p className="mt-2 text-sm text-slate-600">
          Add the account details people should use when they owe you. QR images stay
          in R2; Postgres stores metadata only.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <FormErrorSummary message={error} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Label</span>
              <input
                className={inputClassName}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="PromptPay main"
                required
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Provider or bank</span>
              <input
                className={inputClassName}
                value={providerName}
                onChange={(event) => setProviderName(event.target.value)}
                placeholder="PromptPay, SCB, KBank"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Account name</span>
              <input
                className={inputClassName}
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Account number or reference</span>
              <input
                className={inputClassName}
                value={accountReference}
                onChange={(event) => setAccountReference(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium">PromptPay ID</span>
              <input
                className={inputClassName}
                value={promptpayId}
                onChange={(event) => setPromptpayId(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium">QR image</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleQrUpload(file);
                  }
                }}
                className="text-sm"
                disabled={uploadingQr}
              />
              <span className="text-xs text-slate-500">
                {uploadingQr
                  ? "Uploading QR..."
                  : qrImageName
                    ? `Uploaded: ${qrImageName}`
                    : "Optional. Browser compression runs before upload when needed."}
              </span>
            </label>
          </div>

          <label className="grid gap-2 text-sm">
            <span className="font-medium">Instructions</span>
            <textarea
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="Tell people what to send or how to identify the transfer."
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(event) => setIsDefault(event.target.checked)}
            />
            Make this my default receiving method
          </label>

          <button
            type="submit"
            disabled={isPending || uploadingQr}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Save payment method"}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-300 bg-white p-5">
        <h2 className="text-lg font-semibold">Saved methods</h2>
        {methods.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            No payment methods yet. Add one so split participants can see how to pay you.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {methods.map((method) => (
              <li
                key={method.id}
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium">
                      {method.label}
                      {method.is_default ? (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800">
                          Default
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {[method.provider_name, method.account_name, method.account_reference]
                        .filter(Boolean)
                        .join(" · ") || "No account details yet"}
                    </p>
                    {method.promptpay_id ? (
                      <p className="text-sm text-slate-600">
                        PromptPay: {method.promptpay_id}
                      </p>
                    ) : null}
                    {method.note ? (
                      <p className="mt-2 text-sm text-slate-600">{method.note}</p>
                    ) : null}
                  </div>
                  <form action={deletePaymentMethod}>
                    <input type="hidden" name="methodId" value={method.id} />
                    <button
                      type="submit"
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
