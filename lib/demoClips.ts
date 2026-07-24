/**
 * Cached Lab clips for demo generate path (no FAL_KEY / no live call).
 * Prefer exact preset match; fall back to rotating catalog.
 * Server-side disk probe keeps health/preflight honest when assets go missing.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { SAMPLE_TOYS } from "@/lib/samples";

const FALLBACK = [
  "/demos/orbit-dance.mp4",
  "/demos/moon-glow.mp4",
  "/demos/scout-walk.mp4",
  "/demos/beatbot-neon.mp4",
  "/demos/orbit-aura.mp4",
  "/demos/moon-smoke.mp4",
  "/demos/scout-packshot-spin.mp4",
  "/demos/orbit-hyper-cgi.mp4",
  "/demos/moon-box-reveal.mp4",
  "/demos/beatbot-viral-hook.mp4",
  "/demos/scout-story-mode.mp4",
  "/demos/beatbot-unboxed.mp4",
] as const;

/** Absolute path under public/ for a site-relative /demos/… URL. */
export function demoPublicDiskPath(urlPath: string): string {
  const rel = urlPath.replace(/^\//, "");
  return join(process.cwd(), "public", rel);
}

/** True when the static demo file exists on this process host. */
export function demoAssetOnDisk(urlPath: string): boolean {
  if (!urlPath || typeof urlPath !== "string") return false;
  if (!urlPath.startsWith("/demos/")) return false;
  try {
    return existsSync(demoPublicDiskPath(urlPath));
  } catch {
    return false;
  }
}

/**
 * Resolve a product-relevant mp4 for demo mode.
 * Prefers on-disk assets so a missing exact clip never 404s the player.
 */
export function demoClipForEffect(effect: string): string {
  const exact = DEMO_VIDEOS.find((d) => d.preset === effect);
  if (exact?.mp4 && demoAssetOnDisk(exact.mp4)) return exact.mp4;

  let h = 0;
  for (let i = 0; i < effect.length; i++) {
    h = (h + effect.charCodeAt(i) * 17) % FALLBACK.length;
  }
  const preferred = FALLBACK[h] ?? FALLBACK[0];
  if (demoAssetOnDisk(preferred)) return preferred;
  // Exact preset path missing (or hash pick missing) — scan catalog then fallbacks.
  if (exact?.mp4 && !demoAssetOnDisk(exact.mp4)) {
    /* fall through to any present clip */
  }
  for (const p of FALLBACK) {
    if (demoAssetOnDisk(p)) return p;
  }
  for (const d of DEMO_VIDEOS) {
    if (d.mp4 && demoAssetOnDisk(d.mp4)) return d.mp4;
  }
  // Last resort: declared path (preflight should fail before ship if all gone).
  return preferred;
}

/** Paths that must exist on disk for soft-launch demos. */
export function requiredDemoPaths(): string[] {
  return Array.from(new Set([...DEMO_VIDEOS.map((d) => d.mp4), ...FALLBACK]));
}

export type DemoAssetsProbe = {
  ok: boolean;
  required: number;
  present: number;
  missing: string[];
  samples: {
    required: number;
    present: number;
    missing: string[];
  };
  note: string;
};

/**
 * Ops probe for Mode A / preflight — counts only, never streams media.
 * Demo generate path needs at least one present mp4; samples gate one-click stills.
 */
export function probeDemoAssets(): DemoAssetsProbe {
  const demoPaths = requiredDemoPaths();
  const missingDemos = demoPaths.filter((p) => !demoAssetOnDisk(p));
  const samplePaths = SAMPLE_TOYS.map((s) => s.path);
  const missingSamples = samplePaths.filter((p) => !demoAssetOnDisk(p));
  const present = demoPaths.length - missingDemos.length;
  const samplesPresent = samplePaths.length - missingSamples.length;
  const ok = missingDemos.length === 0 && missingSamples.length === 0;
  return {
    ok,
    required: demoPaths.length,
    present,
    // Cap missing list so health JSON stays small if many paths break.
    missing: missingDemos.slice(0, 12),
    samples: {
      required: samplePaths.length,
      present: samplesPresent,
      missing: missingSamples.slice(0, 8),
    },
    note: ok
      ? "Lab demos + sample stills present on disk"
      : `Missing ${missingDemos.length} demo clip(s), ${missingSamples.length} sample still(s) — demo generate may 404`,
  };
}
