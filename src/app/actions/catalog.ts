"use server";

import { revalidatePath } from "next/cache";

import { getRequiredUser } from "@/lib/auth";
import type { SpendlyUnitCategory } from "@/lib/types";
import { DEFAULT_UNIT_BY_CATEGORY } from "@/lib/units";

export async function createStore(formData: FormData) {
  const { supabase, user } = await getRequiredUser();
  const name = String(formData.get("name") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();

  if (!name) {
    return { error: "Store name is required." };
  }

  const { data, error } = await supabase
    .from("stores")
    .insert({
      owner_user_id: user.id,
      name,
      location: location || null,
    })
    .select("id, name, location")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/receipts/new");
  return { data };
}

export async function createProduct(formData: FormData) {
  const { supabase, user } = await getRequiredUser();
  const name = String(formData.get("name") ?? "").trim();
  const unitCategory = String(
    formData.get("unitCategory") ?? "",
  ) as SpendlyUnitCategory;

  if (!name) {
    return { error: "Product name is required." };
  }

  if (!["mass", "volume", "each"].includes(unitCategory)) {
    return { error: "Choose a valid unit category." };
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      owner_user_id: user.id,
      name,
      unit_category: unitCategory,
      default_unit: DEFAULT_UNIT_BY_CATEGORY[unitCategory],
    })
    .select("id, name, unit_category, default_unit")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/receipts/new");
  return { data };
}
