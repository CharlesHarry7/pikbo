/**
 * T6 non-production ffmpeg/ffprobe runner.
 *
 * It accepts only server-owned job input, pins HTTPS to a public DNS result,
 * rejects redirects/private networks, runs binaries without a shell, and
 * writes only verified derivatives to Pikbo-owned storage.
 */

import { spawn } from "node:child_process";
import { lookup } from "node:dns/promises";
import { writeFile, readFile, mkdtemp, rm } from "node:fs/promises";
import { request as httpsRequest } from "node:https";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import type { LookupFunction } from "node:net";
import {
  T6_MAX_SOURCE_BYTES,
  T6_SOURCE_TIMEOUT_MS,
  hasOnlyPublicResolvedAddresses,
  isPublicProviderOutputUrl,
  sha256,
  t6OwnedDeliveryPath,
  type ServerOwnedT6Input,
  type T6InjectedRunner,
} from "@/lib/t6Worker";
import { writeT6OwnedDerivative } from "@/lib/t6OwnedStorage";
import { parseT6FfprobeJson } from "@/lib/t6Probe.mjs";

const PROCESS_TIMEOUT_MS = 120_000;
const STDERR_LIMIT = 16_384;

function binaryPath(name: "ffmpeg" | "ffprobe"): string | null {
  const envName =
    name === "ffmpeg" ? "PIKBO_FFMPEG_PATH" : "PIKBO_FFPROBE_PATH";
  const value = (process.env[envName] || "").trim();
  return value && isAbsolute(value) ? value : null;
}

function allowedProviderHosts(): Set<string> {
  return new Set(
    (process.env.PIKBO_T6_PROVIDER_HOST_ALLOWLIST || "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(
        (host) =>
          Boolean(host) &&
          host.includes(".") &&
          !host.startsWith(".") &&
          !host.endsWith(".")
      )
  );
}

function providerHostAllowed(hostname: string): boolean {
  const allowlist = allowedProviderHosts();
  const host = hostname.toLowerCase();
  return [...allowlist].some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`)
  );
}

async function runProcess(input: {
  command: string;
  args: string[];
}): Promise<{ stdout: Buffer; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(input.command, input.args, {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stderrBytes = 0;
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("T6_PROCESS_TIMEOUT"));
    }, PROCESS_TIMEOUT_MS);
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderrBytes >= STDERR_LIMIT) return;
      const remaining = STDERR_LIMIT - stderrBytes;
      stderr.push(chunk.subarray(0, remaining));
      stderrBytes += Math.min(chunk.byteLength, remaining);
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      const stderrText = Buffer.concat(stderr).toString("utf8");
      if (code !== 0) {
        reject(new Error(`T6_PROCESS_FAILED:${code}:${stderrText}`));
        return;
      }
      resolve({ stdout: Buffer.concat(stdout), stderr: stderrText });
    });
  });
}

async function withTempFile<T>(
  bytes: Uint8Array,
  operation: (path: string, directory: string) => Promise<T>
): Promise<T> {
  const directory = await mkdtemp(join(tmpdir(), "pikbo-t6-"));
  const path = join(directory, "input.mp4");
  try {
    await writeFile(path, bytes, { mode: 0o600 });
    return await operation(path, directory);
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(
      () => undefined
    );
  }
}

async function fetchPinnedProviderOutput(
  input: ServerOwnedT6Input
): Promise<{
  contentType: string | null;
  contentLength: number | null;
  bytes: Uint8Array;
  elapsedMs: number;
  resolvedAddresses: readonly string[];
}> {
  if (!isPublicProviderOutputUrl(input.providerOutputUrl)) {
    throw new Error("SOURCE_URL_UNSAFE");
  }
  const url = new URL(input.providerOutputUrl);
  if (!providerHostAllowed(url.hostname)) {
    throw new Error("SOURCE_HOST_NOT_ALLOWED");
  }
  const resolved = await lookup(url.hostname, {
    all: true,
    verbatim: true,
  });
  const addresses = resolved.map((entry) => entry.address);
  if (!hasOnlyPublicResolvedAddresses(addresses)) {
    throw new Error("SOURCE_PRIVATE_NETWORK");
  }
  const selected = resolved[0];
  if (!selected) throw new Error("SOURCE_DNS_EMPTY");
  const pinnedLookup: LookupFunction = (_hostname, _options, callback) => {
    callback(null, selected.address, selected.family);
  };
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      {
        protocol: "https:",
        hostname: url.hostname,
        port: url.port ? Number(url.port) : 443,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        servername: url.hostname,
        lookup: pinnedLookup,
        headers: {
          Accept: "video/mp4",
          "User-Agent": "Pikbo-T6/1.0",
        },
      },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(
            new Error(
              response.statusCode && response.statusCode >= 300
                ? "SOURCE_REDIRECT_OR_STATUS"
                : "SOURCE_STATUS"
            )
          );
          return;
        }
        const declaredLength = Number(response.headers["content-length"]);
        const contentLength = Number.isFinite(declaredLength)
          ? declaredLength
          : null;
        if (
          contentLength !== null &&
          contentLength > T6_MAX_SOURCE_BYTES
        ) {
          response.destroy(new Error("SOURCE_TOO_LARGE"));
          return;
        }
        const chunks: Buffer[] = [];
        let received = 0;
        response.on("data", (chunk: Buffer) => {
          received += chunk.byteLength;
          if (received > T6_MAX_SOURCE_BYTES) {
            response.destroy(new Error("SOURCE_TOO_LARGE"));
            return;
          }
          chunks.push(chunk);
        });
        response.once("error", reject);
        response.once("end", () => {
          resolve({
            contentType:
              typeof response.headers["content-type"] === "string"
                ? response.headers["content-type"]
                : null,
            contentLength,
            bytes: Buffer.concat(chunks),
            elapsedMs: Date.now() - started,
            resolvedAddresses: addresses,
          });
        });
      }
    );
    request.setTimeout(T6_SOURCE_TIMEOUT_MS, () => {
      request.destroy(new Error("SOURCE_TIMEOUT"));
    });
    request.once("error", reject);
    request.end();
  });
}

export function createT6FfmpegFilesystemRunner(): T6InjectedRunner {
  const ffmpeg = binaryPath("ffmpeg");
  const ffprobe = binaryPath("ffprobe");
  if (!ffmpeg || !ffprobe) {
    throw new Error("T6_BINARIES_NOT_CONFIGURED");
  }
  return {
    fetchServerOwnedOutput: fetchPinnedProviderOutput,
    async runFfmpeg({ args, source }) {
      return withTempFile(source, async (sourcePath, directory) => {
        const outputPath = join(directory, "derivative.mp4");
        const rewritten = args.map((arg, index) => {
          if (arg === "server-owned-source.mp4") return sourcePath;
          if (index === args.length - 1) return outputPath;
          return arg;
        });
        await runProcess({ command: ffmpeg, args: rewritten });
        return readFile(outputPath);
      });
    },
    async probeMp4(bytes) {
      return withTempFile(bytes, async (path) => {
        const result = await runProcess({
          command: ffprobe,
          args: [
            "-v",
            "error",
            "-show_format",
            "-show_streams",
            "-of",
            "json",
            path,
          ],
        });
        const probe = parseT6FfprobeJson(
          JSON.parse(result.stdout.toString("utf8"))
        );
        if (!probe) throw new Error("FFPROBE_INVALID");
        return probe;
      });
    },
    async writeOwnedDerivative({ objectKey, contentType, bytes }) {
      const result = await writeT6OwnedDerivative({
        objectKey,
        contentType,
        bytes,
        expectedChecksum: sha256(bytes),
      });
      if (!result.ok) throw new Error(result.code);
      const deliveryPath = t6OwnedDeliveryPath(objectKey);
      if (!deliveryPath) throw new Error("OWNED_PATH_UNVERIFIED");
      return { deliveryPath };
    },
  };
}
