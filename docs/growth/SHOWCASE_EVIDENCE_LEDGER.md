# Public showcase evidence ledger

Status: canonical audit record
Reviewed: 2026-07-27
Scope: the 12 rows currently registered through `lib/demoVideos.ts` and
`lib/showcaseProjects.ts`

This document records evidence; it does not change production rendering. Until
the product registry is updated by its engineering owner, public labels and
scores must be checked against this ledger.

## Required schema

Canonical implementation: `lib/showcaseEvidence.ts`. This document mirrors
that type; code and build validation win if prose ever drifts.

```ts
type ShowcaseEvidence = {
  schemaVersion: 1;
  rights: {
    basis: "owned" | "licensed";
    rightsRecordId: string;
    holder: string;
  };
  source: {
    sourceRecordId: string;
    inputAssetId: string;
    inputAssetPath: string;
    inputSha256: string;
    distinctFromOutputPoster: true;
  };
  provider: {
    name: string;
    taskId: string;
    requestId: string;
    model: string;
    parameters: Record<string, JSONValue>;
  };
  output: {
    outputAssetId: string;
    videoPath: string;
    posterPath: string;
    outputSha256: string;
  };
  review: {
    reviewer: { id: string; displayName: string };
    reviewedAt: string; // ISO 8601 with timezone
    scores: {
      identity: number;
      motion: number;
      artifacts: number;
      composition: number;
      commercialUse: number;
    };
    notes?: string;
  };
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

Promotion is fail-closed. `official_verified`, `live_generated`, and legacy
`official`/`live` values all invoke `assertShowcasePromotionGate`; a missing or
invalid field throws during registry import and therefore fails the production
build. Cached prototypes and concepts may not expose legacy `qualityScores` or
`reviewerNotes` fields.

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
- Before R4, `lib/showcaseProjects.ts` supplied descriptive model labels and
  static provisional 4/5 scores. R4 removed those unsupported scores.
- git history shows the first six prototype assets and a later six-file
  Seedance Mini batch.
- `docs/evidence/G6_LAUNCH_LOG.md` contains two live generation request IDs for
  a Scout spin and Moon unbox test. Those IDs do not establish that the
  registered cached output files are the outputs of those requests, and they
  are Pikbo request IDs rather than recorded provider task IDs.

Result: **0 official, 12 prototype, 0 rejected** as of this audit.

## Runtime alignment

R4 now aligns the product with this ledger:

1. all 12 rows use `provenance: "cached_prototype"`;
2. numeric scores and reviewer notes are absent until evidence is complete;
3. the poster field is `referencePoster`, not a claimed provider input;
4. the homepage may retain eight distinct cached clips for preview, each
   explicitly labeled as a PIKBO Lab cached prototype;
5. recipes without their own cached media remain static Concept Recipe art;
6. promotion to a verified case still requires the complete evidence record
   and named reviewer defined above.

`npm run showcase-evidence-smoke` prevents unsupported scores, verified-case
labels, reused homepage media, and live-entitlement UI drift from returning.
`npm run showcase-promotion-gate` executes one complete official fixture plus
invalid rights, source, provider, parameter, output, reviewer, timestamp, and
score fixtures.
