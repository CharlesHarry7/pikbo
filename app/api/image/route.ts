import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { checkCredits, deductCredits, refundCredits } from "@/lib/credits";
import { IMAGE_MODEL } from "@/lib/models";
import {
  classifyProviderError,
  providerErrorMessage,
  providerFailHttp,
} from "@/lib/providerError";
import {
  endJob,
  jobInFlightRetryAfterSec,
  takeGenerateBudget,
  tryBeginJob,
} from "@/lib/rateLimit";
import { clientIp } from "@/lib/requestMeta";
import { ensureSession, publicSession, saveSession } from "@/lib/session";
import { isSafeDeliverableUrl } from "@/lib/createTrust";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { prompt?: string; aspect?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request", code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  const prompt = body.prompt?.trim();
  if (!prompt || prompt.length < 4) {
    return NextResponse.json(
      { error: "Prompt required", code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }
  if (prompt.length > 2000) {
    return NextResponse.json(
      { error: "Prompt too long (max 2000 chars)", code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  let session = await ensureSession();

  const rl = takeGenerateBudget(session.id, clientIp(req), "img");
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: `Too many image jobs — try again in ${rl.retryAfterSec}s`,
        code: "RATE_LIMITED",
        retryAfterSec: rl.retryAfterSec,
        session: publicSession(session),
      },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

  const imgLockKey = `img:${session.id}`;
  if (!tryBeginJob(imgLockKey)) {
    const retryAfterSec = jobInFlightRetryAfterSec(imgLockKey);
    return NextResponse.json(
      {
        error: `An image job is already running — try again in ${retryAfterSec}s`,
        code: "JOB_IN_FLIGHT",
        retryAfterSec,
        session: publicSession(session),
      },
      {
        status: 409,
        headers: { "Retry-After": String(retryAfterSec) },
      }
    );
  }

  try {
    // Shared free/demo still — never charges credits (video-first free trial honesty).
    const demoStillPayload = (demoReason: "no_provider_key" | "free_trial_video_only") => {
      // placeholder gradient SVG data URL as demo (lime/black brand, not purple)
      const sub =
        demoReason === "free_trial_video_only"
          ? "Free trial is Create video · upgrade for Flux"
          : "set FAL_KEY for Flux";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0a0a0a"/><stop offset="1" stop-color="#1a2e0a"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="48%" fill="#b8ff3c" font-size="28" text-anchor="middle" font-family="sans-serif">Pikbo demo still</text><text x="50%" y="54%" fill="#b8ff3c" font-size="14" text-anchor="middle" opacity=".75">${sub}</text></svg>`;
      const imageUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
      return {
        imageUrl,
        demo: true as const,
        demoReason,
        model: "demo",
        session: publicSession(session),
        // Parity with /api/generate honesty — cached demos never charge.
        costCredits: 0,
        creditsOutcome: "0 cached" as const,
      };
    };

    // Demo stills are free when no provider is configured (parity with video demos).
    if (!process.env.FAL_KEY) {
      await new Promise((r) => setTimeout(r, 800));
      return NextResponse.json(demoStillPayload("no_provider_key"));
    }

    // Free plan Mini trial is Create video only — stills must not burn the 10-credit trial.
    // Paid plans may live-charge Flux; free always labeled demo (0 credits).
    if (session.plan === "free") {
      await new Promise((r) => setTimeout(r, 600));
      return NextResponse.json(demoStillPayload("free_trial_video_only"));
    }

    // Paid plans only below (Free returned demo above — trial is video Create only).
    const check = checkCredits(session);
    if (!check.ok) {
      return NextResponse.json(
        {
          error: "Not enough credits — top up on Pricing or wait for plan refresh",
          code: "INSUFFICIENT_CREDITS",
          need: check.need,
          have: check.have,
          session: publicSession(session),
        },
        { status: 402 }
      );
    }

    session = deductCredits(session, check.cost);
    await saveSession(session);

    // Match generate: non-prod forced fail for refund path tests (never production).
    const forceFail =
      process.env.PIKBO_FORCE_GENERATE_FAIL === "1" &&
      process.env.NODE_ENV !== "production" &&
      process.env.VERCEL_ENV !== "production";
    if (forceFail) {
      session = refundCredits(session, check.cost);
      await saveSession(session);
      return NextResponse.json(
        {
          error:
            "Forced image failure (PIKBO_FORCE_GENERATE_FAIL) — credits restored",
          code: "GENERATION_FAILED",
          session: publicSession(session),
          creditsRefunded: true,
        },
        { status: 500 }
      );
    }

    try {
      fal.config({ credentials: process.env.FAL_KEY });
      const aspect = body.aspect || "3:4";
      // flux schnell uses image_size enums often
      const sizeMap: Record<string, string> = {
        "1:1": "square_hd",
        "3:4": "portrait_4_3",
        "9:16": "portrait_16_9",
        "16:9": "landscape_16_9",
      };

      const result = await fal.subscribe(IMAGE_MODEL, {
        input: {
          prompt: `${prompt}. Product photography style, designer toy / collectible figure, sharp detail, studio lighting.`,
          image_size: sizeMap[aspect] || "portrait_4_3",
          num_images: 1,
        },
        logs: false,
      });

      const data = result.data as {
        images?: Array<{ url?: string }>;
        image?: { url?: string };
      };
      const imageUrl = data.images?.[0]?.url || data.image?.url;
      if (!imageUrl) {
        session = refundCredits(session, check.cost);
        await saveSession(session);
        return NextResponse.json(
          {
            error: "No image returned",
            code: "MODEL_EMPTY",
            session: publicSession(session),
            creditsRefunded: true,
          },
          { status: 502 }
        );
      }
      // Parity with /api/generate — refuse non-http(s) open-redirect / injection URLs.
      if (!isSafeDeliverableUrl(imageUrl)) {
        session = refundCredits(session, check.cost);
        await saveSession(session);
        return NextResponse.json(
          {
            error: "Model returned an unsafe image URL — credits restored",
            code: "UNSAFE_URL",
            session: publicSession(session),
            creditsRefunded: true,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        imageUrl,
        demo: false,
        model: IMAGE_MODEL,
        session: publicSession(session),
        // Server-echo settlement (Wave B parity with generate).
        costCredits: check.cost,
        creditsOutcome: "10 used" as const,
      });
    } catch (err) {
      console.error("image gen error:", err);
      session = refundCredits(session, check.cost);
      await saveSession(session);
      const raw =
        err && typeof err === "object" && "body" in err
          ? JSON.stringify((err as { body?: unknown }).body)
          : err instanceof Error
            ? err.message
            : "Image generation failed";
      const kind = classifyProviderError(raw);
      const fallback =
        err instanceof Error ? err.message : "Image generation failed";
      const msg = providerErrorMessage(kind, fallback);
      const http = providerFailHttp(kind);
      return NextResponse.json(
        {
          error: msg,
          code: http.code,
          session: publicSession(session),
          creditsRefunded: true,
          ...(http.retryAfterSec != null
            ? { retryAfterSec: http.retryAfterSec }
            : {}),
        },
        {
          status: http.status,
          ...(http.retryAfterSec != null
            ? { headers: { "Retry-After": String(http.retryAfterSec) } }
            : {}),
        }
      );
    }
  } finally {
    endJob(imgLockKey);
  }
}
