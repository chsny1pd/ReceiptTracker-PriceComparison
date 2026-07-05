import { DeleteObjectCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";

import { getR2Env } from "@/lib/env";

export function createR2Client() {
  const env = getR2Env();

  return new S3Client({
    region: "auto",
    endpoint: env.endpoint,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });
}

export function getR2BucketName() {
  return getR2Env().bucket;
}

export function extensionForContentType(contentType: string) {
  if (contentType === "application/pdf") {
    return "pdf";
  }

  if (contentType === "image/png") {
    return "png";
  }

  if (contentType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

export async function deleteR2Object(objectKey: string) {
  const client = createR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getR2BucketName(),
      Key: objectKey,
    }),
  );
}

export async function checkR2Connection() {
  const client = createR2Client();
  await client.send(new HeadBucketCommand({ Bucket: getR2BucketName() }));
}
