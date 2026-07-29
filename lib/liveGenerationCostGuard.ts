/**
 * Seedance 2.0 private-live USD cost admission + honest audit labels.
 *
 * Rules:
 * - Code-side paid ceiling defaults to ZERO (fail closed).
 * - Never auto-recharges. Never reads browser authority.
 * - Estimated / ceiling amounts are always labeled as such.
 * - Actual USD is never invented; only an explicit provider-reported figure
 *   may be stored as actual (this path currently has no actual source).
 * - Process memory is never accepted as a cumulative spend authority.
 * - Until the durable atomic migration is applied and wired, every positive
 *   ceiling fails closed before a credit reservation or provider request.
 *
 * Keep this module free of path-alias imports so offline Node regressions can
 * load it with --experimental-strip-types (parity with privateLiveBeta.mjs).
 */

/** Exact private-live launch model identity. */
export const SEEDANCE2_PRIVATE_LIVE_MODEL =
  "bytedance/seedance-2.0/fast/image-to-video" as const;

/**
 * Conservative planning rate (USD / second) for Seedance 2.0 Standard
 * image-to-video. The verified public quote is for 720p. Until a separate
 * official 480p quote is recorded, 480p uses the same 720p upper bound rather
 * than inventing a cheaper rate.
 */
export const SEEDANCE2_STANDARD_ESTIMATED_USD_PER_SEC = {
  "480p": 0.3034,
  "720p": 0.3034,
} as const;

export type CostAmountKind = "estimated" | "ceiling" | "actual";

export type LabeledUsdAmount = {
  amountUsd: number;
  kind: CostAmountKind;
  /** Always present so clients cannot treat the figure as an invoice. */
  label: CostAmountKind;
};

export type Seedance2CostAudit = {
  modelId: string;
  durationSec: number;
  resolution: "480p" | "720p";
  estimated: LabeledUsdAmount;
  /** Cumulative code-side ceiling remaining after this job (labeled). */
  ceiling: LabeledUsdAmount;
  /**
   * Actual provider cost. null when the provider did not report a figure.
   * Never filled with an estimate.
   */
  actual: LabeledUsdAmount | null;
  note: string;
};

export type PaidCeilingAdmission =
  | {
      ok: true;
      ceilingUsd: number;
      spentUsd: number;
      remainingUsd: number;
      estimatedJobUsd: number;
      reservedSpentUsd: number;
      idempotent: boolean;
      audit: Seedance2CostAudit;
    }
  | {
      ok: false;
      code:
        | "PAID_CEILING_ZERO"
        | "PAID_CEILING_EXHAUSTED"
        | "PAID_CEILING_UNAVAILABLE"
        | "MODEL_NOT_ADMITTED";
      error: string;
      ceilingUsd: number;
      spentUsd: number;
      remainingUsd: number;
      estimatedJobUsd: number;
      audit: Seedance2CostAudit;
    };

export function paidCeilingScopeKey(userId: string): string {
  return `seedance2-paid-ceiling:${userId}`;
}

export function getPaidCeilingSpentUsd(userId: string): number {
  void userId;
  return 0;
}

/** Env parse: missing / invalid → 0 (fail closed). Never auto-recharges. */
export function parsePaidCeilingUsd(raw: string | null | undefined): number {
  if (raw == null || raw === "") return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  // Cap absurd configs in process memory; durable path uses migration.
  return Math.min(10_000, Math.floor(n * 100) / 100);
}

export function defaultPaidCeilingUsdFromEnv(
  env: NodeJS.ProcessEnv = process.env
): number {
  return parsePaidCeilingUsd(env.PIKBO_SEEDANCE2_PAID_CEILING_USD);
}

export function isPrivateLiveSeedanceModel(modelId: string): boolean {
  return modelId === SEEDANCE2_PRIVATE_LIVE_MODEL;
}

/**
 * Force the exact Seedance 2.0 Fast endpoint for the 5s/720p launch contract.
 * Client preference and free-tier env overrides never win here.
 */
export function privateLiveSeedanceModel(
  clientPrefer?: string | null
): typeof SEEDANCE2_PRIVATE_LIVE_MODEL {
  void clientPrefer;
  return SEEDANCE2_PRIVATE_LIVE_MODEL;
}

export function estimateSeedance2JobUsd(input: {
  durationSec: number;
  resolution: "480p" | "720p" | string;
}): LabeledUsdAmount {
  const resolution: "480p" | "720p" =
    input.resolution === "480p" ? "480p" : "720p";
  const durationSec = Math.min(
    10,
    Math.max(4, Math.round(Number(input.durationSec) || 5))
  );
  const rate = SEEDANCE2_STANDARD_ESTIMATED_USD_PER_SEC[resolution];
  const amountUsd = Math.round(rate * durationSec * 10000) / 10000;
  return {
    amountUsd,
    kind: "estimated",
    label: "estimated",
  };
}

export function buildSeedance2CostAudit(input: {
  durationSec: number;
  resolution: "480p" | "720p" | string;
  ceilingUsd: number;
  remainingAfterReserveUsd: number;
  /** Only pass when the provider explicitly reported a USD figure. */
  actualUsd?: number | null;
  modelId?: string;
}): Seedance2CostAudit {
  const modelId = input.modelId || SEEDANCE2_PRIVATE_LIVE_MODEL;
  const resolution: "480p" | "720p" =
    input.resolution === "480p" ? "480p" : "720p";
  const durationSec = Math.min(
    10,
    Math.max(4, Math.round(Number(input.durationSec) || 5))
  );
  const estimated = estimateSeedance2JobUsd({ durationSec, resolution });
  const actual =
    typeof input.actualUsd === "number" &&
    Number.isFinite(input.actualUsd) &&
    input.actualUsd >= 0
      ? ({
          amountUsd: Math.round(input.actualUsd * 10000) / 10000,
          kind: "actual" as const,
          label: "actual" as const,
        } as LabeledUsdAmount)
      : null;
  return {
    modelId,
    durationSec,
    resolution,
    estimated,
    ceiling: {
      amountUsd: Math.max(0, input.remainingAfterReserveUsd),
      kind: "ceiling",
      label: "ceiling",
    },
    actual,
    note: actual
      ? "Estimated rate is planning-only; actual is provider-reported."
      : "Estimated rate is planning-only. Actual USD is unknown — never invent an invoice figure.",
  };
}

/**
 * Admission facade used by the route while the durable cost migration remains
 * source-only. A positive env value is not enough: a server restart or a
 * second instance could bypass process memory, so this deliberately refuses.
 */
export function tryReservePaidCeilingUsd(input: {
  userId: string;
  ceilingUsd: number;
  durationSec: number;
  resolution: "480p" | "720p" | string;
  modelId?: string;
  idempotencyKey?: string;
}): PaidCeilingAdmission {
  const modelId = input.modelId || SEEDANCE2_PRIVATE_LIVE_MODEL;
  const estimated = estimateSeedance2JobUsd({
    durationSec: input.durationSec,
    resolution: input.resolution,
  });
  const ceilingUsd = Math.max(0, Number(input.ceilingUsd) || 0);
  const spentUsd = 0;
  const remainingUsd = Math.max(0, ceilingUsd - spentUsd);
  void input.userId;
  void input.idempotencyKey;

  const auditBase = (remainingAfter: number): Seedance2CostAudit =>
    buildSeedance2CostAudit({
      durationSec: input.durationSec,
      resolution: input.resolution,
      ceilingUsd,
      remainingAfterReserveUsd: remainingAfter,
      actualUsd: null,
      modelId,
    });

  if (!isPrivateLiveSeedanceModel(modelId)) {
    return {
      ok: false,
      code: "MODEL_NOT_ADMITTED",
      error:
        "Private live generation admits only bytedance/seedance-2.0/image-to-video",
      ceilingUsd,
      spentUsd,
      remainingUsd,
      estimatedJobUsd: estimated.amountUsd,
      audit: auditBase(remainingUsd),
    };
  }

  if (ceilingUsd <= 0) {
    return {
      ok: false,
      code: "PAID_CEILING_ZERO",
      error:
        "Paid Seedance 2.0 ceiling is zero — refuse provider spend until an owner sets a cumulative USD ceiling",
      ceilingUsd,
      spentUsd,
      remainingUsd: 0,
      estimatedJobUsd: estimated.amountUsd,
      audit: auditBase(0),
    };
  }

  if (remainingUsd + 1e-9 < estimated.amountUsd) {
    return {
      ok: false,
      code: "PAID_CEILING_EXHAUSTED",
      error:
        "Estimated job cost exceeds the remaining Seedance 2.0 paid ceiling — no provider request authorized",
      ceilingUsd,
      spentUsd,
      remainingUsd,
      estimatedJobUsd: estimated.amountUsd,
      audit: auditBase(remainingUsd),
    };
  }

  return {
    ok: false,
    code: "PAID_CEILING_UNAVAILABLE",
    error:
      "Durable atomic USD cost admission is not active — provider spend remains blocked even when an environment ceiling is set",
    ceilingUsd,
    spentUsd,
    remainingUsd,
    estimatedJobUsd: estimated.amountUsd,
    audit: auditBase(remainingUsd),
  };
}

/** No-op until the durable reservation RPC is wired. */
export function releasePaidCeilingUsd(input: {
  userId: string;
  estimatedJobUsd: number;
  idempotencyKey?: string;
}): { spentUsd: number } {
  void input;
  return { spentUsd: 0 };
}

/** Compatibility test helper; there is intentionally no process spend store. */
export function resetPaidCeilingStoreForTests(): void {
  // no-op
}

/**
 * Customer-facing success payload fragment. Actual is always null unless the
 * caller supplies a provider-reported number.
 */
export function costAuditForResponse(audit: Seedance2CostAudit): {
  modelId: string;
  estimatedUsd: {
    amountUsd: number;
    kind: "estimated";
    label: "estimated";
  };
  ceilingRemainingUsd: {
    amountUsd: number;
    kind: "ceiling";
    label: "ceiling";
  };
  actualUsd: {
    amountUsd: number;
    kind: "actual";
    label: "actual";
  } | null;
  note: string;
} {
  return {
    modelId: audit.modelId,
    estimatedUsd: {
      amountUsd: audit.estimated.amountUsd,
      kind: "estimated",
      label: "estimated",
    },
    ceilingRemainingUsd: {
      amountUsd: audit.ceiling.amountUsd,
      kind: "ceiling",
      label: "ceiling",
    },
    actualUsd:
      audit.actual == null
        ? null
        : {
            amountUsd: audit.actual.amountUsd,
            kind: "actual",
            label: "actual",
          },
    note: audit.note,
  };
}
