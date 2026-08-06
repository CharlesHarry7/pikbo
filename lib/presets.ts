// Each preset is BOTH a creative effect in the studio AND a programmatic
// SEO landing page at /effects/[slug]. Add a preset -> get a new page.
//
// pSEO structure (learned from Pollo AI's 200+ effect matrix): a two-level
// hierarchy — category hubs (/effects) + individual effect pages — but kept
// inside the designer-toy niche instead of going generic.

export type Audience = "seller" | "collector";
export type CategoryId = "showcase" | "unboxing" | "comealive" | "scene";

export type Category = {
  id: CategoryId;
  label: string;
  blurb: string;
};

export const CATEGORIES: Category[] = [
  {
    id: "showcase",
    label: "Product Showcase",
    blurb: "Commercial packshots: 360°, Zero-G, Display Glow for listings.",
  },
  {
    id: "unboxing",
    label: "Unboxing & Reveal",
    blurb: "Box Reveal beat for drops, restocks, and open-box posts.",
  },
  {
    id: "comealive",
    label: "Come Alive",
    blurb: "Toy Dance, walk, wave — social motion on the figure you own.",
  },
  {
    id: "scene",
    label: "Scenes & Worlds",
    blurb: "Story mode: tiny worlds while keeping the toy recognizable.",
  },
];

export type Preset = {
  slug: string;
  emoji: string;
  name: string; // Studio label
  gradient: string; // card accent
  category: CategoryId;
  audience: Audience;
  tagline: string; // one-liner used on cards
  // --- SEO landing page fields ---
  h1: string;
  seoTitle: string;
  seoDescription: string;
  intro: string; // opening paragraph
  body: string[]; // supporting paragraphs
  keywords: string[];
  faq: { q: string; a: string }[];
  // --- generation ---
  promptTemplate: string; // sent to the video model
  duration: 5 | 10;
  aspectRatio: "9:16" | "16:9" | "1:1";
};

export const PRESETS: Preset[] = [
  // ---------------- SHOWCASE ----------------
  {
    slug: "360-spin-showcase",
    emoji: "🌀",
    name: "360° Spin Showcase",
    gradient: "linear-gradient(135deg,#ff4d8d,#a855f7)",
    category: "showcase",
    audience: "seller",
    tagline:
      "One photo → a square listing-spin draft with inferred angles to review.",
    h1: "Make a 360° Product Video of a Toy From One Photo",
    seoTitle: "Toy 360° Product Video Generator From One Photo | Pikbo",
    seoDescription:
      "Draft a square toy-listing spin from one owned product photo. See the real cached reference/output pair, recorded limits, and the private validation path.",
    intro:
      "A slow square spin can add motion to a collectible listing without a filmed turntable. Pikbo drafts inferred angles from one photo; compare sculpt, paint, logos, and packaging with the physical product before publishing.",
    body: [
      "A short spin can help buyers inspect a collectible, but it does not guarantee a sale. Pikbo offers a generated alternative when you do not have a photographed turntable clip; inferred angles must be reviewed against the real product.",
      "Great for blind box figures, resin art toys, sofubi, and vinyl collectibles. Export in vertical for TikTok Shop or square for marketplace galleries.",
    ],
    keywords: [
      "360 spin video maker",
      "product turntable video",
      "designer toy product video",
      "figure 360 video",
    ],
    faq: [
      {
        q: "Can I make a 360° toy video from one photo?",
        a: "Yes. Pikbo uses one front photo as the reference and generates the unseen angles. Because those angles are inferred rather than photographed, check sculpt, paint, logos, and packaging before using the clip in a listing.",
      },
      {
        q: "Do I need a real turntable?",
        a: "Not for an AI draft. A real turntable remains the accurate choice when every physical angle must be exact.",
      },
      {
        q: "What photo works best?",
        a: "A clean, well-lit shot on a plain background gives the sharpest spin. Front-facing photos work best.",
      },
    ],
    promptTemplate:
      "A slow, smooth 360 degree turntable rotation of the collectible figure on a clean seamless studio backdrop, soft product lighting, subtle reflections, premium commercial look, the object stays centered and in focus.",
    duration: 5,
    aspectRatio: "1:1",
  },
  {
    slug: "display-case-glam",
    emoji: "✨",
    name: "Display Case Glam",
    gradient: "linear-gradient(135deg,#a855f7,#6ee7c7)",
    category: "showcase",
    audience: "collector",
    tagline: "Make a shelf piece look like a boutique grail.",
    h1: "Display Case Glam Lighting Video",
    seoTitle: "Display Case Glam Video for Collectibles | Pikbo",
    seoDescription:
      "Give your collection a cinematic glow-up. Sweeping light, glossy reflections, and a slow camera move that makes any figure look premium.",
    intro:
      "Make your shelf look like a boutique display. Pikbo adds sweeping cinematic light and a slow camera glide so your figure reads as premium and collectible.",
    body: [
      "Perfect for 'grail' posts and collection highlights where you want the piece to feel special.",
      "The glossy, lit look also works as a hero shot for a resale listing or a portfolio of custom work.",
    ],
    keywords: [
      "collectible showcase video",
      "cinematic product lighting",
      "figure glamour video",
      "display case video",
    ],
    faq: [
      {
        q: "Does it change my figure's colors?",
        a: "It adds lighting and reflections on top of your photo without repainting the toy itself.",
      },
    ],
    promptTemplate:
      "Cinematic glamour lighting sweeps across the collectible figure, glossy reflections, slow elegant camera glide, dramatic rim light against a dark premium backdrop, luxury display case mood.",
    duration: 5,
    aspectRatio: "16:9",
  },
  {
    slug: "floating-hero",
    emoji: "🎈",
    name: "Floating Hero",
    gradient: "linear-gradient(135deg,#6a5cff,#ff4d8d)",
    category: "showcase",
    audience: "seller",
    tagline: "A floating hero shot that looks ad-agency expensive.",
    h1: "Create a Floating Toy Product Video From One Photo",
    seoTitle: "Floating Toy Product Video Generator From One Photo | Pikbo",
    seoDescription:
      "Make your figure float and rotate in mid-air for a high-end hero shot. One photo, no CGI, no filming — ready for ads and listings.",
    intro:
      "A floating hero shot can give a product page a more premium feel. Pikbo uses your photo as the reference for a slow mid-air rotation; review the generated details before publishing.",
    body: [
      "Levitation shots are a staple of high-end product ads because they feel expensive and deliberate.",
      "Use it as the opening frame of a launch reel or the hero video on a product page.",
    ],
    keywords: [
      "levitating product video",
      "floating product video maker",
      "toy hero shot video",
    ],
    faq: [
      {
        q: "How do I make a toy float in a product video?",
        a: "Upload a clear photo of a toy you own and open the Floating Hero recipe. Pikbo generates the lift, shadow, and camera movement; review the toy's generated details before publishing.",
      },
      {
        q: "Will it look fake?",
        a: "Pikbo adds a soft shadow and gentle drift so the float reads as an intentional studio effect, not a cutout.",
      },
    ],
    promptTemplate:
      "The collectible figure gently levitates and slowly rotates in mid-air, soft floating motion, a subtle drop shadow below, clean gradient studio background, premium high-end product commercial lighting.",
    duration: 5,
    aspectRatio: "1:1",
  },
  {
    slug: "collection-shelf-pan",
    emoji: "🗄️",
    name: "Collection Shelf Pan",
    gradient: "linear-gradient(135deg,#6ee7c7,#6a5cff)",
    category: "showcase",
    audience: "collector",
    tagline: "Give your whole collection a cinematic flex.",
    h1: "Collection Shelf Pan Video Maker",
    seoTitle: "Collection Shelf Video Maker for Collectors | Pikbo",
    seoDescription:
      "Turn a photo of your shelf into a slow cinematic pan. Show off your whole collection in one scroll-stopping clip.",
    intro:
      "Your shelf deserves better than a still photo. Pikbo turns one shot of your collection into a smooth cinematic pan that shows everything off.",
    body: [
      "Collection tours are one of the most engaging formats for collector accounts.",
      "Great for milestone posts — a full display, a new addition, or a themed grouping.",
    ],
    keywords: [
      "collection shelf video",
      "collection tour video",
      "figure shelf pan video",
    ],
    faq: [
      {
        q: "Can I use a wide photo of my shelf?",
        a: "Yes — a horizontal shelf photo works best for a left-to-right cinematic pan.",
      },
    ],
    promptTemplate:
      "A slow, smooth cinematic horizontal pan across a shelf of collectible figures, gentle parallax, warm display lighting, shallow depth of field, cozy collector showcase mood.",
    duration: 5,
    aspectRatio: "16:9",
  },

  // ---------------- UNBOXING ----------------
  {
    slug: "blind-box-unboxing",
    emoji: "📦",
    name: "Blind Box Unboxing",
    gradient: "linear-gradient(135deg,#6a5cff,#6ee7c7)",
    category: "unboxing",
    audience: "seller",
    tagline: "The blind-box reveal — without opening a box.",
    h1: "Create a Blind Box Unboxing Video From One Product Photo",
    seoTitle: "Blind Box Unboxing Video Generator | Pikbo",
    seoDescription:
      "Create an unboxing reveal video from one photo. The box opens, the figure drops in — the exact moment collectors love. Made for Reels, Shorts, and TikTok.",
    intro:
      "Unboxing is the most-watched format in the collectible world. Pikbo recreates that satisfying reveal — lid lifting, figure appearing — from a single product photo, so you can post a hook without filming a haul.",
    body: [
      "The reveal beat is what stops the scroll. Use it as the opening 3 seconds of a product ad or a teaser for a new drop.",
      "Ideal for series launches and restock announcements where you want hype without shipping samples to a videographer first.",
    ],
    keywords: [
      "blind box unboxing video",
      "unboxing video generator",
      "toy reveal video ai",
      "mystery box unboxing",
    ],
    faq: [
      {
        q: "Can AI make a blind box unboxing video from a photo?",
        a: "Yes. Upload a photo of your own figure or packaging and choose the Blind Box Unboxing recipe. The opening action and unseen packaging surfaces are generated, so verify artwork and product details before posting.",
      },
      {
        q: "Can I use my own box art?",
        a: "Yes — upload a photo that includes your packaging and Pikbo animates the reveal around it.",
      },
      {
        q: "What length is best for Reels?",
        a: "Keep the reveal to 5 seconds and loop it. Short, punchy openers perform best.",
      },
    ],
    promptTemplate:
      "A satisfying unboxing reveal: the blind box lid lifts and the collectible figure appears with a soft bounce, gentle studio lighting, shallow depth of field, playful premium commercial mood, smooth camera push-in.",
    duration: 5,
    aspectRatio: "9:16",
  },
  {
    slug: "mystery-box-reveal",
    emoji: "🎁",
    name: "Mystery Box Reveal",
    gradient: "linear-gradient(135deg,#ff4d8d,#6a5cff)",
    category: "unboxing",
    audience: "collector",
    tagline: "A magical drop reveal built for giveaways.",
    h1: "Mystery Box Reveal Video Maker",
    seoTitle: "Mystery Box Reveal Video Maker | Pikbo",
    seoDescription:
      "Turn one photo into a glowing mystery-box reveal with light bursts and confetti. The dopamine moment, ready for Shorts and Reels.",
    intro:
      "Give your reveal some drama. Pikbo wraps your figure in a glowing mystery box that bursts open with light and confetti — the dopamine hit collectors share.",
    body: [
      "A punchier, more magical take on unboxing for viral posts and giveaways.",
      "Perfect for 'guess what I pulled' content and reveal announcements.",
    ],
    keywords: [
      "mystery box reveal video",
      "surprise reveal video maker",
      "gacha reveal video",
    ],
    faq: [
      {
        q: "Is the confetti optional?",
        a: "Yes — add or remove effects in the studio's prompt box to tune the drama.",
      },
    ],
    promptTemplate:
      "A glowing magical mystery box bursts open with a soft light explosion and confetti, revealing the collectible figure inside, energetic celebratory mood, sparkles, smooth camera push-in, vibrant colors.",
    duration: 5,
    aspectRatio: "9:16",
  },
  {
    slug: "claw-machine-win",
    emoji: "🕹️",
    name: "Claw Machine Win",
    gradient: "linear-gradient(135deg,#d6ff4d,#ff4d8d)",
    category: "unboxing",
    audience: "collector",
    tagline: "Win your figure from an arcade claw, every time.",
    h1: "Claw Machine Video Maker for Toys",
    seoTitle: "Claw Machine Win Video Maker | Pikbo",
    seoDescription:
      "Drop your figure into an arcade claw machine and land the perfect grab. A nostalgic, playful clip from one photo.",
    intro:
      "Everyone loves a claw-machine win. Pikbo places your figure in a colorful arcade claw machine and lands the grab — a playful, nostalgic clip from one photo.",
    body: [
      "A fun, high-personality format that stands out from standard unboxings.",
      "Great for plush, keychains, and small collectibles.",
    ],
    keywords: [
      "claw machine video",
      "arcade claw toy video",
      "toy grab video maker",
    ],
    faq: [
      {
        q: "Does it work with plush?",
        a: "Yes — plush and small figures are ideal for the claw grab motion.",
      },
    ],
    promptTemplate:
      "Inside a colorful arcade claw machine, a metal claw descends and successfully grabs the collectible figure, lifting it up, playful neon arcade lighting, nostalgic fun mood, satisfying win moment.",
    duration: 5,
    aspectRatio: "9:16",
  },

  // ---------------- COME ALIVE ----------------
  {
    slug: "make-figure-dance",
    emoji: "💃",
    name: "Make It Dance",
    gradient: "linear-gradient(135deg,#ff4d8d,#d6ff4d)",
    category: "comealive",
    audience: "collector",
    tagline: "Make your figure dance — the clip collectors share.",
    h1: "Make a Toy Figure Dance From One Photo",
    seoTitle: "Make a Toy Figure Dance From a Photo | Pikbo",
    seoDescription:
      "Upload a photo of your figure and create a playful animated clip for Reels or TikTok. Live renders usually take 30–90 seconds when the provider is configured.",
    intro:
      "Ever wish your favourite figure could come alive? Upload one photo and Pikbo animates a playful little dance — the kind of clip collectors love to share.",
    body: [
      "A dancing collectible can be a strong social hook. Test the result with your audience; reach and engagement are not guaranteed.",
      "Works with vinyl figures, plush, sofubi, and art toys. Add it to a shelf tour or a 'new arrival' post.",
    ],
    keywords: [
      "make my figure dance",
      "toy animation video",
      "dancing figure ai",
      "bring toy to life video",
    ],
    faq: [
      {
        q: "How can I make my action figure dance in a video?",
        a: "Upload one clear, front-facing photo of a figure you own, then choose the dance recipe. Pikbo uses the photo as a visual reference while generating the motion.",
      },
      {
        q: "Will it preserve every detail of my figure?",
        a: "Your upload guides the character and colors, but generated motion can change small details. Review each result before publishing.",
      },
      {
        q: "Is there a free version?",
        a: "Yes. Public validation is a labeled Cached Lab prototype at 0 credits — it does not process your upload. When Live is enabled for an eligible account, the configured Free path is about one 5-second 480p Mini job with an on-player mark. Live access stays gated during soft launch.",
      },
    ],
    promptTemplate:
      "The cute collectible figure performs a playful, bouncy dance with charming character motion, staying in place, soft colorful lighting, joyful energetic mood, clean background, smooth loop-friendly motion.",
    duration: 5,
    aspectRatio: "9:16",
  },
  {
    slug: "make-figure-walk",
    emoji: "🚶",
    name: "Make It Walk",
    gradient: "linear-gradient(135deg,#a855f7,#ff4d8d)",
    category: "comealive",
    audience: "collector",
    tagline: "Give your figure a confident walk of its own.",
    h1: "Make Your Figure Walk — AI Video",
    seoTitle: "Make Your Figure Walk | Toy Animation | Pikbo",
    seoDescription:
      "Animate a confident walk cycle from one photo of your figure. A simple, striking way to bring a collectible to life.",
    intro:
      "There's something magical about a toy that walks. Pikbo animates a confident stride from a single photo, giving your figure a life of its own.",
    body: [
      "A clean, universal motion that suits action figures, robots, and characters.",
      "Pair it with a scene effect to send your figure walking through a tiny world.",
    ],
    keywords: [
      "make figure walk video",
      "walking toy animation",
      "action figure walk cycle",
    ],
    faq: [
      {
        q: "Which figures work best?",
        a: "Figures with legs and a clear front-facing pose animate the most convincingly.",
      },
    ],
    promptTemplate:
      "The collectible figure walks forward with a confident, characterful stride, natural weight and bounce, staying in frame, soft cinematic lighting, clean background, smooth believable motion.",
    duration: 5,
    aspectRatio: "9:16",
  },
  {
    slug: "toy-wave-hello",
    emoji: "👋",
    name: "Wave Hello",
    gradient: "linear-gradient(135deg,#6ee7c7,#a855f7)",
    category: "comealive",
    audience: "collector",
    tagline: "A wink-and-wave that greets your feed.",
    h1: "Cute Toy Wave & Wink Video Maker",
    seoTitle: "Cute Toy Wave / Wink Video Maker | Pikbo",
    seoDescription:
      "Give your figure a charming little wave and wink from one photo. The friendly micro-animation perfect for intros and greetings.",
    intro:
      "A tiny wave goes a long way. Pikbo gives your figure a charming wink-and-wave from a single photo — the perfect friendly intro clip.",
    body: [
      "Micro-animations feel personal and are great as profile intros or greeting posts.",
      "Subtle motion is intended to reduce visual drift, but generated details can still vary.",
    ],
    keywords: [
      "toy wave video",
      "figure wink animation",
      "cute toy greeting video",
    ],
    faq: [
      {
        q: "Is the motion subtle?",
        a: "Yes — it's a gentle, cute micro-animation rather than a big movement.",
      },
    ],
    promptTemplate:
      "The cute collectible figure gives a friendly little wave and a charming wink, gentle subtle motion, warm inviting lighting, clean soft background, adorable wholesome mood, loop-friendly.",
    duration: 5,
    aspectRatio: "9:16",
  },
  {
    slug: "plushie-comes-alive",
    emoji: "🧸",
    name: "Plushie Comes Alive",
    gradient: "linear-gradient(135deg,#ff4d8d,#6ee7c7)",
    category: "comealive",
    audience: "collector",
    tagline: "Your plushie, squishing and bouncing to life.",
    h1: "Make Your Plushie Come to Life — AI Video",
    seoTitle: "Plushie Come to Life Video Maker | Pikbo",
    seoDescription:
      "Turn one photo of your plush toy or stuffed animal into a soft, bouncy, come-alive video. Made for plushie collectors and gifts.",
    intro:
      "Plush toys have so much personality. Pikbo uses one photo to create soft, bouncy motion; fabric, shape, and small details can vary in the result.",
    body: [
      "Built for the plush community: stuffed animals, beanies, and soft collectibles.",
      "A heartfelt format for gifts, keepsakes, and 'meet my plushie' posts.",
    ],
    keywords: [
      "plushie come to life video",
      "plush toy animation",
      "stuffed animal video maker",
    ],
    faq: [
      {
        q: "Will it preserve every plush detail?",
        a: "The upload guides shape and colors, but generated fabric and small details can vary. Review the clip before sharing or selling.",
      },
    ],
    promptTemplate:
      "The soft plush toy comes to life with squishy, bouncy, huggable motion, gentle wobble and a happy little hop, warm cozy lighting, soft clean background, wholesome adorable mood.",
    duration: 5,
    aspectRatio: "9:16",
  },
  {
    slug: "stop-motion-style",
    emoji: "🎬",
    name: "Stop-Motion Style",
    gradient: "linear-gradient(135deg,#d6ff4d,#6a5cff)",
    category: "comealive",
    audience: "collector",
    tagline: "Laika-style stop-motion charm, zero frames shot.",
    h1: "Stop-Motion Style Toy Video Maker",
    seoTitle: "Stop-Motion Style Toy Video Maker | Pikbo",
    seoDescription:
      "Give your figure that handcrafted stop-motion look — the charm of Laika films without frame-by-frame work. From one photo.",
    intro:
      "Stop-motion has a handmade charm that fits collectibles perfectly. Pikbo fakes that stepped, tactile motion from a single photo — no frame-by-frame shooting.",
    body: [
      "A distinctive aesthetic that stands out in a feed full of smooth AI video.",
      "Great for storytelling posts, custom toy makers, and indie brand launches.",
    ],
    keywords: [
      "stop motion toy video",
      "stop motion style ai",
      "handmade toy animation",
    ],
    faq: [
      {
        q: "Is it real stop-motion?",
        a: "It's an AI-rendered stop-motion look — the stepped timing and tactile feel, generated automatically.",
      },
    ],
    promptTemplate:
      "Charming handcrafted stop-motion animation of the collectible figure, slightly stepped frame timing, tactile clay-like texture in motion, warm practical lighting, cozy indie film mood, small delightful movements.",
    duration: 5,
    aspectRatio: "9:16",
  },

  // ---------------- SCENE ----------------
  {
    slug: "miniature-scene",
    emoji: "🏙️",
    name: "Miniature Scene",
    gradient: "linear-gradient(135deg,#ff4d8d,#6a5cff)",
    category: "scene",
    audience: "collector",
    tagline: "Drop your figure into a tiny cinematic world.",
    h1: "Put Your Toy in a Miniature World Video",
    seoTitle: "Miniature World Video Generator for Toys | Pikbo",
    seoDescription:
      "Place your collectible inside a tiny cinematic world and watch the scene come alive. Atmospheric, storybook clips from one photo.",
    intro:
      "Give your figure a world to live in. Pikbo drops your collectible into a tiny cinematic scene — mist, light, gentle motion — and brings it to life.",
    body: [
      "This is storytelling for collectors: a mood, an atmosphere, a moment your figure lives inside.",
      "Ideal for narrative posts and creators building a character around their toy.",
    ],
    keywords: [
      "miniature scene video",
      "toy diorama animation",
      "cinematic toy world video",
    ],
    faq: [
      {
        q: "Can I put my toy into a miniature AI video scene?",
        a: "Yes. Upload the toy photo you own and choose the Miniature Scene recipe. Pikbo generates the surrounding world and camera movement while using your photo as the subject reference.",
      },
      {
        q: "Can I choose the scene?",
        a: "The preset picks an atmospheric world; describe your own in the studio prompt box to customize it.",
      },
    ],
    promptTemplate:
      "The collectible figure comes to life inside a tiny cinematic diorama world, atmospheric volumetric light, soft mist, gentle ambient motion in the scene, storybook mood, shallow depth of field, the figure remains the hero.",
    duration: 5,
    aspectRatio: "16:9",
  },
  {
    slug: "festive-snow",
    emoji: "❄️",
    name: "Festive Snow",
    gradient: "linear-gradient(135deg,#6ee7c7,#a855f7)",
    category: "scene",
    audience: "collector",
    tagline: "Wrap your figure in a cozy snow-globe moment.",
    h1: "Festive Snow Toy Video Maker",
    seoTitle: "Christmas / Festive Snow Toy Video Maker | Pikbo",
    seoDescription:
      "Wrap your figure in a cozy snowfall scene for the holidays. Warm lights, falling snow, and gentle motion from one photo.",
    intro:
      "Nothing says holidays like a snow globe. Pikbo surrounds your figure with soft falling snow and warm festive lights from a single photo.",
    body: [
      "A seasonal format that rides holiday search spikes and gift-giving posts.",
      "Perfect for Christmas drops, advent content, and cozy collection shots.",
    ],
    keywords: [
      "christmas toy video",
      "festive snow video maker",
      "holiday figure video",
    ],
    faq: [
      {
        q: "Is this only for Christmas?",
        a: "The snowy, cozy look works for any winter or festive post, not just Christmas.",
      },
    ],
    promptTemplate:
      "Soft snow falls gently around the collectible figure in a cozy festive scene, warm twinkling holiday lights, subtle bokeh, gentle drifting snowflakes, magical wintery mood, the figure stays crisp and centered.",
    duration: 5,
    aspectRatio: "9:16",
  },
  {
    slug: "neon-city-night",
    emoji: "🌃",
    name: "Neon City Night",
    gradient: "linear-gradient(135deg,#6a5cff,#ff4d8d)",
    category: "scene",
    audience: "collector",
    tagline: "Your figure, lit up in a neon-noir city.",
    h1: "Neon City Toy Video Maker",
    seoTitle: "Neon City Night Toy Video Maker | Pikbo",
    seoDescription:
      "Set your figure against a moody neon cityscape with glowing reflections and rain. A cinematic, edgy look from one photo.",
    intro:
      "Give your figure a cyberpunk edge. Pikbo places it in a moody neon city at night — glowing signs, wet reflections, atmospheric haze — from one photo.",
    body: [
      "A bold, cinematic aesthetic that suits action figures and edgier art toys.",
      "Great for dramatic character posts and standout drops.",
    ],
    keywords: [
      "neon toy video",
      "cyberpunk figure video",
      "cinematic night toy video",
    ],
    faq: [
      {
        q: "Does it add rain?",
        a: "The scene includes subtle wet reflections; ask for more rain in the studio prompt box if you want it.",
      },
    ],
    promptTemplate:
      "The collectible figure stands in a moody neon-lit city at night, glowing signage, wet reflective ground, subtle atmospheric haze and drifting light, cinematic cyberpunk mood, slow push-in, the figure stays the hero.",
    duration: 5,
    aspectRatio: "16:9",
  },
  // ---------------- COME ALIVE (added) ----------------
  {
    slug: "assemble-reveal",
    emoji: "🧩",
    name: "Assemble Reveal",
    gradient: "linear-gradient(135deg,#6a5cff,#d6ff4d)",
    category: "comealive",
    audience: "collector",
    tagline: "Watch your figure build itself, part by part.",
    h1: "Figure Assembly Video Maker",
    seoTitle: "Figure Assembly / Assemble Reveal Video Maker | Pikbo",
    seoDescription:
      "Watch your figure build itself — parts fly in and snap together in an epic assembly reveal. From one photo, no rig. Great for mecha and model kits.",
    intro:
      "Give your figure an epic origin. Pikbo animates an assembly reveal from a single photo — parts fly in and snap together into the finished figure, with a satisfying mechanical build-up.",
    body: [
      "The assemble format suits mecha, robots, action figures, and model kits where the build itself is the appeal.",
      "Use it as a launch teaser or a 'my latest build' reveal that feels far more produced than a photo.",
    ],
    keywords: [
      "figure assembly video",
      "toy assemble video",
      "parts assemble animation",
    ],
    faq: [
      {
        q: "Which figures work best?",
        a: "Mecha, robots, and model kits read especially well, but any figure with clear parts animates convincingly.",
      },
    ],
    promptTemplate:
      "The collectible figure's parts fly in from off-screen and snap together to assemble the complete figure, dynamic mechanical assembly motion, small sparks of light at each connection, clean studio background, epic satisfying build-up, the finished figure holds a confident pose at the end, aiming to preserve the visible sculpt and colors.",
    duration: 5,
    aspectRatio: "9:16",
  },
  {
    slug: "paparazzi-flash",
    emoji: "📷",
    name: "Paparazzi Flash",
    gradient: "linear-gradient(135deg,#ff4d8d,#6a5cff)",
    category: "comealive",
    audience: "collector",
    tagline: "Treat your grail like a red-carpet celebrity.",
    h1: "Paparazzi / Red Carpet Toy Video Maker",
    seoTitle: "Paparazzi Red Carpet Toy Video Maker | Pikbo",
    seoDescription:
      "Turn your figure into a celebrity — red carpet, camera flashes popping, viral energy. A fun, shareable clip from a single photo.",
    intro:
      "Make your figure famous. Pikbo drops it onto a glamorous red carpet with paparazzi flashes popping all around — the viral, high-energy clip collectors love to share.",
    body: [
      "A playful, trend-driven format you can test against simpler product footage; reach and shares are not guaranteed.",
      "Perfect for a 'star of my collection' post or hyping a grail piece.",
    ],
    keywords: [
      "paparazzi toy video",
      "red carpet figure video",
      "celebrity toy video",
    ],
    faq: [
      {
        q: "Is it very flashy?",
        a: "Yes — rapid camera flashes and motion are the whole point. Ask for a calmer version in the studio prompt box if you prefer.",
      },
    ],
    promptTemplate:
      "The collectible figure walks a glamorous red carpet as paparazzi camera flashes pop rapidly all around it, bright flashing lights, soft motion blur of a crowd behind, a confident celebrity strut, the figure stays crisp and centered, fun viral energetic mood.",
    duration: 5,
    aspectRatio: "9:16",
  },

  // ---------------- SCENE (added) ----------------
  {
    slug: "kaiju-rampage",
    emoji: "🦖",
    name: "Kaiju Rampage",
    gradient: "linear-gradient(135deg,#6ee7c7,#ff4d8d)",
    category: "scene",
    audience: "collector",
    tagline: "Your figure goes full kaiju over a tiny city.",
    h1: "Giant Kaiju Toy Video Maker",
    seoTitle: "Giant Kaiju Toy Video Maker | Pikbo",
    seoDescription:
      "Turn your figure into a city-crushing giant. Kaiju-scale monster-movie clips with smoke and searchlights, from one photo.",
    intro:
      "Go full monster movie. Pikbo makes your figure tower as a giant kaiju over a tiny city — stomping between skyscrapers with smoke and searchlights — all from a single photo.",
    body: [
      "An epic, dramatic scene that suits kaiju, dinosaurs, mecha, and larger-than-life characters.",
      "A standout format for a bold reveal or a 'king of the shelf' post.",
    ],
    keywords: [
      "giant toy video",
      "kaiju figure video",
      "monster toy video",
    ],
    faq: [
      {
        q: "Does my figure stay recognizable?",
        a: "The photo guides the figure, but generated details and colors can drift. Review the result before publishing."
      },
    ],
    promptTemplate:
      "The collectible figure towers as a giant kaiju over a tiny miniature city at dusk, stomping between skyscrapers, dramatic sense of massive scale, atmospheric smoke and sweeping searchlights, epic monster-movie mood, slow low-angle camera, the scene aims to preserve the figure's visible look and colors.",
    duration: 5,
    aspectRatio: "16:9",
  },
  // ---------------- VIRAL (added, quality-first) ----------------
  {
    slug: "smoke-burst-entrance",
    emoji: "💨",
    name: "Smoke Burst Entrance",
    gradient: "linear-gradient(135deg,#6a5cff,#a855f7)",
    category: "comealive",
    audience: "collector",
    tagline: "A smoke-burst hero entrance for your figure.",
    h1: "Smoke Burst Reveal Video Maker",
    seoTitle: "Smoke Burst Reveal Video Maker for Figures | Pikbo",
    seoDescription:
      "Give your figure a dramatic entrance — bursting out of a cloud of smoke into a hero pose. A cinematic viral reveal from one photo.",
    intro:
      "Every hero needs an entrance. Pikbo bursts your figure out of a swirling cloud of smoke into a confident hero pose — a dramatic, cinematic reveal made from a single photo.",
    body: [
      "The smoke-burst is a staple of action trailers and viral edits because it builds anticipation and lands on a strong beat.",
      "Great for action figures, mecha, and any grail you want to introduce with impact.",
    ],
    keywords: [
      "smoke reveal video",
      "dramatic entrance video",
      "figure reveal effect",
    ],
    faq: [
      {
        q: "Does it hide my figure in smoke?",
        a: "Only for a beat — the smoke clears to reveal your figure crisp and centered in a hero pose.",
      },
    ],
    promptTemplate:
      "The collectible figure bursts out of a swirling cloud of atmospheric smoke into a confident hero pose, dramatic backlight and volumetric haze, cinematic slow-motion reveal, the smoke clears to show the figure crisp and recognizable, using the uploaded photo as reference.",
    duration: 5,
    aspectRatio: "9:16",
  },
  {
    slug: "paint-splash",
    emoji: "💦",
    name: "Paint Splash",
    gradient: "linear-gradient(135deg,#ff4d8d,#d6ff4d)",
    category: "showcase",
    audience: "seller",
    tagline: "Freeze a vivid paint splash around your figure.",
    h1: "Paint Splash Product Video Maker",
    seoTitle: "Paint / Color Splash Product Video Maker | Pikbo",
    seoDescription:
      "Wrap your figure in a vivid, frozen paint and liquid splash for a bold, high-energy product video. One photo, no studio.",
    intro:
      "Add some energy and color. Pikbo surrounds your figure with a vivid, dynamic splash of paint and liquid — a bold, ad-grade look that pops in a feed — all from one photo.",
    body: [
      "Colorful splash shots are a favourite in sneaker and product advertising because they read as premium and kinetic.",
      "Works for bright vinyl toys, sporty figures, and any drop where you want maximum visual punch.",
    ],
    keywords: [
      "paint splash product video",
      "color splash figure video",
      "liquid splash toy video",
    ],
    faq: [
      {
        q: "Will the splash cover my figure?",
        a: "No — the splash frames and surrounds the figure while keeping it clear and in focus.",
      },
    ],
    promptTemplate:
      "Vivid dynamic splashes of colorful paint and liquid burst and freeze in mid-air around the collectible figure, high-energy commercial product look, dramatic studio lighting, the figure stays crisp, centered, and fully in focus, bold vibrant colors.",
    duration: 5,
    aspectRatio: "1:1",
  },
  {
    slug: "power-aura",
    emoji: "⚡",
    name: "Power Aura",
    gradient: "linear-gradient(135deg,#d6ff4d,#ff4d8d)",
    category: "comealive",
    audience: "collector",
    tagline: "Power up your figure with an anime energy aura.",
    h1: "Power-Up / Energy Aura Video Maker",
    seoTitle: "Power-Up Energy Aura Video Maker for Figures | Pikbo",
    seoDescription:
      "Charge your figure with a glowing anime-style energy aura and crackling power. A high-impact viral effect from a single photo.",
    intro:
      "Power up your figure. Pikbo surrounds it with a glowing, crackling energy aura — the anime power-up moment — for a high-impact clip made from one photo.",
    body: [
      "The power-up aura uses a familiar anime and gaming visual language; test the result with your own audience.",
      "Perfect for anime figures, action figures, and mecha you want to make feel unstoppable.",
    ],
    keywords: [
      "power up video effect",
      "energy aura figure video",
      "anime power up video",
    ],
    faq: [
      {
        q: "Is the aura over the top?",
        a: "It's a bold anime-style glow. Ask for a subtler aura in the studio prompt box if you prefer.",
      },
    ],
    promptTemplate:
      "The collectible figure charges up with a glowing, crackling energy aura swirling around it, anime power-up moment, radiant light, floating particles and electric arcs, epic dynamic mood, the scene aims to keep the figure crisp and recognizable.",
    duration: 5,
    aspectRatio: "9:16",
  },
  {
    slug: "street-power-up",
    emoji: "⚡",
    name: "Street Power-Up",
    gradient: "linear-gradient(135deg,#111827,#22d3ee)",
    category: "scene",
    audience: "seller",
    tagline: "A 5-second vertical launch moment for drop day.",
    h1: "Street Power-Up Toy Launch Video From One Photo",
    seoTitle: "Street Power-Up Toy Launch Video | Pikbo",
    seoDescription:
      "Turn one owned toy photo into a 5-second vertical launch moment with a slow camera push, city light, and a restrained energy reveal.",
    intro:
      "Street Power-Up is Pikbo's first real Moment contract: one owned toy photo becomes one private 9:16, 5-second launch clip for a drop-day post.",
    body: [
      "The preset keeps the toy's original shape, colors, and proportions while adding a single continuous camera move, rain-slick city light, and a restrained energy activation.",
      "Generated details can vary. Review the clip against the physical toy before publishing, especially face, paint, logos, and small accessories.",
    ],
    keywords: [
      "toy launch video",
      "toy video from photo",
      "streetwear toy promo video",
      "vertical collectible video",
    ],
    faq: [
      {
        q: "What does Street Power-Up generate?",
        a: "One 5-second, 9:16, 720p clip from a clear photo of a toy you own. It is a single continuous shot, not a multi-scene edit.",
      },
      {
        q: "Will it preserve my toy?",
        a: "The prompt explicitly preserves the toy's design, colors, shape, and proportions, but generated details still need a seller review before publishing.",
      },
    ],
    promptTemplate:
      "Create a premium collectible toy launch moment. Keep the original toy design, colors, shape and proportions unchanged. The toy stands on a rainy city street at night. Subtle energy lights activate around the character. Small particles appear, the camera slowly pushes in, and the toy ends in a confident hero pose. Single continuous cinematic shot. Product launch video style.",
    duration: 5,
    aspectRatio: "9:16",
  },
  {
    slug: "hologram-glitch",
    emoji: "🔮",
    name: "Hologram Glitch",
    gradient: "linear-gradient(135deg,#6ee7c7,#6a5cff)",
    category: "scene",
    audience: "collector",
    tagline: "Render your figure as a flickering cyber hologram.",
    h1: "Hologram / Glitch Video Maker for Figures",
    seoTitle: "Hologram Glitch Video Maker for Figures | Pikbo",
    seoDescription:
      "Turn your figure into a flickering cyber hologram — scan lines, glitches, and neon projection. A futuristic viral look from one photo.",
    intro:
      "Go full sci-fi. Pikbo renders your figure as a flickering cyber hologram — scan lines, glitch flickers, and a neon projection glow — for a futuristic look made from a single photo.",
    body: [
      "The hologram-glitch aesthetic suits tech, mecha, and edgier art toys, and stands out in a feed full of clean product shots.",
      "A striking format for a bold reveal or a cyberpunk-themed drop.",
    ],
    keywords: [
      "hologram video effect",
      "glitch figure video",
      "cyberpunk projection video",
    ],
    faq: [
      {
        q: "Is my figure still recognizable?",
        a: "Yes — the hologram and glitch are stylized overlays; your figure's shape and colors stay readable.",
      },
    ],
    promptTemplate:
      "The collectible figure appears as a flickering translucent cyber hologram projection, glowing scan lines, subtle glitch flickers and chromatic aberration, neon projection light in a dark space, futuristic sci-fi mood, the figure keeps its recognizable shape and colors.",
    duration: 5,
    aspectRatio: "16:9",
  },
  {
    slug: "melt-and-reform",
    emoji: "🫠",
    name: "Melt & Reform",
    gradient: "linear-gradient(135deg,#c8ff3d,#7fe6b4)",
    category: "comealive",
    audience: "collector",
    tagline: "Your figure melts into liquid, then snaps back — the satisfying loop.",
    h1: "Make a Melt-and-Reform Toy Video From One Photo",
    seoTitle: "Melt & Reform Toy Video Effect From One Photo | Pikbo",
    seoDescription:
      "Turn one toy photo into a satisfying melt-and-reform loop. The figure melts into liquid then reassembles — a scroll-stopping effect for Reels and TikTok.",
    intro:
      "The melt-and-reform loop is one of the most re-watched effects on short video. Pikbo takes a single photo of the figure you own and turns it into a smooth melt into glossy liquid that snaps back into the figure.",
    body: [
      "Because the transformation is generated, the reformed figure can drift from your real sculpt and paint — treat it as a stylized effect, not a product-accurate render.",
      "Works great for glossy vinyl, resin, and blind box figures where the liquid look reads clearly. Export vertical for the loop feeds.",
    ],
    keywords: [
      "melt toy video effect",
      "toy transformation video from photo",
      "satisfying melt reform video",
    ],
    faq: [
      {
        q: "Is the reformed figure exactly my toy?",
        a: "The upload guides shape and color, but a generated transformation can change sculpt and details. Use it as a stylized effect rather than a listing shot.",
      },
      {
        q: "What toy works best?",
        a: "Glossy vinyl and resin read the liquid melt most clearly. A clean, front-facing photo gives the smoothest loop.",
      },
    ],
    promptTemplate:
      "The collectible figure slowly melts into a pool of glossy liquid of its own colors, then the liquid swirls back upward and reforms into the same figure, smooth satisfying transformation loop, clean studio backdrop, soft reflective lighting, the reformed figure keeps its recognizable shape and colors.",
    duration: 5,
    aspectRatio: "9:16",
  },
  {
    slug: "bullet-time-orbit",
    emoji: "🕶️",
    name: "Bullet-Time Orbit",
    gradient: "linear-gradient(135deg,#74e4ff,#a855f7)",
    category: "showcase",
    audience: "collector",
    tagline: "Freeze the moment and orbit the figure — cinematic bullet-time.",
    h1: "Make a Bullet-Time Orbit Toy Video From One Photo",
    seoTitle: "Bullet-Time Orbit Toy Video Effect From One Photo | Pikbo",
    seoDescription:
      "Turn one toy photo into a cinematic bullet-time orbit. The camera freezes the figure and sweeps around it — a dramatic hero shot for your feed.",
    intro:
      "Bullet-time is the freeze-and-orbit move made famous by action films. Pikbo generates it from one photo of your figure: the moment holds while the camera sweeps a dramatic arc around the piece.",
    body: [
      "It is the most cinematic way to present a grail piece without a multi-camera rig or a turntable.",
      "Best on figures with a strong silhouette and pose. The orbit is a stylized camera move; check the result before using it commercially.",
    ],
    keywords: [
      "bullet time toy video",
      "orbit camera toy video from photo",
      "cinematic figure hero shot",
    ],
    faq: [
      {
        q: "Do I need multiple cameras?",
        a: "No. Pikbo generates the orbiting camera move from a single photo — no rig required.",
      },
      {
        q: "Which figures look best?",
        a: "Dynamic poses and strong silhouettes read best as the camera sweeps around them.",
      },
    ],
    promptTemplate:
      "A dramatic bullet-time camera move that freezes the collectible figure mid-moment while the camera sweeps in a smooth arc around it, shallow depth of field, cinematic key lighting, subtle motion trails in the background, the figure stays sharp, centered, and keeps its shape and colors.",
    duration: 5,
    aspectRatio: "16:9",
  },
  {
    slug: "desk-adventure",
    emoji: "🖇️",
    name: "Desk Adventure",
    gradient: "linear-gradient(135deg,#ffd36a,#ff9f6e)",
    category: "comealive",
    audience: "collector",
    tagline: "Your figure comes alive and explores your desk — tiny POV adventure.",
    h1: "Make a Desk Adventure Toy Video From One Photo",
    seoTitle: "Desk Adventure Toy Video Effect From One Photo | Pikbo",
    seoDescription:
      "Turn one toy photo into a playful desk adventure — the figure comes alive and explores a giant everyday world. A charming come-alive clip for socials.",
    intro:
      "What if your figure came alive when you left the room? Pikbo turns one photo into a playful desk adventure — the toy wanders a giant everyday landscape of pens, cups, and keyboards.",
    body: [
      "The tiny-explorer angle is endlessly shareable and gives even a simple figure a story.",
      "The scenery is generated around your figure; the motion is a stylized effect, so review before commercial use.",
    ],
    keywords: [
      "toy comes alive video",
      "tiny toy adventure video from photo",
      "figure desk adventure video",
    ],
    faq: [
      {
        q: "Does it keep my figure?",
        a: "It animates the figure from your photo and builds a scene around it. Generated motion and scenery can vary, so review the clip.",
      },
      {
        q: "Best photo for this?",
        a: "A clear, full-body photo of the figure gives the model enough to animate the little explorer.",
      },
    ],
    promptTemplate:
      "The collectible figure comes to life and takes tiny curious steps across a giant everyday desk landscape of pens, mugs, and a keyboard, warm natural window light, shallow macro depth of field, playful storybook mood, the figure keeps its recognizable shape and colors.",
    duration: 5,
    aspectRatio: "9:16",
  },
  {
    slug: "confetti-drop-reveal",
    emoji: "🎊",
    name: "Confetti Drop Reveal",
    gradient: "linear-gradient(135deg,#ff6ea8,#ffd36a)",
    category: "unboxing",
    audience: "seller",
    tagline: "Restock energy — confetti bursts and reveals the figure for drop day.",
    h1: "Make a Confetti Drop-Day Toy Reveal Video From One Photo",
    seoTitle: "Confetti Toy Reveal Video for Drop Day From One Photo | Pikbo",
    seoDescription:
      "Turn one toy photo into a celebratory confetti reveal for restocks and drop days. A high-energy announcement clip for TikTok Shop and Instagram.",
    intro:
      "Drop days and restocks live and die on energy. Pikbo turns one photo of your figure into a confetti-burst reveal built to announce a launch and stop the scroll.",
    body: [
      "The celebratory beat frames the figure as the moment, perfect for 'back in stock' and 'available now' posts.",
      "Paid clips are cleared for commercial use — keep the reveal honest to the product you're actually selling.",
    ],
    keywords: [
      "toy drop day reveal video",
      "confetti product reveal video from photo",
      "restock announcement video toy",
    ],
    faq: [
      {
        q: "Can I use it to announce a restock?",
        a: "Yes — it's built for drop-day and restock posts. Paid clips are cleared for commercial use.",
      },
      {
        q: "What photo works best?",
        a: "A clean hero shot of the figure on a simple background lets the confetti reveal land cleanly.",
      },
    ],
    promptTemplate:
      "A burst of colorful confetti and soft bokeh lights explodes around the collectible figure as it is revealed on a clean pedestal, celebratory drop-day energy, punchy commercial lighting, the figure stays centered, sharp, and keeps its shape and colors.",
    duration: 5,
    aspectRatio: "9:16",
  },
  {
    slug: "snow-globe-world",
    emoji: "🔮",
    name: "Snow Globe World",
    gradient: "linear-gradient(135deg,#74e4ff,#eafcb0)",
    category: "scene",
    audience: "collector",
    tagline: "Seal your figure inside a magical snow-globe world.",
    h1: "Make a Snow Globe Toy Video From One Photo",
    seoTitle: "Snow Globe Toy Video Effect From One Photo | Pikbo",
    seoDescription:
      "Turn one toy photo into a magical snow-globe world — the figure sealed inside drifting snow and soft glass light. A cozy collectible clip for socials.",
    intro:
      "A snow globe makes any figure feel precious. Pikbo places the toy you own inside a magical glass globe with drifting snow, soft light, and a tiny world around it — all from one photo.",
    body: [
      "The cozy, keepsake mood suits holiday posts, gifts, and shelf features.",
      "The globe and snow are generated around your figure; treat the scene as a stylized effect and review before commercial use.",
    ],
    keywords: [
      "snow globe toy video",
      "figure in snow globe video from photo",
      "cozy collectible video effect",
    ],
    faq: [
      {
        q: "Does my figure stay recognizable?",
        a: "It animates from your photo inside the globe; generated snow and glass can vary, so review the clip.",
      },
      {
        q: "Good for holiday posts?",
        a: "Yes — the snow-globe mood is made for holiday, gift, and keepsake content.",
      },
    ],
    promptTemplate:
      "The collectible figure stands inside a magical glass snow globe with gently drifting snow, a tiny detailed base world around its feet, soft warm light refracting through the glass, cozy keepsake mood, the figure keeps its recognizable shape and colors.",
    duration: 5,
    aspectRatio: "1:1",
  },
];

// Shared objection-handling FAQ appended to every effect page (L2).
// Answers the questions every buyer/collector asks before their first clip.
export const COMMON_FAQ: { q: string; a: string }[] = [
  {
    q: "Is there a watermark?",
    a: "Cached Pikbo Lab prototypes do not process your upload. When Live is enabled for an eligible account, the configured Free path is one 5-second 480p Mini job with a player mark. Protected file delivery remains a separate launch gate.",
  },
  {
    q: "How many live clips are included?",
    a: "Configured allowances are about 1 / 5 / 15 jobs at the current flat 10-credit model when Live is enabled. These are planning estimates, not current availability. Cached Lab references can be replayed without credits and never process your upload.",
  },
  {
    q: "Can I use the videos commercially — for my shop or ads?",
    a: "The planned paid terms include commercial use for reviewed clips made from assets you own. Live billing is closed during validation; cached prototypes are references, not generated customer deliverables.",
  },
  {
    q: "How many photos do I need?",
    a: "Just one. A single clear photo of the toy you own is enough — no multi-angle shoot, no turntable, no rig.",
  },
  {
    q: "How is this different from just filming with my phone?",
    a: "Filming gives you direct control over the real object; Pikbo offers generated motion and scenes from one photo. Outputs can change small sculpt or color details, and configured live renders usually take 30–90 seconds."
  },
];

export function getPreset(slug: string): Preset | undefined {
  return PRESETS.find((p) => p.slug === slug);
}

export function presetsByCategory(id: CategoryId): Preset[] {
  return PRESETS.filter((p) => p.category === id);
}
