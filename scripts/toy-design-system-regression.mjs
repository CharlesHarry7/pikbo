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
  })
);
