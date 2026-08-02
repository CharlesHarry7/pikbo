import { NextResponse } from "next/server";
import { getSupabaseAnonServer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { site } from "@/lib/site";
import { takeToken } from "@/lib/rateLimit";
import { clientIp } from "@/lib/requestMeta";
import {
  authCallbackUrl,
  resolveTrustedAuthOrigin,
  sanitizeInternalNextPath,
} from "@/lib/authRedirect";

export const runtime = "nodejs";

/**
 * Send email magic link via Supabase Auth.
 * Requires SUPABASE_URL + anon key. Redirects to /auth/callback.
 * Soft rate limits: per-email 3/min · per-IP 8/min (abuse / SMTP burn).
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        code: "NOT_CONFIGURED",
        error: "Sign-in is temporarily unavailable. Please try again later.",
      },
      { status: 503 }
    );
  }

  let email = "";
  let next = "/profile";
  try {
    const body = (await req.json()) as { email?: string; next?: string };
    email = typeof body.email === "string" ? body.email.trim() : "";
    next = sanitizeInternalNextPath(body.next);
  } catch {
    return NextResponse.json(
      { ok: false, code: "INVALID_REQUEST", error: "Invalid request." },
      { status: 400 }
    );
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, code: "INVALID_EMAIL", error: "Enter a valid email" },
      { status: 400 }
    );
  }

  const emailKey = email.toLowerCase().slice(0, 128);
  const ip = clientIp(req);
  const emailRl = takeToken(`magic:${emailKey}`, 3, 60_000);
  if (!emailRl.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        error: `Too many magic-link requests for this email — try again in ${emailRl.retryAfterSec}s`,
        retryAfterSec: emailRl.retryAfterSec,
      },
      {
        status: 429,
        headers: { "Retry-After": String(emailRl.retryAfterSec) },
      }
    );
  }
  const ipRl = takeToken(`magicip:${ip || "unknown"}`, 8, 60_000);
  if (!ipRl.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        error: `Too many magic-link requests from this network — try again in ${ipRl.retryAfterSec}s`,
        retryAfterSec: ipRl.retryAfterSec,
      },
      {
        status: 429,
        headers: { "Retry-After": String(ipRl.retryAfterSec) },
      }
    );
  }

  const supabase = getSupabaseAnonServer();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        code: "CLIENT_ERROR",
        error: "Sign-in is temporarily unavailable. Please try again later.",
      },
      { status: 500 }
    );
  }

  const origin = resolveTrustedAuthOrigin(req);
  if (!origin) {
    console.warn("[auth/magic-link]", {
      event: "untrusted_origin",
    });
    return NextResponse.json(
      {
        ok: false,
        code: "UNTRUSTED_ORIGIN",
        error: "Start sign-in from Pikbo and try again.",
      },
      { status: 403 }
    );
  }
  const emailRedirectTo = authCallbackUrl(origin, process.env.NODE_ENV, next);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    // Do not leak internals; common cause: email auth disabled / SMTP not set
    console.error("[auth/magic-link]", error.message);
    return NextResponse.json(
      {
        ok: false,
        code: "SUPABASE_AUTH_ERROR",
        error:
          "We couldn't send the sign-in email. Please try again in a few minutes.",
      },
      { status: 502 }
    );
  }

  console.info("[auth/magic-link]", {
    event: "otp_request_accepted",
    callbackOrigin: origin,
  });

  // Generic account-existence response; accepted does not prove delivery.
  return NextResponse.json({
    ok: true,
    callbackOrigin: origin,
    message: `If the address can receive mail, check your inbox for a ${site.name} sign-in link. Open it on this device; check spam if needed.`,
  });
}
