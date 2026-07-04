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
