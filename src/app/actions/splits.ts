"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getRequiredUser } from "@/lib/auth";

export type CustomSplitShareInput = {
  participantUserId: string;
  owedAmount: number;
};

export async function createEvenSplit(input: {
  receiptId: string;
  receiptItemId?: string | null;
  participantUserIds: string[];
  receiverPaymentMethodId?: string | null;
}) {
  const { supabase } = await getRequiredUser();

  if (input.participantUserIds.length === 0) {
    return { error: "Select at least one participant." };
  }

  const { data, error } = await supabase.rpc("create_even_expense_split", {
    p_receipt_id: input.receiptId,
    p_receipt_item_id: input.receiptItemId ?? null,
    p_participant_user_ids: input.participantUserIds,
    p_receiver_payment_method_id: input.receiverPaymentMethodId ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/receipts/${input.receiptId}`);
  revalidatePath("/splits");
  redirect(`/splits/${data as string}`);
}

export async function createCustomSplit(input: {
  receiptId: string;
  receiptItemId?: string | null;
  payerShareAmount: number;
  shares: CustomSplitShareInput[];
  receiverPaymentMethodId?: string | null;
}) {
  const { supabase } = await getRequiredUser();

  if (input.shares.length === 0) {
    return { error: "Add at least one participant share." };
  }

  const { data, error } = await supabase.rpc("create_custom_expense_split", {
    p_receipt_id: input.receiptId,
    p_receipt_item_id: input.receiptItemId ?? null,
    p_payer_share_amount: input.payerShareAmount,
    p_shares: input.shares.map((share) => ({
      participant_user_id: share.participantUserId,
      owed_amount: share.owedAmount,
    })),
    p_receiver_payment_method_id: input.receiverPaymentMethodId ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/receipts/${input.receiptId}`);
  revalidatePath("/splits");
  redirect(`/splits/${data as string}`);
}

export async function markShareSettled(formData: FormData): Promise<void> {
  const shareId = String(formData.get("shareId") ?? "");
  const splitId = String(formData.get("splitId") ?? "");

  if (!shareId || !splitId) {
    throw new Error("Share id and split id are required.");
  }

  const { supabase } = await getRequiredUser();
  const { error } = await supabase.rpc("mark_split_share_settled", {
    p_share_id: shareId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/splits/${splitId}`);
  revalidatePath("/splits");
}
