"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getRequiredUser } from "@/lib/auth";
import { deleteR2Object } from "@/lib/r2";
import type { SpendlyUnit } from "@/lib/types";

export type ReceiptLineInput = {
  productId: string;
  rawName: string;
  quantity: number;
  unit: SpendlyUnit;
  lineTotal: number;
  imageObjectKey?: string;
};

export type CreateReceiptInput = {
  storeId: string;
  purchasedAt: string;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  imageObjectKey?: string;
  items: ReceiptLineInput[];
};

export async function createReceipt(input: CreateReceiptInput) {
  const { supabase, user } = await getRequiredUser();

  if (!input.storeId) {
    return { error: "Select a store." };
  }

  if (!input.purchasedAt) {
    return { error: "Purchase date is required." };
  }

  if (input.items.length === 0) {
    return { error: "Add at least one line item." };
  }

  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .insert({
      owner_user_id: user.id,
      store_id: input.storeId,
      purchased_at: input.purchasedAt,
      subtotal: input.subtotal,
      tax: input.tax,
      total: input.total,
      notes: input.notes?.trim() || null,
      image_object_key: input.imageObjectKey || null,
    })
    .select("id")
    .single();

  if (receiptError || !receipt) {
    return { error: receiptError?.message ?? "Could not create receipt." };
  }

  const itemRows = input.items.map((item, index) => ({
    receipt_id: receipt.id,
    product_id: item.productId,
    line_number: index + 1,
    raw_name: item.rawName.trim(),
    quantity: item.quantity,
    unit: item.unit,
    line_total: item.lineTotal,
    normalized_quantity: 0,
    normalized_unit: item.unit,
    normalized_unit_price: 0,
    image_object_key: item.imageObjectKey || null,
  }));

  const { error: itemsError } = await supabase
    .from("receipt_items")
    .insert(itemRows);

  if (itemsError) {
    await supabase.from("receipts").delete().eq("id", receipt.id);
    return { error: itemsError.message };
  }

  revalidatePath("/receipts");
  revalidatePath("/dashboard");
  redirect(`/receipts/${receipt.id}`);
}

export async function deleteReceipt(formData: FormData): Promise<void> {
  const receiptId = String(formData.get("receiptId") ?? "");

  if (!receiptId) {
    throw new Error("Receipt id is required.");
  }

  const { supabase, user } = await getRequiredUser();

  const { data: receipt, error: fetchError } = await supabase
    .from("receipts")
    .select("id, image_object_key, receipt_items(image_object_key)")
    .eq("id", receiptId)
    .eq("owner_user_id", user.id)
    .single();

  if (fetchError || !receipt) {
    throw new Error("Receipt not found.");
  }

  const { error: deleteError } = await supabase
    .from("receipts")
    .delete()
    .eq("id", receiptId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (receipt.image_object_key) {
    try {
      await deleteR2Object(receipt.image_object_key);
    } catch {
      // Receipt is already deleted; orphaned R2 objects are acceptable for demo scope.
    }
  }

  const itemImageKeys = (
    (receipt.receipt_items ?? []) as { image_object_key: string | null }[]
  )
    .map((item) => item.image_object_key)
    .filter((key): key is string => Boolean(key));

  for (const objectKey of itemImageKeys) {
    try {
      await deleteR2Object(objectKey);
    } catch {
      // Receipt is already deleted; orphaned R2 objects are acceptable for demo scope.
    }
  }

  revalidatePath("/receipts");
  revalidatePath("/dashboard");
  redirect("/receipts");
}
