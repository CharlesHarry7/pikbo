import { NextResponse } from "next/server";
import {
  durableMigrateGuest,
  ensurePersonalAccount,
  getPersonalWallet,
  probeDurableCreditsStore,
} from "@/lib/durableCredits";
import { ensureSession, publicSession } from "@/lib/session";
import {
  getAuthUserFromRequest,
  guestSessionIdHash,
} from "@/lib/supabase/user";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { takeToken } from "@/lib/rateLimit";
import { clientIp } from "@/lib/requestMeta";

export const runtime = "nodejs";

/**
 * After magic-link sign-in: ensure durable Free account and one-time migrate
 * remaining guest Cookie credits (capped at 10, never paid plan).
 *
 * R0: cookie is never live-spend authority. Live generate requires durable
 * atomic reserve (or labeled cached demos for guests/Free). This claim only
 * migrates display balance into the durable wallet; it is idempotent and audited.
 *
 * Authorization: Bearer <supabase access_token>
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        code: "NOT_CONFIGURED",
        error: "Supabase is not configured",
      },
      { status: 503 }
    );
  }

  const user = await getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        code: "UNAUTHORIZED",
        error: "Valid Supabase session required",
      },
      { status: 401 }
    );
  }

  // Soft rate limit claim spam (idempotent but still hits durable store).
  const claimRl = takeToken(
    `claim:${user.id}:${clientIp(req)}`,
    12,
    60_000
  );
  if (!claimRl.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        error: `Too many claim attempts — try again in ${claimRl.retryAfterSec}s`,
        retryAfterSec: claimRl.retryAfterSec,
      },
      {
        status: 429,
        headers: { "Retry-After": String(claimRl.retryAfterSec) },
      }
    );
  }

  // Guest cookie on this browser (if any)
  const guest = await ensureSession();
  const guestHash = guestSessionIdHash(guest.id);

  const ensured = await ensurePersonalAccount(user.id, 10);
  if (!ensured.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: ensured.code,
        error: ensured.error || "Could not create durable account",
      },
      { status: 500 }
    );
  }

  const accountId = ensured.data.account.id;
  const migrate = await durableMigrateGuest({
    guestSessionIdHash: guestHash,
    userId: user.id,
    accountId,
    cookieCredits: guest.plan === "free" ? guest.credits : 0,
    idempotencyKey: `guest-migrate:${guestHash}:${user.id}`,
  });

  const migrated =
    migrate.ok && migrate.data ? migrate.data.migrated : 0;
  const wallet =
    migrate.ok && migrate.data
      ? migrate.data.wallet
      : ensured.data.wallet;

  // Phase C honesty: report store backend (local-file vs supabase), never secrets.
  const personal = await getPersonalWallet(user.id);
  const probe = await probeDurableCreditsStore();
  const backend =
    personal?.backend ??
    (probe.backend === "supabase" || probe.backend === "local-file"
      ? probe.backend
      : "local-file");

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
    },
    account: {
      id: accountId,
      planId: ensured.data.account.planId,
      kind: ensured.data.account.kind,
    },
    wallet: wallet
      ? {
          availableCredits: wallet.availableCredits,
          reservedCredits: wallet.reservedCredits,
          backend,
        }
      : null,
    guestMigration: {
      migratedCredits: migrated,
      guestSession: publicSession(guest),
      note:
        migrated > 0
          ? "Your previous balance was added to this account."
          : null,
    },
    authority: {
      generate: "cookie-guest-until-durable-switch",
      durableLedger: backend,
      durableAuthority: "shadow",
    },
  });
}

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, code: "NOT_CONFIGURED", signedIn: false },
      { status: 503 }
    );
  }
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    return NextResponse.json({
      ok: true,
      signedIn: false,
      user: null,
    });
  }
  const ensured = await ensurePersonalAccount(user.id, 10);
  const personal = await getPersonalWallet(user.id);
  const probe = await probeDurableCreditsStore();
  const backend =
    personal?.backend ??
    (probe.backend === "supabase" || probe.backend === "local-file"
      ? probe.backend
      : "local-file");
  return NextResponse.json({
    ok: true,
    signedIn: true,
    user: { id: user.id, email: user.email },
    account: ensured.ok
      ? {
          id: ensured.data.account.id,
          planId: ensured.data.account.planId,
        }
      : null,
    wallet: ensured.ok
      ? {
          availableCredits: ensured.data.wallet?.availableCredits ?? 0,
          reservedCredits: ensured.data.wallet?.reservedCredits ?? 0,
          backend,
        }
      : null,
    authority: {
      generate: "cookie-guest-until-durable-switch",
      durableLedger: backend,
      durableAuthority: "shadow",
    },
  });
}
