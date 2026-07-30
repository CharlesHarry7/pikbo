import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`showcase-evidence smoke failed: ${message}`);
  }
}

const showcase = read("lib/showcaseProjects.ts");
const evidenceGate = read("lib/showcaseEvidence.ts");
const demos = read("lib/demoVideos.ts");
const softLaunch = read("lib/softLaunch.ts");
const projectPage = read("app/projects/[slug]/page.tsx");
const videoTile = read("components/VideoTile.tsx");
const presetPreview = read("components/PresetPreviewCard.tsx");
const createStudio = read("components/CreateStudio.tsx");
const batchStudio = read("components/BatchStudio.tsx");
const meClient = read("lib/meClient.ts");

const proofList =
  softLaunch.match(/HOME_PROOF_SLUGS\s*=\s*\[([\s\S]*?)\]\s*as const/)?.[1] ??
  "";
const proofSlugs = [...proofList.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

const demoRows = [
  ...demos.matchAll(
    /\{\s*id:\s*"([^"]+)"[\s\S]*?preset:\s*"([^"]+)"[\s\S]*?mp4:\s*"([^"]+)"/g
  ),
].map((match) => ({
  id: match[1],
  preset: match[2],
  mp4: match[3],
}));
const homeRows = proofSlugs.map((slug) =>
  demoRows.find((row) => row.preset === slug)
);

assert(proofSlugs.length === 8, "homepage retention wall must freeze at 8 recipes");
assert(homeRows.every(Boolean), "every homepage recipe must resolve to a cached clip");
assert(
  new Set(homeRows.map((row) => row.mp4)).size === 8,
  "the 8 homepage previews must use 8 distinct video files"
);
assert(
  showcase.includes('provenance: "cached_prototype"') &&
    showcase.includes("referencePoster: demo.poster"),
  "Showcase registry must declare cached prototypes and reference posters"
);
assert(
  projectPage.includes("Not a verified provider input") &&
    projectPage.includes("provider task ID") &&
    projectPage.includes("showcaseEvidenceChecklist") &&
    projectPage.includes("Promotion locked"),
  "Inside Project must disclose the missing input/task link and show the evidence gate"
);

const truthSurface = [
  showcase,
  softLaunch,
  projectPage,
  read("components/ExploreProjectGrid.tsx"),
  read("components/ProjectCard.tsx"),
  read("components/HomeProjectsExplore.tsx"),
  read("components/HomeViralWall.tsx"),
  read("components/HfExploreHome.tsx"),
  read("lib/videoFeed.ts"),
].join("\n");

for (const forbidden of [
  /Official · cached/i,
  /official_cached/,
  /Lab\s*≥\s*4/i,
  /all scores\s*≥\s*4/i,
  /qualityScores/,
  /reviewerNotes/,
  /provisionalLabQualityLabel/,
  /passesHomeProofQuality/,
]) {
  assert(!forbidden.test(truthSurface), `truth surface contains ${forbidden}`);
}
assert(
  showcase.includes("assertShowcasePromotionGate(project)") &&
    showcase.includes("evidenceGatedProvenanceLabel(project)") &&
    evidenceGate.includes("assertShowcasePromotionGate(project)") &&
    evidenceGate.includes('project.provenance === "official_verified"'),
  "verified labels must remain behind the evidence promotion gate"
);
assert(
  !/\b[0-5](?:\.\d+)?\s*\/\s*5\b/.test(projectPage),
  "Inside Project must not show an unverified numeric score"
);
assert(
  videoTile.includes("data-concept-recipe-art") &&
    presetPreview.includes("data-concept-recipe-art"),
  "concept recipes must stay static and must not borrow cached videos"
);
assert(
  createStudio.includes(
    "const privateUploadEnabled = canUsePrivateLaunch(session)"
  ) &&
    createStudio.includes(
      "const demoMode = !privateUploadEnabled || labStill"
    ),
  "Create must use the strict private-launch capability and fail closed to cached preview"
);
assert(
  batchStudio.includes(
    "const privateUploadEnabled = canUsePrivateLaunch(me)"
  ) &&
    batchStudio.includes(
      "const demoMode = !privateUploadEnabled || labStill"
    ),
  "Seller Pack must use the same strict private-launch capability and fail closed"
);
assert(
  meClient.includes("export function canUsePrivateLaunch") &&
    meClient.includes("me?.signedIn === true") &&
    meClient.includes("me.canLiveGenerate === true") &&
    meClient.includes("me.durableCreditsActive === true") &&
    meClient.includes('me.mode === "live-generate"'),
  "shared private-launch capability must require auth, live permission, durable credits, and live mode"
);

console.log(
  `showcase-evidence smoke passed: ${proofSlugs.length} distinct cached previews, no numeric proof score, concepts static`
);
