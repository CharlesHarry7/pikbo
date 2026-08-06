// A SECOND programmatic page type: use-case / platform landing pages at
// /for/[slug]. This is a different keyword axis from effects — it targets
// commercial-intent seller queries ("etsy listing video", "tiktok shop
// product video") that competitors rank for but Pikbo didn't cover.
//
// Each use-case cross-links to relevant effect pages, weaving effects × use
// cases into an internal-link mesh (the Pollo "Use Cases" + "Effects" model).

import type { Audience } from "./presets";

export type UseCase = {
  slug: string;
  emoji: string;
  label: string; // short nav label
  audience: Audience;
  h1: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  body: string[];
  keywords: string[];
  recommendedEffects: string[]; // preset slugs
  faq: { q: string; a: string }[];
};

export const USE_CASES: UseCase[] = [
  {
    slug: "etsy-listing-videos",
    emoji: "🛍️",
    label: "Etsy sellers",
    audience: "seller",
    h1: "Make an Etsy Listing Video for a Toy From One Photo",
    // Soft-launch honesty: no Free Mini product-cap in public SEO titles.
    seoTitle: "Etsy Toy Listing Video Generator From One Photo | Pikbo",
    seoDescription:
      "Turn one owned product photo into an Etsy listing-video recipe. Preview cached spin, floating-hero, or glam examples before gated Live submission.",
    intro:
      "Pikbo turns one photo of your handmade toy or collectible into a short listing-video draft—no camera rig or turntable. Review generated angles and product details before publishing.",
    body: [
      "Etsy shows listing videos right in the gallery, so a short spin or floating hero shot gives buyers the confidence a photo can't.",
      "Batch a whole shop's worth of product videos from the photos you already have, and keep a consistent look across every listing.",
      "Most handmade and designer-toy shops already have packshots. Pikbo reuses those stills so you do not rebook a photographer every time you add a SKU.",
      "Public validation uses cached Lab prototypes at 0 credits and never processes your upload. An eligible Live account sees an exact quote before submission.",
      "Always confirm Etsy's current media rules and that every generated product detail matches the physical item before you publish.",
    ],
    keywords: [
      "etsy listing video",
      "etsy video maker",
      "product video for etsy",
      "handmade toy video",
    ],
    recommendedEffects: ["360-spin-showcase", "floating-hero", "display-case-glam"],
    faq: [
      {
        q: "How do I make an Etsy listing video for a toy without filming?",
        a: "Upload one product photo you own, choose a listing recipe, and generate a short draft. Check Etsy's current listing requirements and verify every generated product detail before uploading.",
      },
      {
        q: "What video does Etsy allow on listings?",
        a: "Etsy supports listing videos. Pikbo can be configured for a 5-second square or vertical clip; confirm the marketplace requirements before publishing.",
      },
      {
        q: "Do I need to film anything?",
        a: "No. Pikbo generates the video from one product photo you already have.",
      },
    ],
  },
  {
    slug: "tiktok-shop-product-videos",
    emoji: "🎵",
    label: "TikTok Shop",
    audience: "seller",
    h1: "Create a TikTok Shop Video for a Toy From One Photo",
    seoTitle: "TikTok Shop Toy Video Generator From One Photo | Pikbo",
    seoDescription:
      "Create short TikTok Shop video drafts from one toy photo. Try unboxing, product-spin, and character-motion hooks built for vertical viewing.",
    intro:
      "On TikTok Shop, the opening beat matters. Pikbo turns one owned product photo into an unboxing reveal, product spin, or character-motion draft you can review and test.",
    body: [
      "Vertical 9:16 output drops straight into TikTok with no reformatting.",
      "Post a reveal for a new drop, a dance for a viral moment, and a spin for the product page — all from the same photo.",
    ],
    keywords: [
      "tiktok shop product video",
      "tiktok product video maker",
      "toy video for tiktok",
      "blind box tiktok video",
    ],
    recommendedEffects: ["blind-box-unboxing", "make-figure-dance", "mystery-box-reveal"],
    faq: [
      {
        q: "Can I make a TikTok Shop toy video from one product photo?",
        a: "Yes. Start with one clear photo, choose a vertical recipe, and generate a short draft. Performance is not guaranteed, so test hooks and verify product details before publishing.",
      },
      {
        q: "Are videos vertical for TikTok?",
        a: "Yes — these effects export in 9:16 vertical, ready to upload directly.",
      },
      {
        q: "Can I make videos for a whole product line?",
        a: "Yes, generate one per product from each photo to keep a consistent shop feed.",
      },
    ],
  },
  {
    slug: "amazon-product-videos",
    emoji: "📦",
    label: "Amazon listings",
    audience: "seller",
    h1: "Make an Amazon Product Video for a Toy From One Photo",
    seoTitle: "Amazon Toy Product Video Generator From One Photo | Pikbo",
    seoDescription:
      "Draft a product video for an Amazon toy listing from one owned photo. Generate a product spin or floating hero shot, then verify every inferred detail.",
    intro:
      "Pikbo turns one photo of your figure into a short product-spin or floating-hero draft. Generated unseen angles are illustrative, not product documentation, and must be checked before publishing.",
    body: [
      "A reviewed spin draft can provide another product view, but generated angles are not a substitute for accurate product documentation.",
      "No studio booking — produce listing videos for your whole catalog from existing product photos.",
      "Amazon media rules change. Always confirm length, format, and whether lifestyle motion is allowed for your category before you replace a main image gallery item.",
      "Use cached Lab prototypes to validate a hero-video recipe without a provider call. Live batching remains gated until account and delivery requirements pass.",
      "Never invent features the physical product does not have. If AI motion blurs a logo or accessory, re-shoot the still or regenerate with a cleaner packshot.",
    ],
    keywords: [
      "amazon product video",
      "amazon listing video maker",
      "product video for amazon",
      "toy listing video",
    ],
    recommendedEffects: ["360-spin-showcase", "floating-hero", "blind-box-unboxing"],
    faq: [
      {
        q: "Can I create an Amazon toy product video without a studio shoot?",
        a: "You can generate a short draft from one owned product photo. Confirm Amazon's current media rules and compare every generated angle with the real product before using it in a listing.",
      },
      {
        q: "What format does Amazon need?",
        a: "Square or 16:9 clips work well for Amazon listings — Pikbo's showcase effects export in those ratios.",
      },
    ],
  },
  {
    slug: "instagram-reels-for-collectors",
    emoji: "📸",
    label: "Instagram collectors",
    audience: "collector",
    h1: "Instagram Reels Maker for Toy Collectors",
    seoTitle: "Instagram Reels Maker for Collectors | Pikbo",
    seoDescription:
      "Turn your collection photos into Instagram Reels. Dancing figures, shelf pans, and neon scenes that grow a collector account.",
    intro:
      "Grow your collector account with Reels that move. Pikbo turns photos of the figures you own into dancing clips, shelf pans, and cinematic scenes — the content that gets shared.",
    body: [
      "Reels are built around motion and personality. Test a dancing figure or slow shelf pan against your static posts; performance varies by account and audience.",
      "Build a signature look for your account and post consistently without a camera setup.",
    ],
    keywords: [
      "instagram reels toy video",
      "collector reels maker",
      "figure video for instagram",
    ],
    recommendedEffects: ["make-figure-dance", "paparazzi-flash", "neon-city-night"],
    faq: [
      {
        q: "Are clips ready for Reels?",
        a: "Yes — vertical 9:16 output uploads straight to Instagram Reels.",
      },
    ],
  },
  {
    slug: "blind-box-brand-marketing",
    emoji: "🎁",
    label: "Blind box brands",
    audience: "seller",
    /**
     * Canonical job: brand / shop drop marketing (campaign teaser).
     * Distinct from /tools/blind-box-reveal-video-maker (single pull reveal tool).
     * No licensed IP names (Marvel, Star Wars, Gundam, mass blind-box franchises).
     */
    h1: "Create Blind Box Drop Videos From One Product Photo",
    seoTitle: "Blind Box Drop Video Generator for Toy Brands | Pikbo",
    seoDescription:
      "Launch indie blind-box drops with teaser clips from one product photo you own. Brand marketing drafts for restocks and series launches — not a selfie app.",
    intro:
      "Indie blind-box and designer-toy brands need launch energy without a production crew. Upload one owned product still of your original figure line and draft a drop teaser or campaign hook for social and storefronts.",
    body: [
      "This page is for brand marketing: series teaser, restock hype, and drop-day posts. For a one-off pull/reveal clip maker, use /tools/blind-box-reveal-video-maker instead — one job per URL.",
      "Shoot or use a clean packshot of your own sculpt. We never train your prompt on third-party franchises; only upload art and packaging you own or are licensed to market.",
      "Tease a series before samples ship, then post a matching motion language on drop day. Cached Lab prototypes can validate the recipe direction without processing your upload.",
      "Keep a consistent look across a release with matching recipes (mystery energy for teaser, spin for product grid). Always QA logos and box text before paid ads.",
    ],
    keywords: [
      "blind box brand marketing video",
      "blind box drop teaser video",
      "designer toy launch video",
      "indie blind box campaign clip",
    ],
    recommendedEffects: ["blind-box-unboxing", "mystery-box-reveal", "360-spin-showcase"],
    faq: [
      {
        q: "How is this different from the blind box reveal tool page?",
        a: "This /for page is for brand drop and campaign marketing. The /tools/blind-box-reveal-video-maker page is the focused tool job for a single reveal clip from one photo.",
      },
      {
        q: "How can a blind box brand make a drop teaser from one image?",
        a: "Upload an image your brand owns, select an unboxing or mystery-reveal recipe, and generate a short teaser draft. Packaging text and unrevealed surfaces are model-generated and require review.",
      },
      {
        q: "Can I tease before the product ships?",
        a: "Yes — a single render or product mockup photo of your own line is enough to draft a teaser. Do not upload IP you do not control.",
      },
    ],
  },
  {
    slug: "whatnot-live-selling",
    emoji: "📡",
    label: "Whatnot sellers",
    audience: "seller",
    h1: "Make a Whatnot Promo Video for a Toy From One Photo",
    seoTitle: "Whatnot Toy Promo Video Generator From One Photo | Pikbo",
    seoDescription:
      "Promote your Whatnot shows and drops with quick hype videos. Turn one figure photo into an unboxing or spin clip that pulls buyers into your live.",
    intro:
      "Prepare a Whatnot show promo from one owned figure photo. Pikbo drafts an unboxing or spin clip you can post before a show—without setting up another shoot between sales.",
    body: [
      "Announce a drop, tease a grail, or recap a break with a clip that matches the energy of live selling.",
      "Vertical output fits the social posts that funnel viewers to your Whatnot show.",
    ],
    keywords: [
      "whatnot seller video",
      "whatnot promo video",
      "live selling toy video",
    ],
    recommendedEffects: ["blind-box-unboxing", "360-spin-showcase", "mystery-box-reveal"],
    faq: [
      {
        q: "How do I make a promo video for a Whatnot toy show?",
        a: "Upload a photo of a toy you own, choose an unboxing or spin recipe, and prepare the clip before your show. Pikbo does not publish to Whatnot or guarantee attendance.",
      },
      {
        q: "Can I make clips between lives?",
        a: "Yes — create a promo from one photo. With a configured provider, live renders usually take 30–90 seconds, so prepare them before the show.",
      },
    ],
  },
  {
    slug: "depop-shop-videos",
    emoji: "🧵",
    label: "Depop sellers",
    audience: "seller",
    h1: "Depop Video Maker for Toy & Collectible Shops",
    seoTitle: "Depop Video Maker for Toy Sellers | Pikbo",
    seoDescription:
      "Make your Depop listings move. Turn one photo of a figure or collectible into a clean spin or glam video that stands out in the feed.",
    intro:
      "Depop is a visual, feed-first marketplace. Pikbo turns one photo of your figure or collectible into a spin or glam clip that stops the scroll and makes your shop look pro.",
    body: [
      "A short video on a listing signals a serious seller and helps a piece stand out from static photos.",
      "Keep a consistent look across your whole shop with the same effect on every item.",
      "Most Depop buyers swipe fast. Motion on the first frame is a cheap way to look more established than a single flat photo — without booking a photographer.",
      "Use the same recipe across a drop so your shop feed feels intentional. Review every generated product detail before publishing; marketplaces still require accurate listings.",
    ],
    keywords: [
      "depop video",
      "depop listing video",
      "resale toy video maker",
    ],
    recommendedEffects: ["360-spin-showcase", "display-case-glam", "floating-hero"],
    faq: [
      {
        q: "What size video does Depop use?",
        a: "Square or vertical short clips work well on Depop — both export from Pikbo's showcase effects.",
      },
    ],
  },
  // --- 哥飞式一词一页：cold-start high-intent keyword landings ---
  {
    slug: "photo-to-video-for-toys",
    emoji: "📸",
    label: "Photo → video",
    audience: "seller",
    h1: "Photo to Video for Toys & Collectibles (One Still)",
    // CTR 优化 2026-07-27: 加入 Free 驱动点击
    seoTitle: "Photo to Video AI for Toys & Collectibles, Free | Pikbo",
    seoDescription:
      "Turn one owned toy photo into a short-video recipe for figures and blind-box drops. Cached Lab preview first; eligible Live access is gated.",
    intro:
      "Photo-to-video for toys is the whole product: one clear still of a figure you own becomes a short clip for listings, TikTok, or drops. Pikbo is built for designer toys — not generic stock footage.",
    body: [
      "Most “AI video” tools assume people or landscapes. Collectibles need a different job: keep the paint, silhouette, and product identity readable while adding motion a phone pan cannot fake in ten seconds.",
      "Start with a sharp product photo — even light, full figure in frame, simple background. Cached Lab prototypes cost 0 credits and never process your upload; eligible Live jobs show an exact quote.",
      "Pick a recipe that matches the channel: 360° spin for marketplaces, unboxing energy for short-form, floating hero for launch teasers. Each landing page deep-links into Generate with the recipe pre-selected.",
      "This page is the search intent “photo to video for toys.” If you need Etsy, TikTok Shop, or Amazon specifically, use the /for/* channel pages — one commercial job per URL, same upload → generate loop.",
      "Honest limits: public validation is a cached Lab prototype, not unlimited generation. It costs 0 credits and never processes your upload.",
    ],
    keywords: [
      "photo to video toys",
      "toy image to video",
      "AI photo to video collectibles",
      "figure photo to video generator",
    ],
    recommendedEffects: ["360-spin-showcase", "floating-hero", "blind-box-unboxing"],
    faq: [
      {
        q: "Can I turn one toy photo into a video without filming?",
        a: "Yes. Upload a photo you own, confirm rights, and choose a recipe. The cached preview is free; eligible Live submission and its exact quote are checked at runtime.",
      },
      {
        q: "Is this the same as a generic image-to-video app?",
        a: "The pipeline is image-to-video, but presets, copy, and examples are toy-native (spin, unbox, display glam) so product identity stays the hero.",
      },
      {
        q: "Do Lab demos use my photo?",
        a: "No. Homepage and Lab samples are cached prototypes. Your photo is only used after an eligible signed-in account explicitly submits a live generation.",
      },
    ],
  },
  {
    slug: "action-figure-product-videos",
    emoji: "🦸",
    label: "Action figures",
    audience: "seller",
    /**
     * Canonical job: articulated figure product / listing motion.
     * Not a brand-franchise page — only original or rights-owned figures.
     * Aliases (video-generator, action-figures short) 301 here — no duplicate pages.
     */
    h1: "AI Action Figure Video Generator — Product Clips From One Photo",
    // Soft-launch honesty: no Free Mini product-cap in public SEO titles.
    seoTitle: "AI Action Figure Video Generator From One Photo | Pikbo",
    seoDescription:
      "Action-figure video recipes for sellers. One owned photo → cached spin, hero-float, or shelf-glam preview before gated Live submission.",
    intro:
      "An AI action figure video generator helps sellers of articulated designer figures show scale, paint apps, and pose without a full studio. Upload one photo of a figure you own (not a selfie) and draft a listing-ready product clip.",
    body: [
      "This URL owns the AI action figure video generator job for product/listing motion. Dance/play motion for collectors lives on effect recipes; marketplace channel pages (Etsy, Amazon) own channel SEO — link out, do not duplicate.",
      "Buyers hesitate when they only see a single front-facing JPEG. A short spin or hero float answers “how does it look in the round?” faster than three more stills.",
      "Use a neutral background when you can. Strong silhouettes survive AI motion better than cluttered shelves. Validate the recipe with a cached prototype before any eligible batch.",
      "Recommended path: 360° spin for storefronts, floating hero for “new in stock” posts, display-case glam when the figure is a premium release. Always verify likeness and accessories before you publish.",
      "Rights matter: only upload figures and photos you own or are licensed to market. Do not upload third-party franchise packaging you do not control. Soft launch enforces an owns-rights checkbox server-side.",
    ],
    keywords: [
      "AI action figure video generator",
      "ai action figure video generator",
      "action figure product video",
      "action figure listing video",
      "articulated figure product clip",
    ],
    recommendedEffects: ["360-spin-showcase", "floating-hero", "display-case-glam"],
    faq: [
      {
        q: "What is an AI action figure video generator?",
        a: "A tool that drafts short product motion from one photo of an articulated figure you own — for listings and social, not franchise IP cloning.",
      },
      {
        q: "Can I make an action figure listing video without a turntable?",
        a: "Yes. Upload one clear photo, run a spin or hero recipe, and review the draft. A physical turntable is optional, not required.",
      },
      {
        q: "Will paint details stay accurate?",
        a: "Start from a sharp photo. AI motion can soften micro detail — always inspect the output before listing high-value pieces.",
      },
      {
        q: "Is this for mass-franchise packaging?",
        a: "No. Pikbo is for photos of collectibles you own or are licensed to market. Upload original or rights-cleared figures only.",
      },
    ],
  },
  {
    slug: "toy-photography-to-video",
    emoji: "🎞️",
    label: "Toy photography",
    audience: "collector",
    h1: "Turn Toy Photography Into Short Video",
    seoTitle: "Toy Photography to Video AI | Pikbo",
    seoDescription:
      "Animate toy photography you already shot — shelf scenes, dioramas, and product stills become short videos for Reels and collector feeds.",
    intro:
      "You already invested in toy photography. Pikbo reuses that still as the first frame of a short clip so your best lighting and styling work harder on social.",
    body: [
      "Toy photographers and collectors often have a hard drive of excellent stills that die as single Instagram posts. Motion extends the life of a shot without restaging the set.",
      "Best inputs: sharp focus on the figure, controlled light, and a background you would be happy to see moving slightly. Busy city backdrops can distract; mini dioramas often shine with a gentle camera push.",
      "Use miniature-scene or floating-hero style recipes when the photo is already cinematic. Use spin when the photo is a clean product packshot and you want marketplace energy instead of story energy.",
      "Validation honesty: cached Lab examples are not generated from your upload. Eligible Live jobs show finite quotes, and refunds are claimed only when confirmed.",
      "Workflow tip: shoot once for photo, generate variants for different platforms, keep the original RAW/JPEG archive as your source of truth.",
    ],
    keywords: [
      "toy photography video",
      "animate toy photo",
      "collector toy video from photo",
      "diorama video AI",
    ],
    recommendedEffects: ["miniature-scene", "floating-hero", "360-spin-showcase"],
    faq: [
      {
        q: "Can I animate existing toy photos?",
        a: "Yes — upload a photo you own, pick a recipe, and generate a short draft. Confirm rights for any branded or collab figures before public posts.",
      },
      {
        q: "Does Pikbo replace a real camera move?",
        a: "No. It drafts AI motion from a still for social and listing use. Complex stop-motion stories still belong on a real rig.",
      },
    ],
  },
  {
    slug: "collectible-ai-video",
    emoji: "💎",
    label: "Collectibles",
    audience: "collector",
    h1: "AI Video Generator for Collectibles",
    seoTitle: "AI Video Generator for Collectibles | Pikbo",
    seoDescription:
      "Collectible video recipes for designer toys, figures, and blind boxes from one photo. Cached previews for shelves, drops, and seller listings.",
    intro:
      "Collectible culture lives on motion now — restocks, pulls, and shelf flexes. Pikbo is an AI video generator aimed at that niche: one owned photo in, short clip out.",
    body: [
      "Generic AI video tools do not speak collector language. You need recipes that look like product hero films, unboxings, and display-case glamour — not random camera chaos.",
      "Upload a photo of a piece you own and choose a collectible-native recipe. Cached prototypes show the workflow; eligible Live access is gated before provider submission.",
      "Brands and indie makers can draft teaser loops before a drop; collectors can animate a grail for community posts. Always keep rights clear and do not claim fake multi-model stacks we have not shipped.",
      "Internal mesh: pair this page with effect landings (spin, unbox) and channel pages (Etsy, TikTok Shop) so each URL owns one search job while linking to the same Generate tool.",
      "Cold-start SEO note: this URL targets “AI video for collectibles / collectible video generator.” Title, H1, and body stay aligned; we do not rotate TDH weekly during freeze.",
    ],
    keywords: [
      "AI video for collectibles",
      "collectible video generator",
      "designer toy AI video",
      "blind box AI video",
    ],
    recommendedEffects: ["display-case-glam", "blind-box-unboxing", "360-spin-showcase"],
    faq: [
      {
        q: "Is Pikbo only for sellers?",
        a: "No. Collectors use recipes for shelf flexes and community posts; sellers use the same loop for listings. Public validation uses cached prototypes.",
      },
      {
        q: "Which model runs on the public free path?",
        a: "Public validation does not promise a Live model. Cached Lab prototypes process no upload. Generate exposes a model and quote only after the full Live eligibility gate passes.",
      },
    ],
  },
  {
    slug: "designer-toy-marketing-videos",
    emoji: "🚀",
    label: "Toy brands",
    audience: "seller",
    h1: "Designer Toy Marketing Videos From One Photo",
    seoTitle: "Designer Toy Marketing Video Generator | Pikbo",
    seoDescription:
      "Draft designer-toy marketing recipes from one product photo — cached launch teaser, restock hook, and listing-spin previews.",
    intro:
      "Indie toy brands and makers need constant motion content. Pikbo drafts marketing clips from the product photos you already shot for the lookbook.",
    body: [
      "Launch weeks burn through creative. Instead of reshooting every SKU, reuse the hero packshot as the seed for a teaser, restock announcement, or listing spin.",
      "Map recipes to jobs: floating hero for “coming soon,” mystery reveal for blind-box lines, 360 spin for store pages, dance or paparazzi for social hooks when on-brand.",
      "Keep claims honest: Lab prototypes are labeled cached, Live access requires the full runtime gate, and checkout remains off during validation.",
      "Team workflow: generate drafts in Generate, download, then finish captions and brand end-cards in your editor. Pikbo is the motion draft, not a full brand OS.",
      "Link this page from product pages and newsletters with a single CTA: upload photo → generate short video. One primary action beats five competing buttons.",
    ],
    keywords: [
      "designer toy marketing video",
      "toy brand video generator",
      "product launch toy video",
      "restock announcement video toys",
    ],
    recommendedEffects: ["floating-hero", "mystery-box-reveal", "360-spin-showcase"],
    faq: [
      {
        q: "Can a small toy brand batch SKUs?",
        a: "Yes — create one selected Moment per SKU through Generate. Private access remains intentionally limited; paid allowances appear only when billing is live.",
      },
      {
        q: "Do you guarantee sales lift?",
        a: "No. Pikbo drafts clips. Conversion depends on offer, traffic, and creative testing.",
      },
    ],
  },
  {
    slug: "ebay-listing-videos",
    emoji: "🏷️",
    label: "eBay sellers",
    audience: "seller",
    h1: "eBay Listing Video for Toys From One Photo",
    seoTitle: "eBay Toy Listing Video Generator | Pikbo",
    seoDescription:
      "Plan an eBay listing video for toys and collectibles from one photo. Preview cached calm-spin recipes before gated Live submission.",
    intro:
      "eBay buyers want to trust condition and form. Draft a short spin or hero clip from one owned product photo before you list or relaunch a SKU.",
    body: [
      "Auction and fixed-price listings both benefit from motion that shows depth without hiding flaws. Prefer honest lighting and full-figure framing.",
      "Confirm eBay’s current media requirements for your site (US, UK, DE…). Public validation uses cached Lab prototypes; prove one listing look first, then scale only when Live is enabled for your account.",
      "Resellers: keep the original photo archive so disputes can be answered with the real still, not only the AI draft.",
      "Cross-link Amazon/Etsy pages if you multi-home inventory — each marketplace job keeps its own URL.",
    ],
    keywords: [
      "ebay listing video toys",
      "ebay product video maker",
      "collectible ebay video",
    ],
    recommendedEffects: ["360-spin-showcase", "display-case-glam", "floating-hero"],
    faq: [
      {
        q: "Can AI video misrepresent condition?",
        a: "Yes if you are not careful. QA every clip. Never use motion that hides damage buyers must know about.",
      },
    ],
  },
  {
    slug: "mercari-listing-videos",
    emoji: "📲",
    label: "Mercari sellers",
    audience: "seller",
    h1: "Mercari Video for Figures & Collectibles",
    seoTitle: "Mercari Toy Listing Video From One Photo | Pikbo",
    seoDescription:
      "Create short Mercari listing videos for figures and designer toys from one photo. Mobile-first clips for resale apps.",
    intro:
      "Mercari is scroll-first. A short product clip from one photo helps your figure stand out without a full reshoot between thrift finds.",
    body: [
      "Shoot or reuse a clean packshot, then generate a calm spin. Avoid over-stylized effects that look unlike the item in hand.",
      "Public path is cached Lab at 0 credits. Lab demos on Pikbo never process your upload.",
      "Resale honesty first: if the item has shelf wear, do not pick a glam recipe that hides it.",
    ],
    keywords: [
      "mercari listing video",
      "mercari figure video",
      "resale toy video maker",
    ],
    recommendedEffects: ["360-spin-showcase", "floating-hero", "display-case-glam"],
    faq: [
      {
        q: "Vertical or square?",
        a: "Both can work. Match what your Mercari feed previews best and regenerate if needed.",
      },
    ],
  },
  {
    slug: "facebook-marketplace-toy-videos",
    emoji: "💙",
    label: "Marketplace",
    audience: "seller",
    h1: "Facebook Marketplace Toy Videos From One Photo",
    seoTitle: "Facebook Marketplace Toy Video Generator | Pikbo",
    seoDescription:
      "Draft a short Facebook Marketplace video for toys and figures from one photo. Local pickup listings with clearer product motion.",
    intro:
      "Local buyers still want to see the object move. Turn one owned photo into a short Marketplace-friendly clip without a home studio.",
    body: [
      "Keep motion simple — spin or float. Heavy VFX can hurt trust for second-hand sales.",
      "Include scale context in your photos when possible; AI will not invent accurate measurements.",
      "Cached Lab previews are enough to judge listing motion. Failed Live jobs refund credits only when the server confirms release.",
    ],
    keywords: [
      "facebook marketplace toy video",
      "marketplace figure video",
      "local sell toy video",
    ],
    recommendedEffects: ["360-spin-showcase", "floating-hero", "paparazzi-flash"],
    faq: [
      {
        q: "Does Pikbo post to Marketplace?",
        a: "No. Download and upload inside Facebook yourself.",
      },
    ],
  },
  {
    slug: "reddit-collector-showcase-videos",
    emoji: "🗨️",
    label: "Reddit collectors",
    audience: "collector",
    h1: "Reddit Showcase Videos for Toy Collectors",
    seoTitle: "Reddit Toy Showcase Video From One Photo | Pikbo",
    seoDescription:
      "Make short showcase clips for Reddit toy communities from one photo — shelf flexes and pull reveals with honest Lab vs Live limits.",
    intro:
      "Subreddits reward clear product shots. A short AI motion draft can lift a still post — as long as you label AI when community rules require it.",
    body: [
      "Check each subreddit’s rules on AI media before posting. Honesty beats bans.",
      "Use display glam or spin for grails; unbox energy for pulls. Live remains gated; Lab previews stay free.",
      "Do not spam the same clip across every toy sub. Tailor captions and follow local etiquette.",
    ],
    keywords: [
      "reddit toy showcase video",
      "collector reddit video",
      "figure flex video from photo",
    ],
    recommendedEffects: ["display-case-glam", "360-spin-showcase", "blind-box-unboxing"],
    faq: [
      {
        q: "Should I disclose AI?",
        a: "If the community asks for disclosure, disclose. Pikbo is a draft tool, not a pass to break sub rules.",
      },
    ],
  },
];

/**
 * G4: short / roast-era slugs → real use-case pages.
 * Kept in source so App Router `[slug]` never 404s before next.config redirects.
 */
export const FOR_SLUG_ALIASES: Record<string, string> = {
  "etsy-sellers": "etsy-listing-videos",
  etsy: "etsy-listing-videos",
  "tiktok-shop": "tiktok-shop-product-videos",
  tiktok: "tiktok-shop-product-videos",
  amazon: "amazon-product-videos",
  "amazon-sellers": "amazon-product-videos",
  instagram: "instagram-reels-for-collectors",
  collectors: "instagram-reels-for-collectors",
  "blind-box": "blind-box-brand-marketing",
  whatnot: "whatnot-live-selling",
  depop: "depop-shop-videos",
  // 哥飞 cold-start keyword aliases → one canonical /for page each
  "photo-to-video": "photo-to-video-for-toys",
  "toy-photo-to-video": "photo-to-video-for-toys",
  "action-figure-video": "action-figure-product-videos",
  "action-figures": "action-figure-product-videos",
  // SEO Intent map aliases — no second page for same job
  "action-figure-video-generator": "action-figure-product-videos",
  "action-figure-product-video": "action-figure-product-videos",
  "blind-box-video-generator": "blind-box-brand-marketing",
  "blind-box-drop-videos": "blind-box-brand-marketing",
  "blind-box-marketing": "blind-box-brand-marketing",
  "toy-photography": "toy-photography-to-video",
  collectibles: "collectible-ai-video",
  "ai-collectible-video": "collectible-ai-video",
  "designer-toy-marketing": "designer-toy-marketing-videos",
  "toy-marketing": "designer-toy-marketing-videos",
  ebay: "ebay-listing-videos",
  "ebay-sellers": "ebay-listing-videos",
  mercari: "mercari-listing-videos",
  "facebook-marketplace": "facebook-marketplace-toy-videos",
  marketplace: "facebook-marketplace-toy-videos",
  "reddit-collectors": "reddit-collector-showcase-videos",
};

/** Resolve alias → canonical slug (or return input). */
export function resolveUseCaseSlug(slug: string): string {
  return FOR_SLUG_ALIASES[slug] ?? slug;
}

export function getUseCase(slug: string): UseCase | undefined {
  return USE_CASES.find((u) => u.slug === resolveUseCaseSlug(slug));
}
