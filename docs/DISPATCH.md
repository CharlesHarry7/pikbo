# Current dispatch

There is no general feature-expansion dispatch.

Work only on an open item in `docs/STATUS.md`, from current `origin/main`, and
within that issue's acceptance criteria. The order is fixed:

1. Put `main@02ba045` on production after Vercel's 24-hour deployment limit
   resets, then verify the guest Street Power-Up proof and the hard-closed
   production health gate.
2. Prepare a protected non-production Preview whose `/api/health` reports
   `privatePreviewReadiness.ready=true` with no missing requirements.
3. Complete one authenticated owned-photo Street Power-Up result with private
   recovery and owner-only download, then prove one 10-credit settlement.
4. Prove retry, accounting, and privacy behavior.
5. Rehearse Stripe in test mode only after the product loop passes.

Do not create a new surface, model catalog, Pack, growth lane, or architecture
project while these items remain incomplete.
