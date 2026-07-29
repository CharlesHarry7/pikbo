/**
 * Atomic Seller Pack / Launch Pack authority.
 *
 * - Pure offline state machine mirrors
 *   supabase/migrations/20260729020000_atomic_seller_pack.sql
 * - Server adapters call service-role RPCs only (never browser-trusted amounts).
 *
 * One authenticated owner + client pack key → one 30-credit reservation,
 * one pack run, exactly three fixed recoverable child jobs.
 */

import {
  SELLER_PACK_CHILD_COUNT,
  SELLER_PACK_CONTRACT_FINGERPRINT_V1,
  SELLER_PACK_CREDITS_PER_CHILD,
  SELLER_PACK_ITEMS,
  SELLER_PACK_LIVE_TOTAL_CREDITS,
  type SellerPackItem,
} from "@/lib/sellerPackContract";
import {
  supabaseAuthorizeSellerPackChildAtomic,
  supabaseExpireQueuedSellerPackChildren,
  supabaseGetSellerPackStatusAtomic,
  supabaseReleaseSellerPackChildAtomic,
  supabaseReserveSellerPackAtomic,
  supabaseRetrySellerPackChildAtomic,
  supabaseSettleSellerPackChildAtomic,
  type AtomicSellerPackChildAuthorization,
  type AtomicSellerPackJobPublic,
  type AtomicSellerPackReserveResult,
  type AtomicSellerPackStatusResult,
} from "@/lib/durableCredits/supabaseStore";

export {
  SELLER_PACK_CHILD_COUNT,
  SELLER_PACK_CONTRACT_FINGERPRINT_V1,
  SELLER_PACK_CREDITS_PER_CHILD,
  SELLER_PACK_LIVE_TOTAL_CREDITS,
};

export const SELLER_PACK_QUOTED_CREDITS = SELLER_PACK_LIVE_TOTAL_CREDITS;
export const SELLER_PACK_CHILD_CREDITS = SELLER_PACK_CREDITS_PER_CHILD;

export type SellerPackChildKey = (typeof SELLER_PACK_ITEMS)[number]["key"];

export type AtomicPackChildJob = {
  jobId: string;
  childKey: SellerPackChildKey;
  effectSlug: string;
  aspectRatio: string;
  durationSec: number;
  status: "queued" | "running" | "succeeded" | "failed";
  quotedCredits: number;
  settledCredits: number;
  attemptKey: string | null;
  errorCode?: string | null;
  hasPrivateResult?: boolean;
  modelId?: string;
  resolution?: string;
  providerAuthorizations: number;
};

export type AtomicPackWallet = {
  availableCredits: number;
  reservedCredits: number;
  lifetimeUsedCredits: number;
};

export type AtomicPackRunState = {
  packRunId: string;
  ownerUserId: string;
  accountId: string;
  clientPackKey: string;
  contractFingerprint: string;
  reservationId: string;
  status: "running" | "succeeded" | "partial" | "failed";
  quotedCredits: number;
  settledCredits: number;
  releasedCredits: number;
  jobs: AtomicPackChildJob[];
};

export type AtomicPackStore = {
  wallet: AtomicPackWallet;
  packsByOwnerKey: Record<string, AtomicPackRunState>;
  packsById: Record<string, AtomicPackRunState>;
  /** Cross-account denial fixture: owner id → false means not owner. */
  nextIds: { pack: number; job: number; reservation: number };
};

function ownerKey(ownerUserId: string, clientPackKey: string): string {
  return `${ownerUserId}::${clientPackKey}`;
}

function cloneJob(job: AtomicPackChildJob): AtomicPackChildJob {
  return { ...job };
}

function clonePack(pack: AtomicPackRunState): AtomicPackRunState {
  return {
    ...pack,
    jobs: pack.jobs.map(cloneJob),
  };
}

function fixedChildren(): readonly SellerPackItem[] {
  return SELLER_PACK_ITEMS;
}

function recomputePackStatus(pack: AtomicPackRunState): AtomicPackRunState["status"] {
  const succeeded = pack.jobs.filter((j) => j.status === "succeeded").length;
  const failed = pack.jobs.filter((j) => j.status === "failed").length;
  if (succeeded === 3) return "succeeded";
  if (failed === 3) return "failed";
  if (succeeded + failed === 3) return "partial";
  return "running";
}

export function createAtomicSellerPackStore(input?: {
  availableCredits?: number;
  reservedCredits?: number;
  lifetimeUsedCredits?: number;
}): AtomicPackStore {
  return {
    wallet: {
      availableCredits: input?.availableCredits ?? 30,
      reservedCredits: input?.reservedCredits ?? 0,
      lifetimeUsedCredits: input?.lifetimeUsedCredits ?? 0,
    },
    packsByOwnerKey: {},
    packsById: {},
    nextIds: { pack: 1, job: 1, reservation: 1 },
  };
}

function fail(code: string, extra: Record<string, unknown> = {}) {
  return { ok: false as const, code, ...extra };
}

export function pureReserveSellerPack(
  store: AtomicPackStore,
  input: {
    ownerUserId: string;
    clientPackKey: string;
    contractFingerprint?: string;
  }
):
  | {
      ok: true;
      idempotent: boolean;
      pack: AtomicPackRunState;
      wallet: AtomicPackWallet;
    }
  | { ok: false; code: string; need?: number; have?: number } {
  const key = (input.clientPackKey || "").trim();
  if (!input.ownerUserId) return fail("AUTH_REQUIRED");
  if (key.length < 8 || key.length > 128) return fail("INVALID_PACK_KEY");
  const fingerprint =
    input.contractFingerprint || SELLER_PACK_CONTRACT_FINGERPRINT_V1;
  if (fingerprint !== SELLER_PACK_CONTRACT_FINGERPRINT_V1) {
    return fail("IDEMPOTENCY_CONFLICT");
  }

  const existing = store.packsByOwnerKey[ownerKey(input.ownerUserId, key)];
  if (existing) {
    if (
      existing.contractFingerprint !== fingerprint ||
      existing.quotedCredits !== SELLER_PACK_QUOTED_CREDITS
    ) {
      return fail("IDEMPOTENCY_CONFLICT");
    }
    if (existing.jobs.length !== 3) return fail("PACK_JOB_COUNT_INVALID");
    return {
      ok: true,
      idempotent: true,
      pack: clonePack(existing),
      wallet: { ...store.wallet },
    };
  }

  if (store.wallet.availableCredits < SELLER_PACK_QUOTED_CREDITS) {
    return fail("INSUFFICIENT_CREDITS", {
      need: SELLER_PACK_QUOTED_CREDITS,
      have: store.wallet.availableCredits,
    });
  }

  store.wallet.availableCredits -= SELLER_PACK_QUOTED_CREDITS;
  store.wallet.reservedCredits += SELLER_PACK_QUOTED_CREDITS;

  const packRunId = `pack_${store.nextIds.pack++}`;
  const reservationId = `res_${store.nextIds.reservation++}`;
  const jobs: AtomicPackChildJob[] = fixedChildren().map((item) => ({
    jobId: `job_${store.nextIds.job++}`,
    childKey: item.key,
    effectSlug: item.slug,
    aspectRatio: item.aspectRatio,
    durationSec: item.durationSec,
    status: "queued",
    quotedCredits: SELLER_PACK_CHILD_CREDITS,
    settledCredits: 0,
    attemptKey: null,
    hasPrivateResult: false,
    modelId: "seedance-fast",
    resolution: "720p",
    providerAuthorizations: 0,
  }));

  const pack: AtomicPackRunState = {
    packRunId,
    ownerUserId: input.ownerUserId,
    accountId: `acct_${input.ownerUserId}`,
    clientPackKey: key,
    contractFingerprint: fingerprint,
    reservationId,
    status: "running",
    quotedCredits: SELLER_PACK_QUOTED_CREDITS,
    settledCredits: 0,
    releasedCredits: 0,
    jobs,
  };
  store.packsByOwnerKey[ownerKey(input.ownerUserId, key)] = pack;
  store.packsById[packRunId] = pack;
  return {
    ok: true,
    idempotent: false,
    pack: clonePack(pack),
    wallet: { ...store.wallet },
  };
}

export function pureAuthorizeSellerPackChild(
  store: AtomicPackStore,
  input: {
    ownerUserId: string;
    packRunId: string;
    jobId: string;
    effectSlug: string;
    durationSec: number;
    aspectRatio: string;
    attemptKey: string;
  }
):
  | {
      ok: true;
      idempotent: boolean;
      providerAuthorized: boolean;
      pack: AtomicPackRunState;
      job: AtomicPackChildJob;
      wallet: AtomicPackWallet;
    }
  | { ok: false; code: string } {
  const attempt = (input.attemptKey || "").trim();
  if (!input.ownerUserId) return fail("AUTH_REQUIRED");
  if (attempt.length < 8 || attempt.length > 128) {
    return fail("INVALID_IDEMPOTENCY_KEY");
  }

  const pack = store.packsById[input.packRunId];
  if (!pack || pack.ownerUserId !== input.ownerUserId) {
    return fail("PACK_NOT_FOUND");
  }
  const job = pack.jobs.find((j) => j.jobId === input.jobId);
  if (!job) return fail("JOB_BINDING_MISMATCH");

  if (
    job.effectSlug !== input.effectSlug ||
    job.durationSec !== input.durationSec ||
    job.aspectRatio !== input.aspectRatio ||
    job.quotedCredits !== SELLER_PACK_CHILD_CREDITS
  ) {
    return fail("PACK_CHILD_CONTRACT_MISMATCH");
  }

  if (job.status === "succeeded") return fail("CHILD_ALREADY_SUCCEEDED");
  if (
    job.status === "running" &&
    job.attemptKey &&
    job.attemptKey === attempt
  ) {
    return {
      ok: true,
      idempotent: true,
      providerAuthorized: false,
      pack: clonePack(pack),
      job: cloneJob(job),
      wallet: { ...store.wallet },
    };
  }
  if (job.status === "failed") return fail("CHILD_REQUIRES_RETRY");
  if (job.status !== "queued") return fail("CHILD_NOT_AUTHORIZABLE");

  const remaining =
    pack.quotedCredits - pack.settledCredits - pack.releasedCredits;
  if (remaining < SELLER_PACK_CHILD_CREDITS) {
    return fail("PACK_CREDITS_EXHAUSTED");
  }

  job.status = "running";
  job.attemptKey = attempt;
  job.providerAuthorizations += 1;
  pack.status = "running";
  return {
    ok: true,
    idempotent: false,
    providerAuthorized: true,
    pack: clonePack(pack),
    job: cloneJob(job),
    wallet: { ...store.wallet },
  };
}

export function pureSettleSellerPackChild(
  store: AtomicPackStore,
  input: {
    ownerUserId: string;
    packRunId: string;
    jobId: string;
    attemptKey: string;
    /** Must be true: private storage precedes settlement. */
    privateStored: boolean;
  }
):
  | {
      ok: true;
      idempotent: boolean;
      pack: AtomicPackRunState;
      job: AtomicPackChildJob;
      wallet: AtomicPackWallet;
    }
  | { ok: false; code: string } {
  const attempt = (input.attemptKey || "").trim();
  if (attempt.length < 8 || attempt.length > 128) {
    return fail("INVALID_IDEMPOTENCY_KEY");
  }
  const pack = store.packsById[input.packRunId];
  if (!pack || pack.ownerUserId !== input.ownerUserId) {
    return fail("PACK_NOT_FOUND");
  }
  const job = pack.jobs.find((j) => j.jobId === input.jobId);
  if (!job) return fail("JOB_BINDING_MISMATCH");
  if (job.attemptKey !== attempt) return fail("ATTEMPT_MISMATCH");
  if (!input.privateStored) return fail("PRIVATE_RESULT_REQUIRED");

  if (job.status === "succeeded" && job.settledCredits >= SELLER_PACK_CHILD_CREDITS) {
    return {
      ok: true,
      idempotent: true,
      pack: clonePack(pack),
      job: cloneJob(job),
      wallet: { ...store.wallet },
    };
  }
  if (job.status !== "running") return fail("CHILD_NOT_RUNNING");

  const remaining =
    pack.quotedCredits - pack.settledCredits - pack.releasedCredits;
  if (
    remaining < SELLER_PACK_CHILD_CREDITS ||
    store.wallet.reservedCredits < SELLER_PACK_CHILD_CREDITS
  ) {
    return fail("RESERVED_BALANCE_INVALID");
  }

  store.wallet.reservedCredits -= SELLER_PACK_CHILD_CREDITS;
  store.wallet.lifetimeUsedCredits += SELLER_PACK_CHILD_CREDITS;
  pack.settledCredits += SELLER_PACK_CHILD_CREDITS;
  job.status = "succeeded";
  job.settledCredits = SELLER_PACK_CHILD_CREDITS;
  job.hasPrivateResult = true;
  pack.status = recomputePackStatus(pack);
  return {
    ok: true,
    idempotent: false,
    pack: clonePack(pack),
    job: cloneJob(job),
    wallet: { ...store.wallet },
  };
}

export function pureReleaseSellerPackChild(
  store: AtomicPackStore,
  input: {
    ownerUserId: string;
    packRunId: string;
    jobId: string;
    attemptKey: string;
    reason?: string;
    /** Ambiguous outcomes must not claim refund. */
    confirmed: boolean;
  }
):
  | {
      ok: true;
      idempotent: boolean;
      creditsRefunded: true;
      pack: AtomicPackRunState;
      job: AtomicPackChildJob;
      wallet: AtomicPackWallet;
    }
  | { ok: false; code: string; creditsRefunded?: false } {
  const attempt = (input.attemptKey || "").trim();
  if (attempt.length < 8 || attempt.length > 128) {
    return fail("INVALID_IDEMPOTENCY_KEY");
  }
  const pack = store.packsById[input.packRunId];
  if (!pack || pack.ownerUserId !== input.ownerUserId) {
    return fail("PACK_NOT_FOUND");
  }
  const job = pack.jobs.find((j) => j.jobId === input.jobId);
  if (!job) return fail("JOB_BINDING_MISMATCH");
  if (job.attemptKey !== attempt) return fail("ATTEMPT_MISMATCH");
  if (job.hasPrivateResult) {
    return fail("PRIVATE_RESULT_RECONCILIATION_REQUIRED");
  }
  if (!input.confirmed) {
    return { ok: false, code: "AMBIGUOUS_FAILURE", creditsRefunded: false };
  }

  if (job.status === "failed" && job.settledCredits === 0) {
    return {
      ok: true,
      idempotent: true,
      creditsRefunded: true,
      pack: clonePack(pack),
      job: cloneJob(job),
      wallet: { ...store.wallet },
    };
  }
  if (job.status === "succeeded") return fail("CHILD_ALREADY_SUCCEEDED");
  // Normal release is only legal after this server authorized the exact
  // provider attempt. Queued expiry is a separate worker-only operation so a
  // browser cancellation can never restore credits while work is in flight.
  if (job.status !== "running") {
    return fail("CHILD_NOT_RELEASABLE");
  }

  const remaining =
    pack.quotedCredits - pack.settledCredits - pack.releasedCredits;
  if (
    remaining < SELLER_PACK_CHILD_CREDITS ||
    store.wallet.reservedCredits < SELLER_PACK_CHILD_CREDITS
  ) {
    return fail("RESERVED_BALANCE_INVALID");
  }

  store.wallet.availableCredits += SELLER_PACK_CHILD_CREDITS;
  store.wallet.reservedCredits -= SELLER_PACK_CHILD_CREDITS;
  pack.releasedCredits += SELLER_PACK_CHILD_CREDITS;
  job.status = "failed";
  job.errorCode = (input.reason || "child_failed").slice(0, 120);
  pack.status = recomputePackStatus(pack);
  return {
    ok: true,
    idempotent: false,
    creditsRefunded: true,
    pack: clonePack(pack),
    job: cloneJob(job),
    wallet: { ...store.wallet },
  };
}

export function pureRetrySellerPackChild(
  store: AtomicPackStore,
  input: {
    ownerUserId: string;
    packRunId: string;
    jobId: string;
    attemptKey: string;
  }
):
  | {
      ok: true;
      idempotent: boolean;
      pack: AtomicPackRunState;
      job: AtomicPackChildJob;
      wallet: AtomicPackWallet;
    }
  | { ok: false; code: string; need?: number; have?: number } {
  const attempt = (input.attemptKey || "").trim();
  if (attempt.length < 8 || attempt.length > 128) {
    return fail("INVALID_IDEMPOTENCY_KEY");
  }
  const pack = store.packsById[input.packRunId];
  if (!pack || pack.ownerUserId !== input.ownerUserId) {
    return fail("PACK_NOT_FOUND");
  }
  if (pack.jobs.length !== 3) return fail("PACK_JOB_COUNT_INVALID");
  const job = pack.jobs.find((j) => j.jobId === input.jobId);
  if (!job) return fail("JOB_BINDING_MISMATCH");

  if (job.status === "succeeded") return fail("CHILD_ALREADY_SUCCEEDED");
  if (
    job.status === "failed" &&
    job.attemptKey &&
    job.attemptKey === attempt
  ) {
    return fail("ATTEMPT_REUSE_FORBIDDEN");
  }
  if (
    job.status === "queued" &&
    job.attemptKey &&
    job.attemptKey === attempt
  ) {
    return {
      ok: true,
      idempotent: true,
      pack: clonePack(pack),
      job: cloneJob(job),
      wallet: { ...store.wallet },
    };
  }
  if (job.status !== "failed") return fail("CHILD_NOT_RETRYABLE");
  if (pack.releasedCredits < SELLER_PACK_CHILD_CREDITS) {
    return fail("NO_RELEASED_CREDITS_TO_RERESERVE");
  }
  if (store.wallet.availableCredits < SELLER_PACK_CHILD_CREDITS) {
    return fail("INSUFFICIENT_CREDITS", {
      need: SELLER_PACK_CHILD_CREDITS,
      have: store.wallet.availableCredits,
    });
  }

  store.wallet.availableCredits -= SELLER_PACK_CHILD_CREDITS;
  store.wallet.reservedCredits += SELLER_PACK_CHILD_CREDITS;
  pack.releasedCredits -= SELLER_PACK_CHILD_CREDITS;
  pack.status = "running";
  job.status = "queued";
  job.attemptKey = attempt;
  job.errorCode = null;
  job.settledCredits = 0;
  return {
    ok: true,
    idempotent: false,
    pack: clonePack(pack),
    job: cloneJob(job),
    wallet: { ...store.wallet },
  };
}

export function pureGetSellerPackStatus(
  store: AtomicPackStore,
  input: { ownerUserId: string; packRunId: string }
):
  | {
      ok: true;
      pack: AtomicPackRunState;
      wallet: AtomicPackWallet;
    }
  | { ok: false; code: string } {
  if (!input.ownerUserId) return fail("AUTH_REQUIRED");
  const pack = store.packsById[input.packRunId];
  if (!pack || pack.ownerUserId !== input.ownerUserId) {
    return fail("PACK_NOT_FOUND");
  }
  return {
    ok: true,
    pack: clonePack(pack),
    wallet: { ...store.wallet },
  };
}

/** Reject a fourth logical child or path tampering against the fixed trio. */
export function pureRejectFourthChild(
  store: AtomicPackStore,
  input: {
    ownerUserId: string;
    packRunId: string;
    jobId: string;
  }
): { ok: false; code: string } {
  const pack = store.packsById[input.packRunId];
  if (!pack || pack.ownerUserId !== input.ownerUserId) {
    return fail("PACK_NOT_FOUND");
  }
  const job = pack.jobs.find((j) => j.jobId === input.jobId);
  if (!job) return fail("JOB_BINDING_MISMATCH");
  return fail("PACK_JOB_COUNT_INVALID");
}

// ── Server adapters (service-role RPC) ─────────────────────────────────────

export async function reserveAtomicSellerPack(input: {
  userId: string;
  clientPackKey: string;
}): Promise<
  | { ok: true; data: AtomicSellerPackReserveResult }
  | { ok: false; code: string; error: string; need?: number; have?: number }
> {
  return supabaseReserveSellerPackAtomic(input);
}

export async function authorizeAtomicSellerPackChild(input: {
  userId: string;
  packRunId: string;
  jobId: string;
  effectSlug: string;
  durationSec: number;
  aspectRatio: string;
  attemptKey: string;
}): Promise<
  | { ok: true; data: AtomicSellerPackChildAuthorization }
  | { ok: false; code: string; error: string }
> {
  return supabaseAuthorizeSellerPackChildAtomic(input);
}

export async function settleAtomicSellerPackChild(input: {
  userId: string;
  packRunId: string;
  jobId: string;
  attemptKey: string;
  providerRequestId?: string;
}): Promise<
  | {
      ok: true;
      data: {
        packRunId: string;
        jobId: string;
        reservationId: string;
        settledCredits: number;
        availableCredits: number;
        reservedCredits: number;
        packSettledCredits: number;
        packReleasedCredits: number;
        idempotent: boolean;
      };
    }
  | { ok: false; code: string; error: string }
> {
  return supabaseSettleSellerPackChildAtomic(input);
}

export async function releaseAtomicSellerPackChild(input: {
  userId: string;
  packRunId: string;
  jobId: string;
  attemptKey: string;
  reason: string;
}): Promise<
  | {
      ok: true;
      data: {
        packRunId: string;
        jobId: string;
        reservationId: string;
        releasedCredits: number;
        availableCredits: number;
        reservedCredits: number;
        packSettledCredits: number;
        packReleasedCredits: number;
        creditsRefunded: true;
        idempotent: boolean;
      };
    }
  | { ok: false; code: string; error: string }
> {
  return supabaseReleaseSellerPackChildAtomic(input);
}

export async function retryAtomicSellerPackChild(input: {
  userId: string;
  packRunId: string;
  jobId: string;
  attemptKey: string;
}): Promise<
  | {
      ok: true;
      data: {
        packRunId: string;
        jobId: string;
        reservationId: string;
        childKey: string;
        status: string;
        attemptKey: string;
        availableCredits: number;
        reservedCredits: number;
        packSettledCredits: number;
        packReleasedCredits: number;
        idempotent: boolean;
      };
    }
  | { ok: false; code: string; error: string; need?: number; have?: number }
> {
  return supabaseRetrySellerPackChildAtomic(input);
}

export async function getAtomicSellerPackStatus(input: {
  userId: string;
  packRunId: string;
}): Promise<
  | { ok: true; data: AtomicSellerPackStatusResult }
  | { ok: false; code: string; error: string }
> {
  return supabaseGetSellerPackStatusAtomic(input);
}

export async function expireAtomicSellerPackQueuedChildren(input?: {
  limit?: number;
}) {
  return supabaseExpireQueuedSellerPackChildren(input);
}

export function mapPackJobsPublic(
  jobs: AtomicSellerPackJobPublic[]
): AtomicSellerPackJobPublic[] {
  const order = new Map(
    SELLER_PACK_ITEMS.map((item, index) => [item.key, index])
  );
  return [...jobs].sort(
    (a, b) =>
      (order.get(a.childKey as SellerPackChildKey) ?? 9) -
      (order.get(b.childKey as SellerPackChildKey) ?? 9)
  );
}

/**
 * Detect whether a generate body is a live Seller Pack child request.
 * Both ids must be non-empty UUID-like strings; partial pairs fail closed.
 */
export function parseSellerPackChildRequest(body: {
  packRunId?: unknown;
  packJobId?: unknown;
}):
  | { kind: "none" }
  | { kind: "invalid"; code: "INVALID_PACK_BINDING"; error: string }
  | { kind: "pack"; packRunId: string; packJobId: string } {
  const hasRun = body.packRunId != null && body.packRunId !== "";
  const hasJob = body.packJobId != null && body.packJobId !== "";
  if (!hasRun && !hasJob) return { kind: "none" };
  if (!hasRun || !hasJob) {
    return {
      kind: "invalid",
      code: "INVALID_PACK_BINDING",
      error: "Seller Pack live children require both packRunId and packJobId",
    };
  }
  if (typeof body.packRunId !== "string" || typeof body.packJobId !== "string") {
    return {
      kind: "invalid",
      code: "INVALID_PACK_BINDING",
      error: "packRunId and packJobId must be strings",
    };
  }
  const packRunId = body.packRunId.trim();
  const packJobId = body.packJobId.trim();
  if (packRunId.length < 8 || packJobId.length < 8) {
    return {
      kind: "invalid",
      code: "INVALID_PACK_BINDING",
      error: "packRunId and packJobId are too short",
    };
  }
  return { kind: "pack", packRunId, packJobId };
}
