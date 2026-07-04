import Link from "next/link";

import { CompareForm } from "@/components/compare-form";
import { PageHeader } from "@/components/page-header";
import { getRequiredUser } from "@/lib/auth";
import { getServerI18n } from "@/lib/server-preferences";
import { relationId, relationName } from "@/lib/supabase-helpers";
import type { Product } from "@/lib/types";

export default async function ComparePage() {
  const { supabase, user } = await getRequiredUser();
  const { dict } = await getServerI18n();

  const [{ data: products }, { data: recentProducts }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, unit_category, default_unit")
      .eq("owner_user_id", user.id)
      .order("name"),
    supabase
      .from("receipt_items")
      .select("product:products(id, name)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const savedInsightProductsMap = new Map<string, unknown>();
  for (const row of recentProducts ?? []) {
    const id = relationId(row.product);
    if (id && !savedInsightProductsMap.has(id)) {
      savedInsightProductsMap.set(id, row.product);
    }
  }
  const savedInsightProducts = Array.from(savedInsightProductsMap.values());

  return (
    <>
      <PageHeader
        title={dict.compare.title}
        description={dict.compare.description}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="min-w-0">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">{dict.compare.quickTab}</h2>
            <p className="mt-1 text-sm text-slate-600">
              Manual shelf-price checks for rushed decisions before you buy.
            </p>
          </div>
          <CompareForm products={(products ?? []) as Product[]} />
        </div>

        <div className="rounded-lg border border-slate-300 bg-white p-5">
          <h2 className="text-lg font-semibold">{dict.compare.savedTab}</h2>
          <p className="mt-2 text-sm text-slate-600">{dict.compare.savedHelp}</p>
          {savedInsightProducts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">{dict.compare.insightsEmpty}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {savedInsightProducts.map((product) => {
                const productId = relationId(product);
                if (!productId) {
                  return null;
                }

                return (
                <li
                  key={productId}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <p className="font-medium">{relationName(product, "Saved product")}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Review receipt-derived history, then return to quick compare if you need
                    a live shelf check.
                  </p>
                  <Link
                    href={`/products/${productId}/history`}
                    className="mt-3 inline-flex text-sm font-medium text-emerald-700"
                  >
                    Open saved price history
                  </Link>
                </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
