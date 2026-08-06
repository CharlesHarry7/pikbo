/**
 * AIT-348 — Image studio fail Retry residual
 * (canRetryGenerateFailure parity with Create/Landing/Batch after AIT-334).
 *
 * Source contract (no network, no provider):
 * 1. canRetryGenerateFailure blocks auth/paywall/fatal/durable-hold
 * 2. refund unconfirmed still allows Retry (copy warns check balance)
 * 3. Image studio Fail panel only passes onRetry when the pure gate allows
 * 4. imageClient surfaces fatal/paywall for gate inputs (generateClient parity)
 * 5. Never invent restore on Fail panel (only "10 restored" settlement)
 *
 * Run: npm run image-studio-fail-retry-regression
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canRetryGenerateFailure } from "../lib/generateRecoveryPolicy.ts";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

// ─── 1. Pure gate — still residual matches generate-wait honesty ───────────

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
      code: "DURABLE_CREDITS_UNAVAILABLE",
      hasInput: true,
    }),
    false,
    "reconcile hold must not re-POST still"
  );
  assert.equal(
    canRetryGenerateFailure({
      code: "PROVIDER_NETWORK",
      hasInput: false,
    }),
    false,
    "empty prompt → no Retry still"
  );
  assert.equal(
    canRetryGenerateFailure({
      code: "PROVIDER_NETWORK",
      hasInput: true,
      busy: true,
    }),
    false,
    "busy still generate blocks Retry"
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

// ─── 2. Policy export still present ────────────────────────────────────────

{
  const policy = read("lib/generateRecoveryPolicy.ts");
  assert.match(policy, /export function canRetryGenerateFailure/);
  assert.match(policy, /AUTH_REQUIRED/);
  assert.match(policy, /DURABLE_CREDITS_UNAVAILABLE/);
  assert.match(policy, /INSUFFICIENT_CREDITS/);
  assert.match(policy, /PROVIDER_BALANCE/);
}

// ─── 3. imageClient — fatal/paywall + refund honesty ───────────────────────

{
  const client = read("lib/imageClient.ts");
  assert.match(client, /fatal\?: boolean/);
  assert.match(client, /paywall\?: boolean/);
  assert.match(
    client,
    /const paywall = code === "INSUFFICIENT_CREDITS"/
  );
  assert.match(
    client,
    /const fatal =\s*code === "INSUFFICIENT_CREDITS" \|\| code === "PROVIDER_BALANCE"/
  );
  // Durable hold never claims refund + never marks paywall/fatal invent
  assert.match(
    client,
    /DURABLE_CREDITS_UNAVAILABLE[\s\S]{0,500}fatal:\s*false[\s\S]{0,80}paywall:\s*false/
  );
  // Never invent restore without creditsRefunded === true
  assert.match(client, /creditsRefunded === true/);
  assert.match(client, /refundUnconfirmed/);
  assert.match(client, /export async function postImageWithRetry/);
  assert.match(client, /interpretImageResponse/);
}

// ─── 4. Image studio Fail panel wiring ─────────────────────────────────────

{
  const page = read("app/image/page.tsx");
  assert.match(page, /canRetryGenerateFailure/);
  assert.match(page, /from ["']@\/lib\/generateRecoveryPolicy["']/);
  assert.match(page, /lastFailCode/);
  assert.match(page, /lastFailFatal/);
  assert.match(page, /lastFailPaywall/);
  assert.match(page, /recordFailGate/);
  assert.match(page, /clearFailGate/);
  assert.match(page, /GenerateFailPanel/);
  assert.match(page, /failCreditState/);
  assert.match(page, /retryAfterSec=\{failRetryAfterSec\}/);
  // Gate owns onRetry — no bare !busy invent
  assert.match(
    page,
    /canRetryGenerateFailure\(\{[\s\S]{0,220}code: lastFailCode[\s\S]{0,120}fatal: lastFailFatal[\s\S]{0,120}paywall: lastFailPaywall[\s\S]{0,100}busy[\s\S]{0,80}hasInput:/
  );
  assert.match(
    page,
    /canRetryGenerateFailure\([\s\S]{0,400}\)\s*\?\s*\(\)\s*=>[\s\S]{0,500}:\s*undefined/
  );
  // Prompt length is the still "input" for re-POST
  assert.match(page, /hasInput:\s*prompt\.trim\(\)\.length\s*>=\s*4/);
  // Fail path records code + fatal + paywall from imageClient result
  assert.match(
    page,
    /recordFailGate\(\{[\s\S]{0,120}code: result\.code[\s\S]{0,120}fatal:[\s\S]{0,80}paywall:/
  );
  // Restore only when settlement says restored (never invent on unconfirmed)
  assert.match(
    page,
    /creditsRestored=\{failCreditState === "10 restored"\}/
  );
  assert.match(page, /requestCreditStateFromFailure/);
  assert.match(page, /refund unconfirmed|failCreditState/);
  // New attempt clears gate
  assert.match(page, /clearFailGate\(\)/);
}

// ─── 5. Fail panel contract — callers own the gate ─────────────────────────

{
  const fail = read("components/GenerateFailPanel.tsx");
  assert.match(fail, /\{onRetry \? \(/);
  assert.match(fail, /disabled=\{retryLocked\}/);
  assert.match(fail, /fail\.unconfirmed|Refund unconfirmed|refund unconfirmed/i);
  assert.match(fail, /fail\.restored|credits restored|10 restored/i);
}

// ─── 6. package.json script registered ─────────────────────────────────────

{
  const pkg = JSON.parse(read("package.json"));
  assert.equal(
    pkg.scripts["image-studio-fail-retry-regression"],
    "node --experimental-strip-types scripts/image-studio-fail-retry-regression.mjs"
  );
}

console.log(
  "image-studio-fail-retry-regression: PASS (canRetry gate · imageClient fatal/paywall · Image studio Fail onRetry parity · refund honesty)"
);
