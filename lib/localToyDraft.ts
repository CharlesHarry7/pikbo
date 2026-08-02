import type { MomentId } from "@/lib/moments";

export const LOCAL_TOY_DRAFT_MAX_BYTES = 8 * 1024 * 1024;
export const LOCAL_TOY_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
export const LOCAL_TOY_DRAFT_DB = "pikbo-local-toy-draft-v1";
export const LOCAL_TOY_DRAFT_STORE = "drafts";
export const LOCAL_TOY_DRAFT_KEY = "active";

export type ToyStageTransform = {
  x: number;
  y: number;
  scale: number;
};

export type LocalToyDraft = {
  version: 1;
  imageBlob: Blob;
  selectedMomentId: MomentId;
  transform: ToyStageTransform;
  createdAt: number;
  expiresAt: number;
};

export function clampToyStageTransform(
  value: Partial<ToyStageTransform> | null | undefined
): ToyStageTransform {
  const finite = (candidate: unknown, fallback: number) =>
    typeof candidate === "number" && Number.isFinite(candidate)
      ? candidate
      : fallback;
  return {
    x: Math.min(85, Math.max(15, finite(value?.x, 50))),
    y: Math.min(82, Math.max(18, finite(value?.y, 52))),
    scale: Math.min(1.8, Math.max(0.65, finite(value?.scale, 0.85))),
  };
}

export function isDraftExpired(
  draft: Pick<LocalToyDraft, "expiresAt">,
  now = Date.now()
): boolean {
  return !Number.isFinite(draft.expiresAt) || draft.expiresAt <= now;
}

function matches(bytes: Uint8Array, expected: number[], offset = 0) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

export async function validateLocalToyImage(blob: Blob): Promise<{
  ok: true;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
} | {
  ok: false;
  error: string;
}> {
  if (blob.size <= 0 || blob.size > LOCAL_TOY_DRAFT_MAX_BYTES) {
    return { ok: false, error: "Choose a JPG, PNG, or WebP image under 8 MB." };
  }
  const bytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  const jpeg = matches(bytes, [0xff, 0xd8, 0xff]);
  const png = matches(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const webp =
    matches(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    matches(bytes, [0x57, 0x45, 0x42, 0x50], 8);
  if (!jpeg && !png && !webp) {
    return { ok: false, error: "That file is not a valid JPG, PNG, or WebP image." };
  }
  return {
    ok: true,
    mimeType: jpeg ? "image/jpeg" : png ? "image/png" : "image/webp",
  };
}

function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexeddb_unavailable"));
      return;
    }
    const request = indexedDB.open(LOCAL_TOY_DRAFT_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LOCAL_TOY_DRAFT_STORE)) {
        db.createObjectStore(LOCAL_TOY_DRAFT_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("draft_open_failed"));
  });
}

async function runDraftRequest<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDraftDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(LOCAL_TOY_DRAFT_STORE, mode);
      const request = action(transaction.objectStore(LOCAL_TOY_DRAFT_STORE));
      let requestResult: T;
      request.onsuccess = () => {
        requestResult = request.result;
      };
      request.onerror = () => reject(request.error ?? new Error("draft_request_failed"));
      transaction.oncomplete = () => resolve(requestResult);
      transaction.onabort = () => reject(transaction.error ?? new Error("draft_aborted"));
      transaction.onerror = () => reject(transaction.error ?? new Error("draft_failed"));
    });
  } finally {
    db.close();
  }
}

export async function saveLocalToyDraft(input: {
  imageBlob: Blob;
  selectedMomentId: MomentId;
  transform: ToyStageTransform;
  now?: number;
}): Promise<LocalToyDraft> {
  const validation = await validateLocalToyImage(input.imageBlob);
  if (!validation.ok) {
    throw new Error(validation.error);
  }
  const createdAt = input.now ?? Date.now();
  const draft: LocalToyDraft = {
    version: 1,
    imageBlob: input.imageBlob,
    selectedMomentId: input.selectedMomentId,
    transform: clampToyStageTransform(input.transform),
    createdAt,
    expiresAt: createdAt + LOCAL_TOY_DRAFT_TTL_MS,
  };
  await runDraftRequest("readwrite", (store) =>
    store.put(draft, LOCAL_TOY_DRAFT_KEY)
  );
  return draft;
}

export async function loadLocalToyDraft(): Promise<LocalToyDraft | null> {
  const draft = await runDraftRequest<LocalToyDraft | undefined>(
    "readonly",
    (store) => store.get(LOCAL_TOY_DRAFT_KEY)
  );
  if (!draft || draft.version !== 1 || !(draft.imageBlob instanceof Blob)) {
    return null;
  }
  if (isDraftExpired(draft)) {
    await clearLocalToyDraft();
    return null;
  }
  const validation = await validateLocalToyImage(draft.imageBlob);
  if (!validation.ok) {
    await clearLocalToyDraft();
    return null;
  }
  return {
    ...draft,
    transform: clampToyStageTransform(draft.transform),
  };
}

export async function clearLocalToyDraft(): Promise<void> {
  await runDraftRequest("readwrite", (store) =>
    store.delete(LOCAL_TOY_DRAFT_KEY)
  );
}
