import { redirect } from "next/navigation";
import { createRemixHref } from "@/lib/remixIntent";

/**
 * Alias used by big AI video apps.
 * Bare /generate → listing-spin remix (ratio/duration/channel), not bare /create.
 * Query strings pass through to /create (deep links keep intent).
 */
export default async function GenerateAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") q.set(k, v);
    else if (Array.isArray(v) && v[0]) q.set(k, v[0]);
  }
  const s = q.toString();
  if (s) {
    redirect(`/create?${s}`);
  }
  redirect(createRemixHref("360-spin-showcase"));
}
