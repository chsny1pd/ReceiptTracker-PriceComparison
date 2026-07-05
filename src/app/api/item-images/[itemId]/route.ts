import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

import { createR2Client, getR2BucketName } from "@/lib/r2";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { contentTypeFromObjectKey } from "@/lib/upload-validation";

type RouteContext = {
  params: Promise<{
    itemId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { itemId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: item, error } = await supabase
    .from("receipt_items")
    .select("image_object_key")
    .eq("id", itemId)
    .single();

  if (error || !item?.image_object_key) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  const command = new GetObjectCommand({
    Bucket: getR2BucketName(),
    Key: item.image_object_key,
  });
  const viewUrl = await getSignedUrl(createR2Client(), command, {
    expiresIn: 300,
  });

  return NextResponse.json({
    viewUrl,
    contentType: contentTypeFromObjectKey(item.image_object_key),
  });
}
