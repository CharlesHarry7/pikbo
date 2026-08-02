import { NextResponse } from "next/server";
import { createBetaRequest, normalizeBetaRequest } from "@/lib/betaRequests";
import { takeToken } from "@/lib/rateLimit";
import { clientIp } from "@/lib/requestMeta";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = clientIp(req) || "unknown";
  const rateLimit = takeToken(`beta-request:${ip}`, 3, 60 * 60 * 1000);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMITED", error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_JSON", error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: silently accept bots without storing or revealing the field.
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true, duplicate: false, status: "pending" }, { status: 201 });
  }

  const normalized = normalizeBetaRequest({
    email: typeof body.email === "string" ? body.email : undefined,
    role: typeof body.role === "string" ? body.role : undefined,
    shopUrl: typeof body.shopUrl === "string" ? body.shopUrl : undefined,
    sourcePath: typeof body.sourcePath === "string" ? body.sourcePath : undefined,
    consent: body.consent === true,
  });
  if (!normalized.ok) {
    return NextResponse.json(normalized, { status: 400 });
  }

  const result = await createBetaRequest(normalized.value);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.code === "NOT_CONFIGURED" ? 503 : 500 });
  }
  return NextResponse.json(
    { ok: true, duplicate: result.duplicate, status: result.status },
    { status: result.duplicate ? 200 : 201, headers: { "Cache-Control": "no-store" } }
  );
}
