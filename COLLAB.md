# Pikbo multi-agent collaboration

**Repo (single source of truth):** https://github.com/CharlesHarry7/pikbo
**Product:** designer-toy AI video tool (pikbo.ai) — subscriptions + later ads.  
**Active execution agents:** Codex · Grok · WorkBuddy (and the human owner)

**Role split (boss):** see **`docs/ROLES.md`**.  
Codex = implementation/integration. Grok = sourced growth evidence. WorkBuddy = read-only external audit.
Cross-cutting → communicate in `docs/DISPATCH.md` before editing.

Everyone works **only through this GitHub repo**. Do not invent parallel local-only histories.

---

## 0. First 60 seconds (every session)

```bash
cd <local-clone>
git fetch origin --prune
git checkout main
git pull --ff-only origin main
cat docs/STATUS.md          # who owns what
git log --oneline -15       # latest quality commits
git branch -a
```

If another agent pushed something good → **merge/rebase onto it before you edit the same area**.

---

## 1. Branch rules

| Role | Branch pattern | Example |
|---|---|---|
| Grok | `agent/grok/<topic>` | `agent/grok/stripe-webhook` |
| GPT | `agent/gpt/<topic>` | `agent/gpt/homepage-demos` |
| Claude | `agent/claude/<topic>` | `agent/claude/seo-keywords` |
| WorkBuddy | `agent/workbuddy/<topic>` | `agent/workbuddy/seo-baseline-2026-07-28` |
| Hotfix | `fix/<issue>` | `fix/credits-double-charge` |

- **Never force-push `main`.**
- Prefer short-lived branches (hours, not days).
- One branch = one coherent outcome (reviewable in a single PR).
- One agent = one active task/branch/PR. Check `STATUS`, `DISPATCH`, remote branches and open PRs before claiming more work.

---

## 2. Commit messages

Prefix every commit:

```
[grok] add Stripe webhook for plan renewals
[gpt] real demo videos on homepage hero
[claude] expand /effects long-tail presets
```

Body (optional): what / why / risk.

---

## 3. How to “pull the others’ good stuff”

### A. Latest stable
```bash
git checkout main && git pull --ff-only
```

### B. Cherry-pick one great commit
```bash
git fetch origin
git log origin/main --oneline -20
git cherry-pick <sha>
```

### C. Reuse work from another agent’s branch
```bash
git fetch origin
git log origin/agent/gpt/<topic> --oneline -10
git checkout -b agent/grok/integrate-gpt-x
git merge origin/agent/gpt/<topic>   # or cherry-pick selected SHAs
```

### D. Browse on GitHub (no clone needed)
- Commits: `https://github.com/CharlesHarry7/pikbo/commits/main`
- Branches: `https://github.com/CharlesHarry7/pikbo/branches`
- Compare: `https://github.com/CharlesHarry7/pikbo/compare/main...agent/gpt/<topic>`
- Raw file: `https://raw.githubusercontent.com/CharlesHarry7/pikbo/main/<path>`

### E. Capture a “quality note” for others
When you land something others should reuse, append a line to `docs/HANDOFF.md`:

```md
### 2026-07-22 — [grok] credits cookie session
- Path: lib/session.ts, app/api/generate
- Why good: works without DB; 402 paywall ready
- Reuse: keep watermark flag from plan; refund on fal failure
```

---

## 4. Ownership (avoid three-way file fights)

Claim work in `docs/STATUS.md` **before** editing. Soft locks:

| Area | Primary owner (default) | Notes |
|---|---|---|
| Credits / session / checkout API | Grok | `lib/session.ts`, `lib/credits.ts`, `app/api/*` |
| CreateStudio UX / watermark UI | Grok | coordinate if GPT redesigns studio |
| pSEO content matrix | Claude | `lib/presets.ts`, `usecases.ts`, `toytypes.ts`, SEO pages |
| Homepage / brand / demo media | GPT | `app/page.tsx`, `public/` demos |
| Auth + Supabase | whoever claims first | update STATUS |
| Stripe webhooks | whoever claims first | update STATUS |
| Infra / deploy (Vercel) | human + one agent | document env in `.env.example` only |

If you must touch another owner’s files: **read their latest commit first**, keep the diff minimal, note it in HANDOFF.

---

## 5. Merge path (fast but safe)

1. Claim row in `docs/STATUS.md` → set `In progress` + agent name + branch.
2. Branch from fresh `main`.
3. Ship small PRs. Direct pushes to `main` are forbidden.
4. Before merge: `npm run build` must pass.
5. Merge to `main` (squash OK). Update STATUS → `Done` + commit SHA.
6. Never leave secrets in git (`.env*` ignored; only `.env.example`).

Human can always override ownership in STATUS.

---

## 6. Speed rules

- **Parallelize by area**, not by rewriting the same file.
- A task is complete only with a branch, commit, PR/report and reproducible evidence; “thinking” is not progress.
- Prefer **vertical slices**: one effect page + one API fix + one UI win — shippable.
- If blocked >30 min on keys (Stripe/Supabase/fal): ship behind flags / dev stubs, document in HANDOFF, move on.
- Demo mode without `FAL_KEY` must keep working.
- Do not expand scope into “Higgsfield clone” — stay designer-toy vertical.
- Public deploy, GSC indexing, DNS, production database, credits, billing, paid providers and Stripe require a separate explicit owner GO.

---

## 7. Product north star (do not drift)

- Tool for **sellers + collectors**: photo → clip → list/post.
- Money: **subscription + credits** first; ads later.
- Free = watermark + cheap model + low credits.
- SEO: keep the reviewed seven-URL sitemap; no new indexable route without stable GSC query evidence, a real product entry and an owned example.

Roadmap snapshot lives in `README.md` and live claims in `docs/STATUS.md`.
