# Pikbo visual asset registry — Wave A frontend polish (2026-07-29)

Every first-screen visual, its bound Project/Recipe, status, and originality
boundary. All assets are **original PIKBO Lab key visuals** generated in-house
for this registry, stored locally in the repo (no external image URLs, no
stock, no third-party IP, no real people, no brand logos, no known characters).

## Hero

| Asset | File | Size | Bound to | Status | Notes |
|---|---|---|---|---|---|
| Premiere key visual | `public/demos/hero/hero-key.webp` | 1600×900 · 91 KB | Home hero poster | Original Lab key visual | Group lineup of 4 original art-toy sculpts (sofubi alien, mecha, translucent resin, plush monster) |
| Premiere loop | `public/demos/hero/hero-loop.mp4` | 1280×720 · 3.9 MB · 5 s | Home hero (only eager video) | Original Lab brand film, cached | Camera-only move over a static display; no character animation; generated from the key visual. Not a provider render. |

## Character input stills (Project posters/inputs + Create samples)

Re-art-directed studio product photos of the four existing PIKBO Lab
characters. The cached output videos are **unchanged** (same Lab prototype
renders); the stills are the poster/reference side of each project.

| Asset | File | Size | Projects | Status |
|---|---|---|---|---|
| Orbit still | `public/demos/inputs/orbit.webp` | 900×1200 · 22 KB | orbit-cgi, orbit-dance, orbit-aura | Original Lab key visual (same character, new art direction) |
| Moon still | `public/demos/inputs/moon.webp` | 900×1200 · 22 KB | moon-reveal, moon-glow, moon-smoke | Original Lab key visual |
| Scout still | `public/demos/inputs/scout.webp` | 900×1200 · 30 KB | scout-story, scout-spin, scout-walk | Original Lab key visual |
| Beatbot still | `public/demos/inputs/beatbot.webp` | 900×1200 · 27 KB | beatbot-hook, beatbot-unboxed, beatbot-neon | Original Lab key visual |

## Recipe covers (`/demos/recipes/<slug>.webp`, 900×1200, 17–86 KB each)

One distinct original art-toy subject, scene, composition, and palette per
recipe — machine registry in `lib/recipeArt.ts`. Used by:

- Home recipe wall (`HomeViralWall`) — card **poster** for the 8 home-proof
  recipes; the registered cached clip still plays as the media proof.
- `/effects` concept cards (`VideoTile`) and `PresetPreviewCard` — static
  original art for the 15 concept recipes (no borrowed video loops).
- Seller campaign band (`HomeSellerValueBanner`, `blind-box-unboxing`).

All 27 covers are **editorial illustrations of the recipe**, never presented
as customer results or as a specific project's output. Recipes with cached
footage keep their real project videos; the cover is editorial identity only.

| Recipe slug | Cover subject | Palette |
|---|---|---|
| floating-hero | translucent aqua resin figure | electric blue / charcoal |
| blind-box-unboxing | coral sofubi + cream blind box | hot pink / cream |
| miniature-scene | khaki explorer in cardboard diorama | warm tungsten / kraft |
| paparazzi-flash | chrome-silver figure on red carpet | silver / deep red |
| 360-spin-showcase | gunmetal mecha on turntable | acid lime / gunmetal |
| mystery-box-reveal | pearl-white resin + violet box | ultraviolet / pearl |
| make-figure-dance | magenta plush monster | hot pink / charcoal |
| display-case-glam | jade resin grail in glass case | warm gold / jade |
| collection-shelf-pan | mixed shelf lineup | warm walnut |
| claw-machine-win | cream plush prize + claw | teal / magenta neon |
| make-figure-walk | wind-up tin robot | electric blue |
| toy-wave-hello | butter-yellow vinyl character | amber |
| plushie-comes-alive | shaggy teal plush | teal / warm rim |
| stop-motion-style | clay handcrafted figure | warm clay |
| festive-snow | crimson winter figure | crimson / cool blue / gold |
| neon-city-night | black mecha in wet neon alley | cyan / magenta |
| assemble-reveal | white/gunmetal mecha parts | white / gunmetal |
| kaiju-rampage | emerald sofubi kaiju over mini city | emerald / dusk |
| smoke-burst-entrance | obsidian figure in smoke | black / white backlight |
| paint-splash | white vinyl + paint splash | ultraviolet / acid lime |
| power-aura | sapphire figure + energy aura | sapphire / electric blue |
| hologram-glitch | translucent holographic figure | iridescent RGB |
| melt-and-reform | caramel melting figure | caramel / warm spot |
| bullet-time-orbit | action figure + orbit trail | acid lime / charcoal |
| desk-adventure | micro explorer on giant desk | warm lamp / walnut |
| confetti-drop-reveal | gold-accented figure + confetti | gold / black |
| snow-globe-world | figure inside glass snow globe | cool glass / warm rim |

## Honesty boundaries

- No asset depicts a real person, celebrity face, copyrighted character, or
  brand logo. All sculpts are original generic art-toy designs.
- Generator watermark strip was cropped out of every image during conversion
  (bottom 7% removal, WebP q≤82).
- Concept recipes render static covers only — never another recipe's video.
- The hero loop is an official Lab brand film cached in-repo; it must not be
  described as a live provider render or customer result.
- Legacy `/demos/*-still.webp` files remain in-repo for history but are no
  longer referenced by `lib/demoVideos.ts` or `lib/samples.ts`.
