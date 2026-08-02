/**
 * Homepage TDH — 哥飞 2026-07-25 拍板：
 * - 主词「ai toy video generator」只留给 /tools/ai-toy-video-generator
 * - 首页 Title/H1 走品牌 + suite，避免与 tools 页 cannibalization
 * - Keyword mesh: tools/for 承担意图；root = brand + embedded tool
 */
const SITE_DOMAIN = "pikbo.ai";
const SITE_URL = `https://${SITE_DOMAIN}`;

export const site = {
  name: "Pikbo",
  domain: SITE_DOMAIN,
  url: SITE_URL,
  /**
   * VIDEO-first product. Photo = input; short AI video = output.
   * Soft launch: free Mini trial / labeled Lab demos; no fake multi-model.
   */
  tagline: "Designer toy AI video suite",
  /**
   * Meta description — 哥飞 CTR 优化 2026-07-27: 加入搜索意图词 + 利益点驱动
   */
  description:
    "Turn one owned designer-toy photo into a fixed listing, reveal, and social-video Pack. Preview cached Pikbo Lab prototypes; real private generation is invite-only.",
  /**
   * Document title (homepage default) — brand first.
   * 哥飞 P0: must NOT match tools rank-page title.
   * CTR 优化 2026-07-27: "Designer Toy AI Video Suite" → "Turn Toy Photos into Videos" (利益点驱动)
   */
  titleDefault: "Pikbo — Turn Toy Photos into Videos",
  /**
   * Homepage H1 — brand + scene, not the full primary keyword phrase.
   * Rank H1 stays on /tools/ai-toy-video-generator.
   */
  homeH1: "One toy photo. Three product videos.",
  /** Primary rank keyword — tools page only; not homepage Title/H1 */
  keyword: "AI toy video generator",
  /** Rank battlefield URL for internal links */
  rankToolPath: "/tools/ai-toy-video-generator" as const,
  socialImages: {
    openGraph: `${SITE_URL}/pikbo-launch-pack-og-v2.png`,
    twitter: `${SITE_URL}/pikbo-launch-pack-og-v2.png`,
    width: 1731,
    height: 909,
    alt: "Pikbo — one designer-toy photo becomes three product-video formats",
  },
  contact: {
    supportEmail: `support@${SITE_DOMAIN}`,
  },
  /**
   * Add only profiles that have been verified to resolve publicly.
   * The former @pikbo_ai URL returned 404 and must not be an entity signal.
   */
  officialProfiles: [] as readonly string[],
  suiteLine: "Seller Starter Pack · 3 recipe previews",
} as const;
