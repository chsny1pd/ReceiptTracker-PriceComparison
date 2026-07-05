import { compressImageIfNeeded } from "@/lib/client-image";
import {
  isPdfContentType,
  UPLOAD_MAX_BYTES,
  validateSelectedUploadFile,
} from "@/lib/upload-validation";

type PrepareClientUploadOptions = {
  maxDimension: number;
  invalidTypeMessage: string;
  tooLargeMessage: string;
};

export async function prepareClientUpload(
  file: File,
  options: PrepareClientUploadOptions,
) {
  const validationError = validateSelectedUploadFile(file);

  if (validationError === "invalidType") {
    throw new Error(options.invalidTypeMessage);
  }

  if (validationError === "tooLarge") {
    throw new Error(options.tooLargeMessage);
  }

  if (isPdfContentType(file.type)) {
    return file;
  }

  return compressImageIfNeeded(file, {
    maxDimension: options.maxDimension,
    maxBytes: UPLOAD_MAX_BYTES,
  });
}
