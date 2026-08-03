# Pikbo collaboration rules

**Canonical repository:** <https://github.com/CharlesHarry7/pikbo>

GitHub `main` is the only integration source. Chat transcripts, local copies,
old worktrees, and agent branches are not product authority.

## Start a task

```bash
git fetch origin --prune
git worktree add ../pikbo-worktrees/<task> -b codex/<task> origin/main
```

Use `agent/<name>/<task>` when a named external agent owns the branch. Never
switch branches in another agent's worktree.

## Scope and review

- One branch and PR must deliver one reviewable outcome.
- Keep branches short-lived; close or delete the branch after merge or rejection.
- Do not merge whole historical branches. Reimplement a still-valid fix from
  current `main`, or cherry-pick only a reviewed atomic commit.
- Required CI must pass. A green CI without a successful production deployment
  is not a release.
- `docs/CURRENT_LAUNCH_CONTRACT.md` wins over historical plans.

## Handoff

A handoff contains the branch, commit, PR, changed paths, tests, deployment URL
when applicable, and remaining blocker. The user is never used as a messenger
between agents.

## Protected actions

Production provider spend, billing, customer data, DNS, database migrations,
and public deployment require an explicit task scope and verification. Feature
branches and Preview environments must stay fail-closed by default.
