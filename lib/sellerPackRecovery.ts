/**
 * Current-device Seller Pack recovery.
 *
 * This is deliberately not Library/history or a credits ledger. The browser
 * remembers only how to find the three submitted children again; the current
 * session's `/api/generations` response is authoritative for every submitted
 * child result and credit settlement.
 */

export const SELLER_PACK_RECOVERY_KEY = "pikbo_seller_pack_active_v1";

export type SellerPackChildStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "refunded"
  | "not_started"
  | "recovery_unavailable";

export type SellerPackRecoveryChild = {
  slug: string;
  name: string;
  aspectRatio: "9:16" | "1:1" | "16:9";
  /** API job id or provider request id. Omitted only when this child was never submitted. */
  requestId?: string;
  /** Hint only; never trusted for video, credits, or refund settlement. */
  statusHint: SellerPackChildStatus;
  retryCount: number;
};

export type SellerPackRecoveryRun = {
  version: 1;
  projectId: string;
  savedAt: string;
  children: SellerPackRecoveryChild[];
};

const FIXED_CHILDREN = [
  { slug: "360-spin-showcase", name: "Listing Spin", aspectRatio: "1:1" },
  { slug: "blind-box-unboxing", name: "Blind-box Reveal", aspectRatio: "9:16" },
  { slug: "paparazzi-flash", name: "Social Flash", aspectRatio: "9:16" },
] as const;

export type SellerPackPublicJob = {
  id: string;
  requestId?: string;
  effect: string;
  status: "queued" | "running" | "succeeded" | "failed" | "canceled";
  videoUrl?: string;
  demo?: boolean;
  model?: string;
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
  watermark?: boolean;
  creditsOutcome?: "0 cached" | "10 used" | "10 restored" | "refund unconfirmed";
  error?: string;
  errorCode?: string;
};

export type RecoveredSellerPackChild = SellerPackRecoveryChild & {
  status: SellerPackChildStatus;
  creditState?: SellerPackPublicJob["creditsOutcome"] | "not charged";
  error?: string;
  errorCode?: string;
  videoUrl?: string;
  demo?: boolean;
  model?: string;
  duration?: number;
  resolution?: string;
  watermark?: boolean;
};

function isAspectRatio(value: unknown): value is "9:16" | "1:1" | "16:9" {
  return value === "9:16" || value === "1:1" || value === "16:9";
}

function isStatus(value: unknown): value is SellerPackChildStatus {
  return [
    "queued",
    "running",
    "succeeded",
    "failed",
    "refunded",
    "not_started",
    "recovery_unavailable",
  ].includes(value as SellerPackChildStatus);
}

/** Parse an untrusted sessionStorage value; only the exact fixed three children survive. */
export function parseSellerPackRecovery(value: unknown): SellerPackRecoveryRun | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || typeof raw.projectId !== "string" || !Array.isArray(raw.children)) {
    return null;
  }
  const children = raw.children.flatMap((item): SellerPackRecoveryChild[] => {
    if (!item || typeof item !== "object") return [];
    const child = item as Record<string, unknown>;
    if (typeof child.slug !== "string" || typeof child.name !== "string") {
      return [];
    }
    const fixed = FIXED_CHILDREN.find(
      (expected) =>
        expected.slug === child.slug &&
        expected.name === child.name &&
        expected.aspectRatio === child.aspectRatio
    );
    if (!fixed || !isAspectRatio(child.aspectRatio) || !isStatus(child.statusHint)) {
      return [];
    }
    return [{
      slug: child.slug,
      name: child.name,
      aspectRatio: child.aspectRatio,
      requestId: typeof child.requestId === "string" ? child.requestId : undefined,
      statusHint: child.statusHint,
      retryCount:
        typeof child.retryCount === "number" && Number.isFinite(child.retryCount)
          ? Math.max(0, Math.floor(child.retryCount))
          : 0,
    }];
  });
  const exactOrder = children.every(
    (child, index) => child.slug === FIXED_CHILDREN[index].slug
  );
  return children.length === 3 && exactOrder
    ? { version: 1, projectId: raw.projectId, savedAt: typeof raw.savedAt === "string" ? raw.savedAt : "", children }
    : null;
}

/**
 * Submitted children must be found in the current generation-job session.
 * A local hint can only retain an explicitly unsubmitted child; it can never
 * restore an old success, failure, debit, or refund claim.
 */
export function reconcileSellerPackRecovery(
  run: SellerPackRecoveryRun,
  jobs: SellerPackPublicJob[]
): { children: RecoveredSellerPackChild[]; unavailable: number } {
  let unavailable = 0;
  const byId = new Map<string, SellerPackPublicJob>();
  for (const job of jobs) {
    byId.set(job.id, job);
    if (job.requestId) byId.set(job.requestId, job);
  }
  const children = run.children.map((child): RecoveredSellerPackChild => {
    if (!child.requestId) {
      if (child.statusHint === "not_started") return { ...child, status: "not_started" };
      unavailable += 1;
      return { ...child, status: "recovery_unavailable", error: "This child was not confirmed in the current device/session." };
    }
    const job = byId.get(child.requestId);
    if (!job || job.effect !== child.slug) {
      unavailable += 1;
      return { ...child, status: "recovery_unavailable", error: "Job is no longer available in this device/server session." };
    }
    const requestId = job.requestId || job.id;
    if (job.status === "succeeded") {
      return {
        ...child,
        requestId,
        status: "succeeded",
        creditState:
          job.creditsOutcome === "0 cached" || job.creditsOutcome === "10 used"
            ? job.creditsOutcome
            : undefined,
        videoUrl: job.videoUrl,
        demo: job.demo,
        model: job.model,
        duration: job.duration,
        resolution: job.resolution,
        watermark: job.watermark,
      };
    }
    if (job.status === "queued" || job.status === "running") {
      return { ...child, requestId, status: job.status };
    }
    const confirmedRestore = job.creditsOutcome === "10 restored";
    const unconfirmed = job.creditsOutcome === "refund unconfirmed" || job.status === "canceled";
    return {
      ...child,
      requestId,
      status: confirmedRestore ? "refunded" : "failed",
      creditState: confirmedRestore
        ? "10 restored"
        : unconfirmed
          ? "refund unconfirmed"
          : "not charged",
      error: job.error || (unconfirmed ? "Refund unconfirmed — check balance before retrying." : "Generation failed"),
      errorCode: job.errorCode,
    };
  });
  return { children, unavailable };
}
