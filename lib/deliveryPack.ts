/**
 * Post-clip delivery checklist — first principles.
 *
 * Physics: a clip only creates value when exported/posted.
 * Not a 妙呀 IP asset package. Not a new product surface.
 * Just: after generate, what job remains for THIS clip.
 */

import type { JobIntentId } from "@/lib/jobIntents";

export type DeliveryItem = {
  id: string;
  label: string;
  /** Optional deep link when the action is in-app */
  href?: string;
};

/**
 * Creative Director fidelity QC — human review ticks after generate.
 * Not automated vision scoring; seller confirms before listing/post.
 */
export function fidelityQcItems(opts?: {
  demo?: boolean;
  pack?: boolean;
}): DeliveryItem[] {
  const demo = Boolean(opts?.demo);
  const pack = Boolean(opts?.pack);
  const scope = pack ? "each pack child" : "this clip";
  return [
    {
      id: "qc-edge",
      label: demo
        ? `QC edges (Lab demo) · still review ${scope} before treating as product proof`
        : `QC · edges sharp on ${scope} (no melt / smear)`,
    },
    {
      id: "qc-paint",
      label: `QC · paint splits clean vs real toy (Sales fidelity)`,
    },
    {
      id: "qc-logo",
      label: `QC · logo / sculpt details match the SKU you own`,
    },
    {
      id: "qc-bg",
      label: `QC · background clean enough for listing / social crop`,
    },
    {
      id: "qc-ratio",
      label: pack
        ? "QC · proportions read as designer toy (not stretched morph)"
        : "QC · proportions / face stay on-figure (no random morph)",
    },
  ];
}

/**
 * Static next steps after a successful clip.
 * Job-aware copy only — no fake "posted" tracking.
 * Download label stays honest for Free live raw (T6).
 */
export function deliveryItemsForJob(
  jobId: JobIntentId | null | undefined,
  opts?: { demo?: boolean; downloadAllowed?: boolean; includeQc?: boolean }
): DeliveryItem[] {
  const demo = Boolean(opts?.demo);
  const downloadAllowed = opts?.downloadAllowed !== false;
  const includeQc = opts?.includeQc !== false;
  const items: DeliveryItem[] = [
    {
      id: "download",
      label: demo
        ? "Label is clear: this is a Lab demo — run Live for your photo"
        : downloadAllowed
          ? "Download the MP4 (or copy link)"
          : "Download blocked · Free live raw (T6 file watermark pending)",
    },
  ];

  if (includeQc) {
    items.push(...fidelityQcItems({ demo, pack: false }));
  }

  switch (jobId) {
    case "etsy-listing":
      items.push({
        id: "post",
        label: "Add to listing gallery (1:1) · verify sculpt vs real product",
      });
      items.push({
        id: "next",
        label: "Same photo → TikTok hook or Seller Pack",
        href: "/create?job=tiktok-hook",
      });
      break;
    case "tiktok-hook":
      items.push({
        id: "post",
        label: "Post 9:16 with product link in bio/caption",
      });
      items.push({
        id: "next",
        label: "Same photo → listing spin for the shop",
        href: "/create?job=etsy-listing",
      });
      break;
    case "blind-box-drop":
      items.push({
        id: "post",
        label: "Use for drop-day / restock story · keep spoilers honest",
      });
      items.push({
        id: "next",
        label: "Same photo → shelf glam for PDP",
        href: "/create?job=shelf-display",
      });
      break;
    case "shelf-display":
      items.push({
        id: "post",
        label: "PDP / collection post · check paint under lighting",
      });
      items.push({
        id: "next",
        label: "Same photo → Seller Pack (3 clips)",
        href: "/create?mode=seller-pack",
      });
      break;
    case "seller-pack":
      items.push({
        id: "post",
        label: "Export CSV / Manifest for downloadable children only",
      });
      items.push({
        id: "next",
        label: "Open Library to re-download the set",
        href: "/library",
      });
      break;
    default:
      items.push({
        id: "post",
        label: "Post where this job was meant for (shop or social)",
      });
      items.push({
        id: "next",
        label: "Same photo → another job, or Seller Pack ×3",
        href: "/create?mode=seller-pack",
      });
  }

  return items;
}

/**
 * Seller Pack post-success checklist — channel jobs for each of the three fixed children.
 * Honest: Free live raw may be blocked (T6); export only lists downloadable clips.
 */
export function sellerPackPostItems(opts?: {
  downloadableCount?: number;
  readyCount?: number;
  demo?: boolean;
  includeQc?: boolean;
}): DeliveryItem[] {
  const downloadable = Math.max(0, opts?.downloadableCount ?? 0);
  const ready = Math.max(0, opts?.readyCount ?? 0);
  const includeQc = opts?.includeQc !== false;
  const items: DeliveryItem[] = [
    {
      id: "export",
      label:
        downloadable > 0
          ? `Export CSV / Manifest · ${downloadable}/${ready || downloadable} downloadable`
          : ready > 0
            ? `Clips ready · download blocked on Free raw until T6 (${ready} playable)`
            : "Wait for at least one succeeded child before export",
    },
  ];

  if (includeQc) {
    items.push(...fidelityQcItems({ demo: opts?.demo, pack: true }));
  }

  items.push(
    {
      id: "listing-spin",
      label: "Listing Spin → shop gallery (1:1) · verify sculpt",
    },
    {
      id: "blind-box",
      label: "Box Reveal → drop / restock story (9:16)",
    },
    {
      id: "social-flash",
      label: "Social Hook → TikTok / Reels first second (9:16)",
    },
    {
      id: "library",
      label: "Library keeps this device set",
      href: "/library",
    },
    {
      id: "variant",
      label: "Single Generate for one more variant",
      href: "/create",
    }
  );
  return items;
}

/** sessionStorage key for interactive delivery ticks (device-local only). */
export function deliveryChecklistStorageKey(surface: string): string {
  return `pikbo:delivery-check:${surface}`;
}
