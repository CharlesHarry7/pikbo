/**
 * Bounded client waits for Studio open / Lab sample loads.
 * Fail closed with an explicit timeout rather than an endless spinner.
 */

export const STUDIO_SESSION_BOOT_MS = 8_000;
export const LAB_SAMPLE_LOAD_MS = 12_000;
export const LAB_VIDEO_READY_MS = 12_000;
export const STUDIO_NAV_OPEN_MS = 12_000;

export class ClientTimeoutError extends Error {
  readonly code = "CLIENT_TIMEOUT" as const;
  constructor(message = "Timed out") {
    super(message);
    this.name = "ClientTimeoutError";
  }
}

export function isClientTimeoutError(err: unknown): boolean {
  return (
    err instanceof ClientTimeoutError ||
    (typeof err === "object" &&
      err !== null &&
      (err as { code?: string }).code === "CLIENT_TIMEOUT")
  );
}

/** Race a promise against a wall-clock timeout. Rejects with ClientTimeoutError. */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = "Timed out"
): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new ClientTimeoutError(message));
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
