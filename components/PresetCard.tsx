import Link from "next/link";
import type { Preset } from "@/lib/presets";
import { recipeHasUniqueProof } from "@/lib/seoIndex";
import { provisionalLabQualityLabel } from "@/lib/showcaseProjects";

/**
 * SEO / related-recipe emoji card.
 * Honesty: Lab-proof recipes get Official · cached (+ Lab ≥4 when registry
 * quality passes); concept recipes stay Concept (not customer UGC).
 */
export function PresetCard({ preset }: { preset: Preset }) {
  const hasProof = recipeHasUniqueProof(preset.slug);
  const labQuality = hasProof
    ? provisionalLabQualityLabel(preset.slug)
    : null;

  return (
    <Link
      href={`/effects/${preset.slug}`}
      className="card group relative overflow-hidden p-0 transition-transform hover:-translate-y-1"
    >
      <div
        className="relative grid h-40 place-items-center text-5xl"
        style={{ background: preset.gradient }}
      >
        <span className="drop-shadow-md transition-transform duration-300 group-hover:scale-110">
          {preset.emoji}
        </span>
        <div className="absolute left-2 top-2 flex max-w-[80%] flex-wrap gap-0.5">
          {hasProof ? (
            <span
              className="rounded-full border border-white/10 bg-black/55 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white/75 backdrop-blur-sm"
              title="Official Lab cached demo · not live customer output"
            >
              Official · cached
            </span>
          ) : (
            <span
              className="rounded-full border border-white/15 bg-black/55 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white/55 backdrop-blur-sm"
              title="Concept recipe — reachable for Create, not a unique Lab demo yet"
            >
              Concept
            </span>
          )}
          {labQuality ? (
            <span
              className="rounded-full border border-amber-200/25 bg-black/55 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-amber-100/90 backdrop-blur-sm"
              title="Provisional Lab self-check · all scores ≥4/5 · not external human QA"
              data-proof-quality="provisional-lab"
            >
              Lab ≥4
            </span>
          ) : null}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">
            {preset.name}
          </h3>
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-dim)]">
            {preset.audience === "seller" ? "Sell" : "Flex"}
          </span>
        </div>
        <p className="mt-1.5 text-sm leading-snug text-[var(--fg-muted)]">
          {preset.tagline}
        </p>
        <span className="mt-3 inline-flex text-xs font-semibold text-[var(--brand)] opacity-0 transition-opacity group-hover:opacity-100">
          Open →
        </span>
      </div>
    </Link>
  );
}
