export const UPLOAD_MAX_BYTES = 1024 * 1024;

export const UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf,.pdf";

export const ALLOWED_UPLOAD_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function isPdfContentType(contentType: string) {
  return contentType === "application/pdf";
}

export function isAllowedUploadContentType(contentType: string) {
  return ALLOWED_UPLOAD_CONTENT_TYPES.has(contentType);
}

export function contentTypeFromObjectKey(objectKey: string) {
  if (objectKey.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (objectKey.endsWith(".png")) {
    return "image/png";
  }

  if (objectKey.endsWith(".webp")) {
    return "image/webp";
  }

  return "image/jpeg";
}

export function validatePresignRequest(contentType?: string, fileSize?: number) {
  if (!contentType || !isAllowedUploadContentType(contentType)) {
    return "Upload must be a JPEG, PNG, WebP image, or PDF.";
  }

  if (!fileSize || fileSize <= 0 || fileSize > UPLOAD_MAX_BYTES) {
    return "Upload must be 1 MB or smaller.";
  }

  return null;
}

export function validateSelectedUploadFile(file: File) {
  if (!isAllowedUploadContentType(file.type)) {
    return "invalidType" as const;
  }

  if (isPdfContentType(file.type) && file.size > UPLOAD_MAX_BYTES) {
    return "tooLarge" as const;
  }

  return null;
}
