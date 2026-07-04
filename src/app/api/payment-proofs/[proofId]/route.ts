import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

import { createR2Client, getR2BucketName } from "@/lib/r2";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ proofId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { proofId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: proof, error } = await supabase
    .from("share_payment_proofs")
    .select("id, image_object_key")
    .eq("id", proofId)
    .single();

  if (error || !proof?.image_object_key) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  const { data: allowed, error: accessError } = await supabase.rpc(
    "can_view_share_payment_proof",
    { p_proof_id: proofId },
  );

  if (accessError || !allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const command = new GetObjectCommand({
    Bucket: getR2BucketName(),
    Key: proof.image_object_key,
  });
  const viewUrl = await getSignedUrl(createR2Client(), command, {
    expiresIn: 300,
  });

  return NextResponse.json({ viewUrl });
}
