/**
 * T6 baked-watermark worker v1 (source-only).
 *
 * This module deliberately has no HTTP route and no client input surface. A
 * future server-owned job worker must obtain `ServerOwnedT6Input` from its
 * persisted generation-job/output record, then invoke this adapter. Until
 * database-backed worker tests pass, `SERVER_OWNED_T6_BAKED_WATERMARK_IMPLEMENTED`
 * stays false and callers must not serve raw Free provider output.
 */

import { createHash } from "node:crypto";

export const SERVER_OWNED_T6_BAKED_WATERMARK_IMPLEMENTED = false;
export const T6_MAX_SOURCE_BYTES = 50 * 1024 * 1024;
export const T6_SOURCE_TIMEOUT_MS = 30_000;

export type T6DerivativeStatus = "queued" | "running" | "succeeded" | "failed";

export type ServerOwnedT6Input = Readonly<{
  jobId: string;
  providerRequestId: string;
  provider: string;
  /** Trusted provider output held by the server job record; never request JSON. */
  providerOutputUrl: string;
  idempotencyKey: string;
}>;

export type T6DerivativeMetadata = Readonly<{
  status: T6DerivativeStatus;
  idempotencyKey: string;
  objectKey: string;
  deliveryPath?: string;
  contentType?: "video/mp4";
  sourceChecksum?: string;
  outputChecksum?: string;
  /** ffprobe / runner proof, never treated as customer-visible source metadata. */
  probe?: { formatName: string; bakedMarkSignal: boolean };
  errorCode?: string;
}>;

export type T6WorkerReadiness = Readonly<{
  envRequested: boolean;
  implemented: boolean;
  effective: boolean;
  reason: string;
}>;

/** An environment value is only an operator request, never a launch switch. */
export function t6WorkerReadiness(): T6WorkerReadiness {
  const envRequested = process.env.PIKBO_T6_BAKED_WATERMARK_WORKER === "1";
  const implemented = SERVER_OWNED_T6_BAKED_WATERMARK_IMPLEMENTED;
  return {
    envRequested,
    implemented,
    effective: envRequested && implemented,
    reason:
      "T6 baked derivatives are hard-disabled until the persisted server worker and database-backed ffmpeg proof are complete",
  };
}

/** Deterministic across retries, separate from the provider URL / raw object. */
export function t6DerivativeIdempotencyKey(input: {
  jobId: string;
  providerRequestId: string;
}): string {
  const material = `${input.jobId}:${input.providerRequestId}`;
  return `t6-bake:${createHash("sha256").update(material).digest("hex")}`;
}

export function t6DerivativeObjectKey(input: ServerOwnedT6Input): string {
  return `t6-baked/${createHash("sha256")
    .update(input.idempotencyKey)
    .digest("hex")}.mp4`;
}

/** The only customer-facing address a verified T6 object may use. */
export function t6OwnedDeliveryPath(objectKey: string): string | null {
  const match = objectKey.match(/^t6-baked\/([a-f0-9]{64})\.mp4$/);
  return match ? `/api/t6-derivatives/${match[1]}.mp4` : null;
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

/** DNS rebinding guard: every address resolved by the server adapter must be public. */
export function hasOnlyPublicResolvedAddresses(addresses: readonly string[]): boolean {
  if (!addresses.length) return false;
  return addresses.every((address) => {
    const normalized = address.replace(/^\[|\]$/g, "").toLowerCase();
    if (isPrivateIpv4(normalized)) return false;
    const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mappedIpv4 && isPrivateIpv4(mappedIpv4[1])) return false;
    return !(
      normalized === "::1" ||
      normalized.startsWith("fe80:") ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd")
    );
  });
}

/**
 * URL shape guard for a server-owned provider output. DNS resolution and
 * byte-stream limits are intentionally left to the worker deployment adapter.
 */
export function isPublicProviderOutputUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !host || url.username || url.password) return false;
    if (host === "localhost" || host.endsWith(".localhost") || isPrivateIpv4(host)) {
      return false;
    }
    // file:, data:, unix sockets and IPv6 loopback / link-local / ULA all fail.
    if (host.includes(":")) {
      const normalized = host.replace(/^\[|\]$/g, "");
      if (
        normalized === "::1" ||
        normalized.startsWith("fe80:") ||
        normalized.startsWith("fc") ||
        normalized.startsWith("fd")
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/** Enforced before ffmpeg starts; unknown/oversized/slow source is blocked. */
export function validateT6SourceResponse(input: {
  contentType: string | null;
  contentLength: number | null;
  downloadedBytes: number;
  elapsedMs: number;
  resolvedAddresses: readonly string[];
}): { ok: true } | { ok: false; code: string } {
  if (!hasOnlyPublicResolvedAddresses(input.resolvedAddresses)) {
    return { ok: false, code: "SOURCE_PRIVATE_NETWORK" };
  }
  if ((input.contentType || "").split(";", 1)[0].trim().toLowerCase() !== "video/mp4") {
    return { ok: false, code: "SOURCE_CONTENT_TYPE" };
  }
  if (
    (input.contentLength !== null && input.contentLength > T6_MAX_SOURCE_BYTES) ||
    input.downloadedBytes <= 0 ||
    input.downloadedBytes > T6_MAX_SOURCE_BYTES
  ) {
    return { ok: false, code: "SOURCE_TOO_LARGE" };
  }
  if (input.elapsedMs > T6_SOURCE_TIMEOUT_MS) {
    return { ok: false, code: "SOURCE_TIMEOUT" };
  }
  return { ok: true };
}

/** Reject arbitrary URLs at the worker boundary and require server job metadata. */
export function createServerOwnedT6Input(job: {
  id: string;
  requestId?: string;
  provider?: string;
  videoUrl?: string;
  demo: boolean;
  watermark: boolean;
}): ServerOwnedT6Input | null {
  if (
    !job.id ||
    !job.requestId ||
    !job.provider ||
    !job.videoUrl ||
    job.demo ||
    !job.watermark ||
    !isPublicProviderOutputUrl(job.videoUrl)
  ) {
    return null;
  }
  return {
    jobId: job.id,
    providerRequestId: job.requestId,
    provider: job.provider,
    providerOutputUrl: job.videoUrl,
    idempotencyKey: t6DerivativeIdempotencyKey({
      jobId: job.id,
      providerRequestId: job.requestId,
    }),
  };
}

/** ffmpeg command contract: visible mark plus an auditable MP4 metadata tag. */
export function t6FfmpegArgs(input: {
  sourcePath: string;
  outputPath: string;
  text?: string;
}): string[] {
  const mark = (input.text || "PIKBO").replace(/['\\:]/g, " ").slice(0, 48);
  return [
    "-y",
    "-i",
    input.sourcePath,
    "-vf",
    `drawtext=text='${mark}':x=w-tw-36:y=h-th-28:fontsize=30:fontcolor=white@0.92:box=1:boxcolor=black@0.42:boxborderw=10`,
    "-metadata",
    "comment=PIKBO baked watermark",
    "-movflags",
    "+faststart",
    "-c:a",
    "copy",
    input.outputPath,
  ];
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Validates the post-transform contract. The real adapter must enforce a
 * bounded download, timeout, `video/mp4` source type, ffprobe success, and a
 * separate owned object key before it can mark a derivative succeeded.
 */
export function verifyT6Derivative(input: {
  source: Uint8Array;
  output: Uint8Array;
  probe: { formatName: string; bakedMarkSignal: boolean };
}): { ok: true; sourceChecksum: string; outputChecksum: string } | { ok: false; code: string } {
  const sourceChecksum = sha256(input.source);
  const outputChecksum = sha256(input.output);
  if (!input.output.byteLength || sourceChecksum === outputChecksum) {
    return { ok: false, code: "DERIVATIVE_UNVERIFIED" };
  }
  if (!/mp4|mov/i.test(input.probe.formatName) || !input.probe.bakedMarkSignal) {
    return { ok: false, code: "WATERMARK_PROBE_FAILED" };
  }
  return { ok: true, sourceChecksum, outputChecksum };
}

/**
 * Injectable runner boundary. Production wiring must provide a server-only
 * provider-output fetcher, ffmpeg invocation and owned-object writer; tests
 * use a fake runner and never make a network request or run system tooling.
 */
export type T6InjectedRunner = {
  fetchServerOwnedOutput: (input: ServerOwnedT6Input) => Promise<{
    contentType: string | null;
    contentLength: number | null;
    bytes: Uint8Array;
    elapsedMs: number;
    /** Adapter must resolve before fetch and provide all A/AAAA results. */
    resolvedAddresses: readonly string[];
  }>;
  runFfmpeg: (input: { args: string[]; source: Uint8Array }) => Promise<Uint8Array>;
  probeMp4: (output: Uint8Array) => Promise<{
    formatName: string;
    bakedMarkSignal: boolean;
  }>;
  writeOwnedDerivative: (input: {
    objectKey: string;
    contentType: "video/mp4";
    bytes: Uint8Array;
  }) => Promise<{ deliveryPath: string }>;
};

/**
 * Pure/injectable worker core. Its caller is responsible for persisting the
 * returned transition with a row lock/compare-and-set; this core never has a
 * client URL parameter or a raw-provider delivery result.
 */
export async function runT6PipelineWithInjectedRunner(input: {
  current?: T6DerivativeMetadata;
  job: ServerOwnedT6Input;
  runner: T6InjectedRunner;
}): Promise<T6DerivativeMetadata> {
  const base = {
    idempotencyKey: input.job.idempotencyKey,
    objectKey: t6DerivativeObjectKey(input.job),
  };
  if (input.current?.status === "succeeded" || input.current?.status === "failed") {
    return input.current;
  }
  const running = transitionT6Derivative(input.current, "running", base);
  try {
    const source = await input.runner.fetchServerOwnedOutput(input.job);
    const sourceCheck = validateT6SourceResponse({
      contentType: source.contentType,
      contentLength: source.contentLength,
      downloadedBytes: source.bytes.byteLength,
      elapsedMs: source.elapsedMs,
      resolvedAddresses: source.resolvedAddresses,
    });
    if (!sourceCheck.ok) return { ...base, status: "failed", errorCode: sourceCheck.code };

    const output = await input.runner.runFfmpeg({
      args: t6FfmpegArgs({
        sourcePath: "server-owned-source.mp4",
        outputPath: `${base.objectKey}.tmp.mp4`,
      }),
      source: source.bytes,
    });
    const probe = await input.runner.probeMp4(output);
    const verification = verifyT6Derivative({ source: source.bytes, output, probe });
    if (!verification.ok) return { ...base, status: "failed", errorCode: verification.code };
    const written = await input.runner.writeOwnedDerivative({
      objectKey: base.objectKey,
      contentType: "video/mp4",
      bytes: output,
    });
    if (written.deliveryPath !== t6OwnedDeliveryPath(base.objectKey)) {
      return { ...base, status: "failed", errorCode: "OWNED_PATH_UNVERIFIED" };
    }
    return transitionT6Derivative(running, "succeeded", base, {
      contentType: "video/mp4",
      deliveryPath: written.deliveryPath,
      ...verification,
      probe,
    });
  } catch {
    return { ...base, status: "failed", errorCode: "BAKE_PROCESSING_FAILED" };
  }
}

/** The app-level entrypoint is hard-blocked until durable worker proof exists. */
export async function processServerOwnedT6Derivative(input: {
  current?: T6DerivativeMetadata;
  job: ServerOwnedT6Input;
  runner: T6InjectedRunner;
}): Promise<T6DerivativeMetadata> {
  if (!t6WorkerReadiness().effective) {
    return {
      idempotencyKey: input.job.idempotencyKey,
      objectKey: t6DerivativeObjectKey(input.job),
      status: "failed",
      errorCode: "SERVER_WORKER_DISABLED",
    };
  }
  return runT6PipelineWithInjectedRunner(input);
}

/**
 * State transition reducer used by the future durable worker and fixture.
 * It keeps retries idempotent and never turns a failed/blocked record into a
 * claimed success without verified metadata.
 */
export function transitionT6Derivative(
  current: T6DerivativeMetadata | undefined,
  next: T6DerivativeStatus,
  base: Pick<T6DerivativeMetadata, "idempotencyKey" | "objectKey">,
  verified?: Pick<T6DerivativeMetadata, "contentType" | "sourceChecksum" | "outputChecksum" | "probe" | "deliveryPath">
): T6DerivativeMetadata {
  if (current?.status === "succeeded") return current;
  if (current?.status === "failed") return current;
  if (next === "succeeded") {
    if (!verified?.contentType || !verified.deliveryPath || !verified.sourceChecksum || !verified.outputChecksum || !verified.probe?.bakedMarkSignal) {
      return { ...base, status: "failed", errorCode: "DERIVATIVE_UNVERIFIED" };
    }
    return { ...base, status: "succeeded", ...verified };
  }
  return { ...base, status: next };
}
