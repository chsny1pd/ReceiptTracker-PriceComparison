"use client";

import { useRef } from "react";

import { ReceiptCard, type ReceiptCardData } from "@/components/dashboard/receipt-card";

type ReceiptCarouselProps = {
  receipts: ReceiptCardData[];
};

export function ReceiptCarousel({ receipts }: ReceiptCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollBy(direction: "left" | "right") {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    const amount = direction === "left" ? -280 : 280;
    track.scrollBy({ left: amount, behavior: "smooth" });
  }

  if (receipts.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        No receipts yet. Log your first receipt to see it here.
      </p>
    );
  }

  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {receipts.length} most recent receipt{receipts.length === 1 ? "" : "s"}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scrollBy("left")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-sm transition hover:border-slate-500"
            aria-label="Scroll to older receipts"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scrollBy("right")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-sm transition hover:border-slate-500"
            aria-label="Scroll to newer receipts"
          >
            →
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {receipts.map((receipt) => (
          <div key={receipt.id} className="snap-start">
            <ReceiptCard receipt={receipt} compact />
          </div>
        ))}
      </div>
    </div>
  );
}
