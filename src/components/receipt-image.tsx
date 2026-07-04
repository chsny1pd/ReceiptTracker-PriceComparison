"use client";

import { useEffect, useState } from "react";

type ReceiptImageProps = {
  receiptId: string;
};

export function ReceiptImage({ receiptId }: ReceiptImageProps) {
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadImage() {
      const response = await fetch(`/api/receipt-images/${receiptId}`);
      const payload = (await response.json()) as {
        viewUrl?: string;
        error?: string;
      };

      if (cancelled) {
        return;
      }

      if (!response.ok || !payload.viewUrl) {
        setError(payload.error ?? "Could not load receipt image.");
        return;
      }

      setViewUrl(payload.viewUrl);
    }

    void loadImage();

    return () => {
      cancelled = true;
    };
  }, [receiptId]);

  if (error) {
    return (
      <p className="rounded-lg border border-slate-300 bg-white p-4 text-sm text-slate-600">
        {error}
      </p>
    );
  }

  if (!viewUrl) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Loading receipt image...
      </div>
    );
  }

  return (
    <img
      src={viewUrl}
      alt="Receipt"
      className="max-h-96 w-full rounded-lg border border-slate-300 bg-white object-contain"
    />
  );
}
