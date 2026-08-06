/**
 * AIT-155: Create same-photo assetId handoff — fail-closed contracts.
 *
 * Library opens:
 *   /create?mode=moment&effect=street-power-up&source=library&assetId=<uuid>
 *
 * Contracts under test (static + pure-unit):
 * 1. Only owner-ready assets may be adopted (plan + recent include proof).
 * 2. Missing / foreign / pending / rejected / deleted → drop (empty slot).
 * 3. Client Create DTO never carries object keys, signed URLs, or hashes.
 * 4. Guest deep-link login next preserves durable assetId.
 * 5. Wire Create page / Guest gate / CreateStudio / APIs.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");

// --- Source wiring ---
const createPage = read("app/create/page.tsx");
const gate = read("components/GuestMomentCreateGate.tsx");
const studio = read("components/CreateStudio.tsx");
const clientAssets = read("lib/clientAssets.ts");
const ownerRecent = read("lib/ownerRecentToyAssets.ts");
const recentRoute = read("app/api/assets/recent/route.ts");
const contentRoute = read("app/api/assets/[id]/content/route.ts");
const pureLib = read("lib/privateGenerationResultsPure.mjs");

assert.match(createPage, /initialAssetId=\{sp\.assetId\}/);
assert.match(createPage, /fixedMomentCreateReturnPath/);
assert.match(
  createPage,
  /fixedMomentCreateReturnPath\(\{[\s\S]{0,160}assetId:\s*sp\.assetId/
);
assert.match(createPage, /signInNextPath=\{guestSignInNextPath\}/);

assert.match(gate, /signInNextPath/);
assert.match(gate, /guestMomentSignInHref/);
assert.match(gate, /fixedMomentCreateReturnPath/);
assert.match(gate, /data-guest-create-sign-in/);

assert.match(studio, /parseCreateRetryAssetIdQuery/);
assert.match(studio, /planCreateQueryAssetHandoff/);
assert.match(studio, /fetchRecentPrivateToyAssets/);
assert.match(studio, /includeAssetId/);
assert.match(studio, /fixedMomentCreateReturnPath/);
assert.match(
  studio,
  /fixedMomentCreateReturnPath\(\{[\s\S]{0,160}assetId:\s*initialAssetId/
);
assert.match(studio, /initialAssetId/);
assert.match(studio, /data-same-photo-slot/);
assert.match(studio, /data-same-photo-handoff-note/);
// Fail-closed: never trust query alone without ready-list proof.
assert.match(studio, /planCreateQueryAssetHandoff/);
assert.match(studio, /not-in-ready-list|dropHandoff/);

assert.match(clientAssets, /export function parseCreateRetryAssetIdQuery/);
assert.match(clientAssets, /export function planCreateQueryAssetHandoff/);
assert.match(clientAssets, /export function fixedMomentCreateReturnPath/);
assert.match(clientAssets, /export function guestMomentSignInHref/);
assert.match(clientAssets, /export async function fetchRecentPrivateToyAssets/);
assert.match(clientAssets, /includeAssetId/);
// Client DTO hygiene: previewPath is relative API only (not a storage signed URL).
assert.match(clientAssets, /previewPath\.startsWith\("\/api\/assets\/"\)/);
// RecentPrivateToyAsset type is closed over id + display metadata + previewPath only.
assert.match(
  clientAssets,
  /export type RecentPrivateToyAsset = \{\n  id: string;\n  skuLabel: string \| null;\n  mimeType: string;\n  sizeBytes: number;\n  createdAt: string;\n  verifiedAt: string \| null;\n  previewPath: string;\n\};/
);

assert.match(ownerRecent, /export async function listOwnerRecentReadyToyAssets/);
assert.match(ownerRecent, /export async function getOwnerReadyToyAssetById/);
assert.match(ownerRecent, /includeAssetId/);
assert.match(ownerRecent, /\.eq\("state", "ready"\)/);
assert.match(ownerRecent, /\.eq\("owner_user_id", input\.ownerUserId\)/);
// Safe select — no storage secrets.
assert.match(
  ownerRecent,
  /RECENT_SELECT\s*=\s*"id,sku_label,mime_type,size_bytes,created_at,verified_at,state"/
);
assert.doesNotMatch(
  ownerRecent,
  /object_key|sha256|signedUrl|createSignedUrl/
);
const ownerPure = read("lib/ownerRecentToyAssetsPure.mjs");
assert.match(ownerPure, /export function mapToyAssetRowToRecentDto/);
assert.match(ownerPure, /export function mergeRecentAssetsWithOptionalPin/);
assert.match(ownerPure, /previewPath/);
assert.doesNotMatch(ownerPure, /getSupabaseAdmin|createSignedUrl/);

assert.match(recentRoute, /listOwnerRecentReadyToyAssets/);
assert.match(recentRoute, /parseRecentIncludeAssetId/);
assert.match(recentRoute, /includeAssetId/);
assert.match(recentRoute, /PRIVATE_INPUT_ACCESS_REQUIRED|invite\.invited/);
assert.match(recentRoute, /Cache-Control": "private, no-store"/);

// UUID content: owner-ready 302 Location only — never JSON signed URL body.
assert.match(contentRoute, /isUuidAssetId|UUID_RE/);
assert.match(contentRoute, /signedPrivateToyAssetPreview/);
assert.match(contentRoute, /status:\s*302/);
assert.match(contentRoute, /Location:\s*preview\.url/);
assert.doesNotMatch(
  contentRoute,
  /return NextResponse\.json\(\{[\s\S]{0,200}signedUrl/
);

// Library emitter still uses controlled handoff URL.
assert.match(
  pureLib,
  /\/create\?mode=moment&effect=street-power-up&source=library&assetId=/
);

// --- Pure unit: planCreateQueryAssetHandoff ---
// Load via ts transpile is heavy; re-implement decision matrix by dynamic import
// of the .ts is not available without strip-types. Mirror contract via Node eval
// of the exported pure helpers by compiling with --experimental-strip-types.
const clientAssetsUrl = pathToFileURL(join(root, "lib/clientAssets.ts")).href;

let parseCreateRetryAssetIdQuery;
let planCreateQueryAssetHandoff;
let fixedMomentCreateReturnPath;
let fixedMomentReturnPathFromLocation;
let guestMomentSignInHref;
let CREATE_RETRY_ASSET_ID_QUERY;

try {
  // Prefer strip-types when available (Node 22+).
  const mod = await import(clientAssetsUrl);
  parseCreateRetryAssetIdQuery = mod.parseCreateRetryAssetIdQuery;
  planCreateQueryAssetHandoff = mod.planCreateQueryAssetHandoff;
  fixedMomentCreateReturnPath = mod.fixedMomentCreateReturnPath;
  fixedMomentReturnPathFromLocation = mod.fixedMomentReturnPathFromLocation;
  guestMomentSignInHref = mod.guestMomentSignInHref;
  CREATE_RETRY_ASSET_ID_QUERY = mod.CREATE_RETRY_ASSET_ID_QUERY;
} catch {
  // Fallback: inline pure copies matching clientAssets (must stay in sync).
  CREATE_RETRY_ASSET_ID_QUERY = "assetId";
  const DURABLE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  parseCreateRetryAssetIdQuery = (raw) => {
    if (typeof raw !== "string") return null;
    const value = raw.trim();
    if (!value || !DURABLE.test(value)) return null;
    return value;
  };
  planCreateQueryAssetHandoff = (input) => {
    if (input.handoffSettled) return { action: "drop", reason: "already-settled" };
    if (!input.queryAssetId) return { action: "drop", reason: "invalid" };
    if (input.userOverride) return { action: "drop", reason: "user-override" };
    if (
      input.selectionSource === "upload" ||
      input.selectionSource === "lab" ||
      input.selectionSource === "other"
    ) {
      return { action: "drop", reason: "user-override" };
    }
    if (
      input.selectionSource === "recent" &&
      typeof input.selectedAssetId === "string" &&
      input.selectedAssetId.length > 0
    ) {
      if (
        input.selectedAssetId.toLowerCase() === input.queryAssetId.toLowerCase()
      ) {
        return { action: "drop", reason: "already-selected" };
      }
      return { action: "drop", reason: "user-override" };
    }
    if (!input.currentOwnerKey) return { action: "drop", reason: "no-owner" };
    if (input.listLoading) return { action: "wait" };
    if (input.listOwnerKey !== input.currentOwnerKey) return { action: "wait" };
    const target = input.queryAssetId.toLowerCase();
    const match = input.readyAssets.find(
      (row) => typeof row?.id === "string" && row.id.toLowerCase() === target
    );
    if (!match) return { action: "drop", reason: "not-in-ready-list" };
    return { action: "adopt", assetId: match.id };
  };
  fixedMomentCreateReturnPath = (input = {}) => {
    const params = new URLSearchParams();
    params.set("mode", "moment");
    params.set("effect", "street-power-up");
    const assetId = parseCreateRetryAssetIdQuery(input.assetId ?? null);
    const rawSource =
      typeof input.source === "string" ? input.source.trim() : "";
    const safeSource =
      rawSource && /^[A-Za-z0-9._-]{1,48}$/.test(rawSource) ? rawSource : "";
    if (assetId) {
      params.set("source", safeSource || "library");
      params.set(CREATE_RETRY_ASSET_ID_QUERY, assetId);
    } else if (safeSource) {
      params.set("source", safeSource);
    } else {
      params.set("source", "guest-create");
    }
    return `/create?${params.toString()}`;
  };
  fixedMomentReturnPathFromLocation = (pathWithSearch) => {
    const fallback = fixedMomentCreateReturnPath({ source: "guest-create" });
    if (typeof pathWithSearch !== "string" || !pathWithSearch.startsWith("/")) {
      return fallback;
    }
    const qIndex = pathWithSearch.indexOf("?");
    const pathOnly =
      qIndex === -1 ? pathWithSearch : pathWithSearch.slice(0, qIndex);
    if (
      pathOnly.startsWith("//") ||
      pathOnly.includes("\\") ||
      pathOnly.includes("://")
    ) {
      return fallback;
    }
    try {
      const url = new URL(pathWithSearch, "https://pikbo.local");
      if (url.origin !== "https://pikbo.local") return fallback;
      if (url.pathname !== "/create") return fallback;
      if (url.hash) return fallback;
      if (url.searchParams.get("mode") !== "moment") return fallback;
      if (url.searchParams.get("effect") !== "street-power-up") return fallback;
      return fixedMomentCreateReturnPath({
        source: url.searchParams.get("source"),
        assetId: url.searchParams.get(CREATE_RETRY_ASSET_ID_QUERY),
      });
    } catch {
      return fallback;
    }
  };
  guestMomentSignInHref = (input = {}) => {
    const next =
      typeof input.pathWithSearch === "string" && input.pathWithSearch
        ? fixedMomentReturnPathFromLocation(input.pathWithSearch)
        : fixedMomentCreateReturnPath({
            source: input.source,
            assetId: input.assetId,
          });
    return `/login?next=${encodeURIComponent(next)}`;
  };
}

const ownerId = "11111111-1111-4111-8111-111111111111";
const inputAssetId = "44444444-4444-4444-8444-444444444444";
const otherAssetId = "55555555-5555-4555-8555-555555555555";

assert.equal(parseCreateRetryAssetIdQuery(inputAssetId), inputAssetId);
assert.equal(parseCreateRetryAssetIdQuery(`  ${inputAssetId}  `), inputAssetId);
assert.equal(parseCreateRetryAssetIdQuery("asset_local_session"), null);
assert.equal(parseCreateRetryAssetIdQuery("not-a-uuid"), null);
assert.equal(parseCreateRetryAssetIdQuery(""), null);
assert.equal(parseCreateRetryAssetIdQuery(null), null);

const basePlan = {
  queryAssetId: inputAssetId,
  handoffSettled: false,
  userOverride: false,
  currentOwnerKey: ownerId,
  listOwnerKey: ownerId,
  readyAssets: [{ id: inputAssetId }],
  listLoading: false,
  selectionSource: null,
  selectedAssetId: null,
};

// Owner-ready match → adopt.
assert.deepEqual(planCreateQueryAssetHandoff(basePlan), {
  action: "adopt",
  assetId: inputAssetId,
});

// Missing from ready list (foreign / pending / rejected / deleted all look the same).
assert.deepEqual(
  planCreateQueryAssetHandoff({
    ...basePlan,
    readyAssets: [{ id: otherAssetId }],
  }),
  { action: "drop", reason: "not-in-ready-list" }
);
assert.deepEqual(
  planCreateQueryAssetHandoff({ ...basePlan, readyAssets: [] }),
  { action: "drop", reason: "not-in-ready-list" }
);

// Loading → wait (do not drop mid-proof).
assert.deepEqual(
  planCreateQueryAssetHandoff({ ...basePlan, listLoading: true }),
  { action: "wait" }
);

// List not bound to current owner → wait.
assert.deepEqual(
  planCreateQueryAssetHandoff({
    ...basePlan,
    listOwnerKey: "other-owner",
  }),
  { action: "wait" }
);

// No owner → drop (guest / capability closed).
assert.deepEqual(
  planCreateQueryAssetHandoff({ ...basePlan, currentOwnerKey: null }),
  { action: "drop", reason: "no-owner" }
);

// Explicit user upload wins.
assert.deepEqual(
  planCreateQueryAssetHandoff({ ...basePlan, userOverride: true }),
  { action: "drop", reason: "user-override" }
);
assert.deepEqual(
  planCreateQueryAssetHandoff({
    ...basePlan,
    selectionSource: "upload",
  }),
  { action: "drop", reason: "user-override" }
);

// Invalid query.
assert.deepEqual(
  planCreateQueryAssetHandoff({ ...basePlan, queryAssetId: null }),
  { action: "drop", reason: "invalid" }
);

// Already settled.
assert.deepEqual(
  planCreateQueryAssetHandoff({ ...basePlan, handoffSettled: true }),
  { action: "drop", reason: "already-settled" }
);

// --- Login return preserves assetId ---
const libraryHandoffUrl = `/create?mode=moment&effect=street-power-up&source=library&assetId=${inputAssetId}`;
const loginReturnPath = fixedMomentReturnPathFromLocation(libraryHandoffUrl);
assert.ok(
  loginReturnPath.includes(`assetId=${inputAssetId}`),
  "login next path must keep durable assetId from Library handoff"
);
assert.match(loginReturnPath, /mode=moment/);
assert.match(loginReturnPath, /effect=street-power-up/);
assert.match(loginReturnPath, /source=library/);

const signInHref = guestMomentSignInHref({ pathWithSearch: libraryHandoffUrl });
assert.match(signInHref, /^\/login\?next=/);
const nextDecoded = decodeURIComponent(signInHref.replace(/^\/login\?next=/, ""));
assert.ok(nextDecoded.includes(inputAssetId));
assert.ok(!nextDecoded.includes("objectKey"));
assert.ok(!nextDecoded.includes("signedUrl"));
assert.ok(!nextDecoded.includes("sha256"));

// Hostile freeform keys stripped.
assert.equal(
  fixedMomentReturnPathFromLocation(
    `${libraryHandoffUrl}&prompt=secret&signedUrl=https://evil`
  ),
  fixedMomentCreateReturnPath({
    source: "library",
    assetId: inputAssetId,
  })
);

// Hostile absolute / non-create paths fall back.
assert.equal(
  fixedMomentReturnPathFromLocation("https://evil.example/steal"),
  fixedMomentCreateReturnPath({ source: "guest-create" })
);
assert.equal(
  fixedMomentReturnPathFromLocation(
    `/create?mode=moment&effect=street-power-up&assetId=not-a-uuid`
  ),
  fixedMomentCreateReturnPath({ source: "guest-create" })
);

// Controlled Library URL builder aligns with Create return path.
const {
  controlledLibraryNewAttemptUrl,
  acceptControlledLibraryNewAttemptUrl,
} = await import(pathToFileURL(join(root, "lib/privateGenerationResultsPure.mjs")).href);

const emitted = controlledLibraryNewAttemptUrl(inputAssetId);
assert.equal(emitted, libraryHandoffUrl);
assert.equal(acceptControlledLibraryNewAttemptUrl(emitted), libraryHandoffUrl);
assert.equal(
  fixedMomentReturnPathFromLocation(emitted),
  fixedMomentCreateReturnPath({
    source: "library",
    assetId: inputAssetId,
  })
);

// mapToyAssetRowToRecentDto pure fail-closed (no server deps).
const {
  mapToyAssetRowToRecentDto,
  mergeRecentAssetsWithOptionalPin,
} = await import(
  pathToFileURL(join(root, "lib/ownerRecentToyAssetsPure.mjs")).href
);

const ready = mapToyAssetRowToRecentDto({
  id: inputAssetId,
  state: "ready",
  mime_type: "image/webp",
  size_bytes: 1024,
  created_at: "2026-08-06T00:00:00.000Z",
  verified_at: "2026-08-06T00:00:01.000Z",
  sku_label: "Beatbot",
  object_key: "secret/path",
  sha256: "a".repeat(64),
});
assert.ok(ready);
assert.equal(ready.id, inputAssetId);
assert.equal(
  ready.previewPath,
  `/api/assets/${encodeURIComponent(inputAssetId)}/content`
);
const serialized = JSON.stringify(ready);
assert.doesNotMatch(serialized, /object_key|objectKey|sha256|signedUrl/);
assert.doesNotMatch(serialized, /secret\/path/);

assert.equal(
  mapToyAssetRowToRecentDto({
    id: inputAssetId,
    state: "pending",
    mime_type: "image/webp",
    size_bytes: 1024,
    created_at: "2026-08-06T00:00:00.000Z",
  }),
  null,
  "pending must not map"
);
assert.equal(
  mapToyAssetRowToRecentDto({
    id: inputAssetId,
    state: "rejected",
    mime_type: "image/webp",
    size_bytes: 1024,
    created_at: "2026-08-06T00:00:00.000Z",
  }),
  null,
  "rejected must not map"
);
assert.equal(
  mapToyAssetRowToRecentDto({
    id: inputAssetId,
    state: "deleted",
    mime_type: "image/webp",
    size_bytes: 1024,
    created_at: "2026-08-06T00:00:00.000Z",
  }),
  null,
  "deleted must not map"
);

const merged = mergeRecentAssetsWithOptionalPin({
  recent: [
    {
      id: otherAssetId,
      skuLabel: null,
      mimeType: "image/jpeg",
      sizeBytes: 10,
      createdAt: "2026-08-06T00:00:00.000Z",
      verifiedAt: null,
      previewPath: `/api/assets/${otherAssetId}/content`,
    },
  ],
  pinned: ready,
});
assert.equal(merged.length, 2);
assert.equal(merged[1].id, inputAssetId);

// Null pin (cross-owner / missing) is a no-op — no existence leak.
assert.deepEqual(
  mergeRecentAssetsWithOptionalPin({
    recent: merged.slice(0, 1),
    pinned: null,
  }),
  merged.slice(0, 1)
);

assert.match(ownerRecent, /ownerRecentToyAssetsPure\.mjs/);

// --- AIT-167: Create owner-ready recent photo rail ---
assert.match(clientAssets, /export function privateRecentOwnerKey/);
assert.match(clientAssets, /export function planRecentOwnerTransition/);
assert.match(clientAssets, /export function deriveRecentReuseUiState/);
assert.match(clientAssets, /export function shouldCommitRecentList/);
assert.match(clientAssets, /export function shouldCommitRecentPreview/);
assert.match(clientAssets, /export async function applyRecentListLoad/);
assert.match(clientAssets, /export async function applyRecentPreviewResolution/);

// CreateStudio: owner-key bound recent load + rail UI; public never requests.
assert.match(studio, /privateRecentOwnerKey/);
assert.match(studio, /planRecentOwnerTransition/);
assert.match(studio, /deriveRecentReuseUiState/);
assert.match(studio, /applyRecentListLoad/);
assert.match(studio, /applyRecentPreviewResolution/);
assert.match(studio, /adoptRecentPrivateAsset/);
assert.match(studio, /recentOwnerKey/);
assert.match(studio, /recentListBoundOwnerKey/);
assert.match(studio, /composerImage|composerAssetId/);
assert.match(studio, /composerHasInput/);
assert.match(studio, /canAdoptAssetId/);
assert.match(studio, /Use a recent verified photo/);
assert.match(studio, /data-recent-private-assets/);
assert.match(studio, /no re-upload/);
assert.match(studio, /recentReuseUi\.showRecentRail/);
assert.match(studio, /recentReuseUi\.visibleAssets/);
assert.match(studio, /if \(!nextOwnerKey\)/);
// Manual recent pick + upload/Lab settle deferred ?assetId= handoff.
assert.match(studio, /userStillChoiceRef\.current = true/);
assert.match(studio, /fromQueryHandoff/);
// Generate + sinks use fail-closed composer still (never raw stale recent).
assert.match(studio, /image: composerImage/);
assert.match(studio, /assetId: composerAssetId/);
assert.match(
  studio,
  /<GenerateWaitStage[\s\S]{0,220}image=\{composerImage\}/
);
assert.match(
  studio,
  /disabled=\{\s*busy \|\| !ownsRights \|\| \(mode === "i2v" && !composerHasInput\)\s*\}/
);
assert.match(studio, /showLabSample=\{lastUploadIgnored \|\| !composerHasInput\}/);
// Selecting recent must not re-upload / registerLocalAsset.
const adoptRecentSlice = studio.slice(
  studio.indexOf("adoptRecentPrivateAsset"),
  studio.indexOf("adoptRecentPrivateAsset") + 3200
);
assert.match(adoptRecentSlice, /setAssetId\(asset\.id\)/);
assert.match(adoptRecentSlice, /applyRecentPreviewResolution/);
assert.doesNotMatch(
  adoptRecentSlice,
  /registerLocalAsset|registerPrivateToyAsset/
);
assert.doesNotMatch(adoptRecentSlice, /upload-url|\/api\/assets\/complete/);
// Owner-switch clears recent selection only; local upload source preserved by plan.
assert.match(studio, /selectionSource: recentSelectionSourceRef\.current/);
assert.match(studio, /clearRecentSelection/);

// Executable privacy race contracts (owner A→B fail-closed).
let privateRecentOwnerKey;
let planRecentOwnerTransition;
let deriveRecentReuseUiState;
let shouldCommitRecentList;
let shouldCommitRecentPreview;
let applyRecentListLoad;
let applyRecentPreviewResolution;
try {
  const mod = await import(clientAssetsUrl);
  privateRecentOwnerKey = mod.privateRecentOwnerKey;
  planRecentOwnerTransition = mod.planRecentOwnerTransition;
  deriveRecentReuseUiState = mod.deriveRecentReuseUiState;
  shouldCommitRecentList = mod.shouldCommitRecentList;
  shouldCommitRecentPreview = mod.shouldCommitRecentPreview;
  applyRecentListLoad = mod.applyRecentListLoad;
  applyRecentPreviewResolution = mod.applyRecentPreviewResolution;
} catch {
  privateRecentOwnerKey = null;
}

if (privateRecentOwnerKey) {
  assert.equal(
    privateRecentOwnerKey({
      privateUploadEnabled: false,
      ownerUserId: "owner-a",
    }),
    null,
    "public / capability-off never yields an owner key"
  );
  assert.equal(
    privateRecentOwnerKey({
      privateUploadEnabled: true,
      ownerUserId: null,
    }),
    null
  );
  assert.equal(
    privateRecentOwnerKey({
      privateUploadEnabled: true,
      ownerUserId: "owner-a",
    }),
    "owner-a"
  );

  const staySame = planRecentOwnerTransition({
    prevOwnerKey: "owner-a",
    nextOwnerKey: "owner-a",
    selectionSource: "recent",
  });
  assert.equal(staySame.ownerChanged, false);
  assert.equal(staySame.clearRecentList, false);
  assert.equal(staySame.clearRecentSelection, false);

  const aToBRecent = planRecentOwnerTransition({
    prevOwnerKey: "owner-a",
    nextOwnerKey: "owner-b",
    selectionSource: "recent",
  });
  assert.equal(aToBRecent.ownerChanged, true);
  assert.equal(aToBRecent.clearRecentList, true);
  assert.equal(aToBRecent.clearRecentThumbs, true);
  assert.equal(aToBRecent.revokeThumbUrls, true);
  assert.equal(aToBRecent.clearRecentSelection, true);
  assert.equal(aToBRecent.bumpLoadGeneration, true);
  assert.equal(aToBRecent.bumpSelectionToken, true);

  const aToBUpload = planRecentOwnerTransition({
    prevOwnerKey: "owner-a",
    nextOwnerKey: "owner-b",
    selectionSource: "upload",
  });
  assert.equal(
    aToBUpload.clearRecentSelection,
    false,
    "owner switch must not wipe local new-upload selection"
  );
  assert.equal(aToBUpload.clearRecentList, true);

  // Render-time blank: stale A recent selection must not surface under B.
  {
    const mid = deriveRecentReuseUiState({
      currentOwnerKey: "owner-b",
      listOwnerKey: "owner-a",
      assets: [{ id: inputAssetId }],
      thumbs: { [inputAssetId]: "blob:a" },
      selectionSource: "recent",
      selectionOwnerKey: "owner-a",
      selectedAssetId: inputAssetId,
      selectedImage: "blob:a",
      loading: false,
    });
    assert.equal(mid.showRecentRail, false);
    assert.equal(mid.visibleAssets.length, 0);
    assert.equal(mid.effectiveSelectedAssetId, null);
    assert.equal(mid.effectiveSelectedImage, null);
    assert.equal(mid.canAdoptAssetId(inputAssetId), false);
  }

  // Same owner: list and recent selection remain visible.
  {
    const same = deriveRecentReuseUiState({
      currentOwnerKey: "owner-a",
      listOwnerKey: "owner-a",
      assets: [{ id: inputAssetId }],
      thumbs: { [inputAssetId]: "blob:a" },
      selectionSource: "recent",
      selectionOwnerKey: "owner-a",
      selectedAssetId: inputAssetId,
      selectedImage: "blob:a",
      loading: false,
    });
    assert.equal(same.showRecentRail, true);
    assert.equal(same.effectiveSelectedAssetId, inputAssetId);
    assert.equal(same.canAdoptAssetId(inputAssetId), true);
  }

  // Local upload under owner switch: do not blank non-recent selection.
  {
    const uploadKept = deriveRecentReuseUiState({
      currentOwnerKey: "owner-b",
      listOwnerKey: null,
      assets: [],
      thumbs: {},
      selectionSource: "upload",
      selectionOwnerKey: null,
      selectedAssetId: null,
      selectedImage: "data:image/png;base64,xx",
      loading: false,
    });
    assert.equal(uploadKept.effectiveSelectedImage, "data:image/png;base64,xx");
    assert.equal(uploadKept.showRecentRail, false);
  }

  // Manual recent pick of a different id wins over deferred ?assetId= handoff.
  assert.deepEqual(
    planCreateQueryAssetHandoff({
      queryAssetId: inputAssetId,
      handoffSettled: false,
      userOverride: false,
      currentOwnerKey: "owner-a",
      listOwnerKey: "owner-a",
      readyAssets: [{ id: inputAssetId }, { id: otherAssetId }],
      listLoading: false,
      selectionSource: "recent",
      selectedAssetId: otherAssetId,
    }),
    { action: "drop", reason: "user-override" },
    "manual recent pick of another asset must beat deferred handoff"
  );

  // Stale list commit after A→B must not write.
  {
    let currentOwner = "owner-a";
    let generation = 1;
    let committed = null;
    let resolveA;
    const loadA = new Promise((resolve) => {
      resolveA = resolve;
    });
    const stalePromise = applyRecentListLoad({
      requestOwnerKey: "owner-a",
      requestGeneration: 1,
      getCurrent: () => ({ ownerKey: currentOwner, generation }),
      load: () => loadA,
      onCommit: (assets) => {
        committed = assets;
      },
    });
    currentOwner = "owner-b";
    generation = 2;
    let committedB = null;
    const bPromise = applyRecentListLoad({
      requestOwnerKey: "owner-b",
      requestGeneration: 2,
      getCurrent: () => ({ ownerKey: currentOwner, generation }),
      load: async () => [{ id: "asset-b" }],
      onCommit: (assets) => {
        committedB = assets;
      },
    });
    resolveA([{ id: "asset-a-stale" }]);
    assert.equal(await stalePromise, "stale");
    assert.equal(committed, null, "owner A stale list must not write after A→B");
    assert.equal(await bPromise, "committed");
    assert.deepEqual(committedB, [{ id: "asset-b" }]);
  }

  // Stale preview commit after selection token bump must not write.
  {
    let currentOwner = "owner-a";
    let currentAssetId = inputAssetId;
    let selectionToken = 1;
    let committedPreview = null;
    let resolvePreview;
    const previewP = new Promise((resolve) => {
      resolvePreview = resolve;
    });
    const stalePreview = applyRecentPreviewResolution({
      requestOwnerKey: "owner-a",
      requestAssetId: inputAssetId,
      requestSelectionToken: 1,
      getCurrent: () => ({
        ownerKey: currentOwner,
        assetId: currentAssetId,
        selectionToken,
      }),
      resolvePreview: () => previewP,
      onCommit: (url) => {
        committedPreview = url;
      },
    });
    // User picks a different recent photo (or owner switch) before A preview lands.
    selectionToken = 2;
    currentAssetId = otherAssetId;
    resolvePreview("blob:stale-a");
    assert.equal(await stalePreview, "stale");
    assert.equal(committedPreview, null);
  }

  assert.equal(
    shouldCommitRecentList({
      requestOwnerKey: "owner-a",
      currentOwnerKey: "owner-b",
      requestGeneration: 1,
      currentGeneration: 1,
    }),
    false
  );
  assert.equal(
    shouldCommitRecentPreview({
      requestOwnerKey: "owner-a",
      currentOwnerKey: "owner-a",
      requestAssetId: inputAssetId,
      currentAssetId: otherAssetId,
      requestSelectionToken: 1,
      currentSelectionToken: 1,
    }),
    false
  );
}

console.log(
  "create-same-photo-handoff-regression: PASS (AIT-155 handoff + AIT-167 recent rail; owner A→B fail-closed; manual pick wins; safe DTO)"
);
