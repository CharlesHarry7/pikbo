#!/usr/bin/env node
/**
 * AIT-32: 潮玩 design system contract — tokens + Library collector surface.
 * Fail-closed pure checks; no network, no Provider, no secrets.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "app/globals.css"), "utf8");
const libraryPage = readFileSync(join(root, "app/library/page.tsx"), "utf8");
const libraryGrid = readFileSync(join(root, "components/LibraryGrid.tsx"), "utf8");
const createPage = readFileSync(join(root, "app/create/page.tsx"), "utf8");
const guestGate = readFileSync(
  join(root, "components/GuestMomentCreateGate.tsx"),
  "utf8"
);
const createStudio = readFileSync(
  join(root, "components/CreateStudio.tsx"),
  "utf8"
);
const waitStage = readFileSync(
  join(root, "components/GenerateWaitStage.tsx"),
  "utf8"
);
const failPanel = readFileSync(
  join(root, "components/GenerateFailPanel.tsx"),
  "utf8"
);

const errors = [];

function must(cond, msg) {
  if (!cond) errors.push(msg);
}

// 8-color palette tokens
const palette = [
  "--toy-ink",
  "--toy-ink-soft",
  "--toy-paper",
  "--toy-bubblegum",
  "--toy-grape",
  "--toy-mango",
  "--toy-aqua",
  "--toy-lime",
];
for (const token of palette) {
  must(css.includes(token), `missing palette token ${token}`);
}

// dual type roles
must(css.includes("--font-display"), "missing --font-display");
must(css.includes("--font-sans"), "missing --font-sans");
must(
  /ui-rounded|SF Pro Rounded|Nunito/.test(css),
  "display stack should include rounded geometric faces"
);

// four card types
for (const card of [
  ".collection-card",
  ".result-card",
  ".pricing-card",
  ".status-card",
]) {
  must(css.includes(card), `missing card type ${card}`);
}

// micro-interactions
for (const motion of [
  "sticker-pop",
  "capsule-float",
  "foil-shimmer",
  "status-pulse",
]) {
  must(css.includes(motion), `missing motion token ${motion}`);
}

// no SaaS-blue primary brand lock-in in design system (sky used only as rare util)
must(css.includes("--toy-sky-pop"), "cool util should be explicit rare token");
must(
  !/^\s*--brand:\s*#0{0,2}[0-9a-f]*blue/im.test(css),
  "brand must not be generic blue"
);

// Library page uses collector system
must(libraryPage.includes("library-cabinet"), "Library page missing cabinet shell");
must(libraryPage.includes("collection-card"), "Library page missing collection-card");
must(libraryPage.includes("status-card"), "Library page missing status-card");
must(libraryPage.includes("toy-sticker"), "Library page missing stickers");
must(
  !libraryPage.includes("site.homeH1") && !libraryPage.includes("titleDefault"),
  "Library must not mutate frozen TDH from site.ts"
);

// LibraryGrid: toy status tones, not sky SaaS blues
must(libraryGrid.includes("result-card"), "LibraryGrid missing result-card");
must(libraryGrid.includes("toy-dot-ready"), "LibraryGrid missing toy-dot-ready");
must(libraryGrid.includes("toy-sticker-aqua"), "LibraryGrid missing aqua sticker");
must(!libraryGrid.includes("text-sky-200"), "LibraryGrid still uses SaaS sky tone");
must(!libraryGrid.includes("bg-sky-300"), "LibraryGrid still uses SaaS sky dots");
must(
  libraryGrid.includes("data-library-action") ||
    libraryGrid.includes("new-attempt"),
  "LibraryGrid must keep new-attempt handoff surface"
);

// Create ritual surface (guest study + owner chrome)
must(css.includes(".create-ritual"), "missing create-ritual shell");
must(css.includes(".create-sample-capsule"), "missing create sample capsule");
must(createPage.includes("create-ritual"), "Create page missing create-ritual");
must(createPage.includes("collection-card"), "Create page missing collection-card");
must(createPage.includes("status-card"), "Create page missing status-card");
must(createPage.includes("toy-sticker"), "Create page missing stickers");
must(
  createPage.includes("Street Power-Up") &&
    createPage.includes("fixedMomentContract"),
  "Create must keep fixed Street Power-Up contract"
);
must(
  !createPage.includes("site.homeH1") && !createPage.includes("titleDefault"),
  "Create must not mutate frozen TDH from site.ts"
);

must(guestGate.includes("create-ritual"), "Guest gate missing create-ritual");
must(guestGate.includes("collection-card"), "Guest gate missing collection-card");
must(guestGate.includes("result-card"), "Guest gate missing result-card");
must(guestGate.includes("status-card"), "Guest gate missing status-card");
must(guestGate.includes("toy-sticker"), "Guest gate missing stickers");
must(guestGate.includes("text-grad"), "Guest gate missing text-grad H1 treatment");
must(
  guestGate.includes("data-guest-create-first") &&
    guestGate.includes("not your toy"),
  "Guest gate must keep honest not-your-toy boundary"
);
must(
  !/\bupload\b|\bcredits\b|\bGenerate\b/.test(
    guestGate.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
  ),
  "Guest gate must not expose upload/credits/Generate in UI copy"
);

// AIT-33 Create loop surfaces (upload · wait · result · broken)
for (const token of [
  "--toy-pink-soft",
  "--toy-purple-soft",
  "--toy-neon",
  "--toy-gold",
  "--toy-electric",
  ".toy-upload-zone",
  ".toy-progress-fill",
  ".toy-shard-loader",
  ".toy-result-frame",
  ".btn-electric",
  ".btn-pink",
  ".toy-broken-card",
  "toy-card-flip",
]) {
  must(css.includes(token), `missing Create-loop token/class ${token}`);
}
must(css.includes("#ffb6d9") || css.includes("#FFB6D9"), "upload pink #FFB6D9");
must(css.includes("#c77dff") || css.includes("#C77DFF"), "purple #C77DFF");
must(css.includes("#39ff14") || css.includes("#39FF14"), "neon #39FF14");
must(css.includes("#ffc857") || css.includes("#FFC857"), "gold #FFC857");
must(css.includes("#00f0ff") || css.includes("#00F0FF"), "electric #00F0FF");
must(
  css.includes("Plus Jakarta Sans"),
  "display stack should prefer Plus Jakarta Sans for wait titles"
);

must(createStudio.includes("toy-upload-zone"), "CreateStudio missing upload zone");
must(createStudio.includes("toy-result-frame"), "CreateStudio missing gold result frame");
must(createStudio.includes("btn-electric"), "CreateStudio missing electric download");
must(createStudio.includes("btn-pink"), "CreateStudio missing pink regenerate");
must(createStudio.includes("toy-broken-card"), "CreateStudio missing broken-card error");
must(
  createStudio.includes("fixedMomentContract") &&
    createStudio.includes("postGenerateWithRetry"),
  "CreateStudio must keep generation handoff (visual-only change)"
);

must(waitStage.includes("toy-wait-stage"), "WaitStage missing status-card wait shell");
must(waitStage.includes("toy-progress-fill"), "WaitStage missing neon progress");
must(waitStage.includes("toy-shard-loader"), "WaitStage missing geometric loader");
must(waitStage.includes("toy-wait-title"), "WaitStage missing display-weight title");

must(failPanel.includes("toy-broken-card"), "FailPanel missing broken-card chrome");
must(failPanel.includes("data-fail-retry"), "FailPanel missing obvious retry control");

if (errors.length) {
  console.error("toy-design-system-regression FAIL:");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}
console.log("toy-design-system-regression OK");
console.log(
  JSON.stringify({
    palette: palette.length,
    cards: 4,
    library: "collector",
    create: "ritual+loop",
  })
);
