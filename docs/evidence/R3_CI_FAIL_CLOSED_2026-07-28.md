# R3 — Live CI fail-closed evidence (2026-07-28)

**Agent:** Grok  
**Branch:** `agent/grok/r3-ci-fail-closed`  
**Repo:** https://github.com/CharlesHarry7/pikbo  
**Beijing time:** 2026-07-28

## Change

Sync **live** GitHub Actions workflow from the reviewed template:

| Path | Role |
|------|------|
| `docs/ci/github-actions-ci.yml` | Canonical CI template (already had R3 gates) |
| `.github/workflows/ci.yml` | **Was** soft-fail (`critical-path \|\| true`) + missing recovery suite |
| After this PR | Same steps as template |

### Live CI now runs (fail the job on failure)

- `engine-smoke`
- `recovery-qa` (R0 cost gate · concurrent overspend · refund · Seller Pack partial · critical-path source honesty)
- `recovery-ledger`
- `recovery-retry-deadline`
- `showcase-evidence-smoke`
- `seo-cold-start-smoke`
- `seller-pack-cached-smoke`
- `recovery-reconciliation`
- `live-copy-smoke` (+ rendered after build)
- `lint` · `typecheck` · `build`
- same-step prod server → `link-check` · **`critical-path` (no `|| true`)** · `seller-pack-api-golden`

## Local test evidence (this machine)

Node: v24.14.0 (Codex bundled). Working tree: `~/claude/pikbo` on branch `agent/grok/r3-ci-fail-closed`.

| Command | Result |
|---------|--------|
| `npm run recovery-qa` | **PASS** |
| `npm run recovery-ledger` | **PASS** |
| `npm run recovery-retry-deadline` | **PASS** |
| `npm run recovery-reconciliation` | **PASS** |
| `npm run seller-pack-cached-smoke` | **PASS** |
| `npm run seo-cold-start-smoke` | **PASS** |
| `npm run engine-smoke` | **PASS** |
| `npm run typecheck` | **PASS** (exit 0) |

## Not claimed

- Public deploy / DNS / GSC indexing / Stripe live / Supabase SQL apply  
- inventing search volume or ranking success  

## Boss / CI note

If GitHub rejects the workflow file push for missing `workflow` scope, re-auth with `workflow` and re-push this branch, or paste `docs/ci/github-actions-ci.yml` over `.github/workflows/ci.yml` once with a workflow-scoped token.

## Push attempt (workflow scope)

```text
git push -u origin HEAD:agent/grok/r3-ci-fail-closed
# remote rejected: refusing to allow an OAuth App to create or update
# workflow `.github/workflows/ci.yml` without `workflow` scope
```

**Branch contents for PR:** evidence + STATUS + HANDOFF; live workflow file left unchanged on remote until boss grants `workflow` scope, then re-apply:

```bash
cp docs/ci/github-actions-ci.yml .github/workflows/ci.yml
git add .github/workflows/ci.yml
git commit -m "[grok] R3: apply fail-closed CI workflow (workflow scope)"
git push
```
