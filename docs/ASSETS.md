# Pikbo visual asset registry — Wave A visual v2 (2026-07-29)

This registry covers the second-round Home visual system. The selected family
was created for Pikbo with the built-in image generator, then converted locally
to WebP. It contains no downloaded social image, stock image, real person,
third-party logo, or known toy character.

## Selected direction

Direction A, “rainy creator workbench”, won the documented six-dimension review
in `docs/proof/wave-a-visual-v2/candidates/candidate-review.md`. The protagonist
is a matte warm-ivory vinyl pebble/fin silhouette with tiny dot eyes, a diagonal
brow, and one acid-lime wrist tag. Those fixed traits distinguish the family
without borrowing ears, teeth, face proportions, clothing, or accessories from
Labubu, Hirono, DIMOO, or another existing IP.

The previous four-character black-studio Hero remains in repository history but
is no longer referenced by Home. Its 3.9 MB loop is not an initial-page request.

## Home Hero and proof rail

| File | Dimensions | Bytes | SHA-256 | UI truth |
|---|---:|---:|---|---|
| `public/demos/visual-v2/hero-desktop.webp` | 1600×900 | 65,608 | `04bf41dbc2fe9776722e8810affaa7a27df8f89d451a5ccef93d55bd6ea92195` | Original editorial scene |
| `public/demos/visual-v2/hero-mobile.webp` | 720×900 | 34,326 | `e150af741cbfffbeef26f1b9b9958a198905dcc68a15415aa9c8521ad112daa6` | Mobile crop of the selected editorial output |
| `public/demos/visual-v2/hero-loop.mp4` | 1280×720 · 5 s | 183,575 | `55be17922915961bb0f34832f50f744616afad096ddaf3bffe234c7777537dcf` | Muted camera push over the original scene; cached editorial motion, not provider output |
| `public/demos/visual-v2/hero-input.webp` | 720×900 | 8,676 | `31d25dea7a4f5060024403541b99ba5b71353fc1d5404e81fcb241f31ef67030` | Original editorial input |
| `public/demos/visual-v2/hero-set.webp` | 720×900 | 45,744 | `200b4aca3b5cc4a81a1f3b3e8d87d95e720a60fadf986dd2aed9539901dab1bf` | Editorial process view |
| `public/demos/visual-v2/hero-output.webp` | 720×900 | 34,326 | `e150af741cbfffbeef26f1b9b9958a198905dcc68a15415aa9c8521ad112daa6` | Cached editorial preview; not provider evidence |

The Home CTA is a generic Create entry. These assets are not registered Recipe
or provider output evidence and must never emit `recipe_use`.

The loop was derived locally from `hero-desktop.webp` with ffmpeg 6.0 (H.264,
30 fps, CRF 27, fast-start). Desktop may autoplay it; mobile is poster-only
until explicit Play. Reduced-motion always prevents autoplay.

## Unified Home Recipe covers

All eight files are 720×900 WebP editorial covers. They keep the same character,
matte vinyl material, rain-blue/walnut/ivory palette, and restrained lime tag.
The story variable changes per card. A card links separately to its registered
Project poster/video; the editorial cover never poses as a cached video frame.

| Recipe | Bytes | SHA-256 |
|---|---:|---|
| `floating-hero` | 19,884 | `fc07ff51c441cc22524f660e0f8c817ab2d94df3dff67a91bf5af52ea485800b` |
| `blind-box-unboxing` | 31,626 | `eeba34e37f0f3b3bd41848211c1dcf7214204e5178d82c4d9f4413fdf4e05ae0` |
| `miniature-scene` | 33,550 | `8aa358017591012c6cb4d5c6b5e6381a22c213e60b08b4282b4e58ccf0ed9bba` |
| `paparazzi-flash` | 12,336 | `6dcd88b9de0659f7501de1b35796befe03e231ef1ff633f60ea36568b1de25db` |
| `360-spin-showcase` | 14,334 | `41213965f500ff0e554c50192421ed48fc1265e11b544c76f8075cc437926c35` |
| `mystery-box-reveal` | 23,998 | `9cb86873fbe16837561d24aeea658baeb9df7235a4b388de526c55c10ba83dcf` |
| `make-figure-dance` | 24,132 | `18ce1fe7158b97161170f8c5d845f5066aa37c80233e29ddd7d006850903a4ff` |
| `display-case-glam` | 26,864 | `08ac2970d671007b61a4c1800942744bc2bce5a21b44723cb84c5db7eca207fd` |

The broader Recipe index retains its other original editorial covers under
`public/demos/recipes/`; concept covers remain static.

## Rejected candidates retained as evidence

| File | Dimensions | Bytes | SHA-256 |
|---|---:|---:|---|
| `direction-a-rain-workbench.webp` | 1600×900 | 65,608 | `04bf41dbc2fe9776722e8810affaa7a27df8f89d451a5ccef93d55bd6ea92195` |
| `direction-b-morning-room.webp` | 1600×900 | 42,064 | `e894e53609b643428c41fbd0274501e725ce7c06b241091bbbd18b5e9b38683d` |
| `direction-c-paper-studio.webp` | 1600×900 | 24,690 | `1618da3cd9f0315bb396ca6b542c0e917c20c8237cd917f742e020af7c031063` |
| `contact-sheet.webp` | 1720×399 | 38,504 | `1599485e5c8aebadaa4333d5586a999047a5d00e5b0ea54b05801600affb8c7c` |

## Prompt and originality record

The shared generation brief specified: a single original matte warm-ivory
vinyl protagonist; asymmetrical pebble/fin silhouette; tiny dot eyes; one
diagonal brow; one acid-lime wrist tag; real materials; no text, logos,
watermarks, people, existing IP, extra character, neon collage, or look-alike
features. Direction A added a rainy window, a creator's worn wood workbench,
warm task light against cool rain light, and negative space for product copy.

No generator watermark was present in the final exports. Conversion changed
format and dimensions only. Original PNG working files stay outside Git and are
not production dependencies.

## Truth and compatibility boundaries

- `lib/demoVideos.ts` and `lib/samples.ts` continue to use the legacy registered
  Orbit/Moon/Scout/Beatbot stills that accompany their cached project videos.
  The K3 re-shoots under `public/demos/inputs/` are not substituted for them.
- “Editorial Recipe art”, “editorial input/process”, “cached prototype”, and
  provider-backed evidence are separate UI states.
- The v2 Home does not call a provider, charge credits, imply a customer result,
  or promise cloud persistence.
- Added imagery does not change `CapabilityState`, `RemixIntent`, the Showcase
  registry, HTTP APIs, pricing, credits, or persistence.
