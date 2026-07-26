import Link from "next/link";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { createRemixHref } from "@/lib/remixIntent";

/**
 * Compact suite doors for SEO landings (/for, /tools, /toys, guides).
 * Always real deep links — never fake multi-model.
 * Recipe doors use createRemixHref (ratio/duration/channel carry).
 */
export function SuiteDoorLinks({
  effectSlug,
  className = "",
}: {
  /** Prefill Generate with this recipe when set */
  effectSlug?: string;
  className?: string;
}) {
  const generateHref = effectSlug
    ? createRemixHref(effectSlug)
    : "/create";

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
        href="/create?mode=seller-pack"
        className="btn btn-ghost !px-3 !py-2 text-xs"
        data-suite-door="seller-pack"
      >
        Seller Pack
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
