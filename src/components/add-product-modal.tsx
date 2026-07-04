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
  const [imageObjectKey, setImageObjectKey] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const isBusy = isAddingProduct || uploadingImage;

  function resetForm() {
    setNewProductName("");
    setNewProductCategory("mass");
    setImageObjectKey(null);
    setImageName(null);
  }

  function handleClose() {
    if (isBusy) {
      return;
    }

    resetForm();
    onClose();
  }

  async function handleImageChange(file: File | null) {
    if (!file) {
      setImageObjectKey(null);
      setImageName(null);
      return;
    }

    setUploadingImage(true);
    onError("");

    try {
      const presignResponse = await fetch("/api/product-images/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          fileSize: file.size,
        }),
      });
      const presignPayload = (await presignResponse.json()) as {
        objectKey?: string;
        uploadUrl?: string;
        error?: string;
      };

      if (!presignResponse.ok || !presignPayload.uploadUrl) {
        throw new Error(
          presignPayload.error ?? "Could not prepare image upload.",
        );
      }

      const uploadResponse = await fetch(presignPayload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Image upload to R2 failed.");
      }

      setImageObjectKey(presignPayload.objectKey ?? null);
      setImageName(file.name);
    } catch (uploadError) {
      setImageObjectKey(null);
      setImageName(null);
      onError(
        uploadError instanceof Error
          ? uploadError.message
          : "Image upload failed.",
      );
    } finally {
      setUploadingImage(false);
    }
  }

  function handleAddProduct() {
    onError("");
    const formData = new FormData();
    formData.set("name", newProductName);
    formData.set("unitCategory", newProductCategory);
    if (imageObjectKey) {
      formData.set("imageObjectKey", imageObjectKey);
    }

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
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Product image (optional)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploadingImage}
            onChange={(event) =>
              void handleImageChange(event.target.files?.[0] ?? null)
            }
            className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-60"
          />
          {uploadingImage ? (
            <span className="inline-flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Uploading to R2...
            </span>
          ) : null}
          {imageName ? (
            <span className="text-sm text-emerald-700">
              Uploaded: {imageName}
            </span>
          ) : null}
        </label>
        <button
          type="button"
          disabled={isBusy || !newProductName.trim()}
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
