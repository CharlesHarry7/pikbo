// A FOURTH content axis: informational guide / how-to articles at
// /guides/[slug]. These target top-of-funnel informational searches
// ("how to make a figure spin video", "how to photograph toys for video")
// and funnel readers into the studio + relevant effect pages.
//
// Keyword mesh: Effects × Use-cases × Toy-types × Guides.

export type GuideSection = {
  h2: string;
  paragraphs: string[];
};

export type GuideChecklistRow = {
  check: string;
  use: string;
  avoid: string;
};

export type GuideSource = {
  label: string;
  url: string;
  note: string;
};

export type Guide = {
  slug: string;
  emoji: string;
  title: string; // on-page H1 / card title
  dek: string; // subtitle
  seoTitle: string;
  seoDescription: string;
  readMins: number;
  intro: string;
  sections: GuideSection[];
  faq: { q: string; a: string }[];
  relatedEffects: string[]; // preset slugs
  keywords: string[];
  author?: string;
  datePublished?: string;
  dateModified?: string;
  checklist?: GuideChecklistRow[];
  sources?: GuideSource[];
};

export const GUIDES: Guide[] = [
  {
    slug: "how-to-make-a-figure-spin-video",
    emoji: "🌀",
    title: "How to Make a 360° Spin Video of a Figure (No Turntable)",
    dek: "Turn one product photo into a smooth rotating showcase in a couple of minutes.",
    seoTitle: "How to Make a 360° Spin Video of a Figure | Pikbo",
    seoDescription:
      "A simple guide to creating a smooth 360° spin video of your figure or collectible from a single photo — no turntable, camera rig, or editing.",
    readMins: 3,
    intro:
      "A slow generated spin can add motion to a toy listing or collection post. From one front photo, unseen angles are model-generated rather than product documentation, so review them carefully before publishing.",
    sections: [
      {
        h2: "1. Start with a clean product photo",
        paragraphs: [
          "The sharper your input, the sharper the spin. Shoot your figure front-on against a plain, uncluttered background with even lighting. Avoid harsh shadows and busy surfaces — they confuse the rotation.",
          "A phone photo is completely fine. What matters is that the whole figure is in frame, in focus, and clearly separated from the background.",
        ],
      },
      {
        h2: "2. Pick the spin effect and generate",
        paragraphs: [
          "Upload the photo, choose the 360° Spin Showcase effect, and generate. The figure is placed on a clean studio turntable and rotated smoothly — the look you'd normally need a rig and a photographer for.",
          "For marketplace galleries, export square; for TikTok Shop or Reels, export vertical. You can generate both from the same photo.",
        ],
      },
      {
        h2: "3. Use it where it converts",
        paragraphs: [
          "Test the spin in a product gallery, storefront hero, or 'new arrival' post. Performance varies, and model-generated unseen angles should not be presented as exact product proof.",
          "Keep the clip short — around five seconds, looping — so it plays cleanly in a feed.",
        ],
      },
    ],
    faq: [
      {
        q: "Do I need a real turntable or 360 camera?",
        a: "No. The spin is generated from one photo, so there's no rig, lighting setup, or filming involved.",
      },
      {
        q: "What if my figure is asymmetrical?",
        a: "A clear front-facing photo still produces a convincing rotation. Very complex or transparent pieces may need a cleaner background to look their best.",
      },
    ],
    relatedEffects: ["360-spin-showcase", "floating-hero", "display-case-glam"],
    keywords: [
      "how to make a 360 spin video",
      "figure spin video",
      "product turntable video without rig",
    ],
  },
  {
    slug: "how-to-photograph-toys-for-ai-video",
    emoji: "📸",
    title: "How to Photograph Your Toys for the Best AI Video Results",
    dek: "Five quick photo habits that make every generated clip look sharper.",
    seoTitle: "How to Photograph Toys for AI Video | Pikbo",
    seoDescription:
      "Five practical toy-photo checks for cleaner AI video: even light, a simple background, sharp focus, honest color, and useful packaging references.",
    readMins: 6,
    author: "Pikbo Editorial",
    datePublished: "2026-07-22T10:15:47Z",
    dateModified: "2026-07-27T16:37:46Z",
    intro:
      "AI video starts with the evidence in your source photo. A clean input cannot guarantee a perfect generated clip, but it gives the model clearer product edges, color, packaging, and scale to reference. These five checks combine marketplace image requirements with the same product-truth review Pikbo applies to cached Lab prototypes.",
    sections: [
      {
        h2: "1. Light it evenly",
        paragraphs: [
          "Soft, even light beats bright, direct light. A window with indirect daylight, or a cheap softbox, wraps the figure in gentle light and avoids blown-out highlights and hard shadows.",
          "Harsh single-source light creates deep shadows that the model can misread as part of the figure, which shows up as artifacts in motion.",
        ],
      },
      {
        h2: "2. Use a plain background",
        paragraphs: [
          "A clean, plain backdrop — white, grey, or a simple gradient — helps the figure separate cleanly from its surroundings. Busy shelves and patterned surfaces make edges ambiguous.",
          "If you want a scene effect like a neon city or a mini world, still start from a clean photo; the effect adds the world around your figure.",
        ],
      },
      {
        h2: "3. Fill the frame, stay in focus",
        paragraphs: [
          "Get close enough that the figure fills most of the frame, and tap to focus so the whole piece is sharp. Google Merchant Center recommends framing the product at roughly 75–90% of the image; that range is also a practical starting point for keeping a toy readable without cutting off accessories.",
          "Avoid extreme angles for showcase effects — a straight, eye-level front view rotates and animates most convincingly.",
        ],
      },
      {
        h2: "4. Shoot the packaging too (for unboxing)",
        paragraphs: [
          "If you want a blind box reveal, include a photo of the box or packaging. The effect animates the reveal around your real product art.",
        ],
      },
      {
        h2: "5. Keep color honest and run one small test",
        paragraphs: [
          "Avoid heavy filters, aggressive sharpening, fake depth blur, or color presets that change the paint you are trying to sell. Keep one untouched source file so you can compare the generated frame with the physical toy.",
          "Run one short draft before preparing a full launch set. Check the silhouette, face, paint splits, accessories, packaging text, and logos. If a commercially important detail drifts, reshoot that detail more clearly or use the original photo instead of presenting the generated angle as product proof.",
        ],
      },
    ],
    checklist: [
      {
        check: "Light",
        use: "Soft, even daylight or a diffused lamp",
        avoid: "Blown highlights and deep single-source shadows",
      },
      {
        check: "Background",
        use: "White, grey, or another simple surface",
        avoid: "Busy shelves, patterns, and objects crossing the silhouette",
      },
      {
        check: "Framing",
        use: "Full toy visible and roughly 75–90% of the frame",
        avoid: "Tiny subjects, cropped accessories, and extreme angles",
      },
      {
        check: "Focus and color",
        use: "Lock focus/exposure on the toy and keep true color",
        avoid: "Blur, beauty filters, artificial paint changes, and heavy HDR",
      },
      {
        check: "References",
        use: "Separate front, packaging, logo, and detail photos when relevant",
        avoid: "Asking one obstructed image to prove unseen product details",
      },
    ],
    sources: [
      {
        label: "Google Merchant Center image guidelines",
        url: "https://support.google.com/merchants/answer/6324350?hl=en",
        note: "Accurate product imagery, high resolution, clear framing, and simple backgrounds.",
      },
      {
        label: "Etsy listing image requirements and best practices",
        url: "https://help.etsy.com/hc/en-us/articles/115015663347-Requirements-and-Best-Practices-for-Images-in-Your-Etsy-Shop",
        note: "Marketplace-oriented guidance for clear, consistently framed listing photos.",
      },
      {
        label: "Apple: lock camera focus and exposure",
        url: "https://support.apple.com/guide/iphone/use-the-camera-control-iph0c397b154/ios",
        note: "Official instructions for holding focus and exposure on the subject.",
      },
    ],
    faq: [
      {
        q: "Does phone photography work?",
        a: "Yes. A modern phone camera with good light and a clean background is more than enough.",
      },
      {
        q: "Should I edit the photo first?",
        a: "A light crop and exposure fix helps, but heavy filters can hurt — keep colors true to the real toy.",
      },
    ],
    relatedEffects: ["360-spin-showcase", "blind-box-unboxing", "display-case-glam"],
    keywords: [
      "how to photograph toys for video",
      "best photo for ai video",
      "figure photography tips",
    ],
  },
  {
    slug: "blind-box-video-ideas-for-tiktok",
    emoji: "📦",
    title: "10 Blind Box Video Ideas for TikTok (From One Photo)",
    dek: "Scroll-stopping clip ideas for sellers and collectors — no filming required.",
    seoTitle: "10 Blind Box Video Ideas for TikTok | Pikbo",
    seoDescription:
      "Ten blind box and designer toy video ideas for TikTok and Reels you can make from a single photo — reveals, dances, mini scenes, and more.",
    readMins: 4,
    intro:
      "Blind box content thrives on TikTok because the reveal is pure dopamine. You don't need a camera crew or a haul to post — here are ten clip ideas you can generate from a single photo, whether you're a seller hyping a drop or a collector showing a pull.",
    sections: [
      {
        h2: "Reveal-driven ideas (great openers)",
        paragraphs: [
          "1. The classic unboxing reveal — the lid lifts and the figure appears. Use it as the first three seconds of any post.",
          "2. The glowing mystery-box burst — a more dramatic, magical reveal with light and confetti, perfect for giveaways and 'guess what I pulled' posts.",
          "3. The claw-machine win — drop your figure into an arcade claw machine and land the grab for a playful, nostalgic hook.",
        ],
      },
      {
        h2: "Personality ideas (great for accounts)",
        paragraphs: [
          "4. Make it dance — a bouncing figure is endlessly shareable and gets your account in front of other collectors.",
          "5. Wave hello — a cute wink-and-wave makes a friendly intro clip for a series or a profile.",
          "6. Red-carpet paparazzi — treat your grail like a celebrity with flashing cameras for a viral, high-energy post.",
        ],
      },
      {
        h2: "Showcase & story ideas",
        paragraphs: [
          "7. A clean 360° spin for the product page or a 'restock' announcement.",
          "8. A mini cinematic scene — drop the figure into a tiny world for a storytelling post.",
          "9. A neon city night scene for an edgier, dramatic look.",
          "10. A shelf pan across your whole collection for a milestone or collection-tour post.",
        ],
      },
    ],
    faq: [
      {
        q: "Do I need to film anything?",
        a: "No — every idea here is generated from a single photo of a toy you own.",
      },
      {
        q: "What length works best on TikTok?",
        a: "Keep clips short and loopable — around five seconds — and lead with the strongest beat (usually the reveal).",
      },
    ],
    relatedEffects: ["blind-box-unboxing", "mystery-box-reveal", "make-figure-dance"],
    keywords: [
      "blind box video ideas",
      "tiktok toy video ideas",
      "designer toy content ideas",
    ],
  },
  {
    slug: "how-to-make-etsy-listing-video-for-toys",
    emoji: "🛍️",
    title: "How to Make an Etsy Listing Video for Toys (From One Photo)",
    dek: "Marketplace-ready motion without a turntable — checklist for handmade and designer toys.",
    seoTitle: "How to Make an Etsy Listing Video for Toys | Pikbo",
    seoDescription:
      "Step-by-step: turn one product photo into an Etsy listing video for toys and collectibles. Photo tips, recipe choice, and publish checks.",
    readMins: 4,
    intro:
      "Etsy listing videos help buyers understand form and finish. You do not need a new shoot for every SKU — one clear owned product photo can seed a short spin or hero clip you review before upload.",
    sections: [
      {
        h2: "1. Match Etsy’s job, not a cinematic short",
        paragraphs: [
          "Listing video intent is commercial: show the object clearly, keep motion calm, and avoid effects that hide paint or scale. Prefer 360° spin, floating hero, or display glam over chaotic dance unless that is your brand.",
          "Confirm Etsy’s current file rules (length, format, size) before you generate a batch. Public validation is a cached Lab prototype at 0 credits (upload not processed). When Live is enabled for an eligible account, Generate shows duration, resolution, and the exact quote — enough to validate one hook.",
        ],
      },
      {
        h2: "2. Photo checklist for clean AI motion",
        paragraphs: [
          "Front-facing, full figure in frame, even light, plain background. Busy shelves and heavy shadows make motion look dirty.",
          "Shoot once, archive the master JPEG/RAW, then generate variants. Never publish a clip you have not checked for sculpt or color drift.",
        ],
      },
      {
        h2: "3. Generate on the use-case page, then QA",
        paragraphs: [
          "Open the Etsy use-case landing or Generate with a listing recipe. Confirm you own the photo. Start with a cached Lab preview (0 credits). When Live is enabled for an eligible account, submit only after the exact quote appears, wait for the full render, and download only after visual QA.",
          "Public checkout stays closed during validation. When Live is enabled for an eligible account, a failed job refunds its credit debit only after the server confirms release.",
        ],
      },
    ],
    faq: [
      {
        q: "Can I list AI video on Etsy?",
        a: "Etsy allows listing videos when they meet marketplace rules. You are responsible for accurate product representation and rights.",
      },
      {
        q: "Square or vertical?",
        a: "Many shops use square or short vertical. Pick the aspect that matches your gallery layout and regenerate if needed.",
      },
    ],
    relatedEffects: ["360-spin-showcase", "floating-hero", "display-case-glam"],
    keywords: [
      "etsy listing video toys",
      "how to make etsy product video",
      "handmade toy listing video",
    ],
  },
  {
    slug: "free-ai-toy-video-generator-limits",
    emoji: "🆓",
    title: "Free AI Toy Video Generator — What Free Validation Actually Includes",
    dek: "Honest soft-launch limits so searchers are not sold unlimited generation.",
    seoTitle: "Free AI Toy Video Generator Limits | Cached Lab | Pikbo",
    seoDescription:
      "What Pikbo free validation includes: cached Lab prototypes at 0 credits. Live is gated; configured allowances and refund truth are explained without unlimited claims.",
    readMins: 3,
    intro:
      "Searchers looking for a free AI toy video generator should see the current truth: public validation is a cached prototype path, not unlimited generation and not a multi-model marketplace.",
    sections: [
      {
        h2: "What the free path is",
        paragraphs: [
          "The public free path is a cached Pikbo Lab prototype at 0 credits. It never processes your upload and makes no provider call.",
          "When Live is enabled for an eligible account, Generate shows the configured model, duration, resolution, and exact credit quote. A refund is only claimed after the server confirms release.",
        ],
      },
      {
        h2: "What the free path is not",
        paragraphs: [
          "It is not unlimited 4K, not Kling/Runway multi-model switching, and not a guarantee of sales or virality. Stripe checkout stays off until billing is intentionally enabled.",
          "If Live is not offered on your account, that is the validation gate — not a broken engine. Cached Lab prototypes stay free; paid checkout remains closed until intentionally enabled.",
        ],
      },
      {
        h2: "How to try without wasting a credit",
        paragraphs: [
          "Use a small, sharp product photo. Pick a simple spin or hero recipe. Keep the tab open for up to ~3 minutes. Canceling mid-request can leave refund status unconfirmed until balance refresh.",
          "For recipe exploration without a provider debit, watch Lab prototypes first. Submit only after Generate confirms an eligible Live mode and exact quote.",
        ],
      },
    ],
    faq: [
      {
        q: "Is there a free AI toy video generator with no card?",
        a: "The cached Pikbo Lab prototype needs no card, costs 0 credits, and does not process your upload. It is not a generated customer result.",
      },
      {
        q: "Why did generation take so long?",
        a: "Only eligible Live jobs enter a provider queue. Their status is tied to a fixed deadline; refreshing or polling does not extend it.",
      },
    ],
    relatedEffects: ["360-spin-showcase", "floating-hero", "blind-box-unboxing"],
    keywords: [
      "free ai toy video generator",
      "free mini toy video",
      "ai figure video free trial",
    ],
  },
  {
    slug: "best-photo-settings-for-ai-figure-video",
    emoji: "📷",
    title: "Best Photo Settings for AI Figure Video",
    dek: "Lighting, framing, and backgrounds that survive Seedance-style motion.",
    seoTitle: "Best Photo Settings for AI Figure Video | Pikbo",
    seoDescription:
      "Practical camera and phone settings for AI figure video: framing, light, background, and what to avoid before you upload to a photo-to-video tool.",
    readMins: 4,
    intro:
      "AI figure video is only as good as the still. These settings reduce mushy edges, color drift, and background noise when you run photo-to-video for designer toys.",
    sections: [
      {
        h2: "Framing and focus",
        paragraphs: [
          "Keep the whole figure in frame with a little margin. Crop later if needed; missing feet or antennas force the model to invent geometry.",
          "Focus on the face or primary paint face. Soft phone portrait mode that blurs the figure itself is usually worse than a simple sharp wide shot.",
        ],
      },
      {
        h2: "Light and background",
        paragraphs: [
          "Even, diffuse light beats dramatic single-source shadows. A white or grey seamless look is ideal for marketplace spins.",
          "Busy city posters and patterned rugs introduce motion artifacts. If you want a mini-scene, still start from a clean figure plate when possible.",
        ],
      },
      {
        h2: "Export and upload",
        paragraphs: [
          "JPEG or PNG under a few MB is fine. Extremely large phone dumps can hit browser or host body limits — compress slightly without crushing detail.",
          "Always tick owns-rights. Brand collabs and licensed sculpts need your own legal clearance before public posts.",
        ],
      },
    ],
    faq: [
      {
        q: "Phone or camera?",
        a: "Either. Sharpness and background control matter more than brand of camera.",
      },
      {
        q: "Can I use a shelf photo?",
        a: "Yes for social flexes; for listings, re-shoot on a plain background when you can.",
      },
    ],
    relatedEffects: ["360-spin-showcase", "miniature-scene", "display-case-glam"],
    keywords: [
      "best photo for ai figure video",
      "toy photo tips ai video",
      "figure photography for image to video",
    ],
  },
  {
    slug: "action-figure-video-for-product-pages",
    emoji: "🦸",
    title: "Action Figure Video for Product Pages (No Studio Rig)",
    dek: "When to use spin vs hero float vs social flash on a figure PDP.",
    seoTitle: "Action Figure Product Page Video From One Photo | Pikbo",
    seoDescription:
      "Add action figure motion to product pages from one photo. Choose spin, hero, or glam recipes and QA paint accuracy before publishing.",
    readMins: 3,
    intro:
      "Product pages convert better when buyers can sense depth. For action figures, a short AI spin or hero float from one owned photo is often enough to replace a missing turntable shoot.",
    sections: [
      {
        h2: "Pick the recipe for the PDP job",
        paragraphs: [
          "Spin = ‘see the sculpt.’ Hero float = ‘feel premium.’ Display glam = ‘shelf worthy.’ Social flash recipes belong on ads and Reels more than the main gallery.",
          "Match aspect to the storefront (1:1 gallery vs 9:16 ads). Do not stretch a single export across every placement.",
        ],
      },
      {
        h2: "QA before publish",
        paragraphs: [
          "Check hands, logos, and accessories. AI can invent fingers or smear print. High-value grails need stricter human review than $15 blind boxes.",
          "Keep the original photo linked in your DAM so support can prove the real product if a buyer disputes the media.",
        ],
      },
    ],
    faq: [
      {
        q: "Is AI video allowed on marketplaces?",
        a: "Policies vary. Represent the product accurately and follow each marketplace’s media rules.",
      },
    ],
    relatedEffects: ["360-spin-showcase", "floating-hero", "display-case-glam"],
    keywords: [
      "action figure product video",
      "figure product page video",
      "action figure spin video",
    ],
  },
  {
    slug: "designer-toy-ai-video-vs-generic-tools",
    emoji: "🎯",
    title: "Designer Toy AI Video vs Generic Photo-to-Video Tools",
    dek: "Why a toy-vertical generator beats a multi-model zoo for listings and drops.",
    seoTitle: "Designer Toy AI Video vs Generic Tools | Pikbo",
    seoDescription:
      "Compare designer toy AI video with generic photo-to-video apps. Owned photos, listing recipes, honest Lab preview limits and gated Live — not fake multi-model theater.",
    readMins: 6,
    intro:
      "Generic AI video tools optimize for faces, cinematic B-roll, and model shopping. Designer-toy sellers need paint, sculpt, and packaging to stay readable while motion sells depth on Etsy, TikTok Shop, and drop posts. This guide explains the difference and when Pikbo’s toy-native path is the right job.",
    sections: [
      {
        h2: "What searchers actually need",
        paragraphs: [
          "Queries like “AI toy video generator,” “blind box AI video generator,” and “one photo toy video AI” are commercial or near-commercial. The user already has a product still. They do not need a 45-camera film school — they need a short clip that survives marketplace QA.",
          "Generic tools often push multi-model free tiers (Kling, Veo, Sora labels). Soft launch honesty matters: if a model is not wired live, it should read Soon — never as a fake live carousel.",
        ],
      },
      {
        h2: "Vertical recipes beat prompt chaos",
        paragraphs: [
          "Pikbo ships toy-native recipes: 360° spin for galleries, box reveal for pulls, floating hero for drop teasers, display glam for shelf posts. Each recipe maps to a job intent instead of a blank prompt box.",
          "Pikbo asks you to choose one directed Moment at a time: a 360° listing spin, a box reveal, or a drop-day hook. Start with the job you need now instead of paying for formats you may not use.",
        ],
      },
      {
        h2: "Rights and identity",
        paragraphs: [
          "Only upload figures and photos you own or are licensed to market. Soft launch enforces an owns-rights confirmation before live jobs. Mass-franchise packaging you do not control is out of scope.",
          "Toy Identity (SKU + preserve notes) is a local bible, not cloud Soul ID. Carry SKU into Next SKU and Remake so commercial context does not drop between clips.",
        ],
      },
      {
        h2: "Honest free path vs unlimited claims",
        paragraphs: [
          "Public validation is intentionally small: cached Lab prototypes cost 0 credits and never process your upload. Configured Live allowances appear only for eligible accounts.",
          "A failed job is called refunded only after the server confirms release. TIMEOUT or cancel can remain unconfirmed — that is honest ledger policy, not a silent debit.",
        ],
      },
      {
        h2: "Recommended path this week",
        paragraphs: [
          "1) Clean packshot → 2) Choose a directed Moment in the AI toy video generator → 3) Generate once → 4) QC edges, paint splits, and logos → 5) Post or list. For marketplace depth, choose figure spin. For pull energy, choose blind-box reveal.",
          "External links and GSC matter more than another thin tool URL. Keep the cold-start index lean; deepen guides and real demos instead of cloning near-duplicate pages.",
        ],
      },
    ],
    faq: [
      {
        q: "Is designer toy AI video the same as animating any product?",
        a: "No. Toy vertical prioritizes sculpt/paint identity and listing recipes over generic cinematic chaos.",
      },
      {
        q: "Do you run every model live?",
        a: "No. A model key or route alone does not make it publicly Live. The full auth, durable-credit, provider, and protected-delivery gate must pass first.",
      },
      {
        q: "Where do I start if I only have one photo?",
        a: "Use the one photo toy video AI tool page or the main AI toy video generator with a clean front-facing still.",
      },
    ],
    relatedEffects: ["360-spin-showcase", "blind-box-unboxing", "floating-hero"],
    keywords: [
      "designer toy AI video",
      "designer toy ai video vs generic",
      "ai toy video generator vs runway",
      "toy vertical photo to video",
    ],
  },
  {
    slug: "seller-pack-workflow-listing-reveal-hook",
    emoji: "📦",
    title: "One-Photo Toy Video Workflow: Choose the Right Sales Moment",
    dek: "A practical way to turn one toy photo into the exact listing, reveal, or social clip you need next.",
    seoTitle: "One-Photo Toy Video Workflow for Sellers | Pikbo",
    seoDescription:
      "Choose a focused Pikbo Moment from one owned toy photo: listing spin, box reveal, or social hook. Includes a seller QC checklist and next-SKU workflow.",
    readMins: 5,
    intro:
      "The public Pikbo workflow is intentionally focused: choose one sales Moment for one SKU, preview the direction, and generate only that clip when your account is eligible. Cached previews cost 0 credits and never process your upload.",
    sections: [
      {
        h2: "Choose the sales job before the effect",
        paragraphs: [
          "Choose Listing Spin when buyers need product depth, Blind-box Reveal when the opening beat is the story, or a social hook when reach matters more than a full product tour.",
          "Open Create from an effect card. Public samples are Pikbo Lab previews; they do not accept your photo or start a paid generation.",
        ],
      },
      {
        h2: "Step-by-step",
        paragraphs: [
          "1) Pick the Moment that matches the channel. 2) Upload a sharp owned photo. 3) Confirm rights. 4) Optional: add SKU and preserve notes. 5) Review the quote. 6) Generate and download only a result that passes your product-detail check.",
          "If a job fails, retry that job only when the interface confirms credit state. Never assume a timeout has already been refunded.",
        ],
      },
      {
        h2: "Fidelity QC before you publish",
        paragraphs: [
          "Check edges (no melt), paint splits, logo/sculpt match, background crop, and proportions. Tick the delivery QC list on the result stage — human review, not automated vision scoring.",
          "High-value grails need stricter QA than low-cost blind boxes. Marketplace policies still require accurate representation.",
        ],
      },
      {
        h2: "Next SKU without losing context",
        paragraphs: [
          "After generation, use Next SKU or Remake links that carry the selected effect and SKU when set. Library Remake also preserves SKU for device-local bibles.",
          "Run another photo for the same commercial goal instead of rebuilding the direction each time.",
        ],
      },
    ],
    faq: [
      {
        q: "Does previewing an effect use credits?",
        a: "No. Pikbo Lab previews are cached, cost 0 credits, and do not process your upload. Eligible accounts see the live quote before a real generation starts.",
      },
      {
        q: "Can one video fit every channel?",
        a: "Usually not. Match aspect and energy to the placement: product galleries often favor a stable square view, while TikTok and Reels favor a vertical first-second hook.",
      },
    ],
    relatedEffects: ["360-spin-showcase", "blind-box-unboxing", "paparazzi-flash"],
    keywords: [
      "one photo toy video workflow",
      "toy seller video workflow",
      "listing reveal social video",
      "etsy tiktok toy video maker",
    ],
  },
  {
    slug: "toy-unboxing-video-from-one-photo",
    emoji: "📦",
    title: "Toy Unboxing Video From One Photo (No Filming Rig)",
    dek: "When you need unbox/reveal energy but only have a still — generate a short clip, then QC before you post.",
    seoTitle:
      "Toy Unboxing Video From One Photo — No Camera Rig | Pikbo",
    seoDescription:
      "Plan a toy unboxing-style short from one owned photo. Preview a cached blind-box recipe, then check gated Live eligibility without fake model claims.",
    readMins: 7,
    intro:
      "Search interest in “toy unboxing” is dominated by YouTube and retailers. A new site cannot win that head term in week one. What you can win is a narrower job: you already own the figure, you only have one photo, and you need unbox/reveal motion for a listing, restock, or social post — without a filming rig. Pikbo is a photo-to-video tool for that job, not a “best toys for toddlers” shopping list.",
    sections: [
      {
        h2: "What this page is (and is not)",
        paragraphs: [
          "Is: a practical path from one rights-owned product still to a short reveal-style clip (blind-box energy, lid-up beat, first-second hook).",
          "Is not: a ranking of best unboxing toys for toddlers, an ASMR media network, or unlimited free 4K generation. Public validation is a cached recipe preview, not a toy SKU called “mini unboxing.”",
          "If Google showed you a broad “toy unboxing” impression, treat it as a probe. Click-through depends on a title that promises a doable job — generate motion from a photo — not on beating Wikipedia.",
        ],
      },
      {
        h2: "Why “toy unboxing” hard-target fails for a 3-day site",
        paragraphs: [
          "Head-term difficulty is high; top results are YouTube, Wikipedia, and marketplaces. A DR-0 site burning crawl budget on that SERP wastes the new-site honeymoon.",
          "Long-tail that matches the product: “unboxing video from one photo,” “blind box reveal AI video,” “make reveal clip without filming.” Those map to recipes you can actually ship.",
        ],
      },
      {
        h2: "Three concrete paths (pick one)",
        paragraphs: [
          "1) Blind-box / pull energy — Use the blind box AI video generator tool. Best when the still shows packaging or a clean figure ready for a “open” beat. Reason: vertical social needs a strong first second; recipes bias toward reveal motion, not a slow 360.",
          "2) Listing-safe spin after the “open” — If the unbox is already done and you need marketplace depth, use figure 360 / product video AI. Reason: buyers ask “what does it look around?” more than “show me cardboard.”",
          "3) Quiet, close, slow (ASMR-adjacent) — Same tools, calmer recipe choice and crop: fill the frame with the toy, avoid chaotic backgrounds, prefer soft light. Reason: ASMR audiences punish visual noise; the model amplifies clutter. Still QC paint and logos — AI can smear print.",
        ],
      },
      {
        h2: "Step-by-step (about 10 minutes)",
        paragraphs: [
          "Photograph or pick one sharp still you own. Plain background beats a busy shelf for clean edges.",
          "Open the on-page tool path: start from /tools/blind-box-reveal-video-maker for reveal energy, or /tools/ai-toy-video-generator for the general head-term workflow. Confirm rights before live generate.",
          "Use the cached Lab prototype to learn the look; it never processes your upload. Submit only after Generate confirms an eligible Live mode and exact quote.",
          "QC: edges, paint splits, logo readability, no random morph. Download only when delivery gates allow. A failed job is called refunded only when the server confirms release; TIMEOUT/cancel may stay unconfirmed.",
        ],
      },
      {
        h2: "Title lesson for zero-click impressions",
        paragraphs: [
          "If Search Console shows impressions with zero clicks, the SERP line was not worth a tap. Prefer titles that state the job and the constraint: one photo, no rig, designer toy / blind box — not empty superlatives.",
          "Brand pages can stay suite-oriented; the rank battlefield for “AI toy video generator” stays on the dedicated tools URL so the homepage does not cannibalize it.",
        ],
      },
    ],
    faq: [
      {
        q: "Can I rank for toy unboxing with a new site?",
        a: "Not against YouTube and Amazon on the head term in week one. Compete on photo-to-reveal jobs and vertical long-tails, then earn links and CTR.",
      },
      {
        q: "Is free Pikbo the same as free unboxing toys?",
        a: "No. Pikbo provides a cached video-workflow preview during validation; it does not ship physical toys or promise public Live generation.",
      },
      {
        q: "How do I get an ASMR-style unboxing clip?",
        a: "Use a tight crop, quiet background, and a reveal-oriented recipe; keep motion calm. Always review the export — ASMR viewers notice smear and noise.",
      },
    ],
    relatedEffects: ["blind-box-unboxing", "mystery-box-reveal", "paparazzi-flash"],
    keywords: [
      "toy unboxing video from one photo",
      "blind box reveal video AI",
      "make unboxing video without filming",
      "free mini toy video trial",
      "toy unboxing ASMR style clip",
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
