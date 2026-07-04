import { PageHeader } from "@/components/page-header";
import { ReceiptForm } from "@/components/receipt-form";
import { getRequiredUser } from "@/lib/auth";
import type { Product, Store } from "@/lib/types";

export default async function NewReceiptPage() {
  const { supabase, user } = await getRequiredUser();

  const [{ data: stores }, { data: products }] = await Promise.all([
    supabase
      .from("stores")
      .select("id, name, location")
      .eq("owner_user_id", user.id)
      .order("name"),
    supabase
      .from("products")
      .select("id, name, unit_category, default_unit")
      .eq("owner_user_id", user.id)
      .order("name"),
  ]);

  const storeList = (stores ?? []) as Store[];
  const productList = (products ?? []) as Product[];

  return (
    <>
      <PageHeader
        title="Log a receipt"
        description="Enter store details, line items, and optionally upload a receipt image to Cloudflare R2."
        backHref="/receipts"
        backLabel="Back to receipts"
      />

      {storeList.length === 0 || productList.length === 0 ? (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {storeList.length === 0 ? (
            <p>Create at least one store before saving a receipt.</p>
          ) : null}
          {productList.length === 0 ? (
            <p>Create at least one product before adding line items.</p>
          ) : null}
        </div>
      ) : null}

      <ReceiptForm stores={storeList} products={productList} />
    </>
  );
}
