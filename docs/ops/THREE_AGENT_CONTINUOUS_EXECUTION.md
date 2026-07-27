# Pikbo three-agent continuous execution

## Source and concurrency

- Canonical repository: `https://github.com/CharlesHarry7/pikbo`.
- Codex, Grok and WorkBuddy each hold at most one task, branch and PR.
- Every run fetches all remote branches, then reads `docs/STATUS.md`,
  `docs/DISPATCH.md`, open PRs and CI before claiming work.
- A task counts as complete only with a branch, commit or report, reproducible
  evidence and a PR handoff.

## Active lanes

| Agent | Branch | Deliverable | Hard boundary |
|---|---|---|---|
| Codex | `agent/gpt/three-agent-control-plane` | collaboration control plane, integration and CI acceptance | no public/paid/production mutation |
| Grok | `agent/grok/pikbo-growth-evidence` | sourced SERP/intent report and attainable-link table | no invented volume, generated pages or directory submission |
| WorkBuddy | `agent/workbuddy/seo-baseline-2026-07-28` | timestamped AITDK/GSC/browser baseline | read-only; no indexing request, code or production access |

## Heartbeat

The Codex thread heartbeat runs hourly. It checks branch/PR activity, CI and
blockers without re-dispatching an agent that is still working. At Beijing
09:00 and 21:00 it reports completed items, commit SHAs, PRs, test results,
blockers and the next task for each lane.

If the same failure recurs in three consecutive checks, that lane stops and
records the evidence plus the smallest owner action needed to unblock it.

## Safe queue

1. Merge the Google-first SEO remediation and confirm main CI.
2. Land Grok growth evidence and WorkBuddy baseline reports.
3. Add Seller Pack cached golden-path and recovery regression coverage.
4. Document T6 gaps while keeping readiness false.
5. Prepare the T5 non-production acceptance pack without applying SQL.
6. Prepare a private Mode A preview blocker list without public deployment.
7. Expand indexable content only after stable real GSC queries exist.

## NO-GO

Public `pikbo.ai`, GSC indexing requests, DNS, production database changes,
credits, billing, Stripe, paid generation, Supabase production migration and
public deployment require a separate explicit owner approval.
