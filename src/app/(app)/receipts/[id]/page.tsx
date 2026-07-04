import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { DeleteReceiptButton } from "@/components/receipts/delete-receipt-button";
import { ItemImage } from "@/components/item-image";
import { ReceiptImage } from "@/components/receipt-image";
import { SplitForm } from "@/components/splits/split-form";
import { getRequiredUser } from "@/lib/auth";
import { formatDate, formatMoney, formatUnitPrice } from "@/lib/format";
import { relationId, relationName } from "@/lib/supabase-helpers";
import type {
  ReceiptItemRow,
  ReceiptSplitSummary,
  UserPaymentMethod,
} from "@/lib/types";

type ReceiptDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReceiptDetailPage({
  params,
}: ReceiptDetailPageProps) {
  const { id } = await params;
  const { supabase, user } = await getRequiredUser();

  const { data: receipt, error } = await supabase
    .from("receipts")
    .select(
      "id, owner_user_id, purchased_at, subtotal, tax, total, notes, image_object_key, stores(name, location), receipt_items(id, line_number, raw_name, quantity, unit, line_total, normalized_quantity, normalized_unit, normalized_unit_price, image_object_key, product:products(id, name))",
    )
    .eq("id", id)
    .single();

  if (error || !receipt) {
    notFound();
  }

  const canManageReceipt = receipt.owner_user_id === user.id;

  const items = (
    (receipt.receipt_items ?? []) as unknown as ReceiptItemRow[]
  ).sort((left, right) => left.line_number - right.line_number);
  const receiptTitle = relationName(
    receipt.stores,
    items[0]?.raw_name ? `${items[0].raw_name} receipt` : "Receipt",
  );

  const [{ data: profiles }, { data: splits }, { data: paymentMethods }] = await Promise.all([
    canManageReceipt
      ? supabase
          .from("profiles")
          .select("id, github_username, display_name")
          .order("display_name")
      : Promise.resolve({ data: [] }),
    supabase
      .from("expense_splits")
      .select("id, split_method, total_amount, created_at, receipt_item_id")
      .eq("receipt_id", id)
      .order("created_at", { ascending: false }),
    canManageReceipt
      ? supabase
          .from("user_payment_methods")
          .select(
            "id, label, provider_name, account_name, account_reference, promptpay_id, qr_image_object_key, note, is_default",
          )
          .eq("owner_user_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const splitSummaries = (splits ?? []) as ReceiptSplitSummary[];
  const splitItems = items.map((item) => ({
    id: item.id,
    rawName: item.raw_name,
    lineTotal: Number(item.line_total),
  }));

  return (
    <>
        <PageHeader
        title={receiptTitle}
        description={`Purchased on ${formatDate(receipt.purchased_at)}`}
        backHref="/receipts"
        backLabel="Back to receipts"
        action={canManageReceipt ? <DeleteReceiptButton receiptId={receipt.id} /> : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border border-slate-300 bg-white p-5">
          <h2 className="text-lg font-semibold">Totals</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="tabular-nums">{formatMoney(Number(receipt.subtotal))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Tax</dt>
              <dd className="tabular-nums">{formatMoney(Number(receipt.tax))}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(Number(receipt.total))}</dd>
            </div>
          </dl>
          {receipt.notes ? (
            <p className="mt-4 text-sm text-slate-600">{receipt.notes}</p>
          ) : null}
        </section>

        {receipt.image_object_key ? (
          <section className="rounded-lg border border-slate-300 bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold">Receipt image</h2>
            <ReceiptImage receiptId={receipt.id} />
          </section>
        ) : null}
      </div>

      <section className="mt-6 overflow-hidden rounded-lg border border-slate-300 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold">Line items</h2>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Quantity</th>
              <th className="px-4 py-3 font-medium">Line total</th>
              <th className="px-4 py-3 font-medium">Normalized price</th>
            </tr>
          </thead>
          <tbody>
            {items?.map((item) => {
              const productId = relationId(item.product);
              const productName = relationName(item.product, "");

              return (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="px-4 py-3">
                  <p className="font-medium">{item.raw_name}</p>
                  {productName ? (
                    <p className="text-slate-600">{productName}</p>
                  ) : null}
                  {productId ? (
                    <Link
                      href={`/products/${productId}/history`}
                      className="mt-1 inline-flex text-sm font-medium text-emerald-700"
                    >
                      View price history
                    </Link>
                  ) : null}
                  {item.image_object_key ? (
                    <div className="mt-3 max-w-xs">
                      <ItemImage
                        itemId={item.id}
                        alt={`${item.raw_name} item image`}
                      />
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {item.quantity} {item.unit}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {formatMoney(Number(item.line_total))}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {formatUnitPrice(
                    Number(item.normalized_unit_price),
                    item.normalized_unit,
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="mt-6 space-y-6">
        {canManageReceipt ? (
          <SplitForm
            receiptId={receipt.id}
            receiptTotal={Number(receipt.total)}
            items={splitItems}
            profiles={profiles ?? []}
            currentUserId={user.id}
            receiverPaymentMethods={(paymentMethods ?? []) as UserPaymentMethod[]}
          />
        ) : (
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
            This receipt was shared with you through a split. You can review it here,
            but only the owner can edit or create new splits from it.
          </div>
        )}

        {splitSummaries.length > 0 ? (
          <div className="rounded-lg border border-slate-300 bg-white p-5">
            <h2 className="text-lg font-semibold">Existing splits</h2>
            <ul className="mt-4 divide-y divide-slate-200">
              {splitSummaries.map((split) => (
                <li
                  key={split.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium capitalize">
                      {split.split_method} split ·{" "}
                      {formatMoney(Number(split.total_amount))}
                    </p>
                    <p className="text-sm text-slate-600">
                      {split.receipt_item_id ? "Line item split" : "Whole receipt"}{" "}
                      · {formatDate(split.created_at.slice(0, 10))}
                    </p>
                  </div>
                  <Link
                    href={`/splits/${split.id}`}
                    className="text-sm font-medium text-emerald-700"
                  >
                    Open split
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <p className="mt-6 text-sm text-slate-600">
        Use product history links above to review trends, or{" "}
        <Link href="/compare" className="font-medium text-emerald-700">
          compare latest store prices
        </Link>
        .
      </p>
    </>
  );
}
