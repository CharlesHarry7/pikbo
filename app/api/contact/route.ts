import {
  corsJson,
  marketingCorsPreflight,
} from "@/lib/cors";
import {
  contactSupportEmail,
  contactWebhookConfigured,
  deliverContactWebhook,
  validateContactBody,
} from "@/lib/contactSubmissions";
import { takeToken } from "@/lib/rateLimit";
import { clientIp } from "@/lib/requestMeta";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  return marketingCorsPreflight(req);
}

/**
 * POST /api/contact — marketing contact form for the static site.
 * Rate-limited; optional CONTACT_WEBHOOK_URL delivery; always returns support email.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const ipRl = takeToken(`contact-ip:${ip || "unknown"}`, 8, 60_000);
  if (!ipRl.ok) {
    return corsJson(
      req,
      {
        ok: false,
        code: "RATE_LIMITED",
        error: `Too many contact submissions — try again in ${ipRl.retryAfterSec}s`,
        retryAfterSec: ipRl.retryAfterSec,
        supportEmail: contactSupportEmail(),
      },
      {
        status: 429,
        headers: { "Retry-After": String(ipRl.retryAfterSec) },
      }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return corsJson(
      req,
      {
        ok: false,
        code: "INVALID_JSON",
        error: "Invalid JSON body",
        supportEmail: contactSupportEmail(),
      },
      { status: 400 }
    );
  }

  const validated = validateContactBody(raw);
  if (!validated.ok) {
    return corsJson(
      req,
      {
        ok: false,
        code: validated.code,
        error: validated.error,
        supportEmail: contactSupportEmail(),
      },
      { status: 400 }
    );
  }

  // Per-email soft cap (avoid inbox spam from one address).
  const emailKey = validated.data.email.toLowerCase();
  const emailRl = takeToken(`contact-email:${emailKey}`, 4, 60 * 60_000);
  if (!emailRl.ok) {
    return corsJson(
      req,
      {
        ok: false,
        code: "RATE_LIMITED",
        error: `Too many messages from this email — try again in ${emailRl.retryAfterSec}s`,
        retryAfterSec: emailRl.retryAfterSec,
        supportEmail: contactSupportEmail(),
      },
      {
        status: 429,
        headers: { "Retry-After": String(emailRl.retryAfterSec) },
      }
    );
  }

  const webhook = await deliverContactWebhook(validated.data);
  const supportEmail = contactSupportEmail();

  // Never claim email was sent unless a webhook confirmed delivery.
  if (webhook.delivered) {
    return corsJson(
      req,
      {
        ok: true,
        received: true,
        delivered: true,
        supportEmail,
        note: "Message accepted and forwarded to the operator inbox webhook.",
      },
      { status: 201 }
    );
  }

  // Accepted for operator review path — client may still open mailto.
  console.info(
    "[contact]",
    JSON.stringify({
      at: new Date().toISOString(),
      nameLen: validated.data.name.length,
      emailDomain: emailKey.includes("@") ? emailKey.split("@")[1] : "unknown",
      messageLen: validated.data.message.length,
      source: validated.data.source || null,
      webhook: contactWebhookConfigured() ? "failed" : "not_configured",
      webhookError: webhook.error || null,
    })
  );

  return corsJson(
    req,
    {
      ok: true,
      received: true,
      delivered: false,
      supportEmail,
      note: contactWebhookConfigured()
        ? "Message validated but webhook delivery failed. Email support@ directly if urgent."
        : "Message validated. Operator webhook not configured — use supportEmail for guaranteed delivery.",
      mailto: `mailto:${supportEmail}?subject=${encodeURIComponent(
        validated.data.subject || "Pikbo contact"
      )}`,
    },
    { status: 202 }
  );
}
