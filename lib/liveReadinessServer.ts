import { publicAuthStatus } from "@/lib/authConfig";
import {
  probeDurableCreditsStore,
} from "@/lib/durableCredits";
import { probeDurableReconciliationSchema } from "@/lib/durableCredits/reconciliation";
import {
  evaluateHealthTruth,
  evaluatePrivatePreviewReadiness,
  type HealthTruthInput,
  type PrivatePreviewReadinessInput,
} from "@/lib/liveCapability";
import {
  probeDurableProviderBudgetStore,
  providerValidationBudgetUsd,
  providerValidationEnvironmentGate,
} from "@/lib/durableProviderBudget";
import {
  privateProviderOutputAllowlistConfigured,
  privateResultsProbe,
} from "@/lib/privateGenerationResults";
import { privateToyAssetsProbe } from "@/lib/privateToyAssets";
import { parsePrivateLiveAllowlist } from "@/lib/privateLiveBeta.mjs";
import { probeSupabase } from "@/lib/supabase/server";
import { t6Report } from "@/lib/t6Watermark";

/**
 * Shared server probe used by /api/health and /api/me. Keeping these facts in
 * one place prevents account CTAs from claiming live access while health is
 * fail-closed.
 */
async function computeSoftLiveReadiness() {
  const [
    durableCredits,
    durableReconciliation,
    durableProviderBudget,
    privateResults,
    privateInputs,
    supabase,
  ] = await Promise.all([
    probeDurableCreditsStore(),
    probeDurableReconciliationSchema(),
    probeDurableProviderBudgetStore(),
    privateResultsProbe(),
    privateToyAssetsProbe(),
    probeSupabase(),
  ]);
  const authPublic = publicAuthStatus();
  const t6 = t6Report();

  const authConfigured =
    authPublic.configured && supabase.configured && supabase.reachable;
  const durableAtomicReservationConfigured =
    process.env.REQUIRE_DURABLE_CREDITS === "1" &&
    process.env.PIKBO_R1_ATOMIC_RESERVATION_READY === "1" &&
    durableCredits.backend === "supabase" &&
    durableCredits.configured &&
    durableCredits.writable &&
    durableCredits.schemaReady === true &&
    supabase.hasServiceRole;
  const durableReconciliationConfigured =
    process.env.PIKBO_R1_RECONCILIATION_READY === "1" &&
    durableReconciliation.configured &&
    durableReconciliation.schemaReady;
  const serverOwnedDeliverableConfigured =
    t6.status === "ready" &&
    t6.fileBake === true &&
    t6.freeLiveRawDownload === "allowed" &&
    t6.tooling.serverOwnedWorkerReady &&
    t6.tooling.derivativeServingImplemented &&
    t6.tooling.storageAdapterImplemented;
  const input: HealthTruthInput = {
    authConfigured,
    durableAtomicReservationConfigured,
    durableReconciliationConfigured,
    providerConfigured: Boolean(process.env.FAL_KEY),
    serverOwnedDeliverableConfigured,
  };
  const providerValidationDeployment =
    providerValidationEnvironmentGate();
  const privatePreviewInput: PrivatePreviewReadinessInput = {
    authConfigured,
    durableAtomicReservationConfigured,
    durableReconciliationConfigured,
    providerConfigured: Boolean(process.env.FAL_KEY),
    privateResultsBucketReady: privateResults.bucketReady,
    privateResultsSchemaReady: privateResults.schemaReady,
    privateResultsRpcReady: privateResults.rpcReady,
    privateInputsBucketReady: privateInputs.bucketReady,
    privateInputsSchemaReady: privateInputs.schemaReady,
    privateInputsRpcReady: privateInputs.rpcReady,
    providerOutputAllowlistConfigured:
      privateProviderOutputAllowlistConfigured(),
    privateLiveEnabled: process.env.PIKBO_PRIVATE_LIVE_ENABLED === "1",
    privateLiveAllowlistConfigured:
      parsePrivateLiveAllowlist(
        process.env.PIKBO_PRIVATE_LIVE_ALLOWLIST || ""
      ).length > 0,
    privateLiveBudgetConfigured:
      Math.floor(
        Number(process.env.PIKBO_PRIVATE_LIVE_BUDGET_MAX || "0")
      ) > 0,
    providerValidationEnvironmentAllowed:
      providerValidationDeployment.environmentAllowed,
    providerValidationBudgetConfigured:
      providerValidationBudgetUsd() > 0,
    durableProviderBudgetSchemaReady:
      durableProviderBudget.schemaReady,
    durableProviderBudgetRpcReady: durableProviderBudget.rpcReady,
  };

  return {
    truth: evaluateHealthTruth(input),
    privatePreview: evaluatePrivatePreviewReadiness(privatePreviewInput),
    input,
    privatePreviewInput,
    authPublic,
    durableCredits,
    durableReconciliation,
    durableProviderBudget,
    privateResults,
    privateInputs,
    supabase,
    t6,
  };
}

type SoftLiveReadiness = Awaited<
  ReturnType<typeof computeSoftLiveReadiness>
>;

const READINESS_TTL_MS = 15_000;
let readinessCache:
  | { expiresAt: number; value: SoftLiveReadiness }
  | null = null;
let readinessProbe: Promise<SoftLiveReadiness> | null = null;

/**
 * UI calls /api/me frequently. Share a short-lived result with /api/health so
 * correctness does not add several Supabase schema probes to every render.
 */
export async function probeSoftLiveReadiness(): Promise<SoftLiveReadiness> {
  const now = Date.now();
  if (readinessCache && readinessCache.expiresAt > now) {
    return readinessCache.value;
  }
  if (readinessProbe) return readinessProbe;

  readinessProbe = computeSoftLiveReadiness();
  try {
    const value = await readinessProbe;
    readinessCache = {
      expiresAt: Date.now() + READINESS_TTL_MS,
      value,
    };
    return value;
  } finally {
    readinessProbe = null;
  }
}
