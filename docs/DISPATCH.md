# Current dispatch

There is no general feature-expansion dispatch. Work only on the open item in
`docs/STATUS.md`, from current `origin/main`, and within that item's acceptance
criteria.

The deployed surfaces are:

- Production: `https://pikbo.ai`, deployed and operator-verified.
- Protected Preview: `https://pikbo-git-codex-private-validation-pi-kbo.vercel.app`,
  deployed and operator-verified. Repeat `/api/health` probes are green with
  `privatePreviewReadiness.ready=true` and no missing requirements.

The order is fixed:

1. Keep production hard-closed. Its deployed health contract remains
   `validation`, `softLive=false`, and `paid=false`; public upload, Provider
   spend, and Checkout stay disabled.
2. Keep the protected Preview on the green health gate while the dedicated FAL
   account is funded. The current FAL balance is `$0.00` (operator-observed),
   and no Provider call, upload, or debit has occurred.
3. After the balance gate clears, use the owner Magic Link and complete one
   private Street Power-Up result at `9:16`, 5 seconds, and 720p. Verify
   private recovery and owner-only download before considering any broader
   generation or billing proof.
4. Prove retry, accounting, and privacy behavior.
5. Rehearse Stripe in test mode only after the single-Moment loop passes.

Do not create a new surface, model catalog, Pack, growth lane, or architecture
project while these items remain incomplete.
