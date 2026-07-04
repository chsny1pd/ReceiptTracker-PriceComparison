import { CompareForm } from "@/components/compare-form";
import { PageHeader } from "@/components/page-header";
import { getRequiredUser } from "@/lib/auth";
import type { Product } from "@/lib/types";

export default async function ComparePage() {
  const { supabase, user } = await getRequiredUser();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, unit_category, default_unit")
    .eq("owner_user_id", user.id)
    .order("name");

  return (
    <>
      <PageHeader
        title="Compare prices"
        description="Enter shelf prices for two or more brands, compare normalized unit prices, and add your pick to the cart."
      />

      <CompareForm products={(products ?? []) as Product[]} />
    </>
  );
}
