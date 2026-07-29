/** Local stills used as one-click sample inputs (no network). */

import { isValidImageDataUrl } from "@/lib/providerError";

export const SAMPLE_TOYS = [
  {
    id: "orbit",
    label: "Orbit float",
    path: "/demos/orbit-still.webp",
    effect: "floating-hero",
  },
  {
    id: "moon",
    label: "Moon box",
    path: "/demos/moon-float.webp",
    effect: "blind-box-unboxing",
  },
  {
    id: "scout",
    label: "Scout pack",
    path: "/demos/scout-still.webp",
    effect: "360-spin-showcase",
  },
  {
    id: "beatbot",
    label: "Beatbot",
    path: "/demos/beatbot-still.webp",
    effect: "paparazzi-flash",
  },
] as const;

function mimeFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/webp";
}

/** Paths that must exist for one-click sample generate (preflight). */
export function requiredSampleStillPaths(): string[] {
  return SAMPLE_TOYS.map((s) =>
    s.path.startsWith("/") ? `public${s.path}` : `public/${s.path}`
  );
}

/**
 * Fetch a public still and return a data URL for Generate API.
 * Ensures MIME is a valid image/* type accepted by /api/generate.
 */
export async function sampleToDataUrl(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) throw new Error("Could not load sample");
  const blob = await res.blob();
  if (!blob || blob.size < 32) throw new Error("Sample empty");
  if (blob.size > 8_000_000) throw new Error("Sample too large");

  const typed =
    blob.type && blob.type.startsWith("image/")
      ? blob
      : new Blob([blob], { type: mimeFromPath(path) });

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Read failed"));
    };
    reader.onerror = () => reject(new Error("Read failed"));
    reader.readAsDataURL(typed);
  });

  // Some browsers emit data:application/octet-stream — normalize to image MIME.
  if (!isValidImageDataUrl(dataUrl)) {
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : "";
    if (!base64) throw new Error("Invalid sample encoding");
    const fixed = `data:${mimeFromPath(path)};base64,${base64}`;
    if (!isValidImageDataUrl(fixed)) throw new Error("Sample not a valid image");
    return fixed;
  }
  return dataUrl;
}
