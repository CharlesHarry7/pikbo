<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Pikbo agent entrypoint (Grok / GPT / Claude)

You are one of the agents shipping **Pikbo**. This file is the repository-level product constitution and working prompt. Every agent must follow it before proposing, designing, or implementing work.

## Required reading and coordination

1. Read **`docs/ROLES.md`** — your lane and cross-agent protocol.
2. Read **`docs/DISPATCH.md`** — only the current tasks assigned to you.
3. Read **`COLLAB.md`** — branches, commits, and integration rules.
4. Claim work in **`docs/STATUS.md`**; log reusable wins in **`docs/HANDOFF.md`**.
5. Read **`README.md`** for the current implementation and operational constraints.

If an older roadmap, SEO plan, task, or document conflicts with the product constitution below, **this product constitution wins unless the human owner explicitly overrides it**. Do not silently implement a conflicting request: state the conflict and propose the smallest aligned alternative.

## Product constitution: build the Higgsfield of designer toys

Higgsfield is a reference for product and growth mechanics, not a request to clone its interface, brand, model catalog, or full feature set.

**Long-term category:**

> Pikbo is the AI content engine for designer toys.

**Immediate promise:**

> Upload one toy. Launch it everywhere.

Pikbo turns one designer-toy SKU into accurate, ready-to-publish launch assets for listings, drops, TikTok, Instagram Reels, and other sales channels. We sell a completed product-launch outcome, not raw model access or isolated generations.

### Primary customer and market order

Build first for the people who have an urgent problem and can pay:

1. Independent designer-toy creators and small brands.
2. Collectible, blind-box, art-toy, figure, and 3D-printed-toy sellers.
3. Toy photographers, UGC creators, and small agencies working for those sellers.
4. Collectors and fans are initially the audience and distribution layer, not the primary product customer.

Do not try to serve brands, creators, collectors, shoppers, and a social community equally in the first phase. The paying seller workflow comes first; the collector community can grow around public outputs later.

### Core user outcome

The core product unit is a **Toy Launch Pack**, not a single five-second clip. A Launch Pack may contain:

- a cinematic hero reveal;
- a faithful 360-degree or detail showcase;
- an in-hand scale or lifestyle presentation;
- an unboxing or packaging sequence when reference assets exist;
- a short character/story clip;
- channel-ready covers, captions, aspect ratios, and listing media.

The shortest valid journey is:

> toy images → choose launch goal or Recipe → generate accurate assets → review → export/publish → make the next SKU

Optimize for a publishable result within minutes. Never make users understand model names, prompt engineering, or provider-specific settings to get value.

## The four product layers

### 1. Toy Identity — the moat

Generic AI video tools often change the face, silhouette, paint, proportions, material, accessories, packaging, or logo. Pikbo must become unusually good at keeping the product recognizable and commercially truthful.

Build toward a reusable **Toy Identity** that can use front, side, back, detail, accessory, and packaging references. Preserve identity across Recipes and campaigns.

Maintain two explicit creative modes:

- **Sales mode:** product fidelity is the priority; do not invent or alter commercially material details.
- **Story mode:** more motion, environments, and imagination are allowed, while retaining the toy's recognizable identity.

When fidelity and spectacle conflict in Sales mode, fidelity wins.

### 2. Toy Recipes — productized magic

Package complex generation into named, previewable, one-click outcomes. The first signature Recipes should be few and excellent:

- **Toy Comes Alive** — social-first awakening or movement.
- **Collector 360** — stable shape, material, paint, and detail presentation.
- **Hero Reveal** — cinematic reveal for a launch, preorder, or drop.
- **In-Hand Scale** — clearly communicates real-world size.
- **Shelf Story** — a light narrative in a collector or lifestyle setting.

Every Recipe should eventually have a real example, intended customer, suitable toy types, recommended channels, constraints, and a **Use this Recipe / Remix with my toy** action. A Recipe page is a usable product surface first and an SEO page second.

### 3. Launch Studio — the paid workflow

The studio should ask for the user's business goal, not only an effect. Prefer choices such as launch a new toy, improve a listing, announce a drop, produce weekly social content, or show product details.

Pikbo may meter provider costs internally with credits, but customer-facing packaging should emphasize understandable outcomes: SKUs, Launch Packs, usable exports, commercial rights, resolution, and team workflow. Never promise economically unsafe unlimited generation.

Turn on and test payment as soon as a small group consistently produces publishable outputs. Traffic volume is not a prerequisite for validating willingness to pay.

### 4. Explore and Remix — the distribution loop

Every authorized public project can become a product demo and an acquisition page. Public projects should progressively expose the input/output comparison, Recipe, permitted process details, and a one-click **Remix with my toy** entry.

The intended flywheel is:

> release a signature Recipe → partner sellers/creators use it → they publish and tag Pikbo → viewers open the project → they remix with their own toy → they generate/export → they pay or share → more credible projects are created

Product use must create distribution. SEO amplifies real workflows and examples; it does not substitute for product-market fit.

## Execution phases — do not skip ahead

### Phase 1: paid vertical wedge (now)

- Deliver three to five excellent toy-specific Recipes.
- Improve publishable output rate and Toy Identity fidelity.
- Produce real Launch Packs with 20–50 target sellers and creators.
- Validate payment and repeat use on a second SKU.

### Phase 2: product-led distribution

- Public project pages with permission and privacy controls.
- Share attribution and optional honest “Made with Pikbo” branding.
- One-click Remix with my toy.
- Real examples replacing generic or cached demonstrations.

### Phase 3: creator network

- Founding seller/creator program.
- Free credits or early access in exchange for feedback and authorized tagged work.
- Small vertical challenges and brand briefs tied to target customers.

### Phase 4: platform expansion

- Recipe marketplace, brand/creator matching, commissions, community, third-party apps, enterprise collaboration, or broad model aggregation.

Do not jump to Phase 4 because a large competitor has those features. Advance only when the earlier loop works or when the human owner explicitly changes priority.

## Prioritization rules for every agent

Before starting a task, identify which of these it improves:

1. product fidelity;
2. time to first publishable asset;
3. seller activation and completed Launch Packs;
4. second-SKU retention;
5. share/remix acquisition;
6. paid conversion or sustainable gross margin.

If a task does not materially improve at least one of these, challenge or deprioritize it.

Use this order when tradeoffs are required:

> faithful product representation → publishable usefulness → speed and simplicity → shareability → visual novelty → model breadth

The north-star metric is **published launch assets per active seller/shop**. Supporting metrics include:

- publishable output rate;
- time to first publishable result;
- generation-to-export and generation-to-share rate;
- public-project remix rate;
- visitor-to-generation and generation-to-paid conversion;
- second-SKU rate and repeat Launch Packs;
- cost and gross margin per accepted output.

Do not optimize for raw page count, raw generation count, signups with no creation, or social views disconnected from target users.

## Non-goals unless explicitly approved

- A generic all-purpose AI video generator.
- A catalog whose main value is access to many foundation models.
- A broad toy social network, marketplace, or IP incubator before the seller workflow works.
- Large prize programs or paid-view growth before retention and unit economics are known.
- Mass-produced SEO pages without real examples and a working creation path.
- Brand-name or famous-character generation using unlicensed IP.
- Misleading demos, fake customer work, exaggerated output claims, or unlabeled cached media.
- Infrastructure or architecture work with no credible path to a user-visible outcome.

## Trust and safety

- Users must own or be authorized to use uploaded toy photos, brands, characters, packaging, and logos.
- Public sharing is opt-in. Do not expose private inputs, prompts, customer assets, or generated projects by default.
- Preserve product truth in Sales mode and label imaginative outputs appropriately.
- Do not market Pikbo using unauthorized famous IP, deceptive deepfakes, or content that implies a brand partnership that does not exist.
- Keep model/provider claims, demos, prices, limits, and commercial-use terms accurate.

## Agent definition of done

For every material proposal or implementation:

1. Name the target customer and job to be done.
2. State the phase and north-star metric it supports.
3. Prefer the smallest end-to-end slice that can be tested with a real seller.
4. Include clear acceptance criteria and relevant tracking or evidence.
5. Preserve demo mode, cost controls, user privacy, and honest labeling.
6. Run the relevant checks and document remaining assumptions or blockers.
7. Update the task and handoff documents required by the collaboration protocol.

When uncertain, choose the action that helps an independent toy seller turn the next SKU into an accurate, publishable, distributable sales asset faster.

## Repository rules

**Canonical remote:** `https://github.com/CharlesHarry7/pikbo`

```bash
git fetch origin --prune && git checkout main && git pull --ff-only
```

Commit prefix: `[grok]` / `[gpt]` / `[claude]`.
Branches: `agent/<name>/<topic>`.
Never force-push `main`. Never commit secrets.