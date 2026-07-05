"use client";

import { useEffect, useRef } from "react";

import { UploadedFilePreview } from "@/components/ui/uploaded-file-preview";
import {
  UPLOAD_ACCEPT,
  validateSelectedUploadFile,
} from "@/lib/upload-validation";

type ImageUploadFieldProps = {
  fileInputId: string;
  accept?: string;
  disabled?: boolean;
  uploading?: boolean;
  previewUrl: string | null;
  previewContentType?: string | null;
  imageName: string | null;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  onValidationError?: (message: string) => void;
  chooseLabel: string;
  replaceLabel: string;
  uploadingLabel: string;
  removeLabel: string;
  invalidTypeMessage: string;
  tooLargeMessage: string;
  helpText?: string;
  selectedHelpText?: string;
};

export function ImageUploadField({
  fileInputId,
  accept = UPLOAD_ACCEPT,
  disabled = false,
  uploading = false,
  previewUrl,
  previewContentType = null,
  imageName,
  onFileSelect,
  onRemove,
  onValidationError,
  chooseLabel,
  replaceLabel,
  uploadingLabel,
  removeLabel,
  invalidTypeMessage,
  tooLargeMessage,
  helpText,
  selectedHelpText,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleRemove() {
    onRemove();
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleFileChange(file: File) {
    const validationError = validateSelectedUploadFile(file);

    if (validationError === "invalidType") {
      onValidationError?.(invalidTypeMessage);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }

    if (validationError === "tooLarge") {
      onValidationError?.(tooLargeMessage);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }

    onFileSelect(file);
  }

  return (
    <div className="space-y-3">
      {previewUrl ? (
        <div className="overflow-hidden rounded-xl border border-slate-300 bg-slate-50">
          <UploadedFilePreview
            url={previewUrl}
            contentType={previewContentType ?? "image/jpeg"}
            alt={imageName ?? "Selected upload preview"}
            className="max-h-64 w-full object-contain"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            {imageName ? (
              <span className="text-sm text-slate-600">{imageName}</span>
            ) : (
              <span className="text-sm text-slate-500">{selectedHelpText}</span>
            )}
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || uploading}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-red-300 px-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {removeLabel}
            </button>
          </div>
        </div>
      ) : null}

      <label
        htmlFor={fileInputId}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-300 bg-white px-5 py-8 text-center transition hover:border-emerald-500 hover:bg-emerald-50"
      >
        <span className="text-sm font-semibold text-emerald-800">
          {uploading ? uploadingLabel : previewUrl ? replaceLabel : chooseLabel}
        </span>
        {helpText ? (
          <span className="mt-2 max-w-md text-xs text-slate-500">{helpText}</span>
        ) : null}
      </label>
      <input
        ref={inputRef}
        id={fileInputId}
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            handleFileChange(file);
          }
        }}
        className="sr-only"
        disabled={disabled || uploading}
      />
    </div>
  );
}
