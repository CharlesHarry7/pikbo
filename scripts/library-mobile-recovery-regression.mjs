import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Issue #68: Library mobile recovery CTA must surface active session jobs
// (video + still combined) instead of a duplicate /create door, and route the
// user back to the existing recovery panel via stable id + scroll/focus.
// Source-level contract — no provider, no API, no env.

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const lib = source("components/LibraryGrid.tsx");

// Combined count: activeJobs = video open + still open
assert.match(
  lib,
  /const activeJobs = sessionMeta\.open \+ sessionStillMeta\.open/,
  "activeJobs must combine video and still open counts (combined count)"
);

// Stable target: video recovery panel has stable id + tabIndex (focusable)
assert.match(
  lib,
  /id="library-session-jobs-panel"/,
  "video recovery panel must have a stable id"
);
assert.match(
  lib,
  /data-library-panel="session-jobs"[\s\S]{0,220}tabIndex=\{-1\}/,
  "video recovery panel must be programmatically focusable (tabIndex -1)"
);

// Stable target: still recovery panel has stable id + tabIndex (focusable)
assert.match(
  lib,
  /id="library-session-stills-panel"/,
  "still recovery panel must have a stable id"
);
assert.match(
  lib,
  /data-library-panel="session-stills"[\s\S]{0,220}tabIndex=\{-1\}/,
  "still recovery panel must be programmatically focusable (tabIndex -1)"
);

// Scroll/focus wiring: video-open → video panel, else still panel.
// One ternary encodes the video-only, still-only, and combined cases:
//   video-only  → sessionMeta.open > 0        → video panel
//   still-only  → sessionMeta.open === 0      → still panel
//   combined    → video wins (open > 0)       → video panel
assert.match(
  lib,
  /sessionMeta\.open > 0\s*\?\s*"library-session-jobs-panel"\s*:\s*"library-session-stills-panel"/,
  "review handler must target video panel when video open, else still panel"
);
assert.match(
  lib,
  /scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/,
  "review handler must scroll the target panel into view"
);
assert.match(
  lib,
  /\.focus\(\{ preventScroll: true \}\)/,
  "review handler must focus the target panel"
);
assert.match(
  lib,
  /document\.getElementById\(targetId\)/,
  "review handler must resolve the target by its stable id"
);

// Active state: accessible Review button with the combined count
assert.match(
  lib,
  /\{activeJobs > 0 \?\s*\(\s*<button[\s\S]{0,300}data-library-action="review-active"/,
  "activeJobs > 0 must render a Review button (not a /create link) in the sticky CTA"
);
assert.match(
  lib,
  /Review \{activeJobs\} active job/,
  "Review button must show the combined active job count"
);
assert.match(
  lib,
  /aria-label=\{`Review \$\{activeJobs\} active job/,
  "Review button must expose an accessible label with the count"
);
assert.match(
  lib,
  /data-library-active-jobs=\{activeJobs\}/,
  "stickyCta container must expose the active job count to the DOM"
);

// Active branch must not duplicate the /create door (no /create link when active)
{
  const activeBranch = lib.match(
    /\{activeJobs > 0 \?\s*\(\s*<button[\s\S]*?\)\s*:\s*\(\s*<Link/
  );
  assert.ok(
    activeBranch,
    "stickyCta must branch: Review button when active, else Create link"
  );
  assert.doesNotMatch(
    activeBranch[0],
    /\/create\?mode=seller-pack/,
    "active branch must not duplicate the /create?mode=seller-pack link"
  );
}

// Zero state preserves Create new Pack → /create?mode=seller-pack
assert.match(
  lib,
  /href="\/create\?mode=seller-pack"[\s\S]{0,140}data-library-action="seller-pack"/,
  "zero state must preserve Create new Pack link to /create?mode=seller-pack"
);
assert.match(
  lib,
  /Create new Pack/,
  "zero state must preserve Create new Pack label"
);

// Shared stickyCta for both empty and populated library (no duplicated CTA)
assert.match(
  lib,
  /data-library-state="empty"[\s\S]*?\{stickyCta\}/,
  "empty library must render the shared stickyCta"
);
assert.match(
  lib,
  /data-library-state="filled"[\s\S]*?\{stickyCta\}/,
  "populated library must render the shared stickyCta"
);

console.log("library mobile recovery regression: PASS");
