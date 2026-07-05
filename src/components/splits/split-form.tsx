"use client";

import { useMemo, useState, useTransition } from "react";

import {
  createCustomSplit,
  createDetailedSplit,
  createEvenSplit,
} from "@/app/actions/splits";
import { useAppPreferences } from "@/components/app-preferences-provider";
import { FormErrorSummary } from "@/components/form-error-summary";
import { PendingNotice } from "@/components/ui/pending-notice";
import { Spinner } from "@/components/ui/spinner";
import { formatMoney } from "@/lib/format";
import type { ProfileOption, UserPaymentMethod } from "@/lib/types";

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
  receiverPaymentMethods: UserPaymentMethod[];
};

type CustomShareRow = {
  key: string;
  participantUserId: string;
  allocationValue: string;
};

type DetailedAllocations = Record<string, Record<string, string>>;
type AllocationUnit = "amount" | "percent";

function profileLabel(profile: ProfileOption) {
  return profile.display_name ?? profile.github_username ?? profile.id.slice(0, 8);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function parseAmount(value: string | undefined) {
  const parsed = Number(value ?? "0");
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return roundMoney(parsed);
}

function percentageToAmount(percentValue: string | undefined, baseAmount: number) {
  const parsed = Number(percentValue ?? "0");
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return roundMoney((parsed / 100) * baseAmount);
}

const sectionClassName = "space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4";
const inputClassName =
  "h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-500";

export function SplitForm({
  receiptId,
  receiptTotal,
  items,
  profiles,
  currentUserId,
  receiverPaymentMethods,
}: SplitFormProps) {
  const { dict } = useAppPreferences();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"quick" | "detailed">("detailed");
  const [target, setTarget] = useState<"receipt" | "item">("receipt");
  const [receiptItemId, setReceiptItemId] = useState(items[0]?.id ?? "");
  const [method, setMethod] = useState<"even" | "custom">("even");
  const [quickAllocationUnit, setQuickAllocationUnit] =
    useState<AllocationUnit>("amount");
  const [detailedAllocationUnit, setDetailedAllocationUnit] =
    useState<AllocationUnit>("amount");
  const [search, setSearch] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [customRows, setCustomRows] = useState<CustomShareRow[]>([
    {
      key: crypto.randomUUID(),
      participantUserId: profiles[0]?.id ?? "",
      allocationValue: "0",
    },
  ]);
  const [detailedAllocations, setDetailedAllocations] = useState<DetailedAllocations>({});
  const [receiverPaymentMethodId, setReceiverPaymentMethodId] = useState(
    receiverPaymentMethods.find((entry) => entry.is_default)?.id ??
      receiverPaymentMethods[0]?.id ??
      "",
  );

  const availableProfiles = useMemo(
    () => profiles.filter((profile) => profile.id !== currentUserId),
    [profiles, currentUserId],
  );

  const availableProfileMap = useMemo(
    () => new Map(availableProfiles.map((profile) => [profile.id, profile])),
    [availableProfiles],
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
  }, [items, receiptItemId, receiptTotal, target]);

  const evenSharePreview = useMemo(() => {
    if (selectedParticipants.length === 0) {
      return 0;
    }

    return roundMoney(targetAmount / (selectedParticipants.length + 1));
  }, [selectedParticipants.length, targetAmount]);

  const customParticipantTotal = useMemo(
    () =>
      roundMoney(
        customRows.reduce(
          (sum, row) =>
            sum +
            (quickAllocationUnit === "percent"
              ? percentageToAmount(row.allocationValue, targetAmount)
              : parseAmount(row.allocationValue)),
          0,
        ),
      ),
    [customRows, quickAllocationUnit, targetAmount],
  );

  const payerShareAmount = roundMoney(targetAmount - customParticipantTotal);

  const selectedParticipantProfiles = selectedParticipants
    .map((id) => availableProfileMap.get(id))
    .filter((profile): profile is ProfileOption => Boolean(profile));

  const detailedRows = useMemo(
    () =>
      items.map((item) => {
        const participantShares = selectedParticipants.map((participantUserId) => ({
          participantUserId,
          owedAmount:
            detailedAllocationUnit === "percent"
              ? percentageToAmount(
                  detailedAllocations[item.id]?.[participantUserId],
                  item.lineTotal,
                )
              : parseAmount(detailedAllocations[item.id]?.[participantUserId]),
        }));
        const participantTotal = roundMoney(
          participantShares.reduce((sum, share) => sum + share.owedAmount, 0),
        );
        const payerRemainder = roundMoney(item.lineTotal - participantTotal);

        return {
          item,
          participantShares,
          participantTotal,
          payerRemainder,
          hasAllocation: participantShares.some((share) => share.owedAmount > 0),
          overAllocated: payerRemainder < 0,
        };
      }),
    [detailedAllocationUnit, detailedAllocations, items, selectedParticipants],
  );

  const detailedParticipantTotals = useMemo(() => {
    const totals = new Map<string, number>();

    for (const participantUserId of selectedParticipants) {
      totals.set(participantUserId, 0);
    }

    for (const row of detailedRows) {
      for (const share of row.participantShares) {
        totals.set(
          share.participantUserId,
          roundMoney((totals.get(share.participantUserId) ?? 0) + share.owedAmount),
        );
      }
    }

    return totals;
  }, [detailedRows, selectedParticipants]);

  const detailedAllocatedTotal = useMemo(
    () =>
      roundMoney(
        [...detailedParticipantTotals.values()].reduce(
          (sum, value) => sum + value,
          0,
        ),
      ),
    [detailedParticipantTotals],
  );

  const detailedPayerTotal = roundMoney(receiptTotal - detailedAllocatedTotal);

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

  function updateDetailedAllocation(
    receiptItemKey: string,
    participantUserId: string,
    value: string,
  ) {
    setDetailedAllocations((current) => ({
      ...current,
      [receiptItemKey]: {
        ...(current[receiptItemKey] ?? {}),
        [participantUserId]: value,
      },
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      if (mode === "quick") {
        const receiptItemTarget = target === "item" ? receiptItemId : null;

        if (method === "even") {
          const result = await createEvenSplit({
            receiptId,
            receiptItemId: receiptItemTarget,
            participantUserIds: selectedParticipants,
            receiverPaymentMethodId: receiverPaymentMethodId || null,
          });

          if (result?.error) {
            setError(result.error);
          }
          return;
        }

        const shares = customRows
          .filter(
            (row) =>
              row.participantUserId &&
              (quickAllocationUnit === "percent"
                ? percentageToAmount(row.allocationValue, targetAmount)
                : parseAmount(row.allocationValue)) > 0,
          )
          .map((row) => ({
            participantUserId: row.participantUserId,
            owedAmount:
              quickAllocationUnit === "percent"
                ? percentageToAmount(row.allocationValue, targetAmount)
                : parseAmount(row.allocationValue),
          }));

        if (payerShareAmount < 0) {
          setError(dict.splits.participantSharesTooHigh);
          return;
        }

        if (
          roundMoney(payerShareAmount + customParticipantTotal) !==
          roundMoney(targetAmount)
        ) {
          setError(dict.splits.sharesMustMatchTarget);
          return;
        }

        const result = await createCustomSplit({
          receiptId,
          receiptItemId: receiptItemTarget,
          payerShareAmount,
          shares,
          receiverPaymentMethodId: receiverPaymentMethodId || null,
        });

        if (result?.error) {
          setError(result.error);
        }
        return;
      }

      if (selectedParticipants.length === 0) {
        setError(dict.splits.selectParticipantsFirst);
        return;
      }

      const allocations = detailedRows
        .filter((row) => row.hasAllocation)
        .map((row) => ({
          receiptItemId: row.item.id,
          payerShareAmount: roundMoney(Math.max(row.payerRemainder, 0)),
          shares: row.participantShares
            .filter((share) => share.owedAmount > 0)
            .map((share) => ({
              participantUserId: share.participantUserId,
              owedAmount: share.owedAmount,
            })),
        }));

      if (allocations.length === 0) {
        setError(dict.splits.allocateAtLeastOneItem);
        return;
      }

      const overAllocatedItem = detailedRows.find((row) => row.overAllocated);
      if (overAllocatedItem) {
        setError(
          dict.splits.itemOverAllocated.replace(
            "{item}",
            overAllocatedItem.item.rawName,
          ),
        );
        return;
      }

      const result = await createDetailedSplit({
        receiptId,
        allocations,
        receiverPaymentMethodId: receiverPaymentMethodId || null,
      });

      if (result?.error) {
        setError(result.error);
      }
    });
  }

  if (availableProfiles.length === 0) {
    return (
      <section className="rounded-lg border border-amber-300 bg-amber-50 p-5">
        <h2 className="text-lg font-semibold">{dict.splits.createExpenseSplit}</h2>
        <p className="mt-2 text-sm text-amber-900">{dict.splits.noOtherUsers}</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5">
        <h2 className="text-xl font-semibold">{dict.splits.createExpenseSplit}</h2>
        <p className="text-sm text-slate-600">{dict.splits.payerRules}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("detailed")}
            className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium transition ${
              mode === "detailed"
                ? "bg-emerald-700 text-white"
                : "border border-slate-300 text-slate-700 hover:border-slate-400"
            }`}
          >
            {dict.splits.detailedMode}
          </button>
          <button
            type="button"
            onClick={() => setMode("quick")}
            className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium transition ${
              mode === "quick"
                ? "bg-slate-950 text-white"
                : "border border-slate-300 text-slate-700 hover:border-slate-400"
            }`}
          >
            {dict.splits.quickMode}
          </button>
        </div>
      </div>

      <PendingNotice show={isPending} message={dict.splits.creatingSplit} />

      <form onSubmit={handleSubmit} className="mt-6 space-y-6" aria-busy={isPending}>
        <FormErrorSummary message={error} />

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className={sectionClassName}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">
                  {dict.splits.searchParticipants}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {dict.splits.participantChooserHelp}
                </p>
              </div>
              <div className="rounded-xl bg-white px-3 py-2 text-right shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {dict.splits.selectedCount}
                </p>
                <p className="text-lg font-semibold tabular-nums">
                  {selectedParticipants.length}
                </p>
              </div>
            </div>

            <label className="grid gap-2 text-sm">
              <span className="font-medium">{dict.splits.searchParticipants}</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={dict.splits.searchParticipantsPlaceholder}
                className={inputClassName}
              />
            </label>

            <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
              {filteredProfiles.map((profile) => (
                <label
                  key={profile.id}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-slate-200 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedParticipants.includes(profile.id)}
                      onChange={() => toggleParticipant(profile.id)}
                    />
                    <span className="text-sm">
                      <span className="font-medium text-slate-900">
                        {profileLabel(profile)}
                      </span>
                      {profile.github_username ? (
                        <span className="text-slate-500">
                          {" "}
                          @{profile.github_username}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            {selectedParticipantProfiles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedParticipantProfiles.map((profile) => (
                  <span
                    key={profile.id}
                    className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800"
                  >
                    {profileLabel(profile)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                {dict.splits.selectParticipantsFirst}
              </p>
            )}
          </section>

          <section className={sectionClassName}>
            <div>
              <h3 className="text-base font-semibold">
                {dict.splits.paymentReceivingMethod}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {dict.splits.paymentMethodHelp}
              </p>
            </div>

            {receiverPaymentMethods.length > 0 ? (
              <select
                value={receiverPaymentMethodId}
                onChange={(event) => setReceiverPaymentMethodId(event.target.value)}
                className={inputClassName}
              >
                <option value="">{dict.splits.noSavedMethod}</option>
                {receiverPaymentMethods.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                    {entry.is_default ? ` (${dict.common.default})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-600">
                <p className="font-medium text-slate-900">{dict.splits.noSavedMethod}</p>
                <p className="mt-1">{dict.splits.noSavedMethodBody}</p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {dict.splits.splitTotal}
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {formatMoney(receiptTotal)}
                </p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {dict.splits.itemsInReceipt}
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {items.length}
                </p>
              </div>
            </div>
          </section>
        </div>

        {mode === "quick" ? (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <section className={sectionClassName}>
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">{dict.splits.splitTarget}</legend>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="target"
                    checked={target === "receipt"}
                    onChange={() => setTarget("receipt")}
                  />
                  {dict.splits.wholeReceipt} ({formatMoney(receiptTotal)})
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="target"
                    checked={target === "item"}
                    onChange={() => setTarget("item")}
                    disabled={items.length === 0}
                  />
                  {dict.splits.oneLineItem}
                </label>
                {target === "item" ? (
                  <select
                    value={receiptItemId}
                    onChange={(event) => setReceiptItemId(event.target.value)}
                    className={inputClassName}
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
                <legend className="text-sm font-medium">{dict.splits.splitMethod}</legend>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="method"
                    checked={method === "even"}
                    onChange={() => setMethod("even")}
                  />
                  {dict.splits.evenSplit}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="method"
                    checked={method === "custom"}
                    onChange={() => setMethod("custom")}
                  />
                  {dict.splits.customAmounts}
                </label>
              </fieldset>

              {method === "custom" ? (
                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium">
                    {dict.splits.allocationUnit}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickAllocationUnit("amount")}
                      className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium transition ${
                        quickAllocationUnit === "amount"
                          ? "bg-emerald-700 text-white"
                          : "border border-slate-300 text-slate-700"
                      }`}
                    >
                      {dict.splits.byAmount}
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickAllocationUnit("percent")}
                      className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium transition ${
                        quickAllocationUnit === "percent"
                          ? "bg-emerald-700 text-white"
                          : "border border-slate-300 text-slate-700"
                      }`}
                    >
                      {dict.splits.byPercent}
                    </button>
                  </div>
                </fieldset>
              ) : null}

              <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                <p className="text-sm font-medium">{dict.splits.splitTotal}</p>
                <p className="mt-1 tabular-nums text-slate-700">
                  {formatMoney(targetAmount)}
                </p>
              </div>
            </section>

            <section className={sectionClassName}>
              {method === "even" ? (
                <>
                  <p className="text-sm text-slate-600">
                    {selectedParticipants.length > 0
                      ? `${dict.splits.eachParticipantOwes} ${formatMoney(
                          evenSharePreview,
                        )}. ${dict.splits.yourImplicitShare}`
                      : dict.splits.selectParticipantsFirst}
                  </p>
                </>
              ) : (
                <>
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
                          className={inputClassName}
                        >
                          {availableProfiles.map((profile) => (
                            <option key={profile.id} value={profile.id}>
                              {profileLabel(profile)}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.allocationValue}
                          onChange={(event) =>
                            updateCustomRow(row.key, {
                              allocationValue: event.target.value,
                            })
                          }
                          className={`${inputClassName} tabular-nums`}
                          placeholder={
                            quickAllocationUnit === "percent" ? "0%" : "0.00"
                          }
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
                          {dict.common.remove}
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomRows((current) => [
                        ...current,
                        {
                          key: crypto.randomUUID(),
                          participantUserId: availableProfiles[0]?.id ?? "",
                          allocationValue: "0",
                        },
                      ])
                    }
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium"
                  >
                    {dict.splits.addParticipant}
                  </button>
                  <p className="text-sm text-slate-600">
                    {dict.splits.payerShare}{" "}
                    <span className="font-medium tabular-nums text-slate-950">
                      {formatMoney(Math.max(payerShareAmount, 0))}
                    </span>
                </p>
                  <p className="text-xs text-slate-500">
                    {quickAllocationUnit === "percent"
                      ? dict.splits.percentOfSplitHelp.replace(
                          "{amount}",
                          formatMoney(targetAmount),
                        )
                      : dict.splits.amountOfSplitHelp}
                  </p>
                </>
              )}
            </section>
          </div>
        ) : (
          <section className={sectionClassName}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">{dict.splits.allocateByItem}</h3>
                <p className="mt-1 max-w-3xl text-sm text-slate-600">
                  {dict.splits.allocateByItemBody}
                </p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {dict.splits.payerShare}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {formatMoney(Math.max(detailedPayerTotal, 0))}
                </p>
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">
                {dict.splits.allocationUnit}
              </legend>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDetailedAllocationUnit("amount")}
                  className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium transition ${
                    detailedAllocationUnit === "amount"
                      ? "bg-emerald-700 text-white"
                      : "border border-slate-300 text-slate-700"
                  }`}
                >
                  {dict.splits.byAmount}
                </button>
                <button
                  type="button"
                  onClick={() => setDetailedAllocationUnit("percent")}
                  className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium transition ${
                    detailedAllocationUnit === "percent"
                      ? "bg-emerald-700 text-white"
                      : "border border-slate-300 text-slate-700"
                  }`}
                >
                  {dict.splits.byPercent}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                {detailedAllocationUnit === "percent"
                  ? dict.splits.percentPerItemHelp
                  : dict.splits.amountPerItemHelp}
              </p>
            </fieldset>

            {selectedParticipantProfiles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600">
                {dict.splits.selectParticipantsFirst}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 font-medium">{dict.splits.lineItem}</th>
                      <th className="px-4 py-3 font-medium">{dict.common.total}</th>
                      {selectedParticipantProfiles.map((profile) => (
                        <th key={profile.id} className="px-4 py-3 font-medium">
                          {profileLabel(profile)}
                        </th>
                      ))}
                      <th className="px-4 py-3 font-medium">{dict.splits.payerShare}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailedRows.map((row) => (
                      <tr key={row.item.id} className="border-b border-slate-100 align-top">
                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-900">{row.item.rawName}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {dict.splits.leaveBlankKeepsPayer}
                          </p>
                        </td>
                        <td className="px-4 py-4 font-medium tabular-nums">
                          {formatMoney(row.item.lineTotal)}
                        </td>
                        {selectedParticipantProfiles.map((profile) => (
                          <td key={profile.id} className="px-4 py-4">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={detailedAllocations[row.item.id]?.[profile.id] ?? ""}
                              onChange={(event) =>
                                updateDetailedAllocation(
                                  row.item.id,
                                  profile.id,
                                  event.target.value,
                                )
                              }
                              placeholder={
                                detailedAllocationUnit === "percent" ? "0%" : "0.00"
                              }
                              className={`${inputClassName} w-28 tabular-nums`}
                            />
                          </td>
                        ))}
                        <td className="px-4 py-4">
                          <span
                            className={`font-medium tabular-nums ${
                              row.overAllocated ? "text-red-700" : "text-slate-900"
                            }`}
                          >
                            {formatMoney(Math.max(row.payerRemainder, 0))}
                          </span>
                          {row.overAllocated ? (
                            <p className="mt-1 text-xs text-red-600">
                              {dict.splits.overAllocated}
                            </p>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50">
                      <td className="px-4 py-4 font-medium">
                        {dict.splits.participantTotals}
                      </td>
                      <td className="px-4 py-4 font-medium tabular-nums">
                        {formatMoney(receiptTotal)}
                      </td>
                      {selectedParticipantProfiles.map((profile) => (
                        <td key={profile.id} className="px-4 py-4 font-medium tabular-nums">
                          {formatMoney(detailedParticipantTotals.get(profile.id) ?? 0)}
                        </td>
                      ))}
                      <td className="px-4 py-4 font-medium tabular-nums">
                        {formatMoney(Math.max(detailedPayerTotal, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <p className="text-sm text-slate-600">
            {mode === "detailed"
              ? dict.splits.detailedModeFooter
              : dict.splits.quickModeFooter}
          </p>
          <button
            type="submit"
            disabled={
              isPending ||
              (mode === "quick" &&
                method === "even" &&
                selectedParticipants.length === 0) ||
              (mode === "quick" && method === "custom" && payerShareAmount < 0)
            }
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Spinner size="sm" className="border-white/30 border-t-white" />
                {dict.splits.creatingSplit}
              </>
            ) : mode === "detailed" ? (
              dict.splits.createDetailedSplit
            ) : (
              dict.splits.createSplit
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
