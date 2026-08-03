# Pikbo active status

**Updated:** 2026-08-04

**Canonical code:** `main@6816030` — single Street Power-Up Moment plus repository convergence

**Production:** synchronized on Vercel deployment `dpl_AzjRBnZXyLrinUx47DV4coRYEX4f`

This is the entire active queue. Historical task boards remain available in
Git history and must not be treated as current work.

| Priority | Outcome | GitHub | State | Done when |
|---|---|---|---|---|
| P0 | Owned photo produces the actual private Moment | #54 | hardening in review | authenticated upload → provider → private object → Library/download |
| P1 | Stripe test subscription binds to the same durable account | #59 | blocked externally | replay-safe test Checkout, webhook, subscription and once-only credits |

## Completed in this convergence

- #129: production now contains the single-Moment Home, Create, and Library;
  `/api/health` remains `validation`, `softLive=false`, and `paid=false`.
- #65: the Magic Link return-path implementation and regression landed before
  the convergence; its remaining real-user proof is part of #54.

## Frozen

- Public three-output Seller Pack
- Generic Studio and arbitrary prompt/model controls
- Explore, Community, Cinema, batch generation and marketplace surfaces
- New SEO route expansion and directory campaigns
- Production provider spend and live Stripe Checkout

## Branch policy

No task may start from a branch created before `main@dc40f4f`. One active task
gets one new branch and one PR. Closed historical PRs are reference material,
not merge candidates.
