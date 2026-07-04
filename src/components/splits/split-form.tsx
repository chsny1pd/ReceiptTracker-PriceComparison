"use client";

import { useMemo, useState, useTransition } from "react";

import {
  createCustomSplit,
  createEvenSplit,
} from "@/app/actions/splits";
import { FormErrorSummary } from "@/components/form-error-summary";
import { formatMoney } from "@/lib/format";
import type { ProfileOption } from "@/lib/types";

type SplitLineItem = {
  id: string;
  rawName: string;
  lineTotal: number;
};

type SplitFormProps = {
  receiptId: string;
  receiptTotal: number;
  items: SplitLineItem[];
  profiles: ProfileOption[];
  currentUserId: string;
};

type CustomShareRow = {
  key: string;
  participantUserId: string;
  owedAmount: string;
};

function profileLabel(profile: ProfileOption) {
  return profile.display_name ?? profile.github_username ?? profile.id.slice(0, 8);
}

export function SplitForm({
  receiptId,
  receiptTotal,
  items,
  profiles,
  currentUserId,
}: SplitFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<"receipt" | "item">("receipt");
  const [receiptItemId, setReceiptItemId] = useState(items[0]?.id ?? "");
  const [method, setMethod] = useState<"even" | "custom">("even");
  const [search, setSearch] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [customRows, setCustomRows] = useState<CustomShareRow[]>([
    {
      key: crypto.randomUUID(),
      participantUserId: profiles[0]?.id ?? "",
      owedAmount: "0",
    },
  ]);

  const availableProfiles = useMemo(
    () => profiles.filter((profile) => profile.id !== currentUserId),
    [profiles, currentUserId],
  );

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return availableProfiles;
    }

    return availableProfiles.filter((profile) => {
      const label = profileLabel(profile).toLowerCase();
      const username = profile.github_username?.toLowerCase() ?? "";
      return label.includes(query) || username.includes(query);
    });
  }, [availableProfiles, search]);

  const targetAmount = useMemo(() => {
    if (target === "receipt") {
      return receiptTotal;
    }

    const item = items.find((entry) => entry.id === receiptItemId);
    return item?.lineTotal ?? 0;
  }, [target, receiptTotal, receiptItemId, items]);

  const evenSharePreview = useMemo(() => {
    if (selectedParticipants.length === 0) {
      return 0;
    }

    return (
      Math.round((targetAmount / (selectedParticipants.length + 1)) * 100) / 100
    );
  }, [selectedParticipants.length, targetAmount]);

  const customParticipantTotal = useMemo(
    () =>
      customRows.reduce((sum, row) => sum + Number(row.owedAmount || 0), 0),
    [customRows],
  );

  const payerShareAmount =
    Math.round((targetAmount - customParticipantTotal) * 100) / 100;

  function toggleParticipant(participantId: string) {
    setSelectedParticipants((current) =>
      current.includes(participantId)
        ? current.filter((id) => id !== participantId)
        : [...current, participantId],
    );
  }

  function updateCustomRow(key: string, patch: Partial<CustomShareRow>) {
    setCustomRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const receiptItemTarget = target === "item" ? receiptItemId : null;

    startTransition(async () => {
      if (method === "even") {
        const result = await createEvenSplit({
          receiptId,
          receiptItemId: receiptItemTarget,
          participantUserIds: selectedParticipants,
        });
        if (result?.error) {
          setError(result.error);
        }
        return;
      }

      const shares = customRows
        .filter((row) => row.participantUserId && Number(row.owedAmount) > 0)
        .map((row) => ({
          participantUserId: row.participantUserId,
          owedAmount: Number(row.owedAmount),
        }));

      if (payerShareAmount < 0) {
        setError("Participant shares exceed the split total.");
        return;
      }

      if (
        Math.round((payerShareAmount + customParticipantTotal) * 100) / 100 !==
        Math.round(targetAmount * 100) / 100
      ) {
        setError("Payer share plus participant shares must equal the split total.");
        return;
      }

      const result = await createCustomSplit({
        receiptId,
        receiptItemId: receiptItemTarget,
        payerShareAmount,
        shares,
      });

      if (result?.error) {
        setError(result.error);
      }
    });
  }

  if (availableProfiles.length === 0) {
    return (
      <section className="rounded-lg border border-amber-300 bg-amber-50 p-5">
        <h2 className="text-lg font-semibold">Create expense split</h2>
        <p className="mt-2 text-sm text-amber-900">
          No other Spendly users found yet. Ask a friend to sign in with GitHub,
          then return here to split this receipt.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-300 bg-white p-5">
      <h2 className="text-lg font-semibold">Create expense split</h2>
      <p className="mt-2 text-sm text-slate-600">
        You are the payer. Only non-payer participants get share rows in the
        database.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <FormErrorSummary message={error} />

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Split target</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="target"
              checked={target === "receipt"}
              onChange={() => setTarget("receipt")}
            />
            Whole receipt ({formatMoney(receiptTotal)})
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="target"
              checked={target === "item"}
              onChange={() => setTarget("item")}
              disabled={items.length === 0}
            />
            One line item
          </label>
          {target === "item" ? (
            <select
              value={receiptItemId}
              onChange={(event) => setReceiptItemId(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.rawName} ({formatMoney(item.lineTotal)})
                </option>
              ))}
            </select>
          ) : null}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Split method</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="method"
              checked={method === "even"}
              onChange={() => setMethod("even")}
            />
            Even split
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="method"
              checked={method === "custom"}
              onChange={() => setMethod("custom")}
            />
            Custom amounts
          </label>
        </fieldset>

        <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <p className="font-medium">Split total</p>
          <p className="mt-1 tabular-nums text-slate-700">
            {formatMoney(targetAmount)}
          </p>
        </div>

        {method === "even" ? (
          <div className="space-y-3">
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Search participants</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="GitHub username or display name"
                className="h-11 rounded-lg border border-slate-300 px-3"
              />
            </label>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
              {filteredProfiles.map((profile) => (
                <label
                  key={profile.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedParticipants.includes(profile.id)}
                    onChange={() => toggleParticipant(profile.id)}
                  />
                  <span className="text-sm">
                    {profileLabel(profile)}
                    {profile.github_username ? (
                      <span className="text-slate-500">
                        {" "}
                        @{profile.github_username}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
            {selectedParticipants.length > 0 ? (
              <p className="text-sm text-emerald-700">
                Each participant owes {formatMoney(evenSharePreview)}. Your
                implicit share is the remainder.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            {customRows.map((row) => (
              <div
                key={row.key}
                className="grid gap-3 md:grid-cols-[1fr_160px_auto]"
              >
                <select
                  value={row.participantUserId}
                  onChange={(event) =>
                    updateCustomRow(row.key, {
                      participantUserId: event.target.value,
                    })
                  }
                  className="h-11 rounded-lg border border-slate-300 px-3 text-sm"
                >
                  {availableProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profileLabel(profile)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={row.owedAmount}
                  onChange={(event) =>
                    updateCustomRow(row.key, { owedAmount: event.target.value })
                  }
                  className="h-11 rounded-lg border border-slate-300 px-3 tabular-nums"
                  placeholder="Owed"
                />
                <button
                  type="button"
                  onClick={() =>
                    setCustomRows((current) =>
                      current.filter((entry) => entry.key !== row.key),
                    )
                  }
                  className="h-11 text-sm text-red-600"
                  disabled={customRows.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setCustomRows((current) => [
                  ...current,
                  {
                    key: crypto.randomUUID(),
                    participantUserId: availableProfiles[0]?.id ?? "",
                    owedAmount: "0",
                  },
                ])
              }
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium"
            >
              Add participant
            </button>
            <p className="text-sm text-slate-600">
              Your payer share:{" "}
              <span className="font-medium tabular-nums text-slate-950">
                {formatMoney(Math.max(payerShareAmount, 0))}
              </span>
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={
            isPending ||
            (method === "even" && selectedParticipants.length === 0) ||
            (method === "custom" && payerShareAmount < 0)
          }
          className="inline-flex h-12 items-center justify-center rounded-lg bg-emerald-700 px-6 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Creating split..." : "Create split"}
        </button>
      </form>
    </section>
  );
}
