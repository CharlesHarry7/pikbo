# Grok + WorkBuddy red-team evidence — 2026-07-29

## Scope and evidence boundary

This record exists to prove that both external assistants produced material
review output for the current Pikbo launch contract. It does **not** treat
either assistant as proof that migrations ran, a provider call succeeded, or a
customer paid.

## Grok

- Conversation:
  <https://grok.com/c/52202f8c-72c9-41d3-a7a8-adc48c6b57b9?rid=43343583-bd4b-44af-9b8a-5ee5550bfc52>
- Review prompt: red-team the private single-clip and fixed three-video Pack
  paths for double charging, unsafe refunds, unauthorized downloads, provider
  budget bypass, and false launch gates.
- Access limitation: the browser did not permit attaching the local repository.
  Grok reviewed the detailed architecture and failure cases supplied in the
  prompt; code-specific conclusions remained explicitly marked as requiring
  repository verification.

Material findings and repository disposition:

1. A private object written before settlement must never become downloadable
   while its job is pending or failed. Pikbo's owner-scoped lookup requires
   `generation_jobs.status = 'succeeded'`; the Pack status and download routes
   use that lookup before signing.
2. Pack child settlement/release must be server-only, exact-amount, atomic, and
   idempotent. Public Pack settle/release routes are removed; each terminal
   child operation is fixed at 10 credits.
3. The US$20 provider validation ceiling must be one database-atomic,
   cumulative non-production budget, not a per-user or process-local counter.
4. Provider access gates must be uniform across every generation path.
5. Real Stripe and production provider access remain a no-go before migration
   rehearsal and real non-production output evidence.

## WorkBuddy

- Original report:
  `/Users/x/WorkBuddy/2026-07-29-22-55-00/pikbo-redteam-reaudit.md`
- Size: 174 lines.
- Review surface: pikbo.ai, Higgsfield, AITDK, the Pikbo repository, and the
  current product documentation.

Material findings adopted in the implementation:

1. The only P0 is authenticated upload -> real generation -> private,
   downloadable delivery; product shells and growth expansion do not substitute
   for it.
2. Stripe stays closed until the delivery path works and test-mode billing is
   proven.
3. Directory submissions and broad SEO expansion stay paused; only a small set
   of high-intent pages may remain indexable, and only with honest evidence.
4. Empty Cinema, Community, Supercomputer, and model-shelf promises are not part
   of the launch contract.

## Release consequence

Both reviews support the same decision: keep production provider and payment
switches closed. Source changes, green CI, and a preview deployment are not
evidence of a real generation, a passed database drill, a beta threshold, or a
subscription.
