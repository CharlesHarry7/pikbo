import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const route = readFileSync(join(root, "app/api/beta/request/route.ts"), "utf8");
const form = readFileSync(join(root, "components/BetaRequestForm.tsx"), "utf8");
const migration = readFileSync(
  join(root, "supabase/migrations/20260803020000_beta_requests.sql"),
  "utf8"
);
const contact = readFileSync(join(root, "app/contact/page.tsx"), "utf8");
const about = readFileSync(join(root, "app/about/page.tsx"), "utf8");

const contract = readFileSync(join(root, "lib/betaRequests.ts"), "utf8");
assert.match(contract, /INVALID_EMAIL/);
assert.match(contract, /CONSENT_REQUIRED/);
assert.match(contract, /INVALID_SHOP_URL/);
assert.match(contract, /ROLE_OPTIONS/);
assert.match(route, /takeToken/);
assert.match(route, /website/);
assert.match(route, /createBetaRequest/);
assert.match(form, /Request 潮玩 private beta|Request private beta/);
assert.match(form, /site\.contact\.supportEmail|support@pikbo\.ai/);
assert.match(migration, /create table if not exists public\.beta_requests/);
assert.match(migration, /enable row level security/);
assert.match(migration, /revoke all on table public\.beta_requests/);
assert.match(contact, /BetaRequestForm/);
assert.match(contact, /Private beta/);
assert.match(contact, /public checkout is closed/);
assert.match(contact, /does not claim a US office or\s+storefront/);
assert.match(contact, /潮玩/);
assert.match(about, /Street Power-Up/);
assert.match(about, /Founding Studio/);
assert.match(about, /private Library/i);
assert.match(about, /CONCEPT_ROBOTS/);
assert.match(about, /Bring your designer toys to life|designer toys/i);
assert.match(about, /潮玩/);
assert.match(about, /What ships today/i);
// No lorem / generic placeholder copy on trust surfaces
assert.doesNotMatch(about, /lorem ipsum|placeholder text|your company name/i);
assert.doesNotMatch(contact, /lorem ipsum|placeholder text|your company name/i);
assert.doesNotMatch(
  about,
  /Explore wall|Community feed|batch generation marketplace/i
);
// Vision may name frozen surfaces as future/not-now — must not claim they are live.
assert.doesNotMatch(
  about,
  /Community is live|Explore is open|public community by default/i
);

console.log("beta-request-regression: PASS");
