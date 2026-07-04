import type { SpendlyUnit } from "@/lib/types";

type HistoryUnitFilterProps = {
  units: SpendlyUnit[];
  currentUnit?: SpendlyUnit;
};

export function HistoryUnitFilter({
  units,
  currentUnit,
}: HistoryUnitFilterProps) {
  if (units.length <= 1) {
    return null;
  }

  return (
    <form className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-300 bg-white p-4">
      <label className="grid gap-2 text-sm">
        <span className="font-medium">Filter by unit</span>
        <select
          name="unit"
          defaultValue={currentUnit ?? ""}
          className="h-11 min-w-40 rounded-lg border border-slate-300 px-3"
        >
          <option value="">All units</option>
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white"
      >
        Apply filter
      </button>
    </form>
  );
}
