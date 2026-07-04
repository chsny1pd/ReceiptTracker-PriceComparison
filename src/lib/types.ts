export type SpendlyUnit = "g" | "kg" | "ml" | "l" | "each";
export type SpendlyUnitCategory = "mass" | "volume" | "each";
export type SpendlyShareStatus =
  | "unpaid"
  | "submitted"
  | "confirmed"
  | "rejected";

export type Store = {
  id: string;
  name: string;
  location: string | null;
};

export type Product = {
  id: string;
  name: string;
  unit_category: SpendlyUnitCategory;
  default_unit: SpendlyUnit;
};

export type ReceiptListItem = {
  id: string;
  purchased_at: string;
  total: number;
  store: { name: string } | null;
};

export type ReceiptItemRow = {
  id: string;
  line_number: number;
  raw_name: string;
  quantity: number;
  unit: SpendlyUnit;
  line_total: number;
  normalized_quantity: number;
  normalized_unit: SpendlyUnit;
  normalized_unit_price: number;
  image_object_key: string | null;
  product: { id: string; name: string } | null;
};

export type CompareRow = {
  store_label: string;
  store_id: string;
  store_name: string;
  receipt_item_id: string | null;
  receipt_id: string | null;
  purchased_at: string | null;
  receipt_created_at: string | null;
  normalized_unit: SpendlyUnit | null;
  normalized_unit_price: number | null;
  line_total: number | null;
};

export type BalanceRow = {
  debtor_user_id: string;
  debtor_display_name: string | null;
  creditor_user_id: string;
  creditor_display_name: string | null;
  amount: number;
};

export type ProductHistoryRow = {
  receipt_item_id: string;
  receipt_id: string;
  store_id: string;
  store_name: string;
  purchased_at: string;
  receipt_created_at: string;
  normalized_quantity: number;
  normalized_unit: SpendlyUnit;
  normalized_unit_price: number;
  line_total: number;
};

export type ProfileOption = {
  id: string;
  github_username: string | null;
  display_name: string | null;
};

export type ReceiptSplitSummary = {
  id: string;
  split_method: "even" | "custom";
  total_amount: number;
  created_at: string;
  receipt_item_id: string | null;
};

export type SplitShareDetail = {
  id: string;
  participant_user_id: string;
  owed_amount: number;
  settled_at: string | null;
  share_status: SpendlyShareStatus;
  latest_payment_proof_id: string | null;
  participant_display_name: string | null;
  participant_github_username: string | null;
};

export type SplitDetail = {
  id: string;
  receipt_id: string;
  receipt_item_id: string | null;
  split_method: "even" | "custom";
  total_amount: number;
  created_at: string;
  payer_user_id: string;
  payer_display_name: string | null;
  payer_github_username: string | null;
  shares: SplitShareDetail[];
};

export type UnsettledShareRow = {
  id: string;
  split_id: string;
  owed_amount: number;
  share_status: SpendlyShareStatus;
  participant_user_id: string;
  participant_display_name: string | null;
  participant_github_username: string | null;
  payer_user_id: string;
  payer_display_name: string | null;
  payer_github_username: string | null;
  receipt_id: string;
};

export type ReceiptDraftListItem = {
  id: string;
  title: string | null;
  updated_at: string;
};

export type UserPaymentMethod = {
  id: string;
  label: string;
  provider_name: string | null;
  account_name: string | null;
  account_reference: string | null;
  promptpay_id: string | null;
  qr_image_object_key: string | null;
  note: string | null;
  is_default: boolean;
};

export type SharePaymentProof = {
  id: string;
  share_id: string;
  uploader_user_id: string;
  receiver_user_id: string;
  image_object_key: string;
  note: string | null;
  review_status: "submitted" | "confirmed" | "rejected";
  reviewed_at: string | null;
  created_at: string;
};
