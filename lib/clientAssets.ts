/** Browser helper for the authenticated private toy-input flow. */

import { privateDownloadHeaders } from "@/lib/history";

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function registerPrivateToyAsset(
  dataUrl: string,
  skuLabel?: string
): Promise<{ assetId: string } | null> {
  if (!dataUrl.startsWith("data:image")) return null;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const bytes = await blob.arrayBuffer();
    const sha256 = hex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
    const auth = await privateDownloadHeaders();
    const prep = await fetch("/api/assets/upload-url", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "toy-input",
        mimeType: blob.type,
        sizeBytes: blob.size,
        sha256,
        skuLabel: skuLabel?.trim() || undefined,
      }),
    });
    const prepared = (await prep.json().catch(() => ({}))) as {
      ok?: boolean;
      assetId?: string;
      uploadUrl?: string;
    };
    if (!prep.ok || !prepared.ok || !prepared.assetId || !prepared.uploadUrl) return null;
    const uploaded = await fetch(prepared.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": blob.type },
      body: blob,
    });
    if (!uploaded.ok) return null;
    const complete = await fetch("/api/assets/complete", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: prepared.assetId }),
    });
    const completed = (await complete.json().catch(() => ({}))) as {
      ok?: boolean;
      asset?: { id?: string; state?: string };
    };
    if (
      !complete.ok ||
      !completed.ok ||
      completed.asset?.id !== prepared.assetId ||
      completed.asset?.state !== "ready"
    ) {
      return null;
    }
    return { assetId: prepared.assetId };
  } catch {
    return null;
  }
}

/** Compatibility name used by current Create surfaces. It is durable now. */
export async function registerLocalAsset(
  dataUrl: string
): Promise<{ assetId: string } | null> {
  return registerPrivateToyAsset(dataUrl);
}
