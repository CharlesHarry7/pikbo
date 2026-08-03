// Fourth programmatic page type: search-intent "tool" pages at /tools/[slug].
// Built to GPT's docs/prd/SEO_INTENT_50.md — one page completes one search job:
// searchable H1 + a working recipe deep-link to Create + honest limits + FAQ.
// Keyword mesh is now: Tools × Effects × Use-cases × Toy-types.
//
// Honesty rules (SEO_INTENT_50): no page promises exact unseen product angles,
// sales, reach, speed, or unlimited generation. Every page deep-links to a real
// recipe in Create; brand names are never targeted.

export type Tool = {
  slug: string;
  emoji: string;
  label: string; // short chip label
  h1: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  body: string[];
  keywords: string[];
  primaryEffect: string; // preset slug that drives the tool panel
  effects: string[]; // preset slugs shown as recommended cards
  faq: { q: string; a: string }[];
};

export const TOOLS: Tool[] = [
  {
    slug: "ai-toy-video-generator",
    emoji: "🧸",
    label: "AI toy video",
    // 哥飞/养站对齐 2026-07-26：只动 T+D 提 CTR，H1 不动；主词仍在 Title 前部
    // CTR 优化 2026-07-27: 缩短至 55 字符避免 SERP 截断；加入 Free 驱动点击
    h1: "AI Toy Video Generator — Photo to Short Video for Designer Toys",
    seoTitle: "AI Toy Video Generator: One Photo to Toy Video | Pikbo",
    seoDescription:
      "Turn one owned toy photo into one directed product-video Moment for a listing, reveal, or social drop. See verified limits before beta access.",
    intro:
      "Pikbo is a focused toy-video studio for sellers and independent brands. One rights-owned figure photo becomes one selected visual outcome instead of a maze of model menus and prompts.",
    body: [
      "Choose the one recipe you need now: Listing Spin for a product page, Blind-box Reveal for a drop, or Street Power-Up for social. Each beta format stays constrained so quality, recovery, and cost can be measured before more choices are added.",
      "Start with a full-product photo you own: front-facing, even light, plain background, and the complete figure in frame. Busy shelves, clipped accessories, and harsh shadows make identity drift more likely.",
      "Public visitors can inspect cached format previews; those previews do not process the uploaded image. Invited accounts use a private Library, short-lived owner download links, and ten credits per completed clip.",
      "Current technical evidence is deliberately narrow. An original unbranded synthetic still produced one private Listing Spin in about two minutes thirty-nine seconds; the 5.042-second 960×960 file reopened after refresh and downloaded twice with identical bytes. This is not a physical product or customer case.",
      "A second internal run stopped before a video was made. Zero credits settled and ten credits were restored. Seller reuse and paid demand are still being validated.",
      "Generated side and back details are inferred. Compare sculpt, paint, logos, packaging, accessories, and proportions with the physical toy before a listing or launch post.",
    ],
    keywords: [
      "ai toy video generator",
      "AI toy video generator from one photo",
      "toy video maker from photo",
      "make a toy video with ai",
      "designer toy AI video",
      "one photo toy video AI",
      "toy product video AI",
    ],
    primaryEffect: "360-spin-showcase",
    effects: ["360-spin-showcase", "floating-hero", "blind-box-unboxing"],
    faq: [
      {
        q: "What is an AI toy video generator?",
        a: "It turns one still photo of a designer toy into a short motion clip. Pikbo is built for figures, blind boxes, and art toys — not generic stock footage. Related jobs: designer toy AI video, one photo toy video AI, and figure 360 clips on their own tool URLs.",
      },
      {
        q: "Is this free to try?",
        a: "Public cached previews need no card and do not process your upload. Private generation and subscriptions remain closed while quality, recovery, and cost are validated.",
      },
      {
        q: "Can it replace a real turntable shoot?",
        a: "It drafts product motion from one photo when you lack a rig. Always QA inferred angles against the physical toy before listing high-value pieces.",
      },
      {
        q: "Does the result match my exact sculpt?",
        a: "Your photo is the reference. Motion can still change small details — review before publishing.",
      },
      {
        q: "Where else should I go after this page?",
        a: "Open a recipe, choose one directed Moment for the job you are doing now, then read pricing for the current beta limits.",
      },
    ],
  },
  {
    slug: "toy-image-to-video-ai",
    emoji: "🎞️",
    label: "Image → video",
    h1: "Turn a Toy Image Into a Video",
    seoTitle: "Toy Image to Video AI — Animate a Photo | Pikbo",
    seoDescription:
      "Upload a toy image and turn it into a short video with AI. The figure in your photo walks, dances, or spins — built for collectors and toy sellers.",
    intro:
      "Have one good photo of your figure? Pikbo turns that image into motion. Choose how it should move and generate a short vertical clip from the still you already have.",
    body: [
      "Image-to-video keeps your figure as the visual reference, so the result looks like your toy rather than a generic character.",
      "Best with a clean, well-lit, front-facing photo on a plain background. Generated details can drift — review before posting.",
      "Use walk or dance recipes when you want character motion; use spin when the still is a packshot for marketplaces. One tool page, one primary job — deep-linked to Create.",
      "Free Mini caps apply on soft launch. Lab wall clips never spend your photo. Keep the browser tab open until the job finishes or credits may look wrong until refresh.",
    ],
    keywords: [
      "toy image to video",
      "image to video ai toy",
      "photo to video toy maker",
    ],
    primaryEffect: "make-figure-walk",
    effects: ["make-figure-walk", "make-figure-dance", "360-spin-showcase"],
    faq: [
      {
        q: "What image works best?",
        a: "A clean, front-facing photo on a plain background with even lighting gives the smoothest motion.",
      },
      {
        q: "How long is the clip?",
        a: "Free Mini clips are 5 seconds at 480p. Paid tiers unlock longer, higher-resolution runs.",
      },
    ],
  },
  {
    slug: "ai-product-video-generator-for-toys",
    emoji: "🛍️",
    label: "Product video",
    h1: "Toy Product Video AI — Listing Clips From One Photo",
    // CTR 优化 2026-07-27: 加入 Free 驱动点击
    seoTitle: "Toy Product Video AI: Listing Clips, Free Mini | Pikbo",
    seoDescription:
      "Toy product video recipes for Etsy, TikTok Shop, and storefronts. One owned photo → clean spin or hero workflow, with a cached preview first.",
    intro:
      "Toy product video AI is for sellers who already have a packshot. Pikbo turns one product photo into a clean spin or hero clip that shows your figure off for a storefront — without a camera studio.",
    body: [
      "Searchers looking for toy product video AI usually need listing motion, not cinematic chaos. A short spin lets buyers inspect a collectible; it does not guarantee a sale. Check inferred angles against the real product.",
      "Paid clips are cleared for commercial use — keep the video honest to the product you're actually selling.",
      "Head term AI toy video generator lives on /tools/ai-toy-video-generator. This page owns the e-commerce product-video job only.",
    ],
    keywords: [
      "toy product video AI",
      "ai product video generator toys",
      "toy listing video maker",
      "product video from photo toy",
    ],
    primaryEffect: "360-spin-showcase",
    effects: ["360-spin-showcase", "floating-hero", "display-case-glam"],
    faq: [
      {
        q: "What is toy product video AI?",
        a: "It drafts a short product clip from one toy photo for listings and shops. Pikbo is toy-native — paint and sculpt stay the reference.",
      },
      {
        q: "Can I use these for listings?",
        a: "Paid clips are cleared for commercial use. Because angles are generated, review sculpt, paint, and logos before publishing.",
      },
      {
        q: "Which marketplaces?",
        a: "Export vertical for TikTok Shop or square for marketplace galleries like Etsy and eBay.",
      },
    ],
  },
  {
    slug: "collectible-video-generator",
    emoji: "🏆",
    label: "Collectible video",
    h1: "Collectible Video Generator From a Photo",
    seoTitle: "Collectible Video Generator From a Photo | Pikbo",
    seoDescription:
      "Give your collectibles the premium video they deserve. Glam lighting, floating hero shots, and spins from one photo — for collectors and resellers.",
    intro:
      "A grail piece deserves better than a shelf photo. Pikbo turns one photo of your collectible into a glam-lit showcase, a floating hero shot, or a clean spin.",
    body: [
      "Built for designer toys, resin, sofubi, and vinyl where the sculpt and finish are the appeal.",
      "The figure stays the reference; generated lighting and motion are stylized effects — review before commercial use.",
    ],
    keywords: [
      "collectible video generator",
      "collectible showcase video",
      "figure showcase video from photo",
    ],
    primaryEffect: "display-case-glam",
    effects: ["display-case-glam", "floating-hero", "360-spin-showcase"],
    faq: [
      {
        q: "Good for grail pieces?",
        a: "Yes — the glam and hero effects add cinematic lighting while keeping your figure sharp and centered.",
      },
      {
        q: "Does it keep the finish?",
        a: "Glossy vinyl and resin play well with the glam lighting. Review the clip to confirm colors read correctly.",
      },
    ],
  },
  {
    slug: "toy-animation-from-photo",
    emoji: "✨",
    label: "Toy animation",
    h1: "Animate a Toy From a Photo",
    seoTitle: "Animate a Toy From a Photo With AI | Pikbo",
    seoDescription:
      "Bring a toy to life from a single photo. Make the figure you own dance, wave, or come alive — clips built for Reels and TikTok.",
    intro:
      "Pikbo animates the toy in your photo. Pick a come-alive recipe — a dance, a wave, a little bit of life — and generate a short clip that gives your figure personality.",
    body: [
      "The state is always clear before you generate: a labeled cached demo, or a live run against your uploaded photo.",
      "Come-alive motion is generated, so expect small variations in the figure between runs. Not happy? Regenerate — failed live jobs restore credits when confirmed.",
    ],
    keywords: [
      "animate toy from photo",
      "toy comes alive video",
      "make a toy move ai",
    ],
    primaryEffect: "make-figure-dance",
    effects: ["make-figure-dance", "toy-wave-hello", "plushie-comes-alive"],
    faq: [
      {
        q: "Cached demo or live?",
        a: "The preflight shows whether the next result is a labeled cached demo or a live run that uses your uploaded photo.",
      },
      {
        q: "What if the motion looks off?",
        a: "AI motion varies run to run. Regenerate for a different take — failed live jobs refund when the server can confirm failure.",
      },
    ],
  },
  {
    slug: "toy-cgi-video-generator",
    emoji: "🌀",
    label: "CGI-style",
    h1: "Create a CGI-Style Product Video for a Toy",
    seoTitle: "CGI-Style Toy Product Video Generator From One Photo | Pikbo",
    seoDescription:
      "Make a clean, CGI-style product video for a toy from one photo. Floating hero shots and studio motion without a 3D model or render pipeline.",
    intro:
      "Want that polished, CGI product look without building a 3D model? Pikbo turns one photo into a floating hero or studio-motion clip with a clean, high-end feel.",
    body: [
      "There is no real 3D model behind the clip — it is a generated video from your photo, so it should not be described as a true CAD or CGI render.",
      "Great for a premium storefront hero or a scroll-stopping social post.",
    ],
    keywords: [
      "cgi toy video generator",
      "cgi style product video toy",
      "3d style toy video from photo",
    ],
    primaryEffect: "floating-hero",
    effects: ["floating-hero", "miniature-scene", "display-case-glam"],
    faq: [
      {
        q: "Is this a real 3D render?",
        a: "No — it is a generated video from your photo, not a true 3D model or CAD render. It gives a CGI-style look, not a technical model.",
      },
      {
        q: "Best photo?",
        a: "A clean, evenly lit shot on a plain background produces the most polished result.",
      },
    ],
  },
  {
    slug: "toy-launch-teaser-generator",
    emoji: "🎬",
    label: "Launch teaser",
    h1: "Create a Toy Launch Teaser From One Photo",
    seoTitle: "Toy Launch Teaser Generator From One Photo | Pikbo",
    seoDescription:
      "Make a punchy launch teaser for a toy drop from one photo. Flash-lit reveal energy for announcements on TikTok, Instagram, and Discord.",
    intro:
      "A drop needs a teaser. Pikbo turns one photo of your figure into a punchy, flash-lit reveal built to announce a launch and get people watching.",
    body: [
      "The teaser frames the figure as the moment — ideal for 'coming soon' and 'drop day' posts.",
      "Keep the teaser honest to the product; paid clips are cleared for commercial use.",
    ],
    keywords: [
      "toy launch teaser generator",
      "toy drop teaser video",
      "figure announcement video from photo",
    ],
    primaryEffect: "paparazzi-flash",
    effects: ["paparazzi-flash", "mystery-box-reveal", "confetti-drop-reveal"],
    faq: [
      {
        q: "Good for a drop announcement?",
        a: "Yes — the flash-reveal energy is built for launch and drop-day posts. Paid clips are cleared for commercial use.",
      },
      {
        q: "What length?",
        a: "Free Mini teasers are 5 seconds at 480p — enough for a punchy vertical hook.",
      },
    ],
  },
  {
    slug: "restock-announcement-video",
    emoji: "📢",
    label: "Restock video",
    h1: "Make a Restock Announcement Video for a Toy",
    seoTitle: "Toy Restock Announcement Video From One Photo | Pikbo",
    seoDescription:
      "Announce a toy restock with a high-energy reveal video from one photo. Built for Whatnot, TikTok Shop, and Instagram 'back in stock' posts.",
    intro:
      "Restocks live on urgency. Pikbo turns one photo of the figure into a reveal-energy clip that says 'back in stock' and stops the scroll.",
    body: [
      "There is no inventory integration — the clip is a social announcement you post yourself, not a live stock feed.",
      "Paid clips are cleared for commercial use; keep the reveal honest to the item you're restocking.",
    ],
    keywords: [
      "restock announcement video",
      "toy back in stock video",
      "restock reveal video from photo",
    ],
    primaryEffect: "mystery-box-reveal",
    effects: ["mystery-box-reveal", "blind-box-unboxing", "confetti-drop-reveal"],
    faq: [
      {
        q: "Does it connect to my store's stock?",
        a: "No — there's no inventory integration. It's a social announcement clip you post yourself.",
      },
      {
        q: "Where do restock videos work best?",
        a: "Vertical clips suit Whatnot promos, TikTok Shop, and Instagram 'back in stock' posts.",
      },
    ],
  },
  {
    slug: "toy-ad-generator",
    emoji: "📣",
    label: "Toy ad",
    h1: "AI Toy Ad Generator From a Product Photo",
    seoTitle: "AI Toy Ad Generator From a Product Photo | Pikbo",
    seoDescription:
      "Draft a short toy ad from one product photo. Clean hero motion for TikTok Shop and Etsy ad creative — commercial use on paid clips.",
    intro:
      "Pikbo drafts short ad creative for a toy from one product photo. Pick a clean hero recipe and generate a vertical clip you can use as ad creative.",
    body: [
      "These are ad drafts, not a media buy — Pikbo makes the creative; running the ad is up to you.",
      "Paid clips are cleared for commercial use. Keep the ad honest to the product and avoid claims you can't support.",
    ],
    keywords: [
      "ai toy ad generator",
      "toy ad video maker",
      "product ad video from photo toy",
    ],
    primaryEffect: "floating-hero",
    effects: ["floating-hero", "360-spin-showcase", "paparazzi-flash"],
    faq: [
      {
        q: "Does it run the ad for me?",
        a: "No — Pikbo makes the ad creative. Placing and running the ad is up to you.",
      },
      {
        q: "Can I use it commercially?",
        a: "Paid clips are cleared for commercial use. Keep the ad honest to the product you're selling.",
      },
    ],
  },
  {
    slug: "one-photo-product-video",
    emoji: "📸",
    label: "One photo",
    h1: "One Photo Toy Video AI — Single Still to Short Clip",
    // CTR 优化 2026-07-27: 加入 Free 驱动点击
    seoTitle: "One Photo Toy Video AI: Still to Short Clip, Free | Pikbo",
    seoDescription:
      "One-photo toy-video recipes for designers and sellers. Preview a cached hero or spin workflow before gated Live submission.",
    intro:
      "One photo toy video AI means you skip the multi-angle shoot. Pikbo turns a single product photo of your toy into a short video — floating hero or clean spin — from that one image.",
    body: [
      "The one-photo workflow is the fastest path from a shelf shot to a postable clip. No turntable required.",
      "Because the motion and any unseen angles are generated, review the result against the real product before using it in a listing.",
      "For the head term AI toy video generator, use /tools/ai-toy-video-generator. This URL owns the single-still constraint job.",
    ],
    keywords: [
      "one photo toy video AI",
      "one photo product video",
      "single photo toy video",
      "product video from one image toy",
    ],
    primaryEffect: "floating-hero",
    effects: ["floating-hero", "360-spin-showcase", "display-case-glam"],
    faq: [
      {
        q: "Really just one photo?",
        a: "Yes — one clean, front-facing photo is enough. Better lighting and a plain background give a smoother clip.",
      },
      {
        q: "Is one photo toy video AI the same as a full studio?",
        a: "No. It drafts motion from one still. QA paint and logos before high-value listings.",
      },
      {
        q: "Will it show accurate angles?",
        a: "Unseen angles are generated and inferred, so check them against the real product before using the clip in a listing.",
      },
    ],
  },
  {
    slug: "toy-unboxing-hook-generator",
    emoji: "🪝",
    label: "Unboxing hook",
    h1: "Generate a Toy Unboxing Hook for Reels and Shorts",
    // CTR 优化 2026-07-27: 加入 Free Mini Trial 驱动点击（该页有 GSC 展现但 0 点击）
    seoTitle:
      "Toy Unboxing Hook Video From One Photo — Free Mini | Pikbo",
    seoDescription:
      "Plan a toy unboxing hook from one photo. Preview cached vertical reveal recipes for Reels, Shorts, and TikTok before gated submission.",
    intro:
      "The first second decides whether anyone watches. Pikbo turns one photo of your figure into a punchy unboxing hook — the reveal opener built to stop the scroll.",
    body: [
      "Use the clip as the opening beat of a longer unboxing, or as a standalone teaser.",
      "The reveal is generated from your photo; treat it as a stylized hook and review before posting.",
    ],
    keywords: [
      "toy unboxing hook generator",
      "unboxing hook video reels",
      "toy reveal opener video from photo",
    ],
    primaryEffect: "blind-box-unboxing",
    effects: ["blind-box-unboxing", "mystery-box-reveal", "confetti-drop-reveal"],
    faq: [
      {
        q: "Is it a full unboxing?",
        a: "It's the hook — the scroll-stopping first beat. Use it to open a longer unboxing or as a standalone teaser.",
      },
      {
        q: "Best format?",
        a: "Vertical 9:16 suits Reels, Shorts, and TikTok hooks.",
      },
    ],
  },
  {
    slug: "toy-ugc-ad-generator",
    emoji: "📱",
    label: "UGC-style ad",
    h1: "Create a UGC-Style Toy Ad From Product Photos",
    seoTitle: "UGC-Style Toy Ad Generator From Product Photos | Pikbo",
    seoDescription:
      "Draft a UGC-style toy ad from a product photo. Casual, social-native motion for TikTok Shop and Reels ad creative — commercial use on paid clips.",
    intro:
      "UGC-style ads feel native to the feed. Pikbo drafts that casual, social look for your toy from a product photo — ad creative that doesn't look like a polished commercial.",
    body: [
      "This calls a UGC style — it is not real user-generated content and should not be presented as a genuine customer post.",
      "Paid clips are cleared for commercial use. Keep the ad honest to the product.",
    ],
    keywords: [
      "ugc toy ad generator",
      "ugc style product video toy",
      "social ad video toy from photo",
    ],
    primaryEffect: "paparazzi-flash",
    effects: ["paparazzi-flash", "floating-hero", "make-figure-dance"],
    faq: [
      {
        q: "Is this real UGC?",
        a: "No — it's a UGC style, not a genuine customer post. Don't present it as a real user review.",
      },
      {
        q: "Can I run it as an ad?",
        a: "Paid clips are cleared for commercial use. Placing the ad is up to you.",
      },
    ],
  },
  {
    slug: "toy-product-demo-video",
    emoji: "🔎",
    label: "Product demo",
    h1: "Make a Short Product Demo Video for a Toy",
    seoTitle: "Toy Product Demo Video From One Photo | Pikbo",
    seoDescription:
      "Turn one toy photo into a short product demo — a clean spin that shows the figure from more angles for listings and social.",
    intro:
      "A short demo helps buyers understand a piece. Pikbo turns one photo of your toy into a clean spin that shows it from more angles than a single still.",
    body: [
      "The demo generates the unseen angles, so it is a helpful preview rather than a guaranteed-accurate product scan.",
      "Review sculpt, paint, and logos before using the demo in a listing.",
    ],
    keywords: [
      "toy product demo video",
      "product demo video from photo toy",
      "toy angles demo video",
    ],
    primaryEffect: "360-spin-showcase",
    effects: ["360-spin-showcase", "floating-hero", "display-case-glam"],
    faq: [
      {
        q: "Are the angles accurate?",
        a: "Unseen angles are generated and inferred. Use the demo as a preview and verify against the real product.",
      },
      {
        q: "Good for marketplace listings?",
        a: "Yes, as a preview clip. Paid clips are cleared for commercial use.",
      },
    ],
  },
  {
    slug: "collector-pov-toy-video",
    emoji: "🫶",
    label: "Collector POV",
    h1: "Create a Collector POV Video From a Toy Photo",
    seoTitle: "Collector POV Toy Video From a Photo | Pikbo",
    seoDescription:
      "Make a cozy collector-POV video from one toy photo — the 'meet my grail' shot with glam lighting and subtle motion for Reels and Shorts.",
    intro:
      "Collectors love a 'meet my grail' moment. Pikbo turns one photo into a cozy collector-POV clip with glam lighting and subtle motion that shows a piece off.",
    body: [
      "The collector angle suits shelf features, hauls, and 'newest pickup' posts.",
      "Your figure stays the reference; lighting and motion are stylized effects — review before commercial use.",
    ],
    keywords: [
      "collector pov toy video",
      "meet my grail toy video",
      "collection showcase video from photo",
    ],
    primaryEffect: "display-case-glam",
    effects: ["display-case-glam", "floating-hero", "collection-shelf-pan"],
    faq: [
      {
        q: "Good for a haul or shelf post?",
        a: "Yes — the collector-POV mood suits hauls, shelf features, and 'newest pickup' posts.",
      },
      {
        q: "Does it keep my figure?",
        a: "It animates from your photo; generated lighting and motion can vary, so review the clip.",
      },
    ],
  },
  {
    slug: "custom-toy-product-video",
    emoji: "🛠️",
    label: "Custom toy",
    h1: "Make a Product Video for a Custom Art Toy",
    seoTitle: "Custom Art Toy Product Video From One Photo | Pikbo",
    seoDescription:
      "Give your custom art toy or one-off a premium product video from one photo. Glam lighting and clean motion for makers and resellers.",
    intro:
      "A custom piece deserves a custom-feeling video. Pikbo turns one photo of your one-off art toy into a glam-lit product clip — no studio, no rig.",
    body: [
      "Built for indie makers and resellers presenting a bespoke or small-run piece.",
      "The clip animates from your photo; generated details can vary, so review before using it to sell.",
    ],
    keywords: [
      "custom toy product video",
      "custom art toy video maker",
      "bespoke figure video from photo",
    ],
    primaryEffect: "display-case-glam",
    effects: ["display-case-glam", "360-spin-showcase", "floating-hero"],
    faq: [
      {
        q: "Good for a one-off piece?",
        a: "Yes — it's built for custom and small-run art toys. A clean photo of your piece gives the best result.",
      },
      {
        q: "Can I sell with it?",
        a: "Paid clips are cleared for commercial use. Keep the video honest to the piece you're selling.",
      },
    ],
  },
  {
    slug: "toy-social-content-pack",
    emoji: "🎒",
    label: "Content pack",
    h1: "Create a Social Content Pack for One Toy SKU",
    seoTitle: "Social Content Pack for One Toy SKU From a Photo | Pikbo",
    seoDescription:
      "Plan a social content pack for one toy from a photo — multiple recipe angles (spin, reveal, hero) to fill a week of posts for one SKU.",
    intro:
      "One SKU can carry a week of posts. Pikbo helps you spin one toy photo into multiple angles — a spin, a reveal, a hero — so a single figure fills a content calendar.",
    body: [
      "Each clip is generated on its own run; there is no single one-click bundle yet, so you compose the pack recipe by recipe.",
      "Paid clips are cleared for commercial use. Keep each post honest to the product.",
    ],
    keywords: [
      "toy social content pack",
      "content pack for one toy sku",
      "multiple toy videos from one photo",
    ],
    primaryEffect: "paparazzi-flash",
    effects: ["paparazzi-flash", "360-spin-showcase", "mystery-box-reveal"],
    faq: [
      {
        q: "Is it a one-click bundle?",
        a: "Not yet — you compose the pack one recipe at a time. Each clip is its own generation.",
      },
      {
        q: "How many posts from one SKU?",
        a: "Enough distinct recipe angles to fill a week — spin, reveal, hero, and more from a single photo.",
      },
    ],
  },
  // --- 哥飞 cold-start long-tails (proof-backed primary recipes) ---
  {
    slug: "figure-360-product-video",
    emoji: "🔄",
    label: "360 figure video",
    h1: "AI Figure 360 Video From One Photo",
    seoTitle: "AI Figure 360 Video: Listing Spin From One Photo | Pikbo",
    seoDescription:
      "Draft a square figure listing spin from one owned photo. See the verified Fast 720p beta result, download time, recovery evidence, and limits.",
    intro:
      "AI figure 360 video is the turntable look without the rig. This tool turns one owned figure photo into a short 360-style product spin for listings and shop pages.",
    body: [
      "Marketplace buyers want to sense depth. A calm AI figure 360 video answers more questions than three extra stills.",
      "Start with a front-facing packshot on a plain background. Pikbo's validated private Listing Spin is fixed at five seconds, 1:1, and Fast 720p.",
      "Review sculpt and paint before you publish. High-value figures need stricter QA than mass blind boxes.",
      "The current proof is one internal synthetic validation result, not a physical product or customer case. A generated reverse angle is an inference, not proof of the real toy's condition.",
    ],
    keywords: [
      "AI figure 360 video",
      "ai figure 360 video",
      "figure 360 product video",
      "toy turntable video generator",
      "360 figure video from photo",
    ],
    primaryEffect: "360-spin-showcase",
    effects: ["360-spin-showcase", "display-case-glam", "floating-hero"],
    faq: [
      {
        q: "What is AI figure 360 video?",
        a: "A short product spin drafted from one figure photo so buyers can sense the sculpt without a physical turntable.",
      },
      {
        q: "Do I need a physical turntable?",
        a: "No. Upload one clear photo and run the spin recipe. Always QA the result.",
      },
      {
        q: "Has Pikbo verified this result end to end?",
        a: "One private internal Listing Spin completed, reopened after refresh, and downloaded twice with identical bytes. Broader customer use is not verified yet.",
      },
    ],
  },
  {
    slug: "blind-box-reveal-video-maker",
    emoji: "📦",
    label: "Blind box reveal",
    /**
     * Canonical tool job: single-photo reveal / unboxing clip maker.
     * Brand campaign SEO lives on /for/blind-box-brand-marketing (no duplicate page).
     * Original designer-toy / indie blind-box stills only — no franchise names.
     */
    // CTR: unboxing energy + one-photo constraint (not toddler shopping lists)
    h1: "Blind Box AI Video Generator — Reveal From One Photo",
    seoTitle:
      "Blind Box Reveal Video From One Photo (No Filming) | Pikbo",
    seoDescription:
      "Draft a vertical blind-box reveal from one owned photo. See the fixed five-second format, cached pacing preview, current evidence gap, and publishing limits.",
    intro:
      "A blind box AI video generator is for pull energy, not generic face filters. Start with one original or rights-owned blind-box photo and inspect the fixed vertical reveal workflow for TikTok, Reels, or restock posts.",
    body: [
      "Blind-box Reveal is a vertical 9:16 Moment for drop announcements, restock posts, Reels, and Shorts from one rights-owned figure photo.",
      "Lead with the first second: box motion, a silhouette, or mystery light works better than a slow fade. The format stays five seconds and Fast 720p during private beta.",
      "The reveal shown publicly is a cached format preview and does not process your upload. Pikbo has not yet completed a verified private Blind-box Reveal output, so this page does not present the preview as customer proof.",
      "Generated packaging text, logos, paint, accessories, and hidden angles can drift. Compare the draft with the physical figure and box before publishing.",
    ],
    keywords: [
      "blind box AI video generator",
      "blind box ai video generator",
      "blind box reveal video maker",
      "blind box unboxing video from photo",
      "indie blind box reveal clip",
    ],
    primaryEffect: "blind-box-unboxing",
    effects: ["blind-box-unboxing", "mystery-box-reveal", "paparazzi-flash"],
    faq: [
      {
        q: "What is a blind box AI video generator?",
        a: "It drafts a short reveal or unbox-style clip from one photo of a rights-owned blind-box figure — for social and restock hooks.",
      },
      {
        q: "Is this the same as blind box brand marketing?",
        a: "No. This page is the reveal-clip tool. Brand drop campaigns use /for/blind-box-brand-marketing. Both deep-link Create; each keeps one primary keyword job.",
      },
      {
        q: "Can I use a stock unbox template?",
        a: "Recipes are toy-native templates. Your photo is the product reference — review likeness before posting. Only upload collectibles you own.",
      },
      {
        q: "Is the Blind-box Reveal format already verified?",
        a: "Not yet. Public visitors can inspect a cached pacing preview, but the completed private beta evidence currently covers Listing Spin only.",
      },
    ],
  },
  {
    slug: "tiktok-toy-video-from-photo",
    emoji: "📱",
    label: "TikTok toy video",
    h1: "TikTok Toy Video From One Photo",
    seoTitle: "TikTok Toy Video Generator From Photo | Pikbo",
    seoDescription:
      "Plan a short TikTok toy video from one photo — cached vertical-hook previews for figures and blind boxes, with Live access gated.",
    intro:
      "Short-form toy content needs a strong open. Upload one owned photo, pick a vertical-friendly recipe, and draft a TikTok-ready clip.",
    body: [
      "Vertical 9:16 is the default for social hooks. Spin still works if your feed is product-first.",
      "Soft launch Free Mini is enough to test a hook; do not expect unlimited free exports.",
      "Caption and sound still matter — Pikbo drafts the motion layer, not the full growth system.",
      "Channel-specific SEO also lives on /for/tiktok-shop-product-videos.",
    ],
    keywords: [
      "tiktok toy video",
      "toy video for tiktok from photo",
      "figure tiktok video maker",
    ],
    primaryEffect: "paparazzi-flash",
    effects: ["paparazzi-flash", "make-figure-dance", "blind-box-unboxing"],
    faq: [
      {
        q: "Will this go viral?",
        a: "No guarantee. We draft clips; distribution and creative testing are yours.",
      },
    ],
  },
  {
    slug: "shopify-product-video-for-toys",
    emoji: "🛒",
    label: "Shopify toy video",
    h1: "Shopify Product Video for Toys From One Photo",
    seoTitle: "Shopify Toy Product Video Generator | Pikbo",
    seoDescription:
      "Plan a Shopify toy-listing video from one photo. Preview cached calm-spin and hero-float recipes before gated Live submission.",
    intro:
      "DTC toy shops on Shopify convert better with motion on the PDP. Draft a spin or hero clip from the packshot you already use.",
    body: [
      "Prefer calm motion for PDPs; save flashy social recipes for ads.",
      "Export aspect that matches your theme gallery. QA every SKU — AI can smear logos.",
      "Free Mini validates one hero SKU; batch more when paid credits are available.",
      "Also see Amazon and Etsy use-case pages if you sell multi-channel.",
    ],
    keywords: [
      "shopify product video toys",
      "toy shopify video maker",
      "dtc toy product video",
    ],
    primaryEffect: "360-spin-showcase",
    effects: ["360-spin-showcase", "floating-hero", "display-case-glam"],
    faq: [
      {
        q: "Does Pikbo upload to Shopify?",
        a: "No. Download the clip and add it in your Shopify admin or theme.",
      },
    ],
  },
  {
    slug: "designer-toy-teaser-video",
    emoji: "✨",
    label: "Toy teaser",
    h1: "Designer Toy AI Video — Teaser From One Photo",
    seoTitle: "Designer Toy AI Video: Teaser From One Photo | Pikbo",
    seoDescription:
      "Designer-toy video recipes for drops and lookbooks. One owned still → cached floating-hero or reveal preview, with Live access gated.",
    intro:
      "Designer toy AI video is for indie vinyl, art toys, and lookbook stills — not mass face filters. Reuse one owned photo as a short floating hero or mystery reveal without a full motion studio.",
    body: [
      "Floating hero sells premium. Mystery reveal sells curiosity. Match the recipe to the announcement beat.",
      "The head term AI toy video generator is on /tools/ai-toy-video-generator. This page owns designer-toy teaser / drop energy.",
      "Keep claims honest: soft launch model is Seedance Mini on Free Mini; Lab demos are labeled cached samples.",
      "Brand end-cards and logos still belong in your editor after download. See also /for pages for channel marketing jobs.",
    ],
    keywords: [
      "designer toy AI video",
      "designer toy ai video",
      "designer toy teaser video",
      "toy drop teaser generator",
      "art toy launch video",
    ],
    primaryEffect: "floating-hero",
    effects: ["floating-hero", "mystery-box-reveal", "smoke-burst-entrance"],
    faq: [
      {
        q: "Can I batch a whole drop?",
        a: "Start with one photo, one SKU, and one directed Moment per run. Reuse the same effect for the next SKU from Library when it proves useful.",
      },
    ],
  },
];

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
