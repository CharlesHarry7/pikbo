/**
 * AIT-533 (supersedes AIT-334 / AIT-154 / AIT-213 thrash) — Studio
 * generate-wait recovery fail-closed residual
 * (recovery exit + server-gated Retry + BatchStudio parity).
 *
 * Source contract (no network, no provider):
 * 1. Recovery checking/waiting always unlocks a non-destructive detach exit
 * 2. Cancel vs detach leave plans stay pure and non-overlapping
 * 3. Fail-panel Retry is blocked for auth/paywall/fatal/reconcile codes
 * 4. CreateStudio + GenerateWaitStage wire the policy (no silent hang)
 * 5. Fail-closed refund copy remains on GenerateFailPanel
 * 6. BatchStudio wires recovery state, detach, and server-gated Retry
 *
 * Run: npm run generate-wait-honesty-regression
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canRetryGenerateFailure,
  planGenerateWaitLeave,
  shouldShowGenerateWaitDetach,
} from "../lib/generateRecoveryPolicy.ts";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

// ─── 1. Detach visibility — recovery never sticks without exit ─────────────

{
  assert.equal(
    shouldShowGenerateWaitDetach({
      demoMode: true,
      elapsedSec: 120,
      recoveryChecking: true,
    }),
    false,
    "demo Lab wait never detaches to private Library"
  );
  assert.equal(
    shouldShowGenerateWaitDetach({
      elapsedSec: 5,
      recoveryChecking: false,
      awaitingPrimary: false,
    }),
    false,
    "early primary-only wait keeps user on the stage (cancel still available)"
  );
  assert.equal(
    shouldShowGenerateWaitDetach({
      elapsedSec: 15,
      recoveryChecking: true,
    }),
    true,
    "recovery checking unlocks detach immediately — no silent stick"
  );
  assert.equal(
    shouldShowGenerateWaitDetach({
      elapsedSec: 20,
      recoveryChecking: false,
      awaitingPrimary: true,
    }),
    true,
    "awaiting_primary unlocks detach"
  );
  assert.equal(
    shouldShowGenerateWaitDetach({
      elapsedSec: 90,
      recoveryChecking: false,
      awaitingPrimary: false,
    }),
    true,
    "long wall-clock unlocks detach without recovery signal"
  );
  assert.equal(
    shouldShowGenerateWaitDetach({
      elapsedSec: 89,
      recoveryChecking: false,
      awaitingPrimary: false,
    }),
    false,
    "pre-90s primary wait does not force detach"
  );
}

// ─── 2. Leave plans — cancel vs detach never invent a second generate ──────

{
  const detach = planGenerateWaitLeave("detach");
  assert.equal(detach.abortPrimary, false);
  assert.equal(detach.abortRecovery, false);
  assert.equal(detach.cancelLedger, false);
  assert.equal(detach.startNewGenerate, false);

  const cancel = planGenerateWaitLeave("cancel");
  assert.equal(cancel.abortPrimary, true);
  assert.equal(cancel.abortRecovery, true);
  assert.equal(cancel.cancelLedger, true);
  assert.equal(cancel.startNewGenerate, false);
}

// ─── 3. Server-gated Retry — fail-closed, no invented retriable path ───────

{
  assert.equal(
    canRetryGenerateFailure({
      code: "PROVIDER_TIMEOUT",
      hasInput: true,
      busy: false,
    }),
    true,
    "provider blip remains retriable after Retry-After"
  );
  assert.equal(
    canRetryGenerateFailure({
      code: "RATE_LIMITED",
      hasInput: true,
    }),
    true
  );
  assert.equal(
    canRetryGenerateFailure({
      code: "TIMEOUT",
      hasInput: true,
      refundUnconfirmed: true,
    }),
    true,
    "refund unconfirmed still allows Retry (copy warns check balance)"
  );
  assert.equal(
    canRetryGenerateFailure({
      code: "GENERATION_FAILED",
      hasInput: true,
    }),
    true
  );

  assert.equal(
    canRetryGenerateFailure({ code: "AUTH_REQUIRED", hasInput: true }),
    false,
    "auth gate is not a Retry"
  );
  assert.equal(
    canRetryGenerateFailure({
      code: "LIVE_ACCESS_REQUIRED",
      hasInput: true,
    }),
    false
  );
  assert.equal(
    canRetryGenerateFailure({
      code: "INSUFFICIENT_CREDITS",
      paywall: true,
      hasInput: true,
    }),
    false
  );
  assert.equal(
    canRetryGenerateFailure({
      code: "PROVIDER_BALANCE",
      fatal: true,
      hasInput: true,
    }),
    false
  );
  assert.equal(
    canRetryGenerateFailure({
      code: "RIGHTS_REQUIRED",
      hasInput: true,
    }),
    false
  );
  assert.equal(
    canRetryGenerateFailure({
      code: "DURABLE_CREDITS_UNAVAILABLE",
      hasInput: true,
    }),
    false,
    "reconcile hold must not re-POST"
  );
  assert.equal(
    canRetryGenerateFailure({
      code: "PROVIDER_NETWORK",
      hasInput: false,
    }),
    false,
    "no still → no Retry"
  );
  assert.equal(
    canRetryGenerateFailure({
      code: "PROVIDER_NETWORK",
      hasInput: true,
      busy: true,
    }),
    false,
    "busy generate blocks Retry"
  );
  assert.equal(
    canRetryGenerateFailure({ paywall: true, hasInput: true }),
    false
  );
  assert.equal(
    canRetryGenerateFailure({ fatal: true, hasInput: true }),
    false
  );
}

// ─── 4. Source wiring — CreateStudio + wait stage + fail panel ─────────────

{
  const policy = read("lib/generateRecoveryPolicy.ts");
  assert.match(policy, /export function shouldShowGenerateWaitDetach/);
  assert.match(policy, /export function canRetryGenerateFailure/);
  assert.match(policy, /AUTH_REQUIRED/);
  assert.match(policy, /DURABLE_CREDITS_UNAVAILABLE/);

  const wait = read("components/GenerateWaitStage.tsx");
  assert.match(wait, /shouldShowGenerateWaitDetach/);
  assert.match(wait, /data-wait-detach/);
  assert.match(wait, /data-recovery-checking/);
  assert.match(wait, /data-generate-leave="detach"/);
  assert.match(wait, /data-generate-leave="cancel"/);
  assert.match(
    wait,
    /recoveryChecking[\s\S]{0,80}awaitingPrimary/,
    "recovery checking feeds detach policy"
  );
  // No silent stick: cancel always available when onCancel provided
  assert.match(wait, /data-generate-leave="cancel"/);
  assert.match(wait, /Cancel generation/);

  const create = read("components/CreateStudio.tsx");
  assert.match(create, /canRetryGenerateFailure/);
  assert.match(create, /lastFailCode/);
  assert.match(create, /lastFailFatal/);
  assert.match(create, /lastFailPaywall/);
  assert.match(create, /planGenerateWaitLeave\("detach"\)/);
  assert.match(create, /leaveWaitingKeepBackground/);
  assert.match(create, /cancelInFlightGenerate/);
  assert.match(create, /setLastRequestCreditState\("refund unconfirmed"\)/);
  assert.match(create, /recoveringSavedResult/);
  assert.match(create, /awaitingPrimaryAfterRecovery/);
  assert.match(create, /GenerateFailPanel/);
  assert.match(create, /retryAfterSec=\{failRetryAfterSec\}/);
  // AIT-237: fail Retry only when pure gate allows (no invented re-POST)
  assert.match(
    create,
    /canRetryGenerateFailure\(\{[\s\S]{0,220}code: lastFailCode[\s\S]{0,120}fatal: lastFailFatal[\s\S]{0,120}paywall:[\s\S]{0,80}busy[\s\S]{0,80}hasInput:/
  );
  assert.match(
    create,
    /canRetryGenerateFailure\([\s\S]{0,400}\)\s*\?\s*\(\)\s*=>[\s\S]{0,600}:\s*undefined/
  );
  // Mobile strip also gets recoveryChecking for detach parity
  assert.match(
    create,
    /GenerateWaitMobileStrip[\s\S]{0,400}recoveryChecking=\{recoveringSavedResult\}/
  );

  const fail = read("components/GenerateFailPanel.tsx");
  assert.match(fail, /fail\.unconfirmed|Refund unconfirmed|refund unconfirmed/i);
  assert.match(fail, /fail\.restored|credits restored|10 restored/i);
  assert.match(fail, /retryAfterSec|waitLeft|Retry in/);
  assert.match(fail, /disabled=\{retryLocked\}/);
  // Panel only renders Retry when onRetry is passed — callers own the gate
  assert.match(fail, /\{onRetry \? \(/);

  const landing = read("components/LandingToolPanel.tsx");
  assert.match(landing, /canRetryGenerateFailure/);
  assert.match(landing, /lastFailCode/);
  assert.match(landing, /lastFailFatal/);
  assert.match(landing, /lastFailPaywall/);
  assert.match(landing, /setFailCreditState\("refund unconfirmed"\)/);
  // AIT-237: Landing fail Retry is the same pure gate (auth/paywall/balance/reconcile)
  assert.match(
    landing,
    /canRetryGenerateFailure\(\{[\s\S]{0,220}code: lastFailCode[\s\S]{0,120}fatal: lastFailFatal[\s\S]{0,120}paywall:[\s\S]{0,100}busy[\s\S]{0,80}hasInput:/
  );
  assert.match(
    landing,
    /canRetryGenerateFailure\([\s\S]{0,400}\)\s*\?\s*\(\)\s*=>[\s\S]{0,500}:\s*undefined/
  );

  const client = read("lib/generateClient.ts");
  assert.match(client, /awaiting_primary/);
  assert.match(client, /onInconclusiveRecovery/);
  assert.match(client, /maxWaitMs/);
  // Recovery poll is finite — cannot stick forever in checking/waiting
  assert.match(client, /185_000|maxWaitMs/);
}

// ─── 5. BatchStudio residual — recovery exit + Retry gate + detach ─────────

{
  const batch = read("components/BatchStudio.tsx");
  assert.match(batch, /canRetryGenerateFailure/);
  assert.match(batch, /planGenerateWaitLeave/);
  assert.match(batch, /leaveWaitingKeepBackground/);
  assert.match(batch, /cancelInFlightPack/);
  assert.match(batch, /lastFailCode/);
  assert.match(batch, /lastFailFatal/);
  assert.match(batch, /lastFailPaywall/);
  assert.match(batch, /recoveringSavedResult/);
  assert.match(batch, /awaitingPrimaryAfterRecovery/);
  assert.match(batch, /onRecoveryState/);
  assert.match(batch, /awaiting_primary/);
  assert.match(batch, /detachedWaitRef/);
  assert.match(batch, /data-generate-leave="detach"/);
  assert.match(batch, /data-generate-leave="cancel"/);
  assert.match(
    batch,
    /GenerateWaitStage[\s\S]{0,600}onLeaveToLibrary=\{leaveWaitingKeepBackground\}/
  );
  assert.match(
    batch,
    /GenerateWaitStage[\s\S]{0,800}recoveryChecking=\{recoveringSavedResult\}/
  );
  assert.match(
    batch,
    /GenerateWaitMobileStrip[\s\S]{0,400}recoveryChecking=\{recoveringSavedResult\}/
  );
  assert.match(
    batch,
    /canRetryGenerateFailure\(\{[\s\S]{0,200}code: lastFailCode/
  );
  // recovery_unavailable never reads as permanent "Checking…"
  assert.match(batch, /Status unavailable · refresh/);
  assert.doesNotMatch(
    batch,
    /recovery_unavailable"\) return "Checking status"/
  );
  // Unmount must not auto-abort (would kill detach leave)
  assert.match(batch, /packMountedRef\.current = false/);
  assert.doesNotMatch(
    batch,
    /return \(\) => \{\s*window\.clearTimeout\(t\);\s*packAbortRef\.current\?\.abort\(\)/
  );
}

// ─── 6. package.json script registered ─────────────────────────────────────

{
  const pkg = JSON.parse(read("package.json"));
  assert.equal(
    pkg.scripts["generate-wait-honesty-regression"],
    "node --experimental-strip-types scripts/generate-wait-honesty-regression.mjs"
  );
}


// ─── 7. AIT-334 residual — Bearer on cancel + refund exit honesty ──────────

{
  const client = read("lib/generateClient.ts");
  // cancelGenerateLedger must attach auth headers when present (owner cancel)
  assert.match(
    client,
    /async function cancelGenerateLedger[\s\S]{0,1200}generateAuthHeaders\(\)/
  );
  assert.match(
    client,
    /pollDurableGenerateRecovery[\s\S]{0,1200}generateAuthHeaders\(\)/
  );
  // Recovery poll never invents success without authoritative terminal state
  assert.match(client, /isAuthoritativeRecoveryResult/);
  assert.match(client, /refundUnconfirmed: true/);

  const policy = read("lib/generateRecoveryPolicy.ts");
  assert.match(
    policy,
    /creditsRefunded === true/,
    "authoritative recovery failure requires confirmed refund"
  );
  assert.match(policy, /DURABLE_CREDITS_UNAVAILABLE/);

  const create = read("components/CreateStudio.tsx");
  // Never claim restore while settlement is refund unconfirmed
  assert.match(
    create,
    /creditsRestored=\{[\s\S]{0,120}lastRefunded[\s\S]{0,80}refund unconfirmed/
  );
  assert.match(
    create,
    /setLastRefunded\(result\.creditsRefunded === true\)/
  );

  const wait = read("components/GenerateWaitStage.tsx");
  // Exit copy: charge language only — never "refund confirmed" on wait detach
  assert.doesNotMatch(
    wait,
    /refund confirmed|credits restored|10 restored/i
  );
  assert.match(wait, /no second (provider call or )?charge|no second charge/i);
}


console.log(
  "generate-wait-honesty-regression: PASS (detach on recovery · cancel vs detach · server-gated Retry · AIT-237 Create/Landing gate · fail-closed refund copy · Batch wiring)"
);
