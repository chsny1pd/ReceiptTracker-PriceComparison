"use client";

import { useState, useTransition } from "react";

import { createProduct } from "@/app/actions/catalog";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import type { Product } from "@/lib/types";

type AddProductModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (product: Product) => void;
  onError: (message: string) => void;
};

export function AddProductModal({
  open,
  onClose,
  onSuccess,
  onError,
}: AddProductModalProps) {
  const [isAddingProduct, startAddProductTransition] = useTransition();
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState<
    "mass" | "volume" | "each"
  >("mass");

  function resetForm() {
    setNewProductName("");
    setNewProductCategory("mass");
  }

  function handleClose() {
    if (isAddingProduct) {
      return;
    }

    resetForm();
    onClose();
  }

  function handleAddProduct() {
    onError("");
    const formData = new FormData();
    formData.set("name", newProductName);
    formData.set("unitCategory", newProductCategory);

    startAddProductTransition(async () => {
      const result = await createProduct(formData);
      if (result.error) {
        onError(result.error);
        return;
      }

      if (result.data) {
        onSuccess(result.data as Product);
      }

      resetForm();
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add product">
      <div className="space-y-4">
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Product name</span>
          <input
            value={newProductName}
            onChange={(event) => setNewProductName(event.target.value)}
            placeholder="e.g. Milk"
            autoFocus
            className="h-11 rounded-lg border border-slate-300 px-3"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Unit category</span>
          <select
            value={newProductCategory}
            onChange={(event) =>
              setNewProductCategory(
                event.target.value as "mass" | "volume" | "each",
              )
            }
            className="h-11 rounded-lg border border-slate-300 px-3"
          >
            <option value="mass">Mass (g/kg)</option>
            <option value="volume">Volume (ml/l)</option>
            <option value="each">Each</option>
          </select>
        </label>
        <button
          type="button"
          disabled={isAddingProduct || !newProductName.trim()}
          onClick={handleAddProduct}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAddingProduct ? (
            <>
              <Spinner size="sm" className="border-white/30 border-t-white" />
              Adding product...
            </>
          ) : (
            "Add product"
          )}
        </button>
      </div>
    </Modal>
  );
}
