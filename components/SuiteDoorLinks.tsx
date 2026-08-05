import Link from "next/link";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { createGenerate360Href } from "@/lib/jobIntents";
import { createRemixHref } from "@/lib/remixIntent";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

/**
 * Compact suite doors for SEO landings (/for, /tools, /toys, guides).
 * Bare Generate → createGenerate360Href; recipe landings keep createRemixHref.
 * Explicit Moment CTA stays on MOMENT_CREATE_HREF (not a Generate door).
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
      <Link
        href={`${MOMENT_CREATE_HREF}&source=suite-doors`}
        className="btn btn-ghost !px-3 !py-2 text-xs"
        data-suite-door="single-moment"
      >
        Create one Moment
      </Link>
      <Link href="/library" className="btn btn-ghost !px-3 !py-2 text-xs">
        Library
      </Link>
    </div>
  );
}
