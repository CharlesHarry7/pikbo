import Link from "next/link";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { createGenerate360Href } from "@/lib/jobIntents";
import { createRemixHref } from "@/lib/remixIntent";

/**
 * Compact suite doors for SEO landings (/for, /tools, /toys, guides).
 * Primary door = Generate→360 (or recipe remix when a slug is provided).
 * Soft-launch frozen peers stay off this rail so landings match primary Generate.
 */
export function SuiteDoorLinks({
  effectSlug,
  className = "",
}: {
  /** Prefill Generate with this recipe when set */
  effectSlug?: string;
  className?: string;
}) {
  // Recipe landings keep recipe deep link; bare surfaces use canonical 360 helper.
  const generateHref = effectSlug
    ? createRemixHref(effectSlug)
    : createGenerate360Href("suite-doors");

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Link
        href={generateHref}
        className="btn btn-primary !px-4 !py-2 text-xs font-black"
        data-suite-door="generate"
      >
        Open Generate
      </Link>
      <FreeTrialCta
        path={effectSlug ? `/suite-doors/${effectSlug}` : "/suite-doors"}
        variant="ghost"
        className="btn btn-ghost !px-3 !py-2 text-xs"
      />
      <Link href="/library" className="btn btn-ghost !px-3 !py-2 text-xs">
        Library
      </Link>
    </div>
  );
}
