import { CompareForm } from "@/components/compare-form";
import { PageHeader } from "@/components/page-header";
import { getRequiredUser } from "@/lib/auth";
import { getServerI18n } from "@/lib/server-preferences";
import type { Product } from "@/lib/types";

export default async function ComparePage() {
  const { supabase, user } = await getRequiredUser();
  const { dict } = await getServerI18n();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, unit_category, default_unit")
    .eq("owner_user_id", user.id)
    .order("name");

  return (
    <>
      <PageHeader
        title={dict.compare.title}
        description={dict.compare.description}
      />

      <section className="space-y-5">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4">
          <h2 className="text-lg font-semibold text-emerald-950">
            {dict.compare.quickTab}
          </h2>
          <p className="mt-1 text-sm text-emerald-900/80">
            {dict.compare.intro}
          </p>
        </div>
        <CompareForm products={(products ?? []) as Product[]} />
      </section>
    </>
  );
}
