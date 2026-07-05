import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

import { createR2Client, getR2BucketName } from "@/lib/r2";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { contentTypeFromObjectKey } from "@/lib/upload-validation";

type RouteContext = {
  params: Promise<{ methodId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { methodId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: method, error } = await supabase
    .from("user_payment_methods")
    .select("id, qr_image_object_key")
    .eq("id", methodId)
    .single();

  if (error || !method?.qr_image_object_key) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  const { data: allowed, error: accessError } = await supabase.rpc(
    "can_view_payment_method",
    { p_method_id: methodId },
  );

  if (accessError || !allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const command = new GetObjectCommand({
    Bucket: getR2BucketName(),
    Key: method.qr_image_object_key,
  });
  const viewUrl = await getSignedUrl(createR2Client(), command, {
    expiresIn: 300,
  });

  return NextResponse.json({
    viewUrl,
    contentType: contentTypeFromObjectKey(method.qr_image_object_key),
  });
}
