export type DemoVideo = {
  id: string;
  title: string;
  character: string;
  eyebrow: string;
  result: string;
  preset: string;
  ratio: "9:16" | "1:1" | "16:9";
  poster: string;
  mp4: string;
  webm: string;
  accent: string;
  /**
   * First public publish time (ISO 8601 DateTime with timezone).
   * Source: git first-commit author date of the asset / registry batch.
   * Used as VideoObject.uploadDate — never invent a single fake global date.
   */
  publishedAt: string;
};

/**
 * Original Pikbo prototype footage. These are cached product demos, so homepage
 * playback never invokes fal.ai and demo mode remains useful without FAL_KEY.
 *
 * Posters/input stills were re-art-directed 2026-07-29 (Wave A frontend
 * polish): each character's still is now a premium studio product photo of
 * the same PIKBO Lab character (/demos/inputs/<character>.webp, original Lab
 * key visuals). Cached output videos are unchanged. See docs/ASSETS.md.
 *
 * publishedAt notes:
 * - First six: homepage demo theatre commit 2026-07-22T19:57:06+08:00
 * - Mini lab six: Seedance Mini lab batch commit 2026-07-23T03:11:03+08:00
 */
export const DEMO_VIDEOS: DemoVideo[] = [
  {
    id: "orbit-cgi",
    title: "Zero-gravity product hero",
    character: "Orbit",
    eyebrow: "Product showcase",
    result: "A cached product-hero prototype for recipe preview.",
    preset: "floating-hero",
    ratio: "9:16",
    poster: "/demos/inputs/orbit.webp",
    mp4: "/demos/orbit-hyper-cgi.mp4",
    webm: "/demos/orbit-hyper-cgi.webm",
    accent: "#b8a3ff",
    publishedAt: "2026-07-22T11:57:06Z",
  },
  {
    id: "moon-reveal",
    title: "Blind-box reveal",
    character: "Moon",
    eyebrow: "Unboxing",
    result: "A punchy reveal loop for Reels, Shorts, and listings.",
    preset: "blind-box-unboxing",
    ratio: "9:16",
    poster: "/demos/inputs/moon.webp",
    mp4: "/demos/moon-box-reveal.mp4",
    webm: "/demos/moon-box-reveal.webm",
    accent: "#83f3d2",
    publishedAt: "2026-07-22T11:57:06Z",
  },
  {
    id: "scout-story",
    title: "Miniature story world",
    character: "Scout",
    eyebrow: "Story scene",
    result: "Turn a shelf character into a tiny cinematic moment.",
    preset: "miniature-scene",
    ratio: "16:9",
    poster: "/demos/inputs/scout.webp",
    mp4: "/demos/scout-story-mode.mp4",
    webm: "/demos/scout-story-mode.webm",
    accent: "#ffd36a",
    publishedAt: "2026-07-22T11:57:06Z",
  },
  {
    id: "beatbot-hook",
    title: "Drop-day viral hook",
    character: "Beatbot",
    eyebrow: "Social hook",
    result: "Front-load the motion and make the first second count.",
    preset: "paparazzi-flash",
    ratio: "9:16",
    poster: "/demos/inputs/beatbot.webp",
    mp4: "/demos/beatbot-viral-hook.mp4",
    webm: "/demos/beatbot-viral-hook.webm",
    accent: "#ff6ea8",
    publishedAt: "2026-07-22T11:57:06Z",
  },
  {
    id: "scout-spin",
    title: "Listing-ready spin",
    character: "Scout",
    eyebrow: "Marketplace",
    result: "Show the silhouette and finish without filming a turntable.",
    preset: "360-spin-showcase",
    ratio: "1:1",
    poster: "/demos/inputs/scout.webp",
    mp4: "/demos/scout-packshot-spin.mp4",
    webm: "/demos/scout-packshot-spin.webm",
    accent: "#ff9f6e",
    publishedAt: "2026-07-22T11:57:06Z",
  },
  {
    id: "beatbot-unboxed",
    title: "Collector unboxing cut",
    character: "Beatbot",
    eyebrow: "Launch content",
    result: "Reuse one toy photo across a second sales-ready format.",
    preset: "mystery-box-reveal",
    ratio: "9:16",
    poster: "/demos/inputs/beatbot.webp",
    mp4: "/demos/beatbot-unboxed.mp4",
    webm: "/demos/beatbot-unboxed.webm",
    accent: "#74e4ff",
    publishedAt: "2026-07-22T11:57:06Z",
  },
  // --- Cached Mini Lab batch added 2026-07-23; provider task evidence is absent ---
  {
    id: "orbit-dance",
    title: "Toy dance drop",
    character: "Orbit",
    eyebrow: "Come alive",
    result: "Dance loop for social posts.",
    preset: "make-figure-dance",
    ratio: "9:16",
    poster: "/demos/inputs/orbit.webp",
    mp4: "/demos/orbit-dance.mp4",
    webm: "/demos/orbit-dance.mp4",
    accent: "#c8ff3d",
    publishedAt: "2026-07-22T19:11:03Z",
  },
  {
    id: "moon-glow",
    title: "Display case glam",
    character: "Moon",
    eyebrow: "Showcase",
    result: "Boutique shelf glow.",
    preset: "display-case-glam",
    ratio: "9:16",
    poster: "/demos/inputs/moon.webp",
    mp4: "/demos/moon-glow.mp4",
    webm: "/demos/moon-glow.mp4",
    accent: "#b8a3ff",
    publishedAt: "2026-07-22T19:11:03Z",
  },
  {
    id: "scout-walk",
    title: "Figure walk cycle",
    character: "Scout",
    eyebrow: "Come alive",
    result: "A cached walk-cycle prototype for recipe preview.",
    preset: "make-figure-walk",
    ratio: "9:16",
    poster: "/demos/inputs/scout.webp",
    mp4: "/demos/scout-walk.mp4",
    webm: "/demos/scout-walk.mp4",
    accent: "#ffd36a",
    publishedAt: "2026-07-22T19:11:03Z",
  },
  {
    id: "beatbot-neon",
    title: "Neon city night",
    character: "Beatbot",
    eyebrow: "Scene",
    result: "Neon cyber backdrop.",
    preset: "neon-city-night",
    ratio: "9:16",
    poster: "/demos/inputs/beatbot.webp",
    mp4: "/demos/beatbot-neon.mp4",
    webm: "/demos/beatbot-neon.mp4",
    accent: "#74e4ff",
    publishedAt: "2026-07-22T19:11:03Z",
  },
  {
    id: "orbit-aura",
    title: "Power aura burst",
    character: "Orbit",
    eyebrow: "VFX",
    result: "Energy aura around figure.",
    preset: "power-aura",
    ratio: "9:16",
    poster: "/demos/inputs/orbit.webp",
    mp4: "/demos/orbit-aura.mp4",
    webm: "/demos/orbit-aura.mp4",
    accent: "#ff6ea8",
    publishedAt: "2026-07-22T19:11:03Z",
  },
  {
    id: "moon-smoke",
    title: "Smoke entrance",
    character: "Moon",
    eyebrow: "Reveal",
    result: "Smoke burst entrance.",
    preset: "smoke-burst-entrance",
    ratio: "9:16",
    poster: "/demos/inputs/moon.webp",
    mp4: "/demos/moon-smoke.mp4",
    webm: "/demos/moon-smoke.mp4",
    accent: "#83f3d2",
    publishedAt: "2026-07-22T19:11:03Z",
  },
];
