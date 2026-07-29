/**
 * Durable Launch Pack recovery pointer.
 *
 * The browser stores only packRunId + the three server-created packJobIds.
 * `/api/seller-pack/status` remains the owner-scoped authority for state,
 * private signed result URLs, and credit outcomes after refresh.
 */

import { SELLER_PACK_ITEMS } from "@/lib/sellerPackContract";

export const SELLER_PACK_RECOVERY_KEY = "pikbo_seller_pack_active_v2";

export type SellerPackChildStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "refunded"
  | "not_started"
  | "recovery_unavailable";

export type SellerPackRecoveryChild = {
  packJobId: string;
  childKey: string;
  slug: string;
  name: string;
  aspectRatio: "9:16" | "1:1";
  statusHint: SellerPackChildStatus;
  retryCount: number;
};

export type SellerPackRecoveryRun = {
  version: 2;
  projectId: string;
  packRunId: string;
  savedAt: string;
  children: SellerPackRecoveryChild[];
};

export type SellerPackStatusJob = {
  jobId: string;
  childKey: string;
  effectSlug: string;
  aspectRatio: string;
  status: string;
  quotedCredits: number;
  settledCredits: number;
  errorCode?: string | null;
  hasPrivateResult?: boolean;
  resultUrl?: string | null;
  modelId?: string | null;
  resolution?: string | null;
  durationSec?: number;
};

export type RecoveredSellerPackChild = SellerPackRecoveryChild & {
  status: SellerPackChildStatus;
  creditState?:
    | "10 used"
    | "10 restored"
    | "refund unconfirmed"
    | "not charged";
  error?: string;
  errorCode?: string;
  videoUrl?: string;
  demo?: false;
  model?: string;
  duration?: number;
  resolution?: string;
  watermark?: false;
  requestId?: string;
};

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

/** Parse untrusted storage and accept only the exact frozen three-child map. */
export function parseSellerPackRecovery(
  value: unknown
): SellerPackRecoveryRun | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (
    raw.version !== 2 ||
    typeof raw.projectId !== "string" ||
    typeof raw.packRunId !== "string" ||
    raw.packRunId.length < 8 ||
    !Array.isArray(raw.children)
  ) {
    return null;
  }

  const children = raw.children.flatMap(
    (item): SellerPackRecoveryChild[] => {
      if (!item || typeof item !== "object") return [];
      const child = item as Record<string, unknown>;
      if (
        typeof child.packJobId !== "string" ||
        child.packJobId.length < 8 ||
        typeof child.childKey !== "string" ||
        typeof child.slug !== "string" ||
        typeof child.name !== "string" ||
        !isStatus(child.statusHint)
      ) {
        return [];
      }
      const fixed = SELLER_PACK_ITEMS.find(
        (expected) =>
          expected.key === child.childKey &&
          expected.slug === child.slug &&
          expected.label === child.name &&
          expected.aspectRatio === child.aspectRatio
      );
      if (!fixed) return [];
      return [
        {
          packJobId: child.packJobId,
          childKey: child.childKey,
          slug: child.slug,
          name: child.name,
          aspectRatio: fixed.aspectRatio,
          statusHint: child.statusHint,
          retryCount:
            typeof child.retryCount === "number" &&
            Number.isFinite(child.retryCount)
              ? Math.max(0, Math.floor(child.retryCount))
              : 0,
        },
      ];
    }
  );

  const exactOrder = children.every(
    (child, index) =>
      child.childKey === SELLER_PACK_ITEMS[index]?.key &&
      child.slug === SELLER_PACK_ITEMS[index]?.slug
  );
  const uniqueIds = new Set(children.map((child) => child.packJobId));
  if (children.length !== 3 || !exactOrder || uniqueIds.size !== 3) return null;
  return {
    version: 2,
    projectId: raw.projectId,
    packRunId: raw.packRunId,
    savedAt: typeof raw.savedAt === "string" ? raw.savedAt : "",
    children,
  };
}

/**
 * Reconcile an owner-scoped status response. Local hints never restore a
 * success, result URL, or refund on their own.
 */
export function reconcileSellerPackRecovery(
  run: SellerPackRecoveryRun,
  jobs: SellerPackStatusJob[]
): { children: RecoveredSellerPackChild[]; unavailable: number } {
  let unavailable = 0;
  const byId = new Map(jobs.map((job) => [job.jobId, job]));
  const children = run.children.map(
    (child): RecoveredSellerPackChild => {
      const job = byId.get(child.packJobId);
      if (
        !job ||
        job.childKey !== child.childKey ||
        job.effectSlug !== child.slug ||
        job.aspectRatio !== child.aspectRatio ||
        job.quotedCredits !== 10
      ) {
        unavailable += 1;
        return {
          ...child,
          status: "recovery_unavailable",
          error: "The owner-scoped pack job could not be recovered.",
        };
      }
      if (job.status === "succeeded") {
        if (
          job.settledCredits !== 10 ||
          job.hasPrivateResult !== true ||
          typeof job.resultUrl !== "string" ||
          !job.resultUrl.startsWith("http")
        ) {
          unavailable += 1;
          return {
            ...child,
            status: "recovery_unavailable",
            requestId: job.jobId,
            error: "The result is not privately deliverable yet.",
          };
        }
        return {
          ...child,
          requestId: job.jobId,
          status: "succeeded",
          creditState: "10 used",
          videoUrl: job.resultUrl,
          demo: false,
          model: job.modelId || undefined,
          duration: job.durationSec,
          resolution: job.resolution || undefined,
          watermark: false,
        };
      }
      if (job.status === "queued" || job.status === "running") {
        return {
          ...child,
          requestId: job.jobId,
          status: job.status,
        };
      }
      if (job.status === "failed") {
        return {
          ...child,
          requestId: job.jobId,
          status: "refunded",
          creditState: "10 restored",
          errorCode: job.errorCode || undefined,
          error:
            job.errorCode === "expired_unstarted"
              ? "Unstarted child expired — 10 credits restored."
              : "Generation failed — 10 credits restored.",
        };
      }
      unavailable += 1;
      return {
        ...child,
        requestId: job.jobId,
        status: "recovery_unavailable",
        error: "Pack state needs server reconciliation.",
      };
    }
  );
  return { children, unavailable };
}
