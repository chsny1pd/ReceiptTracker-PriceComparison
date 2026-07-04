import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import {
  createR2Client,
  extensionForContentType,
  getR2BucketName,
} from "@/lib/r2";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const maxImageBytes = 5 * 1024 * 1024;
const allowedContentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    contentType?: string;
    fileSize?: number;
  };

  if (!body.contentType || !allowedContentTypes.has(body.contentType)) {
    return NextResponse.json(
      { error: "Item image must be jpeg, png, or webp." },
      { status: 400 },
    );
  }

  if (!body.fileSize || body.fileSize <= 0 || body.fileSize > maxImageBytes) {
    return NextResponse.json(
      { error: "Item image must be 5MB or smaller." },
      { status: 400 },
    );
  }

  const extension = extensionForContentType(body.contentType);
  const objectKey = `receipt-items/${user.id}/${randomUUID()}.${extension}`;
  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: objectKey,
    ContentType: body.contentType,
    ContentLength: body.fileSize,
  });
  const uploadUrl = await getSignedUrl(createR2Client(), command, {
    expiresIn: 300,
  });

  return NextResponse.json({ objectKey, uploadUrl });
}
