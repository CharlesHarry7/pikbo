import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requireRendered = process.argv.includes("--require-rendered");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`live-capability copy smoke failed: ${message}`);
  }
}

const publicPromiseFiles = [
  "lib/site.ts",
  "lib/jsonLd.ts",
  "lib/tools.ts",
  "lib/usecases.ts",
  "lib/guides.ts",
  "lib/presets.ts",
  "app/page.tsx",
  "app/create/page.tsx",
  "app/pricing/page.tsx",
  "app/apps/page.tsx",
  "app/apps/[slug]/page.tsx",
  "app/modules/page.tsx",
  "app/flow/page.tsx",
  "app/cinema/page.tsx",
  "components/HomeSeoBody.tsx",
  "components/PricingHeroCopy.tsx",
  "components/HfExploreHome.tsx",
  "components/SoftLaunchStrip.tsx",
];

const forbiddenUnconditional = [
  /Seedance live/i,
  /Pipeline is live/i,
  /Free live clip/i,
  /live Mini uses 10/i,
  /3 clips\s*\/\s*30 credits live/i,
  /Generate live/i,
  /Lab ≥4/i,
  /Free Mini trial(?:\s*[—·,:-]|\s+with|\s+for|\s*$)/i,
];

for (const relativePath of publicPromiseFiles) {
  const source = read(relativePath);
  for (const pattern of forbiddenUnconditional) {
    assert(
      !pattern.test(source),
      `${relativePath} contains unconditional public promise ${pattern}`
    );
  }
}

assert(
  read("lib/site.ts").includes("Preview cached Pikbo Lab prototypes"),
  "site metadata must lead with the cached validation path"
);
assert(
  /When private Live is enabled,\s+eligible invited accounts\s+can create private 5-second 720p results/.test(
    read("components/HomeSeoBody.tsx")
  ),
  "home SEO body must condition real generation on the private Live gate"
);
assert(
  read("components/PricingHeroCopy.tsx").includes(
    "Subscriptions open after the private beta proves quality, recovery, and sustainable cost."
  ),
  "pricing must keep subscriptions closed until private-beta proof"
);
assert(
  read("app/create/page.tsx").includes(
    "Live access and quotes are gated"
  ),
  "Create metadata must not promise public Live"
);
assert(
  read("lib/tools.ts").includes(
    "cached Pikbo Lab prototype for 0 credits"
  ),
  "rank tool must explain the cached path"
);

function walkHtml(directory) {
  if (!fs.existsSync(directory)) return [];
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walkHtml(absolute));
    else if (entry.isFile() && entry.name.endsWith(".html")) output.push(absolute);
  }
  return output;
}

// Rendered output is intentionally opt-in: a stale .next directory must never
// make the source-only pre-build contract fail.
const renderedFiles = requireRendered
  ? walkHtml(path.join(root, ".next", "server", "app"))
  : [];
if (requireRendered) {
  assert(renderedFiles.length > 0, "no built route HTML found; run next build first");
}

for (const absolute of renderedFiles) {
  const html = fs.readFileSync(absolute, "utf8");
  for (const pattern of forbiddenUnconditional) {
    assert(
      !pattern.test(html),
      `${path.relative(root, absolute)} renders forbidden promise ${pattern}`
    );
  }
}

console.log(
  `live-capability copy smoke: PASS (${publicPromiseFiles.length} source files, ${renderedFiles.length} rendered routes)`
);
