"use server";

import { revalidatePath } from "next/cache";

import { getRequiredUser, requireRole } from "@/lib/auth";
import type { SpendlyUserRole } from "@/lib/types";

const allowedRoles: SpendlyUserRole[] = ["user", "staff", "admin"];

export async function updateUserRole(formData: FormData) {
  await requireRole("admin");
  const { supabase, user } = await getRequiredUser();

  const userId = String(formData.get("userId") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() as SpendlyUserRole;

  if (!userId) {
    return { error: "User is required." };
  }

  if (!allowedRoles.includes(role)) {
    return { error: "Invalid role." };
  }

  if (userId === user.id && role !== "admin") {
    return { error: "Admins cannot demote themselves." };
  }

  const { error } = await supabase.rpc("admin_set_user_role", {
    p_user_id: userId,
    p_role: role,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { success: true };
}
