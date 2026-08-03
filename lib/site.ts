/**
 * Homepage TDH — 哥飞 2026-07-25 拍板：
 * - 主词「ai toy video generator」只留给 /tools/ai-toy-video-generator
 * - 首页 Title/H1 走品牌 + seller outcome，避免与 tools 页 cannibalization
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
  tagline: "AI creative studio for designer toys",
  /**
   * Meta description — 哥飞 CTR 优化 2026-07-27: 加入搜索意图词 + 利益点驱动
   */
  description:
    "Turn one owned toy photo into product-listing, blind-box reveal, and social-launch video directions with Pikbo, an AI product video studio for toy sellers.",
  /**
   * Document title (homepage default) — brand first.
   * 哥飞 P0: must NOT match tools rank-page title.
   * CTR 优化 2026-07-27: "Designer Toy AI Video Suite" → "Turn Toy Photos into Videos" (利益点驱动)
   */
  titleDefault: "Pikbo — AI Product Video Studio for Toy Sellers",
  /**
   * Homepage H1 — brand + scene, not the full primary keyword phrase.
   * Rank H1 stays on /tools/ai-toy-video-generator.
   */
  homeH1: "One toy photo. More ways to sell.",
  /** Primary rank keyword — tools page only; not homepage Title/H1 */
  keyword: "AI toy video generator",
  /** Rank battlefield URL for internal links */
  rankToolPath: "/tools/ai-toy-video-generator" as const,
  socialImages: {
    openGraph: `${SITE_URL}/og.jpg`,
    twitter: `${SITE_URL}/og.jpg`,
    width: 1200,
    height: 630,
    alt: "Pikbo Capsule Reveal — an original creative direction for designer toys",
  },
  contact: {
    supportEmail: `support@${SITE_DOMAIN}`,
  },
  /**
   * Add only profiles that have been verified to resolve publicly.
   * The former @pikbo_ai URL returned 404 and must not be an entity signal.
   */
  officialProfiles: [] as readonly string[],
  suiteLine: "Three seller formats · private creation beta",
} as const;
