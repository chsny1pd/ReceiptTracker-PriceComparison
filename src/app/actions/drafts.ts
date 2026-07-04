"use server";

import { revalidatePath } from "next/cache";

import { getRequiredUser } from "@/lib/auth";
import {
  buildReceiptDraftTitle,
  type ReceiptDraftPayload,
} from "@/lib/receipt-drafts";

export async function saveReceiptDraft(input: {
  draftId?: string | null;
  payload: ReceiptDraftPayload;
}) {
  const { supabase, user } = await getRequiredUser();
  const title = buildReceiptDraftTitle(input.payload);

  const query = input.draftId
    ? supabase
        .from("receipt_drafts")
        .update({
          title,
          payload: input.payload,
        })
        .eq("id", input.draftId)
        .eq("owner_user_id", user.id)
        .select("id")
        .single()
    : supabase
        .from("receipt_drafts")
        .insert({
          owner_user_id: user.id,
          title,
          payload: input.payload,
        })
        .select("id")
        .single();

  const { data, error } = await query;

  if (error || !data) {
    return { error: error?.message ?? "Could not save draft." };
  }

  revalidatePath("/receipts");
  return { data };
}

export async function deleteReceiptDraft(formData: FormData) {
  const draftId = String(formData.get("draftId") ?? "");
  if (!draftId) {
    throw new Error("Draft id is required.");
  }

  const { supabase, user } = await getRequiredUser();
  const { error } = await supabase
    .from("receipt_drafts")
    .delete()
    .eq("id", draftId)
    .eq("owner_user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/receipts");
}
