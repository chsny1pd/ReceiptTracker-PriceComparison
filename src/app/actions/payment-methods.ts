"use server";

import { revalidatePath } from "next/cache";

import { getRequiredUser } from "@/lib/auth";

function normalizeOptional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

export async function savePaymentMethod(formData: FormData) {
  const { supabase, user } = await getRequiredUser();

  const methodId = normalizeOptional(formData.get("methodId"));
  const label = String(formData.get("label") ?? "").trim();
  const providerName = normalizeOptional(formData.get("providerName"));
  const accountName = normalizeOptional(formData.get("accountName"));
  const accountReference = normalizeOptional(formData.get("accountReference"));
  const promptpayId = normalizeOptional(formData.get("promptpayId"));
  const qrImageObjectKey = normalizeOptional(formData.get("qrImageObjectKey"));
  const note = normalizeOptional(formData.get("note"));
  const isDefault = String(formData.get("isDefault") ?? "") === "on";

  if (!label) {
    return { error: "Payment method label is required." };
  }

  const payload = {
    owner_user_id: user.id,
    label,
    provider_name: providerName,
    account_name: accountName,
    account_reference: accountReference,
    promptpay_id: promptpayId,
    qr_image_object_key: qrImageObjectKey,
    note,
    is_default: isDefault,
  };

  const query = methodId
    ? supabase.from("user_payment_methods").update(payload).eq("id", methodId)
    : supabase.from("user_payment_methods").insert(payload);

  const { error } = await query;
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/splits");
  return { success: true };
}

export async function deletePaymentMethod(formData: FormData) {
  const { supabase } = await getRequiredUser();
  const methodId = String(formData.get("methodId") ?? "");

  if (!methodId) {
    throw new Error("Payment method id is required.");
  }

  const { error } = await supabase
    .from("user_payment_methods")
    .delete()
    .eq("id", methodId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/splits");
}
