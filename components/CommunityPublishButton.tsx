"use client";

import Link from "next/link";
import { useState } from "react";
import { isSafeDeliverableUrl } from "@/lib/createTrust";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { useToast } from "@/components/Toast";
import { track } from "@/lib/analytics";

/**
 * Publish a real Library clip to Community UGC.
 * Never invent posts — only signed-in users + safe http(s) video URLs.
 * Lab demos (demo=true) and Free Mini watermark raw (T6) are blocked —
 * publishing raw free provider URLs would bypass the download gate.
 */
export function CommunityPublishButton({
  videoUrl,
  posterUrl,
  effectSlug,
  effectName,
  demo,
  watermark,
  className = "",
}: {
  videoUrl: string;
  posterUrl?: string | null;
  effectSlug?: string;
  effectName?: string;
  demo?: boolean;
  /** Free Mini live raw — not a public deliverable until T6 bake. */
  watermark?: boolean;
  className?: string;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);

  if (demo) {
    return (
      <span
        className={`text-xs text-[var(--fg-dim)] ${className}`}
        title="Cached Lab demos stay on Lab wall — publish your live generate"
      >
        Lab only
      </span>
    );
  }

  if (watermark) {
    return (
      <span
        className={`text-xs text-[var(--fg-dim)] ${className}`}
        title="Free Mini live raw is not a public deliverable until T6 file watermark bake"
      >
        Free raw · no publish
      </span>
    );
  }

  async function publish() {
    const abs = toPublicVideoUrl(videoUrl);
    if (!abs) {
      toast("Need a public http(s) video URL to publish");
      return;
    }
    // Relative /demos paths become absolute — still require safe scheme.
    if (!isSafeDeliverableUrl(abs)) {
      toast("Unsafe video URL — not published");
      return;
    }
    const sb = getSupabaseBrowser();
    if (!sb) {
      toast("Sign-in not configured yet — Community UGC waits on Supabase");
      return;
    }
    setBusy(true);
    try {
      const { data: sessionData } = await sb.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast("Sign in to publish to Community");
        return;
      }
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: (effectName || "My toy video").slice(0, 120),
          caption: "Made with Pikbo · designer toy video",
          effectSlug: effectSlug || undefined,
          videoUrl: abs,
          posterUrl: posterUrl && isSafeDeliverableUrl(posterUrl)
            ? toPublicVideoUrl(posterUrl) || undefined
            : undefined,
        }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        id?: string;
        error?: string;
        code?: string;
        retryAfterSec?: number;
      };
      if (!res.ok || !body.ok) {
        if (body.code === "UNAUTHORIZED" || res.status === 401) {
          toast("Session expired — sign in again");
        } else if (body.code === "NOT_CONFIGURED" || res.status === 503) {
          toast("Community UGC not configured on this deploy");
        } else if (body.code === "RATE_LIMITED" || res.status === 429) {
          const wait =
            typeof body.retryAfterSec === "number"
              ? ` · retry in ${body.retryAfterSec}s`
              : "";
          toast(`Too many publishes${wait}`);
        } else if (body.code === "UNSAFE_URL") {
          toast("Server refused unsafe video URL");
        } else {
          toast(body.error || body.code || "Publish failed");
        }
        return;
      }
      setDoneId(body.id || "ok");
      track({
        event: "export_click",
        path: "/library",
        recipe: effectSlug,
        demo: false,
        meta: { via: "community_publish" },
      });
      toast("Published to Community");
    } catch {
      toast("Network error publishing");
    } finally {
      setBusy(false);
    }
  }

  if (doneId) {
    return (
      <Link
        href="/community"
        className={`text-xs font-bold text-[var(--mint)] hover:underline ${className}`}
      >
        On Community →
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void publish()}
      className={`text-xs font-bold text-[var(--mint)] hover:underline disabled:opacity-50 ${className}`}
      title="Publish this live clip to Community (signed-in · real post only)"
    >
      {busy ? "Publishing…" : "Publish to Community"}
    </button>
  );
}

function toPublicVideoUrl(url: string): string | null {
  if (!isSafeDeliverableUrl(url)) return null;
  const t = url.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("/") && typeof window !== "undefined") {
    return `${window.location.origin}${t}`;
  }
  return null;
}
