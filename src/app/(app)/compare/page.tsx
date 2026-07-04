import { CompareForm } from "@/components/compare-form";
import { PageHeader } from "@/components/page-header";
import { getRequiredUser } from "@/lib/auth";
import type { CompareRow, Product, Store } from "@/lib/types";

type ComparePageProps = {
  searchParams: Promise<{
    productId?: string;
    storeAId?: string;
    storeBId?: string;
  }>;
};

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const { supabase, user } = await getRequiredUser();

  const [{ data: products }, { data: stores }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, unit_category, default_unit")
      .eq("owner_user_id", user.id)
      .order("name"),
    supabase
      .from("stores")
      .select("id, name, location")
      .eq("owner_user_id", user.id)
      .order("name"),
  ]);

  let rows: CompareRow[] = [];
  const compared = Boolean(
    params.productId && params.storeAId && params.storeBId,
  );

  if (compared) {
    const { data, error } = await supabase.rpc("compare_product_between_stores", {
      p_product_id: params.productId,
      p_store_a_id: params.storeAId,
      p_store_b_id: params.storeBId,
    });

    if (!error && data) {
      rows = data as CompareRow[];
    }
  }

  return (
    <>
      <PageHeader
        title="Compare prices"
        description="See which of two stores is cheaper for one product, using the latest price from your receipts."
      />

      <CompareForm
        products={(products ?? []) as Product[]}
        stores={(stores ?? []) as Store[]}
        initialProductId={params.productId ?? ""}
        initialStoreAId={params.storeAId ?? ""}
        initialStoreBId={params.storeBId ?? ""}
        compared={compared}
        rows={rows}
      />
    </>
  );
}
