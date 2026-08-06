import Link from "next/link";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { createGenerate360Href } from "@/lib/jobIntents";
import { createRemixHref } from "@/lib/remixIntent";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";

const SUITE_MOMENT_HREF =
  `${MOMENT_CREATE_HREF}&source=suite-doors` as const;
const SUITE_GENERATE_HREF = createGenerate360Href("suite-doors");

/**
 * Compact suite doors for SEO landings (/for, /tools, /toys, guides).
 * Always real deep links — never fake multi-model or bare /create.
 * Recipe doors use createRemixHref; default Generate uses createGenerate360Href.
 * Moment door is MOMENT_CREATE_HREF (Live-gated), not open checkout.
 */
export function SuiteDoorLinks({
  effectSlug,
  className = "",
}: {
  /** Prefill Generate with this recipe when set */
  effectSlug?: string;
  className?: string;
}) {
  // Default listing spin when no recipe — remix contract (ratio/duration/channel).
  const generateHref = effectSlug
    ? createRemixHref(effectSlug)
    : SUITE_GENERATE_HREF;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Link
        href={generateHref}
        className="btn btn-primary !px-4 !py-2 text-xs font-black"
        data-suite-door="generate"
      >
        Open Generate · Lab
      </Link>
      <FreeTrialCta
        path={effectSlug ? `/suite-doors/${effectSlug}` : "/suite-doors"}
        variant="ghost"
        className="btn btn-ghost !px-3 !py-2 text-xs"
      />
      <Link
        href={SUITE_MOMENT_HREF}
        className="btn btn-ghost !px-3 !py-2 text-xs"
        data-suite-door="single-moment"
        data-live-gated="true"
      >
        Create one Moment · Live-gated
      </Link>
      <Link href="/modules" className="btn btn-ghost !px-3 !py-2 text-xs">
        Modules
      </Link>
      <Link href="/library" className="btn btn-ghost !px-3 !py-2 text-xs">
        Library
      </Link>
      <Link href="/flow" className="btn btn-ghost !px-3 !py-2 text-xs">
        Flow · Preview
      </Link>
    </div>
  );
}
