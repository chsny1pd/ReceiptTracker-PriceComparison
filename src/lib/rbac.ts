import type { SpendlyUserRole } from "@/lib/types";

export function canAccessAdminArea(role: SpendlyUserRole | null | undefined) {
  return role === "staff" || role === "admin";
}

export function isAdminRole(role: SpendlyUserRole | null | undefined) {
  return role === "admin";
}
