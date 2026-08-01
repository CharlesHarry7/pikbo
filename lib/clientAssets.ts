/**
 * Browser helper — register a data-URL image into the local Phase D asset path
 * so generate can send assetId instead of re-posting large Base64.
 */

export async function registerLocalAsset(
  dataUrl: string
): Promise<{ assetId: string } | null> {
  if (!dataUrl.startsWith("data:image")) return null;
  try {
    const comma = dataUrl.indexOf(",");
    const meta = dataUrl.slice(0, comma);
    const contentType =
      /data:(image\/[a-zA-Z0-9.+-]+)/.exec(meta)?.[1] || "image/jpeg";
    // Rough decoded size estimate for preflight (base64 → ~3/4).
    const approxBytes = Math.floor(((dataUrl.length - comma) * 3) / 4);

    const prep = await fetch("/api/assets/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType, byteLength: approxBytes }),
    });
    const prepBody = (await prep.json()) as {
      ok?: boolean;
      assetId?: string;
      uploadUrl?: string;
    };
    if (!prep.ok || !prepBody.ok || !prepBody.assetId || !prepBody.uploadUrl) {
      return null;
    }

    const blob = await (await fetch(dataUrl)).blob();
    const put = await fetch(prepBody.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: blob,
    });
    if (!put.ok) return null;
    return { assetId: prepBody.assetId };
  } catch {
    return null;
  }
}

async function privateAssetAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window === "undefined") return headers;
  try {
    const { getSupabaseBrowser } = await import("@/lib/supabase/browser");
    const supabase = getSupabaseBrowser();
    if (!supabase) return headers;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    /* server will reject missing auth */
  }
  return headers;
}

function hexDigest(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Invited Seller Pack input:
 * browser → short-lived signed PUT → server byte verification → ready asset id.
 * No object key, image bytes, or permanent URL is stored in browser state.
 */
export async function registerPrivateToyAsset(
  dataUrl: string,
  skuLabel?: string
): Promise<
  | { ok: true; inputAssetId: string; sha256: string }
  | { ok: false; code: string; error: string }
> {
  if (!dataUrl.startsWith("data:image")) {
    return {
      ok: false,
      code: "INVALID_IMAGE",
      error: "Upload a JPG, PNG, or WebP toy photo",
    };
  }
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const mimeType = blob.type.toLowerCase();
    if (
      mimeType !== "image/jpeg" &&
      mimeType !== "image/png" &&
      mimeType !== "image/webp"
    ) {
      return {
        ok: false,
        code: "INVALID_IMAGE_TYPE",
        error: "Private Launch Packs accept JPG, PNG, or WebP",
      };
    }
    if (blob.size < 32 || blob.size > 8 * 1024 * 1024) {
      return {
        ok: false,
        code: blob.size > 8 * 1024 * 1024
          ? "IMAGE_TOO_LARGE"
          : "INVALID_IMAGE_SIZE",
        error: "Toy photo must be between 32 bytes and 8MB",
      };
    }
    const bytes = await blob.arrayBuffer();
    const sha256 = hexDigest(
      await crypto.subtle.digest("SHA-256", bytes)
    );
    const clientAssetKey =
      typeof crypto.randomUUID === "function"
        ? `input:${crypto.randomUUID()}`
        : `input:${Date.now().toString(36)}:${Math.random()
            .toString(36)
            .slice(2)}`;
    const authHeaders = await privateAssetAuthHeaders();
    const prep = await fetch("/api/assets/upload-url", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        private: true,
        filename: "toy-input",
        mimeType,
        sizeBytes: blob.size,
        sha256,
        clientAssetKey,
        skuLabel: (skuLabel || "").trim().slice(0, 120) || undefined,
      }),
    });
    const prepared = (await prep.json().catch(() => ({}))) as {
      ok?: boolean;
      code?: string;
      error?: string;
      inputAssetId?: string;
      sha256?: string;
      state?: string;
      uploadUrl?: string | null;
      headers?: Record<string, string>;
    };
    if (
      !prep.ok ||
      !prepared.ok ||
      typeof prepared.inputAssetId !== "string" ||
      prepared.inputAssetId.length < 8 ||
      prepared.sha256 !== sha256
    ) {
      return {
        ok: false,
        code: prepared.code || String(prep.status),
        error: prepared.error || "Could not reserve private input storage",
      };
    }

    if (prepared.state !== "ready") {
      if (
        typeof prepared.uploadUrl !== "string" ||
        !prepared.uploadUrl.startsWith("https://")
      ) {
        return {
          ok: false,
          code: "INVALID_UPLOAD_URL",
          error: "Private upload URL is unavailable",
        };
      }
      // Supabase signed-upload endpoints expect the same multipart body used
      // by storage-js uploadToSignedUrl for Blob/File inputs. A raw Blob PUT
      // can be accepted by generic object endpoints but is not this contract.
      const uploadBody = new FormData();
      uploadBody.append("cacheControl", "3600");
      uploadBody.append("", blob);
      await fetch(prepared.uploadUrl, {
        method: "PUT",
        headers: {
          ...(prepared.headers || {}),
        },
        body: uploadBody,
      });
      // Always ask the owner-scoped server to verify the object. This also
      // recovers the idempotent case where Storage committed but the browser
      // lost the upload response.
    }

    const complete = await fetch("/api/assets/complete", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ inputAssetId: prepared.inputAssetId }),
    });
    const verified = (await complete.json().catch(() => ({}))) as {
      ok?: boolean;
      code?: string;
      error?: string;
      inputAssetId?: string;
      sha256?: string;
      state?: string;
    };
    if (
      !complete.ok ||
      !verified.ok ||
      verified.state !== "ready" ||
      verified.inputAssetId !== prepared.inputAssetId ||
      verified.sha256 !== sha256
    ) {
      return {
        ok: false,
        code: verified.code || String(complete.status),
        error:
          verified.error ||
          "Private toy-photo verification failed before generation",
      };
    }
    return {
      ok: true,
      inputAssetId: verified.inputAssetId,
      sha256,
    };
  } catch (error) {
    return {
      ok: false,
      code: "NETWORK",
      error:
        error instanceof Error
          ? error.message
          : "Private toy-photo upload failed",
    };
  }
}
