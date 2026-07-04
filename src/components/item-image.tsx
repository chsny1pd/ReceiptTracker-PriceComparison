"use client";

import { useEffect, useState } from "react";

type ItemImageProps = {
  itemId: string;
  alt: string;
};

export function ItemImage({ itemId, alt }: ItemImageProps) {
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadImage() {
      const response = await fetch(`/api/item-images/${itemId}`);
      const payload = (await response.json()) as {
        viewUrl?: string;
        error?: string;
      };

      if (cancelled) {
        return;
      }

      if (!response.ok || !payload.viewUrl) {
        setError(payload.error ?? "Could not load item image.");
        return;
      }

      setViewUrl(payload.viewUrl);
    }

    void loadImage();

    return () => {
      cancelled = true;
    };
  }, [itemId]);

  if (error) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        {error}
      </p>
    );
  }

  if (!viewUrl) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
        Loading item image...
      </div>
    );
  }

  return (
    <img
      src={viewUrl}
      alt={alt}
      className="max-h-48 w-full rounded-lg border border-slate-200 bg-white object-contain"
    />
  );
}
