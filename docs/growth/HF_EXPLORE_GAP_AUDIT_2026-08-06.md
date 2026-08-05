# P0 Gap audit: main vs HF Explore（AIT-38）

**Date:** 2026-08-06  
**Mode:** read-only audit (no business-logic changes)  
**Canonical code:** `CharlesHarry7/pikbo` `origin/main` @ `bd559e6`  
**Local reference:** `/Users/x/claude/pikbo` @ `8066566`  
**North star:** 潮玩领域的 higgsfield.ai（Explore 发现流 + 诚实生成主路径 + 360 listing 能力）  
**Contracts read:** `PIKBO_NORTH_STAR`, `docs/CURRENT_LAUNCH_CONTRACT.md`, `docs/prd/HIGGSFIELD_PUBLIC_PARITY.md`, `docs/prd/SOFT_NAV_AND_PRESETS.md`, `docs/research/PIXEL_PARITY_HF_YIHA.md`, `docs/COMPETITOR_SITE_PATTERNS.md`

---

## 1. Snapshot

| Surface | HF Explore pattern | `origin/main` now | Gap severity |
|---|---|---|---|
| **Hero** | Dense product OS: promo rail → feature cards → video-first discovery | Single cinema Moment hero (`HomeCinemaHero`) + trust footer only | **High** |
| **Generation entry** | Generate is the center verb; every card remakes into Create | Primary CTA = Street Power-Up Moment; many secondary doors still deep-link **360-spin remix** | **High** (split intent) |
| **Works feed** | Masonry / viral wall, hover-play, open project, remix | `/explore` Lab grid lives; **home no longer mounts any wall** | **Critical** |
| **Navigation** | Explore-first dense chrome + mobile H·C·**G**·L·P | Soft-launch seller nav: Home / Create / Library / Pricing / Account; home motion chrome omits Explore | **High** |
| **360 spin** | Listing spin is a first-class job in the wall + Generate | Recipe + showcase exist (`360-spin-showcase` in `HOME_PROOF_SLUGS`) but **not visible on `/`** | **High** |

### 1.1 main vs local (`/Users/x/claude/pikbo`)

| Item | `origin/main` (`bd559e6`) | Local (`8066566`) |
|---|---|---|
| Home composition | `HomeCinemaHero` + `HomeTrustFooter` only | Same composition |
| AIT-36 Pop Mart visual | Merged as PR **#167** | Parallel AIT-36 commit + 2 smoke-test string fixes (`h1` contiguous; disclaimer single line) |
| HF wall components | Present on disk, **not mounted** | Same orphan state |
| Recommendation | Treat main as truth; cherry-pick local smoke string fixes only if CI smoke fails on main | Do **not** open a parallel redesign PR |

**Net:** Local is a thin polish delta on the same Moment-first home, not a secret HF Explore branch. The structural HF gap is already on main.

---

## 2. Code truth (what is actually wired)

### 2.1 Home (`app/page.tsx`)

```text
HomeCinemaHero  →  HomeTrustFooter
```

- No `HfExploreHome`, `HomeViralWall`, `HomeProjectsExplore`, product rail, or preset wall.
- Hero promise: one cached Street Power-Up sample → `MOMENT_CREATE_HREF` (`/create?mode=moment&effect=street-power-up`).
- Honest labels: archive sample, 0 credits, not customer deliverable. **Keep this honesty.**

### 2.2 Orphan HF Explore stack (on disk, unused by any route)

| Component | Role | Imported by a page? |
|---|---|---|
| `components/HfExploreHome.tsx` | Full HF home shell (rail + wall + suite) | **No** |
| `components/HomeViralWall.tsx` | Dense 8-card recipe wall | Only by `HfExploreHome` |
| `components/HomeProjectsExplore.tsx` | Inside-project strip | **No** |
| `components/HfProductRail.tsx` | Product door rail | Only via orphan home |
| `components/HomeViralPresetRail.tsx` | Preset chips | Only via orphan home |

These are the fastest path to HF density **without rewriting from zero** — if remounted carefully under the Moment hero (not instead of it).

### 2.3 Explore (`app/explore/page.tsx` + `ExploreProjectGrid`)

- Lab prototype wall: categories (`listing` / `unboxing` / …), hover-play, project open, FAQ, noindex (cold-start SEO budget).
- **Dual CTAs:** primary `Generate` → `createRemixHref("360-spin-showcase")`; secondary → Street Power-Up Moment.
- Visual language still **lime `#c8ff3d` / pure black** — not the AIT-36 Pop Mart tokens (`--void`, pink/cyan/yellow) used on home.

### 2.4 Navigation (`lib/softLaunch.ts` + `components/AppShell.tsx`)

| Layer | Destinations |
|---|---|
| `PRIMARY_NAV` / `MOBILE_NAV` | Home · Create(Moment) · Library · Pricing · Account |
| Home motion chrome (desktop) | Create · Library · Pricing · Sign in |
| Home CTA | “Try Street Power-Up” |
| Soft-nav **doc** (`SOFT_NAV_AND_PRESETS.md`) | Still says Explore / Create / Effects / Lab / Pricing |

**Drift:** code froze seller-first Moment paths; HF / soft-nav docs still describe Explore-first suite chrome. Agents keep re-adding HF modules then leaving them unmounted (AIT-36 simplified home further).

### 2.5 360 listing

- Catalog + showcase: `360-spin-showcase` (category `listing`) is in the 8-slot `HOME_PROOF_SLUGS` whitelist.
- Live entry points that still default Generate → 360 remix: Explore header, `HfProductRail`, legacy `components/Header.tsx` (no app import found — dead file).
- Public home **does not surface** the 360 card or a listing-specific door despite SEO north star (“360 toy listing video”).

### 2.6 Generation honesty (do not break)

From `CURRENT_LAUNCH_CONTRACT.md`:

- Public = labeled cached prototypes; no provider spend.
- Private validation = invited auth + reservation + Seedance Fast 720p 5s Street Power-Up.
- No fake UGC, no Stripe live, no multi-model live claims.

Any HF-density PR must keep Lab badges and remix → Create; never invent community posts.

---

## 3. Gap map (HF job → Pikbo state)

```text
HF Explore loop
  feature rail → dense video wall → open project → remix → Create → Library
Pikbo main loop
  single Moment hero → Create(Moment) → Library
  (/explore Lab wall exists but is off primary chrome and off home)
```

| HF job | Needed Pikbo behavior | Current | Blocker |
|---|---|---|---|
| Enter and *see motion* | Above-fold video + below-fold dense clips | Above-fold only | Wall unmounted |
| Discover recipes | 8 proof slugs on home | Registry ready; UI missing on `/` | Mount + LCP discipline |
| One clear Generate | Single primary intent | Moment vs 360 split | Product decision in code |
| Explore as discovery | Nav + `/explore` parity | Explore noindex Lab; not in primary nav | Soft-launch freeze vs HF goal |
| Listing 360 | Visible listing job | Hidden in registry | Surface + CTA |
| Community UGC wall | Real posts or Lab-only | Lab-only (correct) | Auth + moderation later; **not this wave** |

---

## 4. Priority 5 atomic PRs (independent, reviewable)

Each PR is sized for one agent run, no Stripe/provider/auth expansion, no fake UGC.

---

### PR-1 — Remount Lab proof wall under Moment hero

**Why first:** Largest HF “feel” delta with existing components; restores discovery without abandoning seller Moment frontdoor.

| | |
|---|---|
| **Scope** | Below-fold only: keep `HomeCinemaHero` as LCP; add ≤8 Lab cards from `listHomeShowcaseProjects()` / `HOME_PROOF_SLUGS` |
| **Likely files** | `app/page.tsx`, `components/HomeViralWall.tsx` (toy-token restyle), thin adapter e.g. `components/HomeLabProofWall.tsx` or reuse `HomeProjectsExplore.tsx`, `lib/showcaseProjects.ts` (read-only), `lib/softLaunch.ts` (whitelist already OK) |
| **Out of scope** | Rewriting hero copy; re-enabling full `HfExploreHome` product rail; UGC |
| **Acceptance** | 1. `/` shows hero then wall (≥4 cards, target 8). 2. Each card opens `/projects/<slug>` or remix Create with `effect` query. 3. Badge remains Lab / cached (not “customer result”). 4. LCP still preloads beatbot poster; wall uses lazy/interaction play. 5. `360-spin-showcase` is one of the visible cards. 6. `npm run lint` + relevant home smoke green. |

---

### PR-2 — Unify primary generation intent (Moment primary, 360 secondary)

**Why:** Split CTAs train two products; HF has one center Generate verb.

| | |
|---|---|
| **Scope** | Align *primary* CTAs to `MOMENT_CREATE_HREF`; keep 360 as explicit **Listing** secondary door |
| **Likely files** | `app/explore/page.tsx`, `components/ExploreProjectGrid.tsx`, `components/HfProductRail.tsx`, `components/Header.tsx` (delete or rewire if still unused), `lib/remixIntent.ts` (call sites only), any `createRemixHref("360-spin-showcase")` used as page-level primary CTA |
| **Out of scope** | Changing pricing/credits; changing server generate contract |
| **Acceptance** | 1. Home primary CTA, Explore primary CTA, AppShell home CTA all land on Moment Create (`mode=moment&effect=street-power-up`). 2. 360 remains one-click from listing category / wall card / secondary button labeled for listing spin. 3. Guest → login → Create does not drop `effect` / `mode` / `source`. 4. No new claim of live multi-effect generation on free public path. |

---

### PR-3 — Put Explore back on product chrome (without SEO index bloat)

**Why:** HF discovery is a first-class nav peer; Pikbo Explore is a ghost route.

| | |
|---|---|
| **Scope** | Add Explore to desktop home motion nav + non-home `PRIMARY_NAV` (or replace least critical utility); optional mobile “more” link; **keep** `robots: CONCEPT_ROBOTS` / noindex on Explore |
| **Likely files** | `lib/softLaunch.ts`, `components/AppShell.tsx`, optionally `docs/prd/SOFT_NAV_AND_PRESETS.md` (doc sync only if in same PR) |
| **Out of scope** | Reintroducing Cinema / Models / Community into primary nav; sitemap expansion |
| **Acceptance** | 1. From `/`, user reaches `/explore` in one click on desktop and mobile. 2. Active states work for `/explore`. 3. Explore remains noindex. 4. Primary Create still Moment. 5. Nav still ≤6 visible peers (no HF 17-item dump). |

---

### PR-4 — Toy-skin Explore to match AIT-36 Pop Mart tokens

**Why:** After AIT-36, `/` and `/explore` look like two products; HF density fails if the discovery page feels abandoned.

| | |
|---|---|
| **Scope** | Visual + microcopy only: tokens, chips, card chrome, sticky header; keep grid behavior |
| **Likely files** | `app/explore/page.tsx`, `components/ExploreProjectGrid.tsx`, shared classes in `app/globals.css` if needed |
| **Out of scope** | New categories; evidence promotion; sitemap |
| **Acceptance** | 1. Explore uses home design tokens (`--void` / pink-cyan accents or shared utility classes), not orphan lime-on-black only. 2. Category filter + viewport/hover play unchanged. 3. Honesty strings retained (Lab · evidence pending). 4. Mobile 390 + desktop 1440 smoke screenshots optional but recommended. |

---

### PR-5 — First-class Listing 360 door (home + explore)

**Why:** SEO + seller ICP still name 360 listing; registry has the recipe but product UI hides it behind orphan stacks.

| | |
|---|---|
| **Scope** | Explicit “Listing 360°” door: home secondary CTA and/or pinned wall card; Explore listing chip default highlight optional |
| **Likely files** | `components/HomeCinemaHero.tsx` (secondary link only), `components/HomeViralWall.tsx` / PR-1 adapter, `app/explore/page.tsx`, `lib/remixIntent.ts` / `lib/presets.ts` (read), `app/effects/[slug]` deep link |
| **Out of scope** | New provider model; claiming verified case studies without evidence ledger |
| **Acceptance** | 1. From home, user can start 360 listing create in ≤2 clicks. 2. Deep link is `createRemixHref("360-spin-showcase")` or equivalent with ratio/duration/channel. 3. Card/button labeled as Lab listing study when media is cached prototype. 4. Does not replace Moment as primary CTA (depends on PR-2). |

---

## 5. Explicit non-goals (this audit wave)

- Stripe live / open billing CTAs pretending checkout works.
- Fake community UGC or fake “X creators generating”.
- Re-cloning full HF surface matrix (Academy, Canvas, Originals, multi-model live).
- Deploy / merge to production by agents.
- Replacing Moment private validation contract.

---

## 6. Suggested next Multica card (atomic)

**Title:** `P0: Home remount Lab proof wall under Moment hero (HF density, ≤8 cached cards)`

**Body sketch:** Implement **PR-1** only. Mount below-fold wall from `listHomeShowcaseProjects()`. Restyle to Pop Mart tokens. Include `360-spin-showcase`. Do not change generate API, credits, or auth. Open PR with issue key; leave in_review.

Then chain: PR-2 → PR-3 → PR-4 → PR-5 as separate issues (serial if intent unification must land before 360 secondary labeling; PR-1 can start immediately).

---

## 7. File quick-reference

| Concern | Paths |
|---|---|
| Home mount | `app/page.tsx` |
| Moment hero | `components/HomeCinemaHero.tsx` |
| Trust footer | `components/HomeTrustFooter.tsx` |
| Orphan HF home | `components/HfExploreHome.tsx` |
| Proof wall | `components/HomeViralWall.tsx` |
| Explore page | `app/explore/page.tsx` |
| Explore grid | `components/ExploreProjectGrid.tsx` |
| Shell / nav | `components/AppShell.tsx`, `lib/softLaunch.ts` |
| Showcase registry | `lib/showcaseProjects.ts` |
| Remix hrefs | `lib/remixIntent.ts` |
| Launch contract | `docs/CURRENT_LAUNCH_CONTRACT.md` |

---

## 8. One-line verdict

**main already has a world-class Moment frontdoor, but it abandoned the HF Explore density layer that still exists as orphan code; the fastest path to “潮玩 HF” is remount + unify intent + surface 360 — not another full redesign.**
