import { PageHeader } from "@/components/page-header";
import { ReceiptForm } from "@/components/receipt-form";
import { getRequiredUser } from "@/lib/auth";
import type { ReceiptDraftPayload } from "@/lib/receipt-drafts";
import type { Product, Store } from "@/lib/types";

export default async function NewReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const query = await searchParams;
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
  let initialDraft: ReceiptDraftPayload | null = null;

  if (query.draft) {
    const { data: draft } = await supabase
      .from("receipt_drafts")
      .select("payload")
      .eq("id", query.draft)
      .eq("owner_user_id", user.id)
      .maybeSingle();

    initialDraft = (draft?.payload ?? null) as ReceiptDraftPayload | null;
  }

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

      <ReceiptForm
        stores={storeList}
        products={productList}
        initialDraft={initialDraft}
        initialDraftId={query.draft ?? null}
      />
    </>
  );
}
