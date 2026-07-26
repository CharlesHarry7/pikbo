import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getEntitlement } from "@/lib/entitlements";
import { CREDITS_PER_VIDEO, getPlan, type PlanId } from "@/lib/pricing";

export const SESSION_COOKIE = "pikbo_s";
const MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export class SessionSecretRequiredError extends Error {
  constructor() {
    super("SESSION_SECRET_REQUIRED");
    this.name = "SessionSecretRequiredError";
  }
}

export function sessionSecretConfigured(): boolean {
  return Boolean((process.env.SESSION_SECRET || process.env.CREDITS_SECRET || "").trim());
}

export type UserSession = {
  id: string;
  plan: PlanId;
  credits: number;
  /** YYYY-MM — free credits refresh when this rolls over */
  periodKey: string;
};

export type PublicSession = UserSession & {
  watermark: boolean;
  planName: string;
  clipsLeft: number;
  creditsPerVideo: number;
};

function secret(): string {
  const s = (process.env.SESSION_SECRET || process.env.CREDITS_SECRET || "").trim();
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[pikbo] SESSION_SECRET is missing — refusing session-backed requests."
      );
      throw new SessionSecretRequiredError();
    }
    // Development/demo only. Production must never sign with a public default.
    return "pikbo-dev-secret-change-me";
  }
  return s;
}

export function currentPeriodKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function sign(payloadB64: string): string {
  return createHmac("sha256", secret()).update(payloadB64).digest("base64url");
}

export function encodeSession(session: UserSession): string {
  const payloadB64 = Buffer.from(JSON.stringify(session), "utf8").toString(
    "base64url"
  );
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function decodeSession(
  raw: string | undefined | null
): UserSession | null {
  if (!raw) return null;
  const [payloadB64, sig] = raw.split(".");
  if (!payloadB64 || !sig) return null;
  const expected = sign(payloadB64);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as UserSession;
    if (!data.id || !data.plan || typeof data.credits !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

function newGuest(): UserSession {
  const plan = getPlan("free");
  return {
    id: randomUUID(),
    plan: "free",
    credits: plan.credits,
    periodKey: currentPeriodKey(),
  };
}

/** Refresh free monthly allowance when the calendar month rolls. */
export function refreshPeriod(session: UserSession): UserSession {
  const key = currentPeriodKey();
  if (session.periodKey === key) {
    // Launch pricing cut: free guests who still hold old 30-credit cookies
    // get clamped to current free allowance (do not raise balance).
    if (session.plan === "free") {
      const cap = getPlan("free").credits;
      if (session.credits > cap) {
        return { ...session, credits: cap };
      }
    }
    return session;
  }

  if (session.plan === "free") {
    const plan = getPlan("free");
    return {
      ...session,
      periodKey: key,
      credits: plan.credits,
    };
  }

  // Paid: calendar rollover is a fallback; Stripe invoice.paid is preferred.
  const plan = getPlan(session.plan);
  return {
    ...session,
    periodKey: key,
    credits: plan.credits,
  };
}

/**
 * Overlay durable entitlements (from Stripe webhooks / confirm).
 * Plan comes from entitlements; credits stay on the cookie unless
 * entitlement.periodKey is newer (checkout / renew reset).
 */
export async function applyEntitlement(
  session: UserSession
): Promise<UserSession> {
  const ent = await getEntitlement(session.id);
  if (!ent) return session;

  if (ent.status === "canceled" || ent.plan === "free") {
    if (session.plan === "free") return session;
    return {
      ...session,
      plan: "free",
    };
  }

  if (ent.status === "active" || ent.status === "past_due") {
    const plan = getPlan(ent.plan);
    const periodReset =
      ent.periodKey && ent.periodKey !== session.periodKey
        ? {
            periodKey: ent.periodKey,
            credits:
              typeof ent.credits === "number"
                ? ent.credits
                : plan.credits,
          }
        : null;

    // First time cookie is still free but entitlement is paid
    const upgradeFromFree =
      session.plan === "free" && plan.id !== "free"
        ? {
            credits:
              typeof ent.credits === "number" ? ent.credits : plan.credits,
            periodKey: ent.periodKey || session.periodKey,
          }
        : null;

    return {
      ...session,
      plan: plan.id,
      ...(periodReset || upgradeFromFree || {}),
    };
  }

  return session;
}

export function publicSession(session: UserSession): PublicSession {
  const plan = getPlan(session.plan);
  return {
    ...session,
    watermark: plan.watermark,
    planName: plan.name,
    clipsLeft: Math.floor(session.credits / CREDITS_PER_VIDEO),
    creditsPerVideo: CREDITS_PER_VIDEO,
  };
}

export async function getOrCreateSession(): Promise<UserSession> {
  const jar = await cookies();
  const existing = decodeSession(jar.get(SESSION_COOKIE)?.value);
  if (existing) {
    const refreshed = refreshPeriod(existing);
    return applyEntitlement(refreshed);
  }
  return newGuest();
}

export async function readSession(): Promise<UserSession | null> {
  const jar = await cookies();
  const existing = decodeSession(jar.get(SESSION_COOKIE)?.value);
  if (!existing) return null;
  return applyEntitlement(refreshPeriod(existing));
}

export async function saveSession(session: UserSession): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function ensureSession(): Promise<UserSession> {
  const session = await getOrCreateSession();
  await saveSession(session);
  return session;
}

export function setPlan(
  session: UserSession,
  planId: PlanId,
  options?: { resetCredits?: boolean }
): UserSession {
  const plan = getPlan(planId);
  return {
    ...session,
    plan: plan.id,
    credits: options?.resetCredits === false ? session.credits : plan.credits,
    periodKey: currentPeriodKey(),
  };
}
