/**
 * Homepage TDH — primary keyword focused per 哥飞 2026-07-25 diagnosis.
 * Primary: "AI toy video generator"
 * Supporting phrase in body: "photo into short video" (HomeSeoBody).
 * Keyword URLs live on /tools/* and /for/* — root stays brand + embedded tool.
 */
export const site = {
  name: "Pikbo",
  domain: "pikbo.ai",
  url: "https://pikbo.ai",
  /**
   * VIDEO-first product. Photo = input; short AI video = output.
   * Soft launch: free Mini trial / labeled Lab demos; no fake multi-model.
   */
  tagline: "AI toy video generator from one photo",
  /** Meta description — single primary intent + CTA */
  description:
    "AI toy video generator: turn one photo of a designer toy you own into a short video for listings and TikTok. Free Mini trial. No card. Failed live jobs refund credits.",
  /** Document title — one primary keyword cluster */
  titleDefault: "AI Toy Video Generator from One Photo | Pikbo",
  /** Homepage H1 — matches primary keyword, not pure brand */
  homeH1: "AI toy video generator from one photo",
  keyword: "AI toy video generator",
  twitter: "@pikbo_ai",
  suiteLine: "AI video for toys · Seedance live",
} as const;
