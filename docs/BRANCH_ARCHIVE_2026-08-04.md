# Historical branch archive — 2026-08-04

These pull requests were closed after `main@2d01241` converged Pikbo on one
Street Power-Up Moment. Their remote head branches were removed to reduce
repository and Vercel Preview noise. Pull request discussions and commit SHAs
remain available.

| PR | Removed branch | Last head SHA |
|---|---|---|
| #126 | `agent/grok/hf-explore-home` | `ccbe616e51e7252929d3e616f89d0043ead2145c` |
| #120 | `agent/grok/boss-b-workbuddy-private-live` | `ceaf6f49784d17c801f401b842e7618ff19ec824` |
| #94 | `agent/gpt/editorial-frontdoor` | `6f00a0cf8ec05a14afc615caee4b33425d14020a` |
| #93 | `agent/gpt/preset-first-frontdoor` | `a0175377fcaea5f1e3d1d27e8383109b531c00d7` |
| #91 | `codex/private-input-pack-binding` | `0a1ee39e761c15844ea6fc7c2bd98f6d0194ac65` |
| #78 | `agent/k3/wave-a-frontend-polish` | `5122cb299ca0fe876641392d0e36a4715614d672` |
| #77 | `agent/gpt/higgsfield-wave-a` | `3041ccf50e5f5c90605924ed02f2207cd9caf716` |
| #64 | `agent/gpt/p0-capability-matrix` | `a2d90b937ec59a3f41096f936dcadf047292318b` |
| #63 | `agent/gpt/authenticated-account-ux-v1` | `3a4ae2dbad24449d70eda37bb51f32ba41c95835` |
| #56 | `agent/gpt/p0-live-owned-toy-review` | `00bb1a7cdda793c93c3b03aa2f61bd191d21aef5` |

To inspect or restore one branch:

```bash
git fetch origin pull/<PR>/head:review/pr-<PR>
# or, while GitHub retains the object:
git branch <restored-name> <last-head-sha>
git push -u origin <restored-name>
```

Do not merge a restored branch wholesale. Review or extract one still-valid
atomic change onto a new branch created from current `origin/main`.
