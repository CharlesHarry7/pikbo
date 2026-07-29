/**
 * Original recipe cover art (Wave A frontend polish, 2026-07-29).
 *
 * Every recipe owns a distinct editorial cover: a different original art-toy
 * subject, scene, composition, and palette per recipe. These are PIKBO Lab
 * key visuals generated for this registry — they illustrate the *recipe*,
 * they are not customer results and never stand in for a project's cached
 * output footage. Concept recipes (no cached footage) render these covers as
 * static cards instead of borrowing another recipe's video loop.
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

function art(slug: string, alt: string, subject: string, palette: string): RecipeArt {
  return { src: `${ART_DIR}/${slug}.webp`, alt, subject, palette };
}

export const RECIPE_ART: Record<string, RecipeArt> = {
  "floating-hero": art(
    "floating-hero",
    "Translucent aqua resin art toy levitating above a black pedestal with electric blue rim light",
    "translucent aqua resin figure",
    "electric blue / charcoal"
  ),
  "blind-box-unboxing": art(
    "blind-box-unboxing",
    "Matte cream blind box with lid lifting as a coral sofubi figure emerges, on hot pink seamless paper",
    "coral sofubi + cream blind box",
    "hot pink / cream"
  ),
  "miniature-scene": art(
    "miniature-scene",
    "Tiny khaki explorer vinyl toy in a handcrafted miniature cardboard city street with warm window lights",
    "khaki explorer vinyl figure",
    "warm tungsten / kraft"
  ),
  "paparazzi-flash": art(
    "paparazzi-flash",
    "Chrome-silver art toy on a dark red carpet surrounded by paparazzi flash bokeh",
    "chrome-silver figure",
    "silver / deep red / black"
  ),
  "360-spin-showcase": art(
    "360-spin-showcase",
    "Gunmetal mecha model figure on a black turntable with acid lime edge lighting and rotation trail",
    "gunmetal mecha kit",
    "acid lime / gunmetal"
  ),
  "mystery-box-reveal": art(
    "mystery-box-reveal",
    "Glowing violet gift box bursting open with light rays and iridescent confetti, revealing a pearl-white resin figure",
    "pearl-white resin figure + violet box",
    "ultraviolet / pearl"
  ),
  "make-figure-dance": art(
    "make-figure-dance",
    "Magenta plush art toy monster mid-bounce with confetti frozen in the air under hot pink gel light",
    "magenta plush monster",
    "hot pink / charcoal"
  ),
  "display-case-glam": art(
    "display-case-glam",
    "Jade-green resin grail art toy inside a lit glass museum display case with warm golden spotlights",
    "jade resin grail",
    "warm gold / jade"
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
