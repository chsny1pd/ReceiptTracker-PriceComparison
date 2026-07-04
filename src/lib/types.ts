export type SpendlyUnit = "g" | "kg" | "ml" | "l" | "each";
export type SpendlyUnitCategory = "mass" | "volume" | "each";

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
  participant_user_id: string;
  participant_display_name: string | null;
  participant_github_username: string | null;
  payer_user_id: string;
  payer_display_name: string | null;
  payer_github_username: string | null;
  receipt_id: string;
};
