import { PageHeader } from "@/components/page-header";
import { PaymentMethodsManager } from "@/components/settings/payment-methods-manager";
import { getRequiredUser } from "@/lib/auth";
import { getServerI18n } from "@/lib/server-preferences";
import type { UserPaymentMethod } from "@/lib/types";

export default async function SettingsPage() {
  const { supabase, user } = await getRequiredUser();
  const { dict } = await getServerI18n();

  const { data: methods } = await supabase
    .from("user_payment_methods")
    .select(
      "id, label, provider_name, account_name, account_reference, promptpay_id, qr_image_object_key, note, is_default",
    )
    .eq("owner_user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  return (
    <>
      <PageHeader
        title={dict.settings.title}
        description={dict.settings.description}
      />
      <PaymentMethodsManager methods={(methods ?? []) as UserPaymentMethod[]} />
    </>
  );
}
