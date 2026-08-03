# Pikbo active status

**Updated:** 2026-08-04

**Canonical code:** `main@2d01241` — single Street Power-Up Moment

**Production:** behind canonical code because the Vercel deployment was rate-limited

This is the entire active queue. Historical task boards remain available in
Git history and must not be treated as current work.

| Priority | Outcome | GitHub | State | Done when |
|---|---|---|---|---|
| P0 | Promote current `main` and verify production | #129 | blocked by Vercel quota | Home, Create and Library match `2d01241`; health stays fail-closed |
| P0 | Owned photo produces the actual private Moment | #54 | active | authenticated upload → provider → private object → Library/download |
| P0 | Login returns to the intended Create flow | #65 | active | Magic Link works in protected Preview and restores the creation intent |
| P1 | Stripe test subscription binds to the same durable account | #59 | blocked externally | replay-safe test Checkout, webhook, subscription and once-only credits |

## Frozen

- Public three-output Seller Pack
- Generic Studio and arbitrary prompt/model controls
- Explore, Community, Cinema, batch generation and marketplace surfaces
- New SEO route expansion and directory campaigns
- Production provider spend and live Stripe Checkout

## Branch policy

No task may start from a branch created before `main@2d01241`. One active task
gets one new branch and one PR. Closed historical PRs are reference material,
not merge candidates.
