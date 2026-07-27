import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Fixed wall-clock deadline for one attempt. Reads and heartbeats never move it. */
export function fixedDeadlineAt(nowMs, timeoutMs) {
  const start = Number.isFinite(nowMs) ? nowMs : Date.now();
  const windowMs =
    Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 10 * 60_000;
  return new Date(start + windowMs).toISOString();
}

export function deadlineExpired(deadlineAt, nowMs = Date.now()) {
  const deadline = Date.parse(deadlineAt);
  return Number.isFinite(deadline) && nowMs >= deadline;
}

export function deadlineRemainingMs(deadlineAt, nowMs = Date.now()) {
  const deadline = Date.parse(deadlineAt);
  if (!Number.isFinite(deadline)) return 0;
  return Math.max(0, deadline - nowMs);
}

/**
 * A provider response is deliverable only while the exact local attempt is
 * still running. Cancel, timeout, failure, missing rows and unclaimed retry
 * children all fail closed; their durable reservation needs reconciliation.
 * @param {{ status?: string, errorCode?: string } | null | undefined} job
 * @returns {{ allow: true } | {
 *   allow: false,
 *   code: "REQUEST_CANCELED" | "TIMEOUT" | "GENERATION_FAILED",
 *   httpStatus: number,
 *   message: string
 * }}
 */
export function providerCompletionDecision(job) {
  if (job?.status === "running") {
    return { allow: true };
  }
  if (job?.status === "canceled") {
    return {
      allow: false,
      code: "REQUEST_CANCELED",
      httpStatus: 409,
      message:
        "Generation was canceled while provider work was in flight. The returned output is withheld and credit settlement is unconfirmed.",
    };
  }
  if (job?.status === "failed" && job?.errorCode === "TIMEOUT") {
    return {
      allow: false,
      code: "TIMEOUT",
      httpStatus: 504,
      message:
        "The provider returned after this attempt's fixed deadline. Output is withheld while settlement is reconciled.",
    };
  }
  return {
    allow: false,
    code: "GENERATION_FAILED",
    httpStatus: 409,
    message:
      "This generation attempt is no longer running. The returned output is withheld and credit settlement is unconfirmed.",
  };
}

export function mintRetryToken() {
  return `retry_${randomBytes(24).toString("base64url")}`;
}

export function retryTokenDigest(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

export function retryTokenMatches(expectedDigest, presentedToken) {
  if (
    typeof expectedDigest !== "string" ||
    expectedDigest.length !== 64 ||
    typeof presentedToken !== "string" ||
    presentedToken.length < 16
  ) {
    return false;
  }
  const actual = retryTokenDigest(presentedToken);
  return timingSafeEqual(Buffer.from(expectedDigest), Buffer.from(actual));
}
