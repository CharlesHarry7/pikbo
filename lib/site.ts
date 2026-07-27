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
  /**
   * Meta description — 哥飞 CTR 优化 2026-07-27: 加入搜索意图词 + 利益点驱动
   */
  description:
    "Turn one toy photo into a short AI video — spin, reveal, or hero clip. Free Mini trial, no card. Built for designer toys, blind boxes, and collectibles.",
  /**
   * Document title (homepage default) — brand first.
   * 哥飞 P0: must NOT match tools rank-page title.
   * CTR 优化 2026-07-27: "Designer Toy AI Video Suite" → "Turn Toy Photos into Videos" (利益点驱动)
   */
  titleDefault: "Pikbo — Turn Toy Photos into Videos | Free Mini, No Card",
  /**
   * Homepage H1 — brand + scene, not the full primary keyword phrase.
   * Rank H1 stays on /tools/ai-toy-video-generator.
   */
  homeH1: "Turn your toy photos into launch-ready videos",
  /** Primary rank keyword — tools page only; not homepage Title/H1 */
  keyword: "AI toy video generator",
  /** Rank battlefield URL for internal links */
  rankToolPath: "/tools/ai-toy-video-generator" as const,
  twitter: "@pikbo_ai",
  suiteLine: "Seller Starter Pack · 3 clips / 30 credits",
} as const;
