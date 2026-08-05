/**
 * Marketing-site contact form intake.
 *
 * Soft-launch: validate + rate-limit; durable store only when
 * CONTACT_WEBHOOK_URL is configured. Never invent delivery confirmation
 * beyond "accepted for review" / webhook status.
 */

import { site } from "@/lib/site";

export type ContactPayload = {
  name: string;
  email: string;
  message: string;
  subject?: string;
  source?: string;
};

export type ContactValidation =
  | { ok: true; data: ContactPayload }
  | { ok: false; code: string; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactBody(raw: unknown): ContactValidation {
  if (!raw || typeof raw !== "object") {
    return { ok: false, code: "INVALID_JSON", error: "Expected JSON object" };
  }
  const body = raw as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const subject =
    typeof body.subject === "string" ? body.subject.trim().slice(0, 160) : "";
  const source =
    typeof body.source === "string" ? body.source.trim().slice(0, 80) : "";

  if (name.length < 1 || name.length > 120) {
    return {
      ok: false,
      code: "INVALID_NAME",
      error: "name is required (1–120 characters)",
    };
  }
  if (!email || email.length > 200 || !EMAIL_RE.test(email)) {
    return {
      ok: false,
      code: "INVALID_EMAIL",
      error: "A valid email is required",
    };
  }
  if (message.length < 10 || message.length > 4000) {
    return {
      ok: false,
      code: "INVALID_MESSAGE",
      error: "message is required (10–4000 characters)",
    };
  }

  return {
    ok: true,
    data: {
      name,
      email,
      message,
      ...(subject ? { subject } : {}),
      ...(source ? { source } : {}),
    },
  };
}

export function contactSupportEmail(): string {
  return site.contact.supportEmail;
}

export function contactWebhookConfigured(): boolean {
  return Boolean(process.env.CONTACT_WEBHOOK_URL?.trim());
}

/**
 * Optional operator webhook (e.g. Slack/Zapier). Failures are returned; the
 * route may still acknowledge receipt with a mailto fallback.
 */
export async function deliverContactWebhook(
  data: ContactPayload
): Promise<{ delivered: boolean; error?: string }> {
  const url = process.env.CONTACT_WEBHOOK_URL?.trim();
  if (!url) return { delivered: false };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "pikbo.contact",
        receivedAt: new Date().toISOString(),
        supportEmail: contactSupportEmail(),
        ...data,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        delivered: false,
        error: `webhook HTTP ${res.status}`,
      };
    }
    return { delivered: true };
  } catch (e) {
    return {
      delivered: false,
      error: e instanceof Error ? e.message : "webhook failed",
    };
  }
}
