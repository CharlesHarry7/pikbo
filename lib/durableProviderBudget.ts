import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  buildSeedance2CostAudit,
  estimateSeedance2JobUsd,
  type Seedance2CostAudit,
} from "@/lib/liveGenerationCostGuard";
import { SEEDANCE_FAST } from "@/lib/models";

const HARD_VALIDATION_CAP_USD = 20;

type RpcPayload = Record<string, unknown>;

function payload(value: unknown): RpcPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as RpcPayload;
}

function numberValue(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export type DurableProviderBudgetProbe = {
  configured: boolean;
  schemaReady: boolean;
  rpcReady: boolean;
  warning?: string;
};

/**
 * Read-only readiness probe for the non-production provider-spend authority.
 *
 * The null-user RPC call is an intentional no-op: the SQL function returns
 * AUTH_REQUIRED before it reads or mutates budget state. It proves that the
 * service-role RPC is present without reserving spend.
 */
export async function probeDurableProviderBudgetStore(): Promise<DurableProviderBudgetProbe> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      configured: false,
      schemaReady: false,
      rpcReady: false,
      warning: "Supabase service role unavailable",
    };
  }
  try {
    const [budgetTable, reservationTable, reserveRpc] = await Promise.all([
      admin
        .from("provider_validation_budgets")
        .select("scope")
        .limit(1),
      admin
        .from("provider_spend_reservations")
        .select("id")
        .limit(1),
      admin.rpc("pikbo_reserve_provider_spend_v1", {
        p_user_id: null,
        p_idempotency_key: "readiness-probe",
        p_model_id: SEEDANCE_FAST,
        p_estimated_microusd: 1,
        p_ceiling_microusd: 1,
      }),
    ]);
    const tableError = budgetTable.error || reservationTable.error;
    const rpcResult = payload(reserveRpc.data);
    const rpcReady =
      !reserveRpc.error &&
      rpcResult?.ok === false &&
      rpcResult.code === "AUTH_REQUIRED";
    if (tableError || !rpcReady) {
      return {
        configured: true,
        schemaReady: !tableError,
        rpcReady,
        warning: (
          tableError?.message ||
          reserveRpc.error?.message ||
          "Provider budget RPC readiness probe returned an invalid result"
        ).slice(0, 160),
      };
    }
    return {
      configured: true,
      schemaReady: true,
      rpcReady: true,
    };
  } catch (error) {
    return {
      configured: true,
      schemaReady: false,
      rpcReady: false,
      warning:
        error instanceof Error
          ? error.message.slice(0, 160)
          : "Provider budget readiness probe failed",
    };
  }
}

export function providerValidationBudgetUsd(
  env: NodeJS.ProcessEnv = process.env
): number {
  const gate = providerValidationEnvironmentGate(env);
  if (
    env.PIKBO_PROVIDER_VALIDATION_MODE !== "1" ||
    !gate.environmentAllowed
  ) {
    return 0;
  }
  const raw = env.PIKBO_PROVIDER_VALIDATION_BUDGET_USD;
  const parsed = raw == null || raw === "" ? HARD_VALIDATION_CAP_USD : Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(
    HARD_VALIDATION_CAP_USD,
    Math.floor(parsed * 100) / 100
  );
}

/**
 * Deployment-only gate for the paid provider validation budget.
 *
 * Vercel Preview always needs its own explicit opt-in, even if NODE_ENV is
 * accidentally overridden. Vercel Production and plain production runtimes
 * remain hard-closed. Local development/test may opt in without pretending to
 * be a Vercel Preview.
 */
export function providerValidationEnvironmentGate(
  env: NodeJS.ProcessEnv = process.env
): {
  environment:
    | "vercel-production"
    | "vercel-preview"
    | "local-nonproduction"
    | "closed";
  previewOverride: boolean;
  environmentAllowed: boolean;
  productionHardClosed: boolean;
} {
  const vercelEnvironment = env.VERCEL_ENV;
  const isVercelProduction = vercelEnvironment === "production";
  const isVercelPreview = vercelEnvironment === "preview";
  const previewOverride =
    isVercelPreview &&
    env.PIKBO_PREVIEW_PROVIDER_VALIDATION_ENABLED === "1";
  const localNonProduction =
    (vercelEnvironment == null ||
      vercelEnvironment === "" ||
      vercelEnvironment === "development") &&
    env.NODE_ENV !== "production";
  const productionHardClosed =
    isVercelProduction ||
    (env.NODE_ENV === "production" && !isVercelPreview);
  const environmentAllowed =
    !productionHardClosed &&
    (isVercelPreview ? previewOverride : localNonProduction);

  return {
    environment: isVercelProduction
      ? "vercel-production"
      : isVercelPreview
        ? "vercel-preview"
        : localNonProduction
          ? "local-nonproduction"
          : "closed",
    previewOverride,
    environmentAllowed,
    productionHardClosed,
  };
}

function modelAdmitted(modelId: string): boolean {
  return modelId === SEEDANCE_FAST;
}

export type DurableProviderSpendReservation = {
  reservationId: string;
  userId: string;
  modelId: string;
  estimatedMicrousd: number;
  estimatedUsd: number;
  audit: Seedance2CostAudit;
};

export async function reserveDurableProviderSpend(input: {
  userId: string;
  idempotencyKey: string;
  modelId: string;
  durationSec: number;
  resolution: string;
}): Promise<
  | {
      ok: true;
      providerAuthorized: true;
      reservation: DurableProviderSpendReservation;
    }
  | { ok: false; code: string; error: string; audit: Seedance2CostAudit }
> {
  const ceilingUsd = providerValidationBudgetUsd();
  const estimated = estimateSeedance2JobUsd({
    durationSec: input.durationSec,
    resolution: input.resolution,
  });
  const baseAudit = (remainingUsd: number) =>
    buildSeedance2CostAudit({
      durationSec: input.durationSec,
      resolution: input.resolution,
      ceilingUsd,
      remainingAfterReserveUsd: remainingUsd,
      modelId: input.modelId,
      actualUsd: null,
    });
  if (!modelAdmitted(input.modelId)) {
    return {
      ok: false,
      code: "MODEL_NOT_ADMITTED",
      error: "The selected provider model is outside the validation allowlist",
      audit: baseAudit(ceilingUsd),
    };
  }
  if (ceilingUsd <= 0) {
    return {
      ok: false,
      code: "PAID_CEILING_ZERO",
      error:
        "Provider validation is closed. Enable the non-production validation budget explicitly.",
      audit: baseAudit(0),
    };
  }
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      code: "PAID_CEILING_UNAVAILABLE",
      error: "Durable provider budget is unavailable",
      audit: baseAudit(ceilingUsd),
    };
  }
  const estimatedMicrousd = Math.max(
    1,
    Math.round(estimated.amountUsd * 1_000_000)
  );
  const ceilingMicrousd = Math.round(ceilingUsd * 1_000_000);
  const { data, error } = await admin.rpc("pikbo_reserve_provider_spend_v1", {
    p_user_id: input.userId,
    p_idempotency_key: input.idempotencyKey,
    p_model_id: input.modelId,
    p_estimated_microusd: estimatedMicrousd,
    p_ceiling_microusd: ceilingMicrousd,
  });
  if (error) {
    return {
      ok: false,
      code: "PAID_CEILING_UNAVAILABLE",
      error: error.message.slice(0, 160),
      audit: baseAudit(ceilingUsd),
    };
  }
  const result = payload(data);
  if (!result || result.ok !== true) {
    const code =
      typeof result?.code === "string"
        ? result.code
        : "PAID_CEILING_UNAVAILABLE";
    return {
      ok: false,
      code,
      error:
        code === "PAID_CEILING_EXHAUSTED"
          ? "The US$20 provider validation budget is exhausted"
          : "Provider budget reservation was rejected",
      audit: baseAudit(
        Math.max(
          0,
          (numberValue(result?.ceilingMicrousd) ?? ceilingMicrousd) /
            1_000_000 -
            (numberValue(result?.reservedMicrousd) ?? 0) / 1_000_000 -
            (numberValue(result?.spentMicrousd) ?? 0) / 1_000_000
        )
      ),
    };
  }
  const reservationId =
    typeof result.reservationId === "string" ? result.reservationId : "";
  const returnedEstimate = numberValue(result.estimatedMicrousd);
  const remainingMicrousd = numberValue(result.remainingMicrousd);
  if (
    !reservationId ||
    returnedEstimate !== estimatedMicrousd ||
    remainingMicrousd == null
  ) {
    return {
      ok: false,
      code: "PAID_CEILING_UNAVAILABLE",
      error: "Provider budget returned an invalid reservation",
      audit: baseAudit(ceilingUsd),
    };
  }
  if (result.providerAuthorized !== true || result.idempotent === true) {
    return {
      ok: false,
      code: "JOB_IN_FLIGHT",
      error: "This provider-spend attempt is already reserved",
      audit: baseAudit(remainingMicrousd / 1_000_000),
    };
  }
  return {
    ok: true,
    providerAuthorized: true,
    reservation: {
      reservationId,
      userId: input.userId,
      modelId: input.modelId,
      estimatedMicrousd,
      estimatedUsd: estimatedMicrousd / 1_000_000,
      audit: baseAudit(remainingMicrousd / 1_000_000),
    },
  };
}

async function transitionProviderSpend(
  reservation: DurableProviderSpendReservation,
  action: "commit" | "release"
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;
  const { data, error } = await admin.rpc(
    action === "commit"
      ? "pikbo_commit_provider_spend_v1"
      : "pikbo_release_provider_spend_v1",
    {
      p_user_id: reservation.userId,
      p_reservation_id: reservation.reservationId,
    }
  );
  if (error) return false;
  const result = payload(data);
  return (
    result?.ok === true &&
    result.status === (action === "commit" ? "committed" : "released")
  );
}

export async function commitDurableProviderSpend(
  reservation: DurableProviderSpendReservation
): Promise<boolean> {
  return transitionProviderSpend(reservation, "commit");
}

export async function releaseDurableProviderSpend(
  reservation: DurableProviderSpendReservation
): Promise<boolean> {
  return transitionProviderSpend(reservation, "release");
}

export async function expireDurableProviderSpendReservations(input?: {
  limit?: number;
}): Promise<
  | {
      ok: true;
      data: { releasedReservations: number; releasedMicrousd: number };
    }
  | { ok: false; code: string; error: string }
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      code: "PROVIDER_BUDGET_UNAVAILABLE",
      error: "Durable provider budget is unavailable",
    };
  }
  const requestedLimit = input?.limit;
  const limit =
    typeof requestedLimit === "number" && Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(500, Math.floor(requestedLimit)))
      : 100;
  const { data, error } = await admin.rpc(
    "pikbo_expire_provider_spend_v1",
    { p_limit: limit }
  );
  if (error) {
    return {
      ok: false,
      code: "PROVIDER_BUDGET_RECONCILIATION_FAILED",
      error: error.message.slice(0, 160),
    };
  }
  const result = payload(data);
  const releasedReservations = numberValue(result?.releasedReservations);
  const releasedMicrousd = numberValue(result?.releasedMicrousd);
  if (
    result?.ok !== true ||
    releasedReservations == null ||
    releasedMicrousd == null ||
    releasedReservations < 0 ||
    releasedMicrousd < 0
  ) {
    return {
      ok: false,
      code: "PROVIDER_BUDGET_RECONCILIATION_INVALID",
      error: "Provider budget reconciliation returned an invalid result",
    };
  }
  return {
    ok: true,
    data: {
      releasedReservations,
      releasedMicrousd,
    },
  };
}
