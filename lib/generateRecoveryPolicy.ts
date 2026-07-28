/**
 * Decision policy for racing the original generate response against durable
 * owner-only recovery. Recovery is allowed to win only when it proves a
 * terminal durable outcome; a read/network failure must not cancel a live
 * provider request.
 */

export type GenerateRaceResultLike = {
  ok: boolean;
  status: number;
  code?: string;
  creditsRefunded?: boolean;
};

export function isAuthoritativePrimaryResult(
  result: GenerateRaceResultLike
): boolean {
  return result.ok || result.code !== "NETWORK_ERROR";
}

export function isAuthoritativeRecoveryResult(
  result: GenerateRaceResultLike
): boolean {
  return (
    result.ok ||
    (result.code === "GENERATION_FAILED" &&
      result.creditsRefunded === true)
  );
}

export async function raceGenerateWithDurableRecovery<
  T extends GenerateRaceResultLike,
>(input: {
  primary: Promise<T>;
  recovery: Promise<T>;
  abortPrimary: () => void;
  abortRecovery: () => void;
}): Promise<T> {
  const first = await Promise.race([
    input.primary.then((result) => ({
      source: "primary" as const,
      result,
    })),
    input.recovery.then((result) => ({
      source: "recovery" as const,
      result,
    })),
  ]);

  if (first.source === "primary") {
    if (isAuthoritativePrimaryResult(first.result)) {
      input.abortRecovery();
      return first.result;
    }
    // The browser never received a typed response. Durable owner truth can
    // still prove that the same request completed without starting a retry.
    return input.recovery;
  }

  if (isAuthoritativeRecoveryResult(first.result)) {
    input.abortPrimary();
    return first.result;
  }

  // A missing/unavailable recovery read says nothing about the live POST.
  // Only an explicit caller abort or authoritative durable terminal state may
  // end it. Waiting longer is safer than converting a healthy provider job
  // into an ambiguous cancel/refund state.
  return input.primary;
}
