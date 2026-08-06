/**
 * Pure Create → generate still helpers (AIT-247).
 * No server / React / path-alias imports — safe for Node regression scripts.
 */

/** True only for a real data-URL still — blob: previews and empty strings fail. */
export function isComposerDataUrlStill(image) {
  if (typeof image !== "string" || image.length < 32) return false;
  return /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(image);
}

/**
 * Composer has a still that can drive Generate without a fresh local file pick:
 * durable private assetId (same-photo handoff / recent rail) or a data-URL upload.
 * Blob-only previews without assetId do not count (no provider payload).
 */
export function composerHasUsableToyInput(input) {
  if (typeof input?.assetId === "string" && input.assetId.trim().length > 0) {
    return true;
  }
  return isComposerDataUrlStill(input?.image);
}

function resolveSpecImagePure(spec, store) {
  if (spec?.sourceKey && store?.[spec.sourceKey]) return store[spec.sourceKey];
  if (typeof spec?.image === "string" && spec.image) return spec.image;
  return null;
}

/**
 * Decide which still to POST for a generate attempt.
 * Retry freezes the version's still — never the composer's latest re-upload.
 * When a frozen durable assetId exists, prefer retry-asset (live posts id only).
 */
export function resolveGenerateStill(input) {
  const retry = input?.retry ?? null;
  const sourceStore = input?.sourceStore ?? {};
  if (retry) {
    const frozen = resolveSpecImagePure(retry, sourceStore);
    if (frozen) {
      if (retry.assetId) {
        return {
          image: frozen,
          assetId: retry.assetId,
          mode: "retry-asset",
        };
      }
      return { image: frozen, mode: "retry-still" };
    }
    if (retry.assetId) {
      return { assetId: retry.assetId, mode: "retry-asset" };
    }
    return { mode: "none" };
  }
  if (input?.imageOverride) {
    return { image: input.imageOverride, mode: "image" };
  }
  if (input?.assetId) {
    return {
      assetId: input.assetId,
      image: input.image || undefined,
      mode: "asset",
    };
  }
  if (input?.image) {
    return { image: input.image, mode: "image" };
  }
  return { mode: "none" };
}

/**
 * Shape Create → POST /api/generate still fields after same-photo hydrate.
 *
 * Live (!demoMode): durable assetId only — never re-post Base64 or blob preview.
 * Cached (demoMode): may dual-send a small data URL for process-local recovery.
 * Fail-closed without a usable still (honest client error, no provider call).
 */
export function buildCreateGenerateStillFields(input) {
  const dualMax =
    typeof input?.dualImageMaxLen === "number" &&
    Number.isFinite(input.dualImageMaxLen)
      ? input.dualImageMaxLen
      : 3_500_000;
  const mode = input?.mode ?? "none";
  const useAsset = mode === "asset" || mode === "retry-asset";
  const postAssetId =
    typeof input?.assetId === "string" && input.assetId.trim().length > 0
      ? input.assetId.trim()
      : undefined;
  const dataUrl = isComposerDataUrlStill(input?.image)
    ? input.image
    : isComposerDataUrlStill(input?.ambientImage)
      ? input.ambientImage
      : undefined;

  if (useAsset && postAssetId) {
    if (!input?.demoMode) {
      return { assetId: postAssetId, canSubmit: true };
    }
    const dualOk = Boolean(dataUrl) && (dataUrl?.length ?? 0) < dualMax;
    return {
      assetId: postAssetId,
      image: dualOk ? dataUrl : undefined,
      fallbackImage: dualOk ? dataUrl : undefined,
      canSubmit: true,
    };
  }

  if (!dataUrl) {
    return {
      canSubmit: false,
      error:
        "Upload a reference image first (JPEG, PNG, WebP, or GIF · image-to-video).",
    };
  }
  if (dataUrl.length > 12_000_000) {
    return {
      canSubmit: false,
      error: "Image is too large. Use a photo under ~8MB.",
    };
  }
  if (!input?.demoMode) {
    return {
      canSubmit: false,
      error:
        "Your private toy photo is missing or not ready. Upload it again before generating.",
    };
  }
  return { image: dataUrl, canSubmit: true };
}
