/**
 * Create/Studio open-state contracts (AIT-40).
 * Keep session resolve and Lab sample loads bounded so the UI never sits
 * forever on "checking" / sample loading with no recovery path.
 */

/** How long Create may wait on /api/me before treating access as unresolved public. */
export const STUDIO_SESSION_RESOLVE_MS = 8_000;

/** How long a Lab sample still fetch+decode may take before honest failure. */
export const STUDIO_LAB_SAMPLE_LOAD_MS = 12_000;

/** Street Power-Up archive shown as the fixed-Moment open Lab preview. */
export const STUDIO_OPEN_LAB_SAMPLE = {
  id: "beatbot",
  title: "Street Power-Up",
  character: "Beatbot",
  poster: "/demos/beatbot-still.webp",
  mp4: "/demos/beatbot-viral-hook.mp4",
  webm: "/demos/beatbot-viral-hook.webm",
  badge: "PIKBO Lab · cached prototype",
} as const;

export const STUDIO_SESSION_TIMEOUT_COPY =
  "Could not verify private-beta access in time. Lab preview stays available — retry access check or continue with a cached sample." as const;

export const STUDIO_LAB_SAMPLE_TIMEOUT_COPY =
  "Lab sample took too long to load. Check your connection, then retry a cached still." as const;

/**
 * Race a promise against a wall-clock timeout.
 * On timeout, rejects with the provided Error (or a generic timeout Error).
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutError?: Error
): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(timeoutError ?? new Error(`Timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export function isTimeoutError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.name === "TimeoutError" ||
    /timed out|timeout/i.test(err.message)
  );
}

export function studioSessionTimeoutError(): Error {
  const err = new Error(STUDIO_SESSION_TIMEOUT_COPY);
  err.name = "TimeoutError";
  return err;
}

export function studioLabSampleTimeoutError(): Error {
  const err = new Error(STUDIO_LAB_SAMPLE_TIMEOUT_COPY);
  err.name = "TimeoutError";
  return err;
}
