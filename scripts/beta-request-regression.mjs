import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const route = readFileSync(join(root, "app/api/beta/request/route.ts"), "utf8");
const form = readFileSync(join(root, "components/BetaRequestForm.tsx"), "utf8");
const migration = readFileSync(join(root, "supabase/migrations/20260803020000_beta_requests.sql"), "utf8");

const contract = readFileSync(join(root, "lib/betaRequests.ts"), "utf8");
assert.match(contract, /INVALID_EMAIL/);
assert.match(contract, /CONSENT_REQUIRED/);
assert.match(contract, /INVALID_SHOP_URL/);
assert.match(contract, /ROLE_OPTIONS/);
assert.match(route, /takeToken/);
assert.match(route, /website/);
assert.match(route, /createBetaRequest/);
assert.match(form, /Request private beta/);
assert.match(form, /support@pikbo\.ai/);
assert.match(migration, /create table if not exists public\.beta_requests/);
assert.match(migration, /enable row level security/);
assert.match(migration, /revoke all on table public\.beta_requests/);

console.log("beta-request-regression: PASS");
