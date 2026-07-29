# PIKBO unit economics — current allowances and Seedance cost

> **Superseded on 2026-07-29.** The current single-plan, fixed Fast 720p
> contract and release gates are in
> [`CURRENT_LAUNCH_CONTRACT.md`](./CURRENT_LAUNCH_CONTRACT.md). The
> Free/Creator/Shop and public Mini analysis below is historical evidence only.

**Reviewed:** 2026-07-23

**Scope:** C3 / truth-sync

**Product truth:** `lib/pricing.ts` is the source of truth for credits and public allowance copy.

**Launch rule:** re-check provider and payment pricing before enabling real charges. All dollar figures below are planning estimates, not customer quotes.

## Implemented contract

The current product grants a flat `10 credits` per eligible generation:

| Plan | Monthly price | Credits | Current approximate output | Live path |
|---|---:|---:|---:|---|
| Free | $0 | 10 | ~1 trial clip | Seedance Mini · 5s · 480p · on-player watermark |
| Creator | $19 | 50 | ~5 clips | 720p paid path · no on-player watermark |
| Shop | $49 | 150 | ~15 clips | 720p paid path · batch workflow |

The `~1 / ~5 / ~15` figures are contract-derived prototype estimates: credits divided by the current flat 10-credit job charge. They are not an unlimited promise, a provider invoice quote, or a guarantee that every model/duration combination has the same cost forever.

Cached homepage/Lab examples have no model cost and use no credits. A Studio request without `FAL_KEY` returns a labeled cached demo under the current API credit contract; it must never be described as a live render of the uploaded toy.

## Decision

The old `30 / 500 / 1,500` credit presentation was unsafe and is retired. The current `10 / 50 / 150` contract is materially safer, but the flat 10-credit job charge is still only a foundation:

1. Free uses **Seedance Mini**, not Fast: one 5-second, 480p live trial with an on-player mark when provider access is configured.
2. Creator supports about five current flat-rate jobs, not 50.
3. Shop supports about fifteen current flat-rate jobs, not 150.
4. A 10-second paid render still costs the same credits as a 5-second render, even though provider cost is roughly double.
5. Live billing remains gated until model/resolution/duration weights, durable credits, and download watermarking are enforced server-side.

## Source rates

Production currently selects:

- Free default: `bytedance/seedance-2.0/mini/image-to-video`, forced to 480p.
- Paid default: `bytedance/seedance-2.0/image-to-video`, default 720p.
- Paid preference: Seedance Fast or Mini when selected.
- Studio duration: 5 or 10 seconds; Free is locked to 5 seconds.

Official fal pricing reviewed on 2026-07-23:

| Endpoint / planning path | Approx. rate per second | 5 seconds | 10 seconds | PIKBO use |
|---|---:|---:|---:|---|
| Seedance 2.0 Mini, 480p | $0.0721 | $0.36 | $0.72 | Current Free live path |
| Seedance 2.0 Mini, 720p | $0.1547 | $0.77 | $1.55 | Optional paid preference |
| Seedance 2.0 Fast, 720p | $0.2419 | $1.21 | $2.42 | Paid preference |
| Seedance 2.0 Standard, 720p | ~$0.3034 | ~$1.52 | ~$3.03 | Current paid default |

Sources:

- [fal — Seedance 2.0 Mini Image to Video](https://fal.ai/models/bytedance/seedance-2.0/mini/image-to-video)
- [fal — Seedance 2.0 Fast Image to Video](https://fal.ai/models/bytedance/seedance-2.0/fast/image-to-video)
- [fal — Seedance 2.0 Image to Video](https://fal.ai/models/bytedance/seedance-2.0/image-to-video)
- [Stripe — standard online payment pricing](https://stripe.com/pricing)

fal calculates final cost from output dimensions, duration, frame rate, and token price. Reconcile controlled jobs against the actual fal invoice before changing public weights.

## Free trial exposure

One 5-second Mini 480p live trial costs approximately:

```text
Raw model cost: 5 × $0.0721 = $0.36
With 10% operations buffer: ~$0.40 per fully used trial
```

The 10% buffer is a planning allowance for storage, delivery, retries, monitoring, and price variance; it is not an official fal fee.

| Control | Current / required position |
|---|---|
| Allowance | 10 credits ≈ one current live trial job |
| Duration | 5 seconds |
| Resolution | 480p |
| Model | Seedance Mini |
| Output | On-player watermark today; server-burned file watermark required before public launch |
| Identity | Cookie session today; verified durable account required before serious paid billing |
| Abuse | Rate limit exists; email-backed identity remains the stronger boundary |

The trial is a deliberate acquisition subsidy. Cached examples should remain free to replay because they have zero incremental inference cost.

## Creator $19

For a simple US-card planning example, Stripe lists `2.9% + $0.30`:

```text
$19.00 - (2.9% × $19.00) - $0.30 = ~$18.15 net receipt
```

Stripe fees vary by account country, payment method, currency conversion, tax tooling, and agreement. `$18.15` is a comparison baseline.

At the current five-job allowance:

| Fully used Creator allowance | Raw Seedance cost | Cost with 10% buffer | Contribution after example Stripe fee | Margin after model buffer |
|---|---:|---:|---:|---:|
| 5 × 5s Fast 720p | $6.05 | $6.65 | $11.50 | 63% |
| 5 × 5s Standard 720p | $7.59 | $8.34 | $9.81 | 54% |
| 5 × 10s Fast 720p | $12.10 | $13.30 | $4.85 | 27% |
| 5 × 10s Standard 720p | $15.17 | $16.69 | $1.46 | 8% |

Conclusion: Creator is no longer upside-down at five current jobs, but the worst-case 10-second Standard path leaves too little room for storage, support, chargebacks, tax, and discounts. Duration-aware weights are still required.

## Shop $49

Using the same example fee formula, a `$49` subscription nets about `$47.28` before tax and other costs.

| Fully used Shop allowance | Raw Seedance cost | Cost with 10% buffer | Contribution after example Stripe fee | Margin after model buffer |
|---|---:|---:|---:|---:|
| 15 × 5s Standard 720p | $22.76 | $25.03 | $22.25 | 47% |
| 15 × 10s Fast 720p | $36.29 | $39.91 | $7.37 | 16% |
| 15 × 10s Standard 720p | $45.51 | $50.06 | **-$2.78** | **-6%** |

Conclusion: Shop can still lose money when every current flat-rate job uses the 10-second Standard path. Do not describe the plan as unlimited or as a guaranteed lowest cost per clip.

## Planning weights — not implemented yet

The following is a starting model for Grok to enforce server-side; it is not active UI pricing:

| Generation | Planning charge | Approx. Creator capacity (50 credits) |
|---|---:|---:|
| Mini 480p, 5s | 10 credits | 5 jobs |
| Fast 720p, 5s | 10 credits | 5 jobs |
| Standard 720p, 5s | 13 credits | 3 jobs plus remainder |
| Fast 720p, 10s | 20 credits | 2 jobs plus remainder |
| Standard 720p, 10s | 25 credits | 2 jobs |

Rounding intentionally leaves cost headroom. The quote shown before Generate must be calculated from the selected model, resolution, duration, and variant count, then enforced by the same server transaction that deducts credits.

## Copy and product rules

- Public allowance copy must derive from `PLANS`, `CREDITS_PER_VIDEO`, and `clipsFromCredits`.
- Say `Free ~1 / Creator ~5 / Shop ~15` only while the flat 10-credit contract is active.
- Say `Seedance Mini 480p` for the Free live path; never say Free uses Fast.
- Use `cached demo` when no provider call is made; never imply the uploaded image was rendered.
- “Unlimited” is allowed only for cached playback, never for live generation.
- Free currently has an on-player mark; do not claim the downloaded file has a server-burned watermark yet.
- Failed live jobs refund their credit charge.
- Model-aware weights are a future contract change, not an active feature.

No generation, session, credits, or Stripe logic changes are included in this truth-sync. Grok must implement weighted quotes atomically with durable credit accounting.

## Go / no-go gate

Real charging remains **no-go** until all are true:

1. Model/resolution/duration credit quotes are enforced server-side.
2. Durable identity and credit ledger prevent repeated anonymous grants.
3. Free downloaded files receive a server-side watermark.
4. Controlled live tests confirm fal cost for each offered combination.
5. The actual Stripe account fee schedule is included in plan-margin calculations.
6. Public copy and server behavior pass the same 1 / 5 / 15 contract test.
