# Higgsfield public-surface review → Pikbo Wave A

**Reviewed:** 2026-07-29 (Asia/Shanghai)

**Pikbo baseline:** `50db8e31f9b86b1d59f52a85a090e75a982a2c51`

**Scope:** Home → Explore → Project → Recipe → Create → Library

**Audience:** independent designer-toy creators, small brands, and sellers

## Decision

Pikbo will adopt the target's useful public product mechanics without copying
its brand, marketing campaign, model catalog, customer identities, text, or
media. The outcome is a designer-toy creation loop, not a general creative
model marketplace.

The target homepage observed on 2026-07-29 emphasizes:

- a compact, horizontally dense product navigation;
- a first-screen feature rail and product/capability cards;
- a large promotional/value panel followed by smaller workflow entries;
- separate preset discovery and inspectable project discovery;
- many media-backed surfaces with clear next actions;
- a saved-assets destination that closes the return loop.

Public-source cross-checks:

- [Higgsfield public homepage](https://higgsfield.ai/) currently leads with a
  dense product shell and an “Explore the inside of every project” discovery
  surface. Pikbo adopts the inspectable-project mechanic, not the wording,
  brand, people, campaigns, or media.
- [Higgsfield Community](https://higgsfield.ai/community) separates shared
  projects from shared generations. Pikbo instead exposes only its registered
  cached Lab prototypes because it has no verified public UGC dataset.
- [Higgsfield Academy: project tools](https://higgsfield.ai/academy/courses/cinema-studio-complete-tour/project-tools-and-sidebar)
  documents project-local assets, brief, elements, and creation tools. Pikbo's
  smaller Wave A equivalent is the Project evidence record plus Recipe reuse.
- [Higgsfield Canvas](https://higgsfield.ai/canvas-intro) describes a connected
  workflow with assets and generated outputs in one workspace. Pikbo does not
  claim collaboration, cloud persistence, or a multi-model canvas; Library
  remains local to the current device.

Pikbo should reproduce the hierarchy and interaction grammar only. Any visible
door must either work or carry an explicit validation/preview/coming-soon
state.

## Baseline findings

### Already strong

- A cinematic, toy-first homepage with one clear Create action.
- Eight distinct registered homepage demos with a one-mobile/two-desktop
  autoplay budget.
- Separate Home card links for project inspection and Recipe reuse.
- Twelve registered Lab projects, category filters, direct project routes, and
  validated RemixIntent links.
- Cached, concept, and evidence-pending copy that does not claim customer UGC.
- A Create workflow that already owns generation, quote, reservation, retry,
  refund, and fail-closed behavior.
- A device-local Library with explicit local/session storage disclosure.
- Strong source and rendered-route regression gates.

### Wave A gaps

| Surface | Baseline gap | Wave A response |
|---|---|---|
| Shared shell | State is implied by scattered `live`, `Preview`, and copy strings | Add one internal capability-state registry and derive Home/shell badges from it |
| Mobile shell | Create is text-colored but not the visual center action | Give Create a raised, unmistakable center treatment without changing five destinations |
| Home | Full-screen hero jumps directly into the eight-card Recipe wall | Add a compact product-entry rail and original seller-result value banner |
| Home discovery | Recipe and Project semantics are encoded in one wall | Keep the Recipe wall and add a separate poster-first inspectable Project rail |
| Explore | Filters work, but the cards expose an unverified model string in the footer | Show model/provider only when the project evidence permits it |
| Recipes | Proof/concept states exist, but search/state behavior is not one explicit UI contract | Add client search/category filtering and shared provenance labels |
| Project | Direct page exists; evidence-pending fields need to remain paired and easy to scan | Preserve paired input/output and consolidate Recipe, output, evidence, and reuse facts |
| Create | Deep links are validated, but responsive acceptance must be re-proved after Home changes | Preserve the contract and verify no overflow at all target widths |
| Library | Storage disclosure is detailed but wording references the competitor pattern | Use Pikbo-owned copy and lead with “Local to this device” |

## Frozen product contracts

- `RemixIntent`: `effect`, `source`, `ratio`, `duration`, `channel`.
- `ShowcaseProject`: the registry is the only public proof source.
- `official_cached`, `live_generated`, and `concept` remain distinct.
- A cached response costs 0 credits and does not process the visitor upload.
- Concepts never borrow another Recipe's video.
- Missing provider task/review evidence never becomes a verified model claim.
- Library remains device-local until durable account storage is implemented.
- No production, provider, billing, database, DNS, or deployment changes.

## Acceptance

- Product-entry cards point only to working or explicitly labeled Wave A
  surfaces.
- Home exposes distinct Recipe reuse and Project inspection surfaces.
- Project → Use this Recipe opens Create with the exact registered intent.
- Explore filters remain URL-addressable and keyboard/touch operable.
- Unknown project/recipe paths fail safely.
- 390×844, 768×1024, and 1440×900 have no document-level horizontal overflow.
- Reduced motion disables automatic playback; media retains explicit controls.
- Initial Home loading remains poster-first with at most one eager video.
- Repository source gates, build, rendered routes, and cached API golden paths
  remain green.

## Explicitly not validated by this review

- No provider-backed video generation was called.
- No production payment, database, watermark worker, or cross-device asset
  storage was enabled.
- No customer result, conversion uplift, retention uplift, or performance
  improvement is claimed without measured post-release data.
