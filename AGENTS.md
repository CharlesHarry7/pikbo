<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version can differ from model training data. Read the relevant guide in
`node_modules/next/dist/docs/` before changing framework behavior.
<!-- END:nextjs-agent-rules -->

# Pikbo agent contract

This repository has one active objective: make one designer-toy video Moment
work end to end for a real seller and become safe to charge for.

## Read in this order

1. `docs/CURRENT_LAUNCH_CONTRACT.md`
2. `docs/STATUS.md`
3. `docs/PRODUCTION_SHIP_CHECKLIST.md` — ship + Vercel budget + health softLive truth
4. `README.md`
5. Current `main` code and tests

Older roadmaps, agent prompts, growth reports, screenshots, and product audits
are historical evidence only. If they conflict with the files above, they do
not authorize implementation.

## Immediate product boundary

The active public path is:

```text
Home → sign in → owned toy photo → Street Power-Up Moment
→ private result → Library → owner-only download
```

Do not restore the former public three-video Seller Pack, generic Studio,
Explore wall, Community, Cinema, batch generation, model marketplace, or large
SEO route set. Any future expansion requires evidence that the single-Moment
loop is reliable and useful to target sellers.

## Work rules

- Start from fresh `origin/main`; never continue from a historical agent branch.
- One agent = one worktree = one short-lived branch = one bounded PR.
- Branch names use `codex/<topic>` or `agent/<name>/<topic>`.
- Never force-push or commit directly to `main`.
- Do not commit secrets, customer media, signed URLs, or provider identifiers.
- Keep public generation and payment fail-closed unless the current launch
  contract and its tests explicitly allow them.
- Do not add code that only simulates progress, empty product surfaces, fake
  customers, fake results, or unsupported claims.
- **Batch commits → one git push per session** so Vercel Git previews do not
  burn the daily deploy quota.

## Vercel budget + production ship (HARD)

Agents **must** call the budget gate before any deploy:

```bash
npm run vercel-budget -- check    # exit 1 → do NOT deploy; PR only
npm run vercel-budget -- status
# after a successful deploy only:
npm run vercel-budget -- add
```

Ship checklist (no auto-deploy; probes health softLive honesty):

```bash
npm run production-ship-checklist
# offline:
SKIP_REMOTE=1 npm run production-ship-checklist
```

Rules:

- Usable max ≈ **8 deploys / UTC day**. Prefer merge-to-main over `vercel --prod`.
- If `vercel-budget check` fails: open/update the PR only — never force a
  production deploy.
- Public `/api/health` must stay honest: `ready.softLive` is all-five AND;
  `billing.freeTrial.*` tracks softLive. Closed production (`softLive=false`,
  `paid=false`, cached-demo-only) is a valid ship state.
- Optional one production deploy only when budget allows **and** the change is
  a main-worthy Moment/HF path. Never burn quota on throwaway previews.

## Definition of done

Every change must state the seller outcome, keep scope small, run the relevant
tests (at least `SKIP_REMOTE=1 npm run production-ship-checklist` for ship-facing
work), and include a GitHub PR plus reproducible evidence. A merged change is
not released until its production deployment and public behavior are verified —
and only after `vercel-budget check` allows that deploy.
