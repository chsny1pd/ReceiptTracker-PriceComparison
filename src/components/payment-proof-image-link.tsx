"use client";

import { useEffect, useState } from "react";

type PaymentProofImageLinkProps = {
  proofId: string;
  label: string;
};

export function PaymentProofImageLink({
  proofId,
  label,
}: PaymentProofImageLinkProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openProof() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/payment-proofs/${proofId}`);
      const payload = (await response.json()) as {
        viewUrl?: string;
        error?: string;
      };

      if (!response.ok || !payload.viewUrl) {
        throw new Error(payload.error ?? "Could not open payment proof.");
      }

      window.open(payload.viewUrl, "_blank", "noopener,noreferrer");
    } catch (openError) {
      setError(
        openError instanceof Error
          ? openError.message
          : "Could not open payment proof.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      setError(null);
    };
  }, [proofId]);

  return (
    <div>
      <button
        type="button"
        onClick={() => void openProof()}
        disabled={loading}
        className="inline-flex text-sm font-medium text-emerald-700 transition hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "..." : label}
      </button>
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
