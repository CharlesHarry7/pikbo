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
  tagline: "World-class AIGC video for designer toys",
  /**
   * Meta description — seller outcome + category leadership, not multi-model zoo.
   */
  description:
    "Pikbo is the designer-toy AI video suite: one owned photo → listing spin, blind-box reveal, and social drop clips. Built like a creative OS, specialized for figures, sofubi, and collectibles.",
  /**
   * Document title (homepage default) — brand + category claim.
   * Rank keyword title stays on /tools (no cannibalization).
   */
  titleDefault: "Pikbo — Designer Toy AI Video Suite",
  /**
   * Homepage H1 — category leadership claim (HF-class suite, toy-vertical).
   * Rank H1 stays on /tools/ai-toy-video-generator.
   */
  homeH1: "The world's designer-toy AI video suite.",
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
  suiteLine: "World-class toy video AIGC · one photo → sellable clips",
} as const;
