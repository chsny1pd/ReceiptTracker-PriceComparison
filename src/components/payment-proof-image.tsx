"use client";

import { useEffect, useState } from "react";

import { UploadedFilePreview } from "@/components/ui/uploaded-file-preview";

type PaymentProofImageProps = {
  proofId: string;
  alt: string;
  loadingLabel: string;
};

export function PaymentProofImage({
  proofId,
  alt,
  loadingLabel,
}: PaymentProofImageProps) {
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState("image/jpeg");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadImage() {
      const response = await fetch(`/api/payment-proofs/${proofId}`);
      const payload = (await response.json()) as {
        viewUrl?: string;
        contentType?: string;
        error?: string;
      };

      if (cancelled) {
        return;
      }

      if (!response.ok || !payload.viewUrl) {
        setError(payload.error ?? "Could not load payment proof.");
        return;
      }

      setViewUrl(payload.viewUrl);
      setContentType(payload.contentType ?? "image/jpeg");
    }

    void loadImage();

    return () => {
      cancelled = true;
    };
  }, [proofId]);

  if (error) {
    return (
      <p className="rounded-lg border border-slate-300 bg-white p-4 text-sm text-red-600">
        {error}
      </p>
    );
  }

  if (!viewUrl) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        {loadingLabel}
      </div>
    );
  }

  return (
    <UploadedFilePreview url={viewUrl} contentType={contentType} alt={alt} />
  );
}
