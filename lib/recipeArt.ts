/**
 * Original recipe cover art (Wave A frontend polish, 2026-07-29).
 *
 * The eight Home recipes use one original Pikbo character family so the wall
 * reads as one visual system. The remaining Recipe index covers keep their
 * broader editorial subjects. All covers illustrate the *recipe*: they are
 * not customer results and never stand in for a project's cached footage.
 *
 * Files live locally at /demos/recipes/<slug>.webp (900×1200, ≤250 KB).
 * Full provenance table: docs/ASSETS.md.
 */

export type RecipeArt = {
  /** Local WebP path under /public */
  src: string;
  /** Accessible description of the cover image */
  alt: string;
  /** Original art-toy subject (registry / art-direction record) */
  subject: string;
  /** Dominant palette note (registry record) */
  palette: string;
};

const ART_DIR = "/demos/recipes";
const HOME_ART_DIR = "/demos/visual-v2/recipes";

function art(slug: string, alt: string, subject: string, palette: string): RecipeArt {
  return { src: `${ART_DIR}/${slug}.webp`, alt, subject, palette };
}

function homeArt(
  slug: string,
  alt: string,
  scene: string
): RecipeArt {
  return {
    src: `${HOME_ART_DIR}/${slug}.webp`,
    alt,
    subject: `matte ivory asymmetric vinyl character · ${scene}`,
    palette: "warm ivory / rain blue / walnut / restrained acid lime",
  };
}

export const RECIPE_ART: Record<string, RecipeArt> = {
  "floating-hero": homeArt(
    "floating-hero",
    "Original matte ivory Pikbo character floating gently above a rainy wooden workbench",
    "quiet floating workbench story"
  ),
  "blind-box-unboxing": homeArt(
    "blind-box-unboxing",
    "The same matte ivory Pikbo character peeking from a kraft blind box by a rain-lit window",
    "kraft blind-box reveal"
  ),
  "miniature-scene": homeArt(
    "miniature-scene",
    "The same matte ivory Pikbo character walking through a handmade rainy paper street",
    "miniature paper street"
  ),
  "paparazzi-flash": homeArt(
    "paparazzi-flash",
    "The same matte ivory Pikbo character caught in one restrained camera flash on a wooden desk",
    "editorial camera-flash moment"
  ),
  "360-spin-showcase": homeArt(
    "360-spin-showcase",
    "The same matte ivory Pikbo character on a simple paper turntable beside the rainy window",
    "paper turntable packshot"
  ),
  "mystery-box-reveal": homeArt(
    "mystery-box-reveal",
    "The same matte ivory Pikbo character opening a small kraft parcel in soft window light",
    "quiet mystery-parcel reveal"
  ),
  "make-figure-dance": homeArt(
    "make-figure-dance",
    "The same matte ivory Pikbo character making a playful step among paper scraps on the workbench",
    "paper-confetti dance"
  ),
  "display-case-glam": homeArt(
    "display-case-glam",
    "The same matte ivory Pikbo character displayed beneath a small glass cloche in warm side light",
    "glass-cloche display"
  ),
  "collection-shelf-pan": art(
    "collection-shelf-pan",
    "Dark wooden shelf lineup of varied sofubi and resin art toys under moody warm gallery spots",
    "mixed shelf lineup",
    "warm walnut / mixed"
  ),
  "claw-machine-win": art(
    "claw-machine-win",
    "Metal claw descending toward a cream plush art toy inside a retro arcade claw machine with teal and magenta neon glow",
    "cream plush prize + claw",
    "teal / magenta neon"
  ),
  "make-figure-walk": art(
    "make-figure-walk",
    "Retro wind-up tin robot art toy mid-stride under electric blue gel light with a long dramatic shadow",
    "wind-up tin robot",
    "electric blue / black"
  ),
  "toy-wave-hello": art(
    "toy-wave-hello",
    "Butter-yellow soft vinyl character waving one arm under warm amber key light",
    "butter-yellow vinyl character",
    "amber / charcoal"
  ),
  "plushie-comes-alive": art(
    "plushie-comes-alive",
    "Shaggy teal plush art toy with embroidered button eyes caught mid-hop under cozy warm rim light",
    "shaggy teal plush",
    "teal / warm rim"
  ),
  "stop-motion-style": art(
    "stop-motion-style",
    "Clay-textured handcrafted art toy on a handmade cardboard set with visible fingerprints, warm practical light",
    "clay handcrafted figure",
    "warm clay / kraft"
  ),
  "festive-snow": art(
    "festive-snow",
    "Crimson winter art toy figure in falling snow with warm golden holiday bokeh against a cool blue night",
    "crimson winter figure",
    "crimson / cool blue / gold"
  ),
  "neon-city-night": art(
    "neon-city-night",
    "Black mecha art toy in a rain-wet neon alley with cyan and magenta reflections and cinematic haze",
    "black mecha",
    "cyan / magenta neon"
  ),
  "assemble-reveal": art(
    "assemble-reveal",
    "White and gunmetal mecha art toy with armor parts suspended mid-assembly and small sparks",
    "white/gunmetal mecha parts",
    "white / gunmetal / sparks"
  ),
  "kaiju-rampage": art(
    "kaiju-rampage",
    "Giant emerald sofubi kaiju towering over a miniature cardboard city at dusk with searchlights and smoke",
    "emerald sofubi kaiju",
    "emerald / dusk amber"
  ),
  "smoke-burst-entrance": art(
    "smoke-burst-entrance",
    "Obsidian-black art toy emerging from swirling theatrical smoke with a glowing backlit silhouette edge",
    "obsidian-black figure",
    "black / white backlight"
  ),
  "paint-splash": art(
    "paint-splash",
    "White vinyl art toy with ultraviolet and acid lime paint splashes frozen mid-air around it",
    "white vinyl figure + paint",
    "ultraviolet / acid lime"
  ),
  "power-aura": art(
    "power-aura",
    "Sapphire-blue art toy surrounded by a glowing electric energy aura with crackling light arcs",
    "sapphire-blue figure",
    "sapphire / electric blue"
  ),
  "hologram-glitch": art(
    "hologram-glitch",
    "Translucent holographic art toy with subtle RGB glitch slices and iridescent refraction",
    "holographic translucent figure",
    "iridescent RGB / black"
  ),
  "melt-and-reform": art(
    "melt-and-reform",
    "Caramel art toy whose lower half melts into glossy drips that pool and reform under a single warm spotlight",
    "caramel melting figure",
    "caramel / warm spot"
  ),
  "bullet-time-orbit": art(
    "bullet-time-orbit",
    "Action art toy in a dramatic pose with a frozen circular camera-orbit light trail and acid lime accents",
    "dynamic action figure",
    "acid lime / charcoal"
  ),
  "desk-adventure": art(
    "desk-adventure",
    "Tiny walnut-brown explorer art toy climbing a giant pencil on a dark desk under warm lamp light, macro shot",
    "walnut-brown micro explorer",
    "warm lamp / walnut"
  ),
  "confetti-drop-reveal": art(
    "confetti-drop-reveal",
    "Gold-accented art toy under falling metallic confetti in a dark luxe spotlight",
    "gold-accented figure",
    "gold / black"
  ),
  "snow-globe-world": art(
    "snow-globe-world",
    "Tiny art toy inside a glass snow globe on a polished walnut base with swirling snow, macro shot",
    "snow-globe miniature figure",
    "cool glass / warm rim"
  ),
};

/** Cover art for a recipe, or null when none is registered. */
export function getRecipeArt(slug: string): RecipeArt | null {
  return RECIPE_ART[slug] ?? null;
}
