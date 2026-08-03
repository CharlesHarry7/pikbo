# Pikbo active status

**Updated:** 2026-08-04

**Canonical code:** `main@02ba045` — single Street Power-Up Moment with owner-only live input, reconciliation hardening, and an honest guest Create proof

**Production:** validation-only and behind canonical code while Vercel's
daily deployment limit is active; no alias workaround or Provider gate change
is permitted

This is the entire active queue. Historical task boards remain available in
Git history and must not be treated as current work.

| Priority | Outcome | GitHub | State | Done when |
|---|---|---|---|---|
| P0 | Owned photo produces the actual private Moment | #54 | code merged; protected Preview proof pending | authenticated upload → provider → private object → Library/download |
| P1 | Stripe test subscription binds to the same durable account | #59 | blocked externally | replay-safe test Checkout, webhook, subscription and once-only credits |

## Completed in this convergence

- #129: production now contains the single-Moment Home, Create, and Library;
  `/api/health` remains `validation`, `softLive=false`, and `paid=false`.
- #132: direct live generation now requires an owner-scoped ready private
  asset, every direct live allowance uses the fixed Street Power-Up contract,
  and R1c reconciliation is worker-only and fail-closed.
- #133: anonymous Create now shows the existing cached Street Power-Up study
  before the private gate. It does not mount CreateStudio or expose upload,
  credits, Generate, Provider, or Checkout controls.
- #65: the Magic Link return-path implementation and regression landed before
  the convergence; its remaining real-user proof is part of #54.

## Frozen

- Public three-output Seller Pack
- Generic Studio and arbitrary prompt/model controls
- Explore, Community, Cinema, batch generation and marketplace surfaces
- New SEO route expansion and directory campaigns
- Production provider spend and live Stripe Checkout

## Branch policy

Every new task starts from current `main`; the next protected Preview proof
starts from `main@02ba045`. One active task gets one new branch and one PR. Closed
historical PRs are reference material, not merge candidates.
