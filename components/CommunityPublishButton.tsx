"use client";

import Link from "next/link";
import { useState } from "react";
import {
  isPathSafeLabDemoUrl,
  isPrivateMomentMediaUrl,
  isPublicCommunityVideoUrl,
  isSafeDeliverableUrl,
  isSessionGatedDownloadUrl,
  isStorageSignedObjectUrl,
  isProviderDeliveryMediaUrl,
} from "@/lib/createTrust";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { useToast } from "@/components/Toast";
import { track } from "@/lib/analytics";

/**
 * Publish a real Library clip to Community UGC.
 * Soft-launch fail closed (AIT-454): only Lab `/demos/*` (explicit public
 * deliverables) may be posted. Session `/api/downloads/*`, private signed
 * storage, and provider CDN Moments are refused client + server.
 * Lab samples (demo=true) and free-plan live raw (watermark) stay blocked.
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
  /** Free-plan live raw — not a public deliverable until T6 bake. */
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
        title="Free-plan live raw is not a public deliverable until T6 file watermark bake"
      >
        Free raw · no publish
      </span>
    );
  }

  // Private Moment media: show honest chip (Download / Lab, not Community).
  if (isPrivateMomentMediaUrl(videoUrl)) {
    const title = privateMomentPublishHint(videoUrl);
    return (
      <span
        className={`text-xs text-[var(--fg-dim)] ${className}`}
        title={title}
      >
        Private · no publish
      </span>
    );
  }

  async function publish() {
    // Fail closed before network — match server isPublicCommunityVideoUrl.
    if (isPrivateMomentMediaUrl(videoUrl)) {
      toast(privateMomentPublishHint(videoUrl));
      return;
    }
    const publicUrl = toPublicCommunityVideoUrl(videoUrl);
    if (!publicUrl || !isPublicCommunityVideoUrl(publicUrl)) {
      toast(
        "Only public Lab demos can post to Community — use Download for private Moments"
      );
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
      const poster =
        posterUrl && isSafeDeliverableUrl(posterUrl)
          ? toPublicCommunityVideoUrl(posterUrl)
          : undefined;
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
          videoUrl: publicUrl,
          posterUrl:
            poster && isPublicCommunityVideoUrl(poster) ? poster : undefined,
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
          toast(
            "Server refused private/signed URL — use Download or Lab demo, not publish"
          );
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
      title="Publish a public Lab deliverable to Community (signed-in · real post only)"
    >
      {busy ? "Publishing…" : "Publish to Community"}
    </button>
  );
}

function privateMomentPublishHint(url: string): string {
  if (isSessionGatedDownloadUrl(url)) {
    return "Private Moment (session download) — use Download or open a Lab demo, not Community publish";
  }
  if (isStorageSignedObjectUrl(url)) {
    return "Private Moment (signed storage) — use Download or open a Lab demo, not Community publish";
  }
  if (isProviderDeliveryMediaUrl(url)) {
    return "Private Moment (provider CDN) — use Download or open a Lab demo, not Community publish";
  }
  return "Private Moment — use Download or open a Lab demo, not Community publish";
}

/**
 * Normalize to a Community-allowlisted public URL.
 * Soft-launch: path-safe Lab `/demos/*` only (absolute demos kept if already public).
 */
function toPublicCommunityVideoUrl(url: string): string | null {
  if (!isSafeDeliverableUrl(url)) return null;
  if (isPrivateMomentMediaUrl(url)) return null;
  const t = url.trim();
  if (isPathSafeLabDemoUrl(t)) return t.split(/[?#]/)[0] || t;
  if (isPublicCommunityVideoUrl(t)) return t;
  return null;
}
