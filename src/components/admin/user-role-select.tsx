"use client";

import { useTransition } from "react";

import { updateUserRole } from "@/app/actions/admin";
import type { SpendlyUserRole } from "@/lib/types";

type UserRoleSelectProps = {
  userId: string;
  currentRole: SpendlyUserRole;
  disabled?: boolean;
  labels: Record<SpendlyUserRole, string>;
};

export function UserRoleSelect({
  userId,
  currentRole,
  disabled = false,
  labels,
}: UserRoleSelectProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      name="role"
      defaultValue={currentRole}
      disabled={disabled || isPending}
      aria-label={labels[currentRole]}
      className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      onChange={(event) => {
        const formData = new FormData();
        formData.set("userId", userId);
        formData.set("role", event.target.value);
        startTransition(async () => {
          await updateUserRole(formData);
        });
      }}
    >
      <option value="user">{labels.user}</option>
      <option value="staff">{labels.staff}</option>
      <option value="admin">{labels.admin}</option>
    </select>
  );
}
