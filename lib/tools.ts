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
    h1: "AI Toy Video Generator From One Photo",
    seoTitle: "AI Toy Video Generator From One Photo | Pikbo",
    seoDescription:
      "Turn one photo of a toy you own into a short video. Pick a toy-native recipe — spin, float, unbox, or dance — and generate a clip for TikTok or Etsy.",
    intro:
      "Pikbo is an AI toy video generator built for the toy you actually own. Upload one photo, pick a toy-native recipe, and get a short clip you can post or list — no camera rig, no stop-motion setup.",
    body: [
      "Unlike generic 'turn yourself into a figure' filters, Pikbo animates the figure in your photo and keeps its recognizable shape and colors. Generated motion can still change small details, so review each clip.",
      "Free runs use Seedance Mini at 5 seconds and 480p with an on-player mark. Cached demos are labeled and never presented as your upload.",
      "This page targets the head term “AI toy video generator.” Related long-tails live on dedicated /tools and /for URLs so each search job keeps its own title, H1, and FAQ.",
      "Soft launch honesty: no fake multi-model carousel, no unlimited free 4K, and no guaranteed sales. Failed live jobs refund the 10-credit debit when the server can confirm failure.",
      "Best path: clean product photo → recipe (spin / float / unbox) → wait for the full live render (often 1–3 minutes) → QA paint and silhouette → post or list.",
    ],
    keywords: [
      "ai toy video generator",
      "toy video maker from photo",
      "make a toy video with ai",
    ],
    primaryEffect: "floating-hero",
    effects: ["floating-hero", "360-spin-showcase", "make-figure-dance"],
    faq: [
      {
        q: "Is it free to try?",
        a: "Yes — a free Seedance Mini trial runs at 5 seconds and 480p with an on-player mark. No card required.",
      },
      {
        q: "Does it animate my exact toy?",
        a: "It uses your photo as the reference. Generated motion can change sculpt, color, or small details, so review the result before using it.",
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
    h1: "AI Product Video Generator for Toys",
    seoTitle: "AI Product Video Generator for Toys From One Photo | Pikbo",
    seoDescription:
      "Make listing-ready product videos for toys from one photo. Clean spins and hero shots for Etsy, TikTok Shop, and marketplaces — no studio.",
    intro:
      "Toy listings sell on motion. Pikbo turns one product photo into a clean spin or hero clip that shows your figure off for a storefront, without a camera studio.",
    body: [
      "A short spin lets buyers inspect a collectible, but it does not guarantee a sale, and inferred angles should be checked against the real product.",
      "Paid clips are cleared for commercial use — keep the video honest to the product you're actually selling.",
    ],
    keywords: [
      "ai product video generator toys",
      "toy listing video maker",
      "product video from photo toy",
    ],
    primaryEffect: "360-spin-showcase",
    effects: ["360-spin-showcase", "floating-hero", "display-case-glam"],
    faq: [
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
      "Come-alive motion is generated, so expect small variations in the figure between runs. Not happy? Regenerate — failed live jobs refund credits.",
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
        a: "AI motion varies run to run. Regenerate for a different take — failed live jobs refund the credits.",
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
    h1: "Make a Product Video From One Toy Photo",
    seoTitle: "One-Photo Product Video Maker for Toys | Pikbo",
    seoDescription:
      "Only have one photo? Turn a single toy product photo into a short video — a floating hero or clean spin for listings and social.",
    intro:
      "You don't need a photo shoot. Pikbo turns a single product photo of your toy into a short video — a floating hero or a clean spin — from that one image.",
    body: [
      "The one-photo workflow is the fastest path from a shelf shot to a postable clip.",
      "Because the motion and any unseen angles are generated, review the result against the real product before using it in a listing.",
    ],
    keywords: [
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
    seoTitle: "Toy Unboxing Hook Generator for Reels & Shorts | Pikbo",
    seoDescription:
      "Make the first-second unboxing hook that stops the scroll. Turn one toy photo into a punchy reveal opener for Reels, Shorts, and TikTok.",
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
    h1: "Figure 360° Product Video From One Photo",
    seoTitle: "Figure 360 Product Video Generator | Pikbo",
    seoDescription:
      "Make a 360° product video of a figure from one photo — no turntable. Free Mini trial for toy listings and storefronts.",
    intro:
      "Need a turntable look without the rig? This tool turns one owned figure photo into a short 360-style product spin for listings and shop pages.",
    body: [
      "Marketplace buyers want to sense depth. A calm spin answers more questions than three extra stills.",
      "Start with a front-facing packshot on a plain background. Free Mini is Seedance Mini at 5s · 480p with an on-player mark.",
      "Review sculpt and paint before you publish. High-value figures need stricter QA than mass blind boxes.",
      "Related jobs: Etsy listing page, Amazon product video use case, and the spin effect landing — each keeps its own TDH.",
    ],
    keywords: [
      "figure 360 product video",
      "toy turntable video generator",
      "360 figure video from photo",
    ],
    primaryEffect: "360-spin-showcase",
    effects: ["360-spin-showcase", "display-case-glam", "floating-hero"],
    faq: [
      {
        q: "Do I need a physical turntable?",
        a: "No. Upload one clear photo and run the spin recipe. Always QA the result.",
      },
      {
        q: "Is Free Mini unlimited?",
        a: "No. Soft launch Free Mini has fixed caps. Lab demos are free cached samples and never process your upload.",
      },
    ],
  },
  {
    slug: "blind-box-reveal-video-maker",
    emoji: "📦",
    label: "Blind box reveal",
    h1: "Blind Box Reveal Video Maker From One Photo",
    seoTitle: "Blind Box Reveal Video Maker | Pikbo",
    seoDescription:
      "Create a blind box reveal clip from one figure photo for TikTok and drops. Free Mini trial with honest limits.",
    intro:
      "Reveal energy sells the dopamine of a pull. Pikbo drafts an unboxing-style clip from one photo of a toy you own — for drops, restocks, and short-form hooks.",
    body: [
      "Lead with the first second: lid motion or mystery light works better than a slow fade.",
      "Use vertical recipes for TikTok/Reels. Keep Free Mini caps in mind (5s · 480p · mark).",
      "Brand teams: draft teasers before a drop; collectors: flex a pull. Rights still required on upload.",
      "Pair with the blind-box brand /for page and TikTok Shop use case for channel-specific copy.",
    ],
    keywords: [
      "blind box reveal video",
      "blind box unboxing video maker",
      "mystery box video generator",
    ],
    primaryEffect: "blind-box-unboxing",
    effects: ["blind-box-unboxing", "mystery-box-reveal", "paparazzi-flash"],
    faq: [
      {
        q: "Can I use a stock unbox template?",
        a: "Recipes are toy-native templates. Your photo is the product reference — review likeness before posting.",
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
      "Make a short TikTok toy video from one photo — vertical hooks for figures and blind boxes. Free Mini trial, no card.",
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
      "Add a product video to Shopify toy listings from one photo. Calm spins and hero floats for DTC shops. Free Mini trial.",
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
    h1: "Designer Toy Teaser Video From One Photo",
    seoTitle: "Designer Toy Teaser Video Generator | Pikbo",
    seoDescription:
      "Draft a designer toy launch teaser from one photo — floating hero and reveal energy for drops. Free Mini trial.",
    intro:
      "Launch weeks need teaser loops. Reuse the lookbook still as a short floating hero or mystery reveal without a full motion studio.",
    body: [
      "Floating hero sells premium. Mystery reveal sells curiosity. Match the recipe to the announcement beat.",
      "Keep claims honest: soft launch model is Seedance Mini on Free Mini; Lab demos are labeled cached samples.",
      "Brand end-cards and logos still belong in your editor after download.",
      "See also /for/designer-toy-marketing-videos for the full marketing job page.",
    ],
    keywords: [
      "designer toy teaser video",
      "toy drop teaser generator",
      "art toy launch video",
    ],
    primaryEffect: "floating-hero",
    effects: ["floating-hero", "mystery-box-reveal", "smoke-burst-entrance"],
    faq: [
      {
        q: "Can I batch a whole drop?",
        a: "One photo per SKU per run. Seller Pack can fan out formats when you use that mode.",
      },
    ],
  },
];

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
