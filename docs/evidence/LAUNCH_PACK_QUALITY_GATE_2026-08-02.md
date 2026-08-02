# Launch Pack quality gate — 2026-08-02

## Outcome

Pikbo now has a deterministic, fail-closed manual quality contract for the
frozen three-video Launch Pack. It can reject a technically completed clip
when the owned toy is no longer commercially truthful or the exact file is not
publishable without editing.

This slice does **not** persist reviews, inspect media automatically, call a
Provider, retry a job, move credits, change Storage, open Stripe, or prove that
a real same-SKU three-video Pack has passed.

## Product direction

GPT Pro fixed the implementation boundary in the persistent product review:

- conversation: `6a6b4960-4dcc-83e8-8404-b5cb6748abf6`
- cut: `launch-pack-quality-gate-contract`
- direction: implement a pure domain contract, focused regression and blank
  evidence template only; make identity/commercial misrepresentation a hard
  veto; keep retry evidence format-specific; do not touch runtime systems.

## Contract truth

- Requires the exact Listing Spin, Blind-box Reveal and Social Flash trio with
  frozen key, slug, aspect ratio, five-second duration and unique job/output
  identities.
- Binds the review to `packRunId`, `packJobId`, `attemptKey`, `inputAssetId`,
  input hash and output hash. An exact replay is idempotent; changed evidence
  conflicts; a new output/attempt is a new review identity.
- Separates technical delivery from seller quality. Technical success alone is
  never a quality pass.
- Uses `hard_failed > retry > pass` with no averaging. A partially useful Pack
  keeps its passing-sibling count while the Pack remains `retry`; three retries
  also aggregate to Pack `retry`, with zero passing siblings.
- Hard-fails wrong SKU/colorway, identity drift, invented commercial claims,
  missing reference truth and cross-clip mismatch.
- Listing Spin cannot claim inspectable hidden surfaces without sufficient
  reference coverage. Blind-box packaging cannot be claimed without packaging
  evidence. Social effects cannot overpower the toy.
- Requires a reviewer to answer whether each exact file can be published
  without editing, for its intended channel, with timestamped defect evidence.
- Never includes signed URLs, object keys, Provider IDs, prompts, emails or
  other sensitive operational fields.

## Independent review

- Governance reviewer `/root/context_guardrails`: **APPROVE**. The final diff is
  confined to the pure contract, regression, invalid template, CI wiring and
  control-plane documentation. Runtime product, billing and deployment remain
  unchanged.
- Seller-readiness reviewer `/root/workbuddy_visual_redteam`: initial
  **BLOCK**, then **APPROVE** after two corrections: all-retry aggregation and
  Listing hidden-surface truth both fail closed.
- Code/invariant reviewer `/root/grok_code_audit`: initial **BLOCK** on hash
  casing, caller-controlled replay identity and ambiguous aggregation; final
  **APPROVE**, P0=0 and blocking P1=0, after canonical lowercase hashes,
  structured reviewer/output identity and `retry` plus sibling-count metadata.

## Verification

The final local matrix passes:

- `npm run launch-pack-quality-gate`
- `npm run live-copy-smoke`
- `npm run seo-cold-start-smoke`
- `npm run engine-smoke`
- `npm run seller-pack-cached-smoke`
- `npm run seller-pack-atomic-regression`
- `npm run private-toy-input-pack-regression`
- `npm run private-input-admission-regression`
- `npm run showcase-evidence-smoke`
- `npm run showcase-promotion-gate`
- `npm run recovery-ledger`
- `npm run recovery-reconciliation`
- `npm run stripe-billing-regression`
- `npm run typecheck`
- `npm run lint`
- `npm run build` — 199 pages

The build retains the pre-existing T6 NFT tracing warning. It is unrelated to
this pure contract slice.

## Next proof

The next product milestone is not more UI or another feature. It is to apply
this standard to real private outputs: at least three owned SKUs and ten real
calls within the existing US$20 validation cap, including one same-input
three-video Pack. Public generation, payment and sellable-result claims remain
closed until that evidence passes.
