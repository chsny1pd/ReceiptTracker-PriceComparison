import Link from "next/link";
import { notFound } from "next/navigation";

import { HistoryUnitFilter } from "@/components/products/history-unit-filter";
import { PriceHistoryChart } from "@/components/products/price-history-chart";
import { PriceHistoryTable } from "@/components/products/price-history-table";
import { PageHeader } from "@/components/page-header";
import { getRequiredUser } from "@/lib/auth";
import type { ProductHistoryRow, SpendlyUnit } from "@/lib/types";

type ProductHistoryPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ unit?: string }>;
};

export default async function ProductHistoryPage({
  params,
  searchParams,
}: ProductHistoryPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, user } = await getRequiredUser();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, default_unit, unit_category")
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .single();

  if (productError || !product) {
    notFound();
  }

  const { data, error } = await supabase.rpc("get_product_price_history", {
    p_product_id: id,
    p_normalized_unit: null,
  });

  const allRows = (data ?? []) as ProductHistoryRow[];
  const availableUnits = [
    ...new Set(allRows.map((row) => row.normalized_unit)),
  ] as SpendlyUnit[];

  const unitFilter = query.unit as SpendlyUnit | undefined;
  const rows =
    unitFilter && availableUnits.includes(unitFilter)
      ? allRows.filter((row) => row.normalized_unit === unitFilter)
      : allRows;

  const chartUnit =
    rows[0]?.normalized_unit ?? product.default_unit ?? ("each" as SpendlyUnit);

  return (
    <>
      <PageHeader
        title={`${product.name} price history`}
        description="Trends come only from receipts you logged. Prices use normalized unit values for fair comparison."
        backHref="/receipts"
        backLabel="Back to receipts"
        action={
          <Link
            href={`/compare?productId=${product.id}`}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 px-5 text-sm font-semibold"
          >
            Compare stores
          </Link>
        }
      />

      {error ? (
        <p className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </p>
      ) : null}

      <div className="mb-6">
        <HistoryUnitFilter
          units={availableUnits}
          currentUnit={unitFilter}
        />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">
            No receipt history for this product yet.
          </p>
          <Link
            href="/receipts/new"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white"
          >
            Log a receipt
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <PriceHistoryChart rows={rows} unit={chartUnit} />
          <PriceHistoryTable
            rows={rows}
            productName={product.name}
            unit={chartUnit}
          />
        </div>
      )}
    </>
  );
}
