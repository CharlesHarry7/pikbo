import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/supabase/user";
import { completePrivateToyAsset } from "@/lib/privateToyAssets";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await getAuthUserFromRequest(req);
  if (!auth?.id) {
    return NextResponse.json(
      { ok: false, code: "AUTH_REQUIRED", error: "Sign in to verify a private toy photo" },
      { status: 401 }
    );
  }
  let body: { assetId?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const assetId = typeof body.assetId === "string" ? body.assetId.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(assetId)) {
    return NextResponse.json(
      { ok: false, code: "INVALID_REQUEST", error: "assetId is required" },
      { status: 400 }
    );
  }
  const completed = await completePrivateToyAsset({ ownerUserId: auth.id, assetId });
  if (!completed.ok) {
    const status = completed.code === "INPUT_ASSET_NOT_FOUND" ? 404 :
      completed.code === "PRIVATE_INPUTS_UNAVAILABLE" ? 503 : 400;
    return NextResponse.json(completed, { status });
  }
  return NextResponse.json({
    ok: true,
    inputAssetId: completed.asset.id,
    idempotent: completed.idempotent,
    asset: {
      id: completed.asset.id,
      state: completed.asset.state,
      mimeType: completed.asset.mimeType,
      sizeBytes: completed.asset.sizeBytes,
      skuLabel: completed.asset.skuLabel,
      verifiedAt: completed.asset.verifiedAt,
    },
  });
}
