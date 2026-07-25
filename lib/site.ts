/**
 * Homepage TDH — 哥飞 2026-07-25 拍板：
 * - 主词「ai toy video generator」只留给 /tools/ai-toy-video-generator
 * - 首页 Title/H1 走品牌 + suite，避免与 tools 页 cannibalization
 * - Keyword mesh: tools/for 承担意图；root = brand + embedded tool
 */
export const site = {
  name: "Pikbo",
  domain: "pikbo.ai",
  url: "https://pikbo.ai",
  /**
   * VIDEO-first product. Photo = input; short AI video = output.
   * Soft launch: free Mini trial / labeled Lab demos; no fake multi-model.
   */
  tagline: "Designer toy AI video suite",
  /** Meta description — brand suite + trial; primary keyword lives on /tools */
  description:
    "Pikbo is a designer-toy AI video suite: turn photos of figures you own into short clips for listings and social. Free Mini trial. No card. Failed live jobs restore credits when confirmed.",
  /**
   * Document title (homepage default) — brand first.
   * 哥飞 P0: must NOT match tools rank-page title.
   */
  titleDefault: "Pikbo — Designer Toy AI Video Suite | Free Mini Trial",
  /**
   * Homepage H1 — brand + scene, not the full primary keyword phrase.
   * Rank H1 stays on /tools/ai-toy-video-generator.
   */
  homeH1: "Turn your toy photos into short videos",
  /** Primary rank keyword — tools page only; not homepage Title/H1 */
  keyword: "AI toy video generator",
  /** Rank battlefield URL for internal links */
  rankToolPath: "/tools/ai-toy-video-generator" as const,
  twitter: "@pikbo_ai",
  suiteLine: "AI video for toys · Seedance live",
} as const;
