"use server";

import { revalidatePath } from "next/cache";

import { getRequiredUser } from "@/lib/auth";

function normalizeOptional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

export async function submitPaymentProof(formData: FormData) {
  const { supabase } = await getRequiredUser();

  const shareId = String(formData.get("shareId") ?? "");
  const splitId = String(formData.get("splitId") ?? "");
  const imageObjectKey = String(formData.get("imageObjectKey") ?? "");
  const note = normalizeOptional(formData.get("note"));

  if (!shareId || !splitId || !imageObjectKey) {
    return { error: "Share, split, and uploaded proof image are required." };
  }

  const { error } = await supabase.rpc("submit_share_payment_proof", {
    p_share_id: shareId,
    p_image_object_key: imageObjectKey,
    p_note: note,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/splits/${splitId}`);
  revalidatePath("/splits");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function reviewPaymentProof(
  formData: FormData,
): Promise<{ error?: string; success?: true }> {
  const { supabase } = await getRequiredUser();

  const shareId = String(formData.get("shareId") ?? "");
  const splitId = String(formData.get("splitId") ?? "");
  const action = String(formData.get("action") ?? "");

  if (!shareId || !splitId || (action !== "confirm" && action !== "reject")) {
    return { error: "Proof review payload is invalid." };
  }

  const { error } = await supabase.rpc("review_share_payment_proof", {
    p_share_id: shareId,
    p_decision: action === "confirm" ? "confirmed" : "rejected",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/splits/${splitId}`);
  revalidatePath("/splits");
  revalidatePath("/dashboard");
  return { success: true };
}
