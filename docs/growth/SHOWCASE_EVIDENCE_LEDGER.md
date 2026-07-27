# Public showcase evidence ledger

Status: canonical audit record
Reviewed: 2026-07-27
Scope: the 12 rows currently registered through `lib/demoVideos.ts` and
`lib/showcaseProjects.ts`

This document records evidence; it does not change production rendering. Until
the product registry is updated by its engineering owner, public labels and
scores must be checked against this ledger.

## Required schema

```ts
type ShowcaseEvidence = {
  projectSlug: string;
  recipeSlug: string;
  inputAsset: {
    path: string;
    ownedOrLicensed: boolean;
    rightsRecord: string;
    distinctFromOutputPoster: boolean;
  };
  provider: string;
  providerTaskId: string;
  model: string;
  parameters: Record<string, string | number | boolean>;
  outputAsset: {
    videoPath: string;
    posterPath: string;
    verifiedReadableAt: string;
  };
  reviewer: string;
  reviewedAt: string;
  scores: {
    identity: number;
    motion: number;
    artifacts: number;
    composition: number;
    commercialUse: number;
  };
  status: "official" | "prototype" | "rejected";
  notes: string;
};
```

## Qualification rules

An `official` example requires all fields above:

1. owned/licensed input image with a rights record;
2. input asset distinct from the output poster;
3. provider task ID;
4. exact provider, model and material parameters;
5. readable output video and poster;
6. named internal reviewer and review date;
7. all five numeric scores at least 4/5;
8. any score below 3 rejects the example.

If any required evidence is missing, the row is `prototype` and **has no
numeric quality score**. A model label or an existing video file alone is not
provider provenance.

## Audit of current 12 registered examples

Legend: `—` means no evidence was found in the repository. All score cells are
intentionally blank because no row currently has the complete proof chain.

| Project | Recipe | Registered input/poster | Output | Model evidence | Provider task ID | Named reviewer | Scores | Audit status |
|---|---|---|---|---|---|---|---|---|
| `orbit-cgi` | `floating-hero` | `/demos/orbit-still.webp` (same poster; no rights record) | `/demos/orbit-hyper-cgi.mp4` | “PIKBO Lab prototype render” only | — | — | — | prototype |
| `moon-reveal` | `blind-box-unboxing` | `/demos/moon-float.webp` (same poster; no rights record) | `/demos/moon-box-reveal.mp4` | “PIKBO Lab prototype render” only | — | — | — | prototype |
| `scout-story` | `miniature-scene` | `/demos/scout-still.webp` (same poster; no rights record) | `/demos/scout-story-mode.mp4` | “PIKBO Lab prototype render” only | — | — | — | prototype |
| `beatbot-hook` | `paparazzi-flash` | `/demos/beatbot-still.webp` (same poster; no rights record) | `/demos/beatbot-viral-hook.mp4` | “PIKBO Lab prototype render” only | — | — | — | prototype |
| `scout-spin` | `360-spin-showcase` | `/demos/scout-still.webp` (same poster; no rights record) | `/demos/scout-packshot-spin.mp4` | “PIKBO Lab prototype render” only | — | — | — | prototype |
| `beatbot-unboxed` | `mystery-box-reveal` | `/demos/beatbot-still.webp` (same poster; no rights record) | `/demos/beatbot-unboxed.mp4` | “PIKBO Lab prototype render” only | — | — | — | prototype |
| `orbit-dance` | `make-figure-dance` | `/demos/orbit-still.webp` (same poster; no rights record) | `/demos/orbit-dance.mp4` | Seedance Mini via fal.ai claimed in registry | — | — | — | prototype |
| `moon-glow` | `display-case-glam` | `/demos/moon-float.webp` (same poster; no rights record) | `/demos/moon-glow.mp4` | Seedance Mini via fal.ai claimed in registry | — | — | — | prototype |
| `scout-walk` | `make-figure-walk` | `/demos/scout-still.webp` (same poster; no rights record) | `/demos/scout-walk.mp4` | Seedance Mini via fal.ai claimed in registry | — | — | — | prototype |
| `beatbot-neon` | `neon-city-night` | `/demos/beatbot-still.webp` (same poster; no rights record) | `/demos/beatbot-neon.mp4` | Seedance Mini via fal.ai claimed in registry | — | — | — | prototype |
| `orbit-aura` | `power-aura` | `/demos/orbit-still.webp` (same poster; no rights record) | `/demos/orbit-aura.mp4` | Seedance Mini via fal.ai claimed in registry | — | — | — | prototype |
| `moon-smoke` | `smoke-burst-entrance` | `/demos/moon-float.webp` (same poster; no rights record) | `/demos/moon-smoke.mp4` | Seedance Mini via fal.ai claimed in registry | — | — | — | prototype |

### Repository evidence checked

- `lib/demoVideos.ts` supplies media paths and dates.
- `lib/showcaseProjects.ts` supplies descriptive model labels and static
  provisional 4/5 scores.
- git history shows the first six prototype assets and a later six-file
  Seedance Mini batch.
- `docs/evidence/G6_LAUNCH_LOG.md` contains two live generation request IDs for
  a Scout spin and Moon unbox test. Those IDs do not establish that the
  registered cached output files are the outputs of those requests, and they
  are Pikbo request IDs rather than recorded provider task IDs.

Result: **0 official, 12 prototype, 0 rejected** as of this audit.

## Engineering follow-up

The current runtime registry still assigns all 12 rows
`provenance: "official_cached"` and static provisional 4/5 scores. The owning
engineering task must:

1. remove numeric scores from all 12 rows until evidence is complete;
2. render prototype rows as static Recipe art with no autoplay;
3. prevent prototype rows from satisfying the homepage Official-proof gate;
4. add evidence fields or generate the runtime registry from a validated
   evidence source;
5. promote rows individually only after an internal reviewer signs the complete
   record.

This audit deliberately does not modify business/UI code.
