import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

for (const path of [
  "app/contact/page.tsx",
  "app/refund/page.tsx",
  "app/privacy/page.tsx",
  "app/terms/page.tsx",
]) {
  assert.ok(existsSync(join(root, path)), `${path} must exist`);
}

const company = read("lib/company.ts");
const site = read("lib/site.ts");
const about = read("app/about/page.tsx");
const contact = read("app/contact/page.tsx");
const pricing = read("app/pricing/page.tsx");
const refund = read("app/refund/page.tsx");
const privacy = read("app/privacy/page.tsx");
const terms = read("app/terms/page.tsx");
const footer = read("components/Footer.tsx");
const homeTrust = read("components/HomeTrustFooter.tsx");
const publicBusinessSources = [
  company,
  site,
  about,
  contact,
  pricing,
  refund,
  privacy,
  terms,
  footer,
  homeTrust,
];

assert.match(company, /Pikbo Labs LLC/);
assert.match(company, /Wyoming/);
assert.match(company, /remote from Beijing, China/);
assert.match(company, /launchPacksPerMonth:\s*3/);
assert.match(company, /videosPerPack:\s*3/);

assert.match(site, /supportEmail:\s*`support@\$\{SITE_DOMAIN\}`/);
assert.match(contact, /does not claim a US office or\s+storefront/);
assert.match(contact, /public checkout is closed/);
assert.match(contact, /Private beta/);
// Founding rate is shown; public live checkout stays closed / closed-intent.
assert.match(pricing, /\$\{foundingStudio\.priceMonthly\}|\$49|founding rate/i);
assert.match(
  pricing,
  /public(?: live)? payment remains locked|public live checkout remains gated|Checkout is closed|closed beta/i
);
assert.match(
  pricing,
  /Request private beta access|founding waitlist|founding-intent|private beta/i
);

for (const rule of [
  /cancel a paid subscription at any time/i,
  /within seven\s+calendar days/i,
  /duplicate charges/i,
  /restored automatically/i,
  /non-waivable consumer rights/i,
]) {
  assert.match(refund, rule);
}

assert.match(terms, /Refund Policy/);
assert.match(privacy, /Public paid checkout is currently closed/);
assert.match(footer, /\/contact/);
assert.match(footer, /\/refund/);
assert.match(homeTrust, /Pikbo Labs LLC|company\.legalName/);

for (const source of publicBusinessSources) {
  assert.doesNotMatch(
    source,
    /30 N Gould|Ste\s+[RN]\b|Sheridan,?\s+WY\s+82801/i,
    "registered-agent or mailing-suite addresses must not be presented as the operating address"
  );
  assert.doesNotMatch(
    source,
    /existing US customers|serving US customers|current revenue/i,
    "public copy must not invent US operations, customers, or revenue"
  );
}

console.log(
  "mercury-readiness-smoke: PASS (legal entity, truthful beta, founding rate + closed checkout, support/refund surfaces)"
);
