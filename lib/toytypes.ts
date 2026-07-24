// A THIRD programmatic page type: toy-type / subject pages at /toys/[slug].
// This is the "subject" keyword axis — people search by what they OWN
// ("action figure video", "plush video", "anime figure video"). Each page
// cross-links to the effects that suit that toy type.
//
// Site keyword mesh is now: Effects × Use-cases × Toy-types.

import type { Audience } from "./presets";

export type ToyType = {
  slug: string;
  emoji: string;
  label: string;
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

export const TOY_TYPES: ToyType[] = [
  {
    slug: "action-figures",
    emoji: "🦸",
    label: "Action figures",
    audience: "collector",
    h1: "Action Figure Video Maker",
    seoTitle: "Action Figure Video Maker — Animate Your Figures | Pikbo",
    seoDescription:
      "Make your action figures walk, dance, and pose. Upload one photo and animate the figure you own — no rig, no stop-motion setup.",
    intro:
      "Action figures are made to move. Pikbo animates the figure you own from a single photo — a confident walk, a dance, or a cinematic scene — without a stop-motion rig.",
    body: [
      "Unlike 'turn yourself into an action figure' filters, Pikbo animates your actual figure, keeping its real sculpt, paint, and details.",
      "Great for articulated figures, mecha, and character collectibles you want to bring to life for your feed.",
    ],
    keywords: [
      "action figure video maker",
      "animate action figure",
      "make action figure move video",
    ],
    // Primary must be proof-backed for sitemap index (哥飞: no thin index)
    recommendedEffects: [
      "make-figure-walk",
      "make-figure-dance",
      "360-spin-showcase",
    ],
    faq: [
      {
        q: "Does it animate my figure or generate a new one?",
        a: "It uses the figure in your photo as the visual reference rather than starting from a generic character. Generated motion can still change sculpt, color, or small details, so review the result.",
      },
    ],
  },
  {
    slug: "plush-toys",
    emoji: "🧸",
    label: "Plush toys",
    audience: "collector",
    h1: "Plush & Plushie Video Maker",
    seoTitle: "Plush & Plushie Video Maker | Pikbo",
    seoDescription:
      "Bring your plush toys and stuffed animals to life. Squishy, bouncy come-alive videos from one photo — made for the plushie community.",
    intro:
      "Plush toys have endless personality. Pikbo uses one photo to create squishy, bouncy motion; fabric, shape, and small details can vary.",
    body: [
      "Built for stuffed animals, beanies, and soft collectibles — the huggable motion suits plush better than any generic filter.",
      "Perfect for gifts, keepsakes, and 'meet my plushie' posts.",
    ],
    keywords: [
      "plush video maker",
      "plushie animation",
      "stuffed animal video",
    ],
    recommendedEffects: [
      "floating-hero",
      "make-figure-dance",
      "360-spin-showcase",
    ],
    faq: [
      {
        q: "Will it preserve every plush detail?",
        a: "The upload guides shape and colors, but generated fabric and small details can vary. Review the result before publishing.",
      },
    ],
  },
  {
    slug: "art-toys",
    emoji: "🎨",
    label: "Art toys",
    audience: "seller",
    h1: "Art Toy & Designer Toy Video Maker",
    seoTitle: "Art Toy & Designer Toy Video Maker | Pikbo",
    seoDescription:
      "Give your art toys and designer vinyl the premium video they deserve. Spins, glam lighting, and stop-motion from one photo.",
    intro:
      "Art toys deserve a premium presentation. Pikbo turns one photo of your designer vinyl, resin, or sofubi into a clean spin, glam lighting, or handcrafted stop-motion clip.",
    body: [
      "Ideal for indie makers and resellers who want a consistent, high-end look across a drop.",
      "The stop-motion and glam effects suit the collectible, gallery-piece feel of art toys.",
    ],
    keywords: [
      "art toy video",
      "designer toy video maker",
      "vinyl toy video",
    ],
    recommendedEffects: ["360-spin-showcase", "display-case-glam", "stop-motion-style"],
    faq: [
      {
        q: "Does it work with resin and sofubi?",
        a: "Yes — any art toy photographed clearly works. Glossy resin especially shines with the glam lighting effect.",
      },
    ],
  },
  {
    slug: "anime-figures",
    emoji: "⛩️",
    label: "Anime figures",
    audience: "collector",
    h1: "Anime Figure Video Maker",
    seoTitle: "Anime Figure Video Maker | Pikbo",
    seoDescription:
      "Show off your anime figures with cinematic video. Floating hero shots, glam lighting, and mini scenes from a single photo.",
    intro:
      "Your anime figures deserve more than a shelf photo. Pikbo turns one shot into a floating hero, glam-lit showcase, or tiny cinematic scene that does the sculpt justice.",
    body: [
      "Built for scale figures, prize figures, and garage kits where the detail and pose are the star.",
      "A cinematic clip makes a grail piece feel special and gets your collection noticed.",
    ],
    keywords: [
      "anime figure video",
      "scale figure video maker",
      "figure showcase video",
    ],
    recommendedEffects: ["display-case-glam", "floating-hero", "miniature-scene"],
    faq: [
      {
        q: "Is it good for detailed scale figures?",
        a: "Yes — the showcase effects keep your figure sharp while adding cinematic lighting and motion around it.",
      },
    ],
  },
  {
    slug: "vinyl-figures",
    emoji: "🧊",
    label: "Vinyl figures",
    audience: "collector",
    h1: "Vinyl Figure Video Maker",
    seoTitle: "Vinyl Figure Video Maker | Pikbo",
    seoDescription:
      "Bring your vinyl figures to life. Spin, dance, and glam videos that show off the glossy finish — from a single photo.",
    intro:
      "Vinyl figures have that clean, glossy look that loves the camera. Pikbo turns one photo into a spin, dance, or glam-lit clip that shows your vinyl at its best.",
    body: [
      "Perfect for stylized designer vinyl and character collectibles where the finish and pose are the appeal.",
      "Animate the figure you own from its photo reference. Generated colors and sculpt details can vary, so review each clip.",
    ],
    keywords: [
      "vinyl figure video",
      "vinyl toy animation",
      "designer vinyl video maker",
    ],
    recommendedEffects: ["360-spin-showcase", "make-figure-dance", "display-case-glam"],
    faq: [
      {
        q: "Does the glossy finish come through?",
        a: "Yes — the glam and spin effects add lighting that plays up the reflective vinyl finish.",
      },
    ],
  },
  {
    slug: "resin-sofubi",
    emoji: "🫗",
    label: "Resin & sofubi",
    audience: "seller",
    h1: "Resin & Sofubi Figure Video Maker",
    seoTitle: "Resin & Sofubi Figure Video Maker | Pikbo",
    seoDescription:
      "Give your resin art toys, sofubi, and garage kits a premium video. Glam lighting, stop-motion, and mini scenes from one photo.",
    intro:
      "Resin and sofubi have a handmade, collectible soul. Pikbo turns one photo of your garage kit or soft-vinyl art toy into a glam-lit, stop-motion, or cinematic-scene clip worthy of the craft.",
    body: [
      "Ideal for indie sculptors and small-run drops where each piece is special.",
      "The stop-motion look especially suits the tactile, handmade feel of resin and sofubi.",
    ],
    keywords: [
      "sofubi video",
      "resin figure video",
      "garage kit video maker",
    ],
    recommendedEffects: ["display-case-glam", "stop-motion-style", "miniature-scene"],
    faq: [
      {
        q: "Good for one-off custom pieces?",
        a: "Yes — a single photo of a custom resin or sofubi piece is all you need for a premium clip.",
      },
    ],
  },
  {
    slug: "model-kits",
    emoji: "🤖",
    label: "Model kits",
    audience: "collector",
    h1: "Gunpla & Model Kit Video Maker",
    seoTitle: "Gunpla & Model Kit Video Maker | Pikbo",
    seoDescription:
      "Show off your finished builds. Turn one photo of your model kit into a dynamic walk, neon scene, or spin video — no rig required.",
    intro:
      "You spent hours on that build — give it a video to match. Pikbo turns one photo of your finished model kit into a dynamic walk, neon cityscape, or clean spin that does the work justice.",
    body: [
      "Made for builders showing off completed kits, mecha, and dioramas.",
      "Pair a walk or neon scene with your build reveal to make the post pop.",
    ],
    keywords: [
      "gunpla video",
      "model kit video maker",
      "mecha figure video",
    ],
    recommendedEffects: ["assemble-reveal", "make-figure-walk", "neon-city-night"],
    faq: [
      {
        q: "Does it work with custom paint jobs?",
        a: "Your photo guides the paint, decals, and weathering, but generated motion can change fine details. Compare the output with the real build before publishing.",
      },
    ],
  },
  {
    slug: "blind-box-figures",
    emoji: "📦",
    label: "Blind box figures",
    audience: "collector",
    h1: "Blind Box Video Maker",
    seoTitle: "Blind Box Video Maker — Animate Your Figure From a Photo | Pikbo",
    seoDescription:
      "Turn one photo of your blind box figure into a reveal or dance clip built for Reels and TikTok. Animate the figure you already own — no rig.",
    intro:
      "Blind box figures are made to be shown off. Pikbo animates the one you pulled from a single photo — a reveal, a wiggle, a shelf pan — the exact figure you own.",
    body: [
      "The unboxing reveal is the loop collectors share. Start from a clean photo of the figure and let Pikbo add the motion instead of setting up a camera rig.",
      "Works for the whole series shelf: keep each figure's real sculpt and colors, then post the reveal that fits your feed.",
    ],
    keywords: [
      "blind box video maker",
      "animate blind box figure",
      "blind box reveal video from photo",
    ],
    recommendedEffects: ["blind-box-unboxing", "mystery-box-reveal", "make-figure-dance"],
    faq: [
      {
        q: "Do I need the original packaging?",
        a: "No — just a photo of the figure itself. A clean, well-lit background gives the best motion.",
      },
    ],
  },
  {
    slug: "diorama-scenes",
    emoji: "🏙️",
    label: "Diorama scenes",
    audience: "collector",
    h1: "Diorama Video Maker",
    seoTitle: "Diorama Video Maker — Bring Your Scene to Life | Pikbo",
    seoDescription:
      "Add camera motion and life to your diorama from one photo. A slow pan, a floating hero, or a cinematic reveal of the scene you built.",
    intro:
      "A diorama is a whole world in a box. Pikbo adds cinematic camera motion to the scene you built from a single photo — no motorized slider needed.",
    body: [
      "A slow pan across the set makes a static diorama feel alive and gives your build the presentation it deserves.",
      "Keep every hand-placed detail intact while the shot moves — great for build-reveal posts and portfolio clips.",
    ],
    keywords: [
      "diorama video maker",
      "animate diorama scene",
      "diorama camera pan video",
    ],
    recommendedEffects: ["miniature-scene", "collection-shelf-pan", "neon-city-night"],
    faq: [
      {
        q: "Will it change my build?",
        a: "No — it moves the camera and adds motion around the scene you photographed; your build stays as-is.",
      },
    ],
  },
  {
    slug: "tabletop-miniatures",
    emoji: "🎲",
    label: "Tabletop miniatures",
    audience: "collector",
    h1: "Tabletop Miniature Video Maker",
    seoTitle: "Miniature Video Maker — Animate Your Painted Minis | Pikbo",
    seoDescription:
      "Show off your painted miniatures with a cinematic spin or charge from a single photo. Keep every brushstroke — animate the mini you painted.",
    intro:
      "Hours of painting deserve more than a static shelf shot. Pikbo animates your painted miniature from one photo — a hero spin, a charge, a dramatic reveal.",
    body: [
      "A 360° turn is the cleanest way to show a paint job from every angle without a lightbox rig.",
      "Keeps your basing, highlights, and freehand intact while the shot moves — perfect for painting-showcase posts.",
    ],
    keywords: [
      "miniature video maker",
      "animate painted miniature",
      "tabletop mini spin video",
    ],
    recommendedEffects: ["360-spin-showcase", "make-figure-walk", "power-aura"],
    faq: [
      {
        q: "Does it keep my paint job?",
        a: "Yes — it animates the mini in your photo, preserving your colors, highlights, and basing.",
      },
    ],
  },
  {
    slug: "garage-kits",
    emoji: "🧴",
    label: "Garage kits",
    audience: "collector",
    h1: "Garage Kit Video Maker",
    seoTitle: "Garage Kit Video Maker — Animate Your Finished Kit | Pikbo",
    seoDescription:
      "Turn your finished garage kit into a cinematic clip from one photo. A hero float, a spin, or a scene — keep your sculpt and paint intact.",
    intro:
      "A finished garage kit is a showpiece. Pikbo animates the kit you built and painted from a single photo — a float, a spin, or a moody scene.",
    body: [
      "Show the sculpt from every angle with a smooth turntable spin, no rig required.",
      "Your paint, gradients, and topcoat stay exactly as photographed while the shot comes alive.",
    ],
    keywords: [
      "garage kit video maker",
      "animate garage kit",
      "resin kit showcase video",
    ],
    recommendedEffects: ["floating-hero", "360-spin-showcase", "display-case-glam"],
    faq: [
      {
        q: "Best photo for a glossy kit?",
        a: "Soft, even light with minimal glare works best so the motion reads cleanly.",
      },
    ],
  },
  {
    slug: "desk-toys",
    emoji: "🖥️",
    label: "Desk toys",
    audience: "seller",
    h1: "Desk Toy Video Maker",
    seoTitle: "Desk Toy Video Maker — Product Videos From One Photo | Pikbo",
    seoDescription:
      "Make scroll-stopping desk toy and fidget product videos from a single photo. A clean spin or float for listings and social — no studio.",
    intro:
      "Desk toys sell on motion. Pikbo turns one product photo into a clean spin or float that shows the piece off for a listing or a social post.",
    body: [
      "A packshot spin gives marketplace buyers the 360° look they want without a photo studio.",
      "Great for small shops testing which fidget or desk piece deserves the ad spend.",
    ],
    keywords: [
      "desk toy video maker",
      "fidget toy product video",
      "desk toy spin video from photo",
    ],
    recommendedEffects: ["360-spin-showcase", "floating-hero", "display-case-glam"],
    faq: [
      {
        q: "Can I use these for product listings?",
        a: "Paid clips are cleared for commercial use; keep them honest to the product you're selling.",
      },
    ],
  },
  {
    slug: "ball-jointed-dolls",
    emoji: "🎎",
    label: "Ball-jointed dolls",
    audience: "collector",
    h1: "Doll Video Maker",
    seoTitle: "Doll Video Maker — Animate Your BJD From a Photo | Pikbo",
    seoDescription:
      "Bring your ball-jointed doll to life from one photo — a gentle wave, a turn, or a soft studio glow. Keep the faceup and outfit you styled.",
    intro:
      "A styled doll is a character. Pikbo animates the ball-jointed doll you own from a single photo — a soft turn, a wave, or a studio glow.",
    body: [
      "Keeps your faceup, wig, and outfit exactly as photographed while adding subtle, natural motion.",
      "Great for sharing a new look without a full photoshoot setup.",
    ],
    keywords: [
      "doll video maker",
      "animate bjd doll",
      "ball jointed doll video from photo",
    ],
    recommendedEffects: ["toy-wave-hello", "display-case-glam", "floating-hero"],
    faq: [
      {
        q: "Will it change the faceup?",
        a: "No — it animates the doll in your photo and preserves your faceup, wig, and styling.",
      },
    ],
  },
  {
    slug: "capsule-toys",
    emoji: "🥚",
    label: "Capsule toys",
    audience: "seller",
    h1: "Capsule Toy Video Maker",
    seoTitle: "Capsule Toy Video Maker — Animate Your Mini From a Photo | Pikbo",
    seoDescription:
      "Turn a capsule toy photo into a fun reveal or dance clip for social and listings. Animate the tiny figure you own — no rig, no stop-motion.",
    intro:
      "Capsule toys are small but full of character. Pikbo animates the little figure from a single photo — a reveal, a wiggle, a spin — the one you actually got.",
    body: [
      "The pop-open reveal is made for short vertical video; start from a clean photo and let Pikbo add the motion.",
      "Handy for shops showing a series so buyers can see each mini move before they commit.",
    ],
    keywords: [
      "capsule toy video maker",
      "animate capsule toy",
      "mini figure reveal video from photo",
    ],
    recommendedEffects: ["mystery-box-reveal", "make-figure-dance", "360-spin-showcase"],
    faq: [
      {
        q: "Do tiny figures work?",
        a: "Yes — a close, clean photo of the figure gives the model enough detail to animate it well.",
      },
    ],
  },
];

export function getToyType(slug: string): ToyType | undefined {
  return TOY_TYPES.find((t) => t.slug === slug);
}
