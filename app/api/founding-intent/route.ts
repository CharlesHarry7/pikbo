import { NextResponse } from "next/server";
import { clientIp } from "@/lib/requestMeta";
import { takeToken } from "@/lib/rateLimit";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Capture Founding Studio buyer intent before Stripe keys are wired.
 * Service-role insert only — no public read. Not a payment.
 */
export async function POST(req: Request) {
  const ip = clientIp(req) || "unknown";
  const rl = takeToken(`founding-intent:${ip}`, 6, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", code: "RATE_LIMIT" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: { email?: string; note?: string; source?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    return NextResponse.json(
      { error: "Valid email required", code: "INVALID_EMAIL" },
      { status: 400 }
    );
  }
  const note = (body.note || "").trim().slice(0, 500);
  const source = (body.source || "pricing").trim().slice(0, 64);

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Intent store unavailable", code: "NO_ADMIN" },
      { status: 503 }
    );
  }

  const { error } = await admin.from("founding_intents").insert({
    email,
    note: note || null,
    source,
  });

  if (error) {
    return NextResponse.json(
      {
        error: "Could not save intent",
        code: "INSERT_FAILED",
        detail: error.message.slice(0, 120),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message:
      "Founding interest recorded. Checkout opens when Stripe is connected.",
  });
}
