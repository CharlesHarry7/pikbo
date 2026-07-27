/**
 * T6 server-owned derivative storage.
 *
 * This adapter stores only verified, watermarked MP4 derivatives. Provider
 * URLs and raw provider bytes are never persisted here. The filesystem
 * implementation is suitable for a single-node non-production rehearsal; a
 * shared object-store adapter is still required before multi-node launch.
 */

import { createHash, randomBytes } from "node:crypto";
import {
  mkdir,
  open,
  link,
  lstat,
  readFile,
  rm,
} from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import {
  T6_OWNED_STORAGE_ADAPTER_IMPLEMENTED,
  t6OwnedStorageConfigured,
  t6OwnedStorageRoot,
} from "./t6OwnedStorageConfig.mjs";

export {
  T6_OWNED_STORAGE_ADAPTER_IMPLEMENTED,
  t6OwnedStorageConfigured,
};
export const T6_MAX_DERIVATIVE_BYTES = 64 * 1024 * 1024;

const OBJECT_KEY_PATTERN = /^t6-baked\/([a-f0-9]{64})\.mp4$/;

export type T6OwnedObject = Readonly<{
  objectKey: string;
  contentType: "video/mp4";
  bytes: Uint8Array;
  checksum: string;
}>;

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function t6OwnedObjectHash(objectKey: string): string | null {
  return objectKey.match(OBJECT_KEY_PATTERN)?.[1] || null;
}

export function t6OwnedObjectKeyFromHash(hash: string): string | null {
  return /^[a-f0-9]{64}$/.test(hash) ? `t6-baked/${hash}.mp4` : null;
}

function objectPath(root: string, objectKey: string): string | null {
  if (!OBJECT_KEY_PATTERN.test(objectKey)) return null;
  const candidate = resolve(root, objectKey);
  const fromRoot = relative(root, candidate);
  if (!fromRoot || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    return null;
  }
  return candidate;
}

async function ensurePrivateStorageTree(root: string): Promise<boolean> {
  try {
    await mkdir(root, { recursive: true, mode: 0o700 });
    const rootInfo = await lstat(root);
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) return false;
    const bucket = resolve(root, "t6-baked");
    await mkdir(bucket, { recursive: true, mode: 0o700 });
    const bucketInfo = await lstat(bucket);
    return bucketInfo.isDirectory() && !bucketInfo.isSymbolicLink();
  } catch {
    return false;
  }
}

async function readExisting(
  root: string,
  objectKey: string
): Promise<T6OwnedObject | null> {
  const path = objectPath(root, objectKey);
  if (!path) return null;
  try {
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink()) return null;
    if (info.size <= 0 || info.size > T6_MAX_DERIVATIVE_BYTES) return null;
    const bytes = await readFile(path);
    return {
      objectKey,
      contentType: "video/mp4",
      bytes,
      checksum: sha256(bytes),
    };
  } catch {
    return null;
  }
}

/**
 * Atomic, idempotent write. Concurrent writers for one deterministic object
 * key may succeed only when their verified bytes are identical.
 */
export async function writeT6OwnedDerivative(input: {
  objectKey: string;
  contentType: "video/mp4";
  bytes: Uint8Array;
  expectedChecksum: string;
}): Promise<
  | { ok: true; objectKey: string; checksum: string; idempotent: boolean }
  | { ok: false; code: string }
> {
  const root = t6OwnedStorageRoot();
  const path = root ? objectPath(root, input.objectKey) : null;
  if (!root || !path) return { ok: false, code: "OWNED_STORAGE_DISABLED" };
  if (!(await ensurePrivateStorageTree(root))) {
    return { ok: false, code: "OWNED_STORAGE_UNSAFE" };
  }
  if (
    input.contentType !== "video/mp4" ||
    input.bytes.byteLength <= 0 ||
    input.bytes.byteLength > T6_MAX_DERIVATIVE_BYTES
  ) {
    return { ok: false, code: "OWNED_OBJECT_INVALID" };
  }
  const checksum = sha256(input.bytes);
  if (checksum !== input.expectedChecksum) {
    return { ok: false, code: "OWNED_CHECKSUM_MISMATCH" };
  }

  const existing = await readExisting(root, input.objectKey);
  if (existing) {
    return existing.checksum === checksum
      ? {
          ok: true,
          objectKey: input.objectKey,
          checksum,
          idempotent: true,
        }
      : { ok: false, code: "OWNED_OBJECT_CONFLICT" };
  }

  const tempPath = `${path}.${randomBytes(12).toString("hex")}.tmp`;
  try {
    const handle = await open(tempPath, "wx", 0o600);
    try {
      await handle.writeFile(input.bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      // Hard-link publish is atomic and never overwrites an existing object.
      // Temp and destination share one configured filesystem.
      await link(tempPath, path);
    } catch {
      const raced = await readExisting(root, input.objectKey);
      if (raced?.checksum === checksum) {
        return {
          ok: true,
          objectKey: input.objectKey,
          checksum,
          idempotent: true,
        };
      }
      return { ok: false, code: "OWNED_OBJECT_CONFLICT" };
    }
    return {
      ok: true,
      objectKey: input.objectKey,
      checksum,
      idempotent: false,
    };
  } catch {
    return { ok: false, code: "OWNED_STORAGE_WRITE_FAILED" };
  } finally {
    await rm(tempPath, { force: true }).catch(() => undefined);
  }
}

export async function readT6OwnedDerivative(
  objectKey: string,
  expectedChecksum: string
): Promise<
  | { ok: true; object: T6OwnedObject }
  | { ok: false; code: string }
> {
  const root = t6OwnedStorageRoot();
  if (!root) return { ok: false, code: "OWNED_STORAGE_DISABLED" };
  if (!(await ensurePrivateStorageTree(root))) {
    return { ok: false, code: "OWNED_STORAGE_UNSAFE" };
  }
  const object = await readExisting(root, objectKey);
  if (!object) return { ok: false, code: "OWNED_OBJECT_NOT_FOUND" };
  if (object.checksum !== expectedChecksum) {
    return { ok: false, code: "OWNED_CHECKSUM_MISMATCH" };
  }
  return { ok: true, object };
}
