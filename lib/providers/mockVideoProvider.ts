/**
 * Mock implementation of the video provider seam.
 *
 * Purpose: prove the five downstream capabilities that have nothing to do with
 * the provider — Supabase auth, atomic credit reservation, private Storage
 * write, refresh recovery, owner-only signed download, and reconciliation
 * release — without spending provider budget. A real provider call proves only
 * the generation step; if delivery fails downstream, the money is already gone
 * and no evidence was gathered.
 *
 * Fail-closed: enabled only when PIKBO_PROVIDER_MOCK_SUCCESS=1 AND the runtime
 * is not production. isMockProviderEnabled() is the single gate; production
 * asserts it is off in the ship checklist.
 */

import {
  type VideoJobInput,
  type VideoJobResult,
  type VideoProvider,
} from "./videoProvider";

/**
 * Deliverable the mock returns. A local cached demo asset, so the downstream
 * copy-into-private-Storage step moves real bytes and produces a real SHA-256.
 */
const MOCK_DELIVERABLE = "/demos/beatbot-viral-hook.mp4";

export function isMockProviderEnabled(): boolean {
  if (process.env.PIKBO_PROVIDER_MOCK_SUCCESS !== "1") return false;
  // Never in production, regardless of the flag.
  if (process.env.VERCEL_ENV === "production") return false;
  if (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV) {
    return false;
  }
  return true;
}

export class MockVideoProvider implements VideoProvider {
  readonly id = "mock" as const;

  isConfigured(): boolean {
    return isMockProviderEnabled();
  }

  async uploadImage(file: File): Promise<string> {
    // Read the file so an unreadable or empty upload still fails here, the same
    // place a real provider upload would fail.
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength < 32) {
      throw new Error("mock provider: image data empty or too small");
    }
    return `mock://input/${encodeURIComponent(file.name)}`;
  }

  async runJob(input: VideoJobInput): Promise<VideoJobResult> {
    if (!input.imageUrl.startsWith("mock://")) {
      throw new Error("mock provider: expected a mock-uploaded image url");
    }
    const base = process.env.PIKBO_MOCK_DELIVERABLE_BASE_URL?.trim();
    const videoUrl = base
      ? `${base.replace(/\/$/, "")}${MOCK_DELIVERABLE}`
      : MOCK_DELIVERABLE;
    return {
      videoUrl,
      requestId: `mock-${input.model.replace(/[^a-z0-9]+/gi, "-")}`,
    };
  }
}
