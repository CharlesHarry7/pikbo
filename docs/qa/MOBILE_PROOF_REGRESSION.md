# Responsive core-loop regression

Date: 2026-07-28  
Branch: `agent/claude/mobile-proof-regression`  
Target: local Next.js app with public Live closed

## Path exercised

`Home → Inside Project → Use recipe → Create cached path → Library → Seller Starter Pack`

The Home proof cards now open their registered project evidence page. Recipe
reuse remains available from Inside Project and from the secondary Remake
control. Public Create and Seller Pack paths fail closed to cached prototypes.

## Browser matrix

| Viewport | Routes checked | Horizontal overflow | Result |
|---|---|---:|---|
| 390 × 844 | Home, project, Create, Library, Seller Pack | none | pass |
| 768 × 1024 | Home, project, Create, Library, Seller Pack | none | pass |
| 1440 × 1000 | Home, project, Create, Library, Seller Pack | none | pass |

Additional checks:

- Hero play produced one playing video at 390px.
- After entering the video wall, seven videos were visible but only one played.
- Keyboard traversal reached header controls, project evidence, selling-task
  controls and cached Lab sample controls without a nested video focus stop.
- Project pages label the poster as a reference and the output as a cached
  prototype; `Use this recipe` carries the registered effect/source.
- Create displays an accessible H1, `0 credits`, and upload-not-processed copy
  while capability is unknown or cached.
- Library says `Saved on this device` and does not claim cloud sync.
- Seller Pack displays `3 cached prototype previews · 0 credits`; the old
  unconditional `30 live` step label is absent.

## Screenshots

- `docs/qa/mobile-proof-regression/home-390.png`
- `docs/qa/mobile-proof-regression/home-wall-single-video-390.png`
- `docs/qa/mobile-proof-regression/create-cached-390.png`
- `docs/qa/mobile-proof-regression/library-390.png`
- `docs/qa/mobile-proof-regression/seller-pack-390.png`
- `docs/qa/mobile-proof-regression/inside-project-768.png`
- `docs/qa/mobile-proof-regression/home-1440.png`

The source smoke `npm run mobile-proof-regression` locks the project-detail
door, cached-copy failure mode, conditional Seller Pack quote, accessible Create
heading and mobile/desktop autoplay budget.
