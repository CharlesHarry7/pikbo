/** Pure private-result identity/host guards shared by runtime and no-network tests. */

function normalizedProviderHost(value) {
  const host = String(value).trim().toLowerCase().replace(/^\./, "");
  if (
    !host ||
    host.length > 253 ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
  ) {
    return null;
  }
  const labels = host.split(".");
  if (
    labels.length < 2 ||
    labels.some(
      (label) =>
        label.length === 0 ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)
    )
  ) {
    return null;
  }
  return host;
}

/**
 * Parse the operator allowlist as hostname-only entries. A single malformed
 * value invalidates the complete configuration so readiness and delivery
 * cannot disagree after a paid Provider call.
 *
 * @returns {string[]}
 */
export function parseProviderOutputHostAllowlist(value) {
  const entries = (
    Array.isArray(value) ? value : String(value || "").split(",")
  ).map((entry) => String(entry).trim());
  if (entries.every((entry) => !entry)) return [];
  if (entries.some((entry) => !entry)) return [];
  /** @type {string[]} */
  const hosts = [];
  for (const entry of entries) {
    const host = normalizedProviderHost(entry);
    if (!host) return [];
    hosts.push(host);
  }
  return [...new Set(hosts)];
}

export function providerOutputHostAllowed(value, allowlist) {
  const configuredHosts = parseProviderOutputHostAllowlist(allowlist);
  if (configuredHosts.length === 0) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      !host ||
      url.username ||
      url.password ||
      host === "localhost" ||
      host.endsWith(".localhost") ||
      /^(?:0|10|127|169\.254|172\.(?:1[6-9]|2\d|3[01])|192\.168)\./.test(
        host
      )
    ) {
      return false;
    }
    return configuredHosts.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`)
    );
  } catch {
    return false;
  }
}

export function privateResultObjectKey(input) {
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(input.userId) || !uuid.test(input.jobId)) return null;
  return `private-results/${input.userId.toLowerCase()}/${input.jobId.toLowerCase()}.mp4`;
}

/** Pure decision used after an ambiguous private Storage write is read back. */
export function privateStoredObjectMatches(input) {
  return (
    Number.isInteger(input.expectedByteLength) &&
    input.expectedByteLength >= 32 &&
    Number.isInteger(input.storedByteLength) &&
    input.storedByteLength === input.expectedByteLength &&
    typeof input.expectedChecksum === "string" &&
    /^[a-f0-9]{64}$/.test(input.expectedChecksum) &&
    input.storedChecksum === input.expectedChecksum
  );
}

/** Durable Library statuses that may surface to the owner after refresh/sign-in. */
export const PRIVATE_LIBRARY_STATUSES = Object.freeze([
  "queued",
  "running",
  "succeeded",
  "failed",
  "canceled",
]);

/**
 * Safe client-facing failure codes only. Never pass through freeform provider
 * text, stack traces, object keys, or storage metadata.
 */
const SAFE_LIBRARY_ERROR_CODES = new Set([
  "CONTENT_POLICY",
  "TIMEOUT",
  "PROVIDER_TIMEOUT",
  "PROVIDER_NETWORK",
  "PROVIDER_RATE_LIMIT",
  "RATE_LIMITED",
  "PROVIDER_BALANCE",
  "GENERATION_FAILED",
  "CANCELED",
  "PRIVATE_STORAGE_UNAVAILABLE",
  "PRIVATE_STORAGE_WRITE_FAILED",
  "PROVIDER_OUTPUT_HOST_BLOCKED",
  "PROVIDER_OUTPUT_FETCH_FAILED",
  "PROVIDER_OUTPUT_FETCH_TIMEOUT",
  "PROVIDER_OUTPUT_CONTENT_TYPE",
  "PROVIDER_OUTPUT_TOO_LARGE",
  "PROVIDER_OUTPUT_INVALID_SIZE",
  "PRIVATE_RESULT_RECORD_FAILED",
  "PRIVATE_RESULT_RECORD_UNCERTAIN",
  "PRIVATE_STORAGE_WRITE_UNCERTAIN",
  "LIVE_DISABLED",
  "INSUFFICIENT_CREDITS",
  "RIGHTS_REQUIRED",
]);

export function safeLibraryErrorCode(value) {
  if (typeof value !== "string") return undefined;
  const code = value.trim().toUpperCase().slice(0, 64);
  if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(code)) return undefined;
  return SAFE_LIBRARY_ERROR_CODES.has(code) ? code : "GENERATION_FAILED";
}

/**
 * Map a durable generation_jobs row to the owner-only Library DTO.
 * Never includes object keys, signed URLs, provider IDs, prompts, hashes,
 * user emails, or storage metadata.
 *
 * @param {Record<string, unknown>} row
 * @returns {null | {
 *   id: string,
 *   requestId: string,
 *   status: string,
 *   effect: string,
 *   demo: false,
 *   watermark: false,
 *   downloadAllowed: boolean,
 *   videoUrl?: string,
 *   errorCode?: string,
 *   model?: string,
 *   duration?: number,
 *   aspectRatio?: string,
 *   resolution?: string,
 *   creditsOutcome?: string,
 *   createdAt: string,
 *   updatedAt: string,
 *   owned: true,
 *   durable: true,
 *   adapter: "supabase-private",
 *   capabilities: {
 *     localRetry: false,
 *     localCancel: false,
 *     newAttempt: boolean,
 *     refreshOnly: boolean,
 *   },
 * }}
 */
export function privateLibraryJobFromRow(row) {
  if (!row || typeof row !== "object") return null;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const status = typeof row.status === "string" ? row.status.trim() : "";
  const effect =
    typeof row.effect_slug === "string" && row.effect_slug.trim()
      ? row.effect_slug.trim().slice(0, 120)
      : "";
  if (
    !id ||
    !effect ||
    !PRIVATE_LIBRARY_STATUSES.includes(status)
  ) {
    return null;
  }

  const createdAt =
    typeof row.created_at === "string" && row.created_at
      ? row.created_at
      : new Date(0).toISOString();
  const updatedAt =
    (typeof row.completed_at === "string" && row.completed_at) ||
    (typeof row.started_at === "string" && row.started_at) ||
    createdAt;

  const open = status === "queued" || status === "running";
  const terminalFailure = status === "failed" || status === "canceled";
  const deliverable =
    status === "succeeded" &&
    typeof row.output_object_key === "string" &&
    row.output_object_key.length > 0 &&
    row.output_content_type === "video/mp4";

  /** @type {ReturnType<typeof privateLibraryJobFromRow>} */
  const job = {
    id,
    requestId: id,
    status,
    effect,
    demo: false,
    watermark: false,
    downloadAllowed: deliverable,
    createdAt,
    updatedAt,
    owned: true,
    durable: true,
    adapter: "supabase-private",
    capabilities: {
      // Durable rows must never hit process-memory Retry/Cancel endpoints.
      localRetry: false,
      localCancel: false,
      // Honest new attempt via Create — not same-photo reuse yet.
      newAttempt: terminalFailure,
      refreshOnly: open,
    },
  };

  if (deliverable) {
    job.videoUrl = `/api/downloads/${encodeURIComponent(id)}`;
    job.creditsOutcome = "10 used";
  } else if (status === "failed") {
    job.creditsOutcome = "10 restored";
  } else if (status === "canceled") {
    job.creditsOutcome = "refund unconfirmed";
  }

  if (typeof row.model_id === "string" && row.model_id.trim()) {
    job.model = row.model_id.trim().slice(0, 160);
  }
  if (typeof row.duration_seconds === "number" && Number.isFinite(row.duration_seconds)) {
    job.duration = row.duration_seconds;
  }
  if (typeof row.aspect_ratio === "string" && row.aspect_ratio.trim()) {
    job.aspectRatio = row.aspect_ratio.trim().slice(0, 16);
  }
  if (typeof row.resolution === "string" && row.resolution.trim()) {
    job.resolution = row.resolution.trim().slice(0, 32);
  }

  if (terminalFailure) {
    const code = safeLibraryErrorCode(
      typeof row.error_code === "string" ? row.error_code : undefined
    );
    if (code) job.errorCode = code;
    else if (status === "canceled") job.errorCode = "CANCELED";
    else job.errorCode = "GENERATION_FAILED";
  }

  return job;
}

/**
 * Merge durable Library rows with the process-memory ledger.
 * Durable truth wins on id/requestId mirrors; counts include durable-only rows.
 *
 * @param {{
 *   durableJobs: Array<NonNullable<ReturnType<typeof privateLibraryJobFromRow>>>,
 *   localJobs: Array<Record<string, unknown>>,
 *   localCounts: {
 *     queued: number,
 *     running: number,
 *     succeeded: number,
 *     failed: number,
 *     canceled: number,
 *     open: number,
 *     total: number,
 *   },
 *   listLimit: number,
 * }} input
 */
export function mergePrivateLibraryWithLocalLedger(input) {
  const limit = Math.min(50, Math.max(1, Math.floor(input.listLimit || 50)));
  const durableJobs = Array.isArray(input.durableJobs) ? input.durableJobs : [];
  const localJobs = Array.isArray(input.localJobs) ? input.localJobs : [];
  const localCounts = input.localCounts || {
    queued: 0,
    running: 0,
    succeeded: 0,
    failed: 0,
    canceled: 0,
    open: 0,
    total: 0,
  };

  const durableIds = new Set(durableJobs.map((job) => job.id));
  const mirroredLocalIds = new Set();
  for (const job of localJobs) {
    const id = typeof job.id === "string" ? job.id : "";
    const requestId =
      typeof job.requestId === "string" ? job.requestId : "";
    if ((id && durableIds.has(id)) || (requestId && durableIds.has(requestId))) {
      if (id) mirroredLocalIds.add(id);
      if (requestId) mirroredLocalIds.add(requestId);
    }
  }

  const unmirroredLocal = localJobs.filter((job) => {
    const id = typeof job.id === "string" ? job.id : "";
    const requestId =
      typeof job.requestId === "string" ? job.requestId : "";
    return (
      !(id && durableIds.has(id)) &&
      !(requestId && durableIds.has(requestId))
    );
  });

  const durableOnly = durableJobs.filter(
    (job) => !mirroredLocalIds.has(job.id)
  );

  const durableExtra = {
    queued: 0,
    running: 0,
    succeeded: 0,
    failed: 0,
    canceled: 0,
  };
  for (const job of durableOnly) {
    if (job.status in durableExtra) {
      durableExtra[/** @type {keyof typeof durableExtra} */ (job.status)] += 1;
    }
  }

  const byStatus = {
    queued: localCounts.queued + durableExtra.queued,
    running: localCounts.running + durableExtra.running,
    succeeded: localCounts.succeeded + durableExtra.succeeded,
    failed: localCounts.failed + durableExtra.failed,
    canceled: localCounts.canceled + durableExtra.canceled,
  };
  const open = byStatus.queued + byStatus.running;
  const total =
    localCounts.total +
    durableExtra.queued +
    durableExtra.running +
    durableExtra.succeeded +
    durableExtra.failed +
    durableExtra.canceled;

  const jobs = [...durableJobs, ...unmirroredLocal]
    .sort((a, b) => {
      const aCreated =
        typeof a.createdAt === "string" ? a.createdAt : "";
      const bCreated =
        typeof b.createdAt === "string" ? b.createdAt : "";
      return bCreated.localeCompare(aCreated);
    })
    .slice(0, limit);

  return {
    jobs,
    byStatus,
    open,
    total,
    durableCount: durableJobs.length,
    durableOnlyCount: durableOnly.length,
    mirroredCount: durableJobs.length - durableOnly.length,
  };
}
