import { NextResponse } from "next/server";
import { getSupabaseAnonServer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { site } from "@/lib/site";
import { takeToken } from "@/lib/rateLimit";
import { clientIp } from "@/lib/requestMeta";
import {
  authCallbackUrl,
  resolveTrustedAuthOrigin,
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
        error: "Supabase is not configured on this server",
      },
      { status: 503 }
    );
  }

  let email = "";
  try {
    const body = (await req.json()) as { email?: string };
    email = typeof body.email === "string" ? body.email.trim() : "";
  } catch {
    return NextResponse.json(
      { ok: false, code: "INVALID_REQUEST", error: "Expected JSON { email }" },
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
      { ok: false, code: "CLIENT_ERROR", error: "Could not init Supabase" },
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
        error: "Sign-in must be started from an approved Pikbo address.",
      },
      { status: 403 }
    );
  }
  const emailRedirectTo = authCallbackUrl(origin);

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
          error.message.includes("Error sending") ||
          error.message.toLowerCase().includes("smtp")
            ? "Could not send email. In Supabase Dashboard enable Email auth and check SMTP / rate limits."
            : error.message.slice(0, 160),
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
    message: `If the address is valid, ${site.name} accepted the request. You are not signed in yet — open the email on this device and click the sign-in link. Check spam too.`,
  });
}
