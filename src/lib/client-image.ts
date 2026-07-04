export type CompressImageOptions = {
  maxDimension: number;
  maxBytes: number;
  preferredType?: "image/jpeg" | "image/webp";
  quality?: number;
};

export async function compressImageIfNeeded(
  file: File,
  options: CompressImageOptions,
) {
  const preferredType = options.preferredType ?? "image/webp";
  const quality = options.quality ?? 0.82;

  if (
    file.size <= options.maxBytes &&
    file.type !== "image/heic" &&
    file.type !== "image/heif"
  ) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    options.maxDimension / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not prepare image compression.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, preferredType, quality),
  );

  if (!blob) {
    throw new Error("Could not compress image.");
  }

  if (blob.size > options.maxBytes && preferredType === "image/webp") {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.78),
    );
  }

  if (!blob || blob.size > options.maxBytes) {
    throw new Error("Compressed image is still too large.");
  }

  const outputType = blob.type || preferredType;
  const extension = outputType === "image/jpeg" ? "jpg" : "webp";
  const basename = file.name.replace(/\.[^.]+$/, "") || "upload";

  return new File([blob], `${basename}.${extension}`, {
    type: outputType,
    lastModified: Date.now(),
  });
}
