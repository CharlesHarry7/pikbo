import Link from "next/link";
import type { ConceptEffectFeedItem } from "@/lib/videoFeed";

function aspectClass(
  ratio: ConceptEffectFeedItem["ratio"],
  compact?: boolean
) {
  if (compact) {
    if (ratio === "9:16") return "aspect-[9/13]";
    if (ratio === "1:1") return "aspect-square";
    if (ratio === "16:9") return "aspect-video";
    return "aspect-[4/5]";
  }
  if (ratio === "9:16") return "aspect-[9/14]";
  if (ratio === "1:1") return "aspect-square";
  if (ratio === "16:9") return "aspect-video";
  return "aspect-[4/5]";
}

/**
 * Static concept card. It intentionally has no video source or autoplay
 * component: a recipe without exact proof must never borrow another output.
 */
export function ConceptRecipeTile({
  item,
  compact,
}: {
  item: ConceptEffectFeedItem;
  compact?: boolean;
}) {
  return (
    <Link
      href={item.detailHref ?? item.href}
      data-proof-status="concept"
      data-recipe-slug={item.recipeSlug}
      className="group block overflow-hidden rounded-xl border border-dashed border-white/[0.14] bg-white/[0.025] transition duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.045]"
      aria-label={`View concept recipe ${item.title}; no demo yet`}
    >
      <div
        className={`relative overflow-hidden ${aspectClass(item.ratio, compact)}`}
      >
        <div
          className="absolute inset-0 opacity-25 saturate-50"
          style={{ background: item.conceptGradient }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(255,255,255,0.12),transparent_30%),linear-gradient(to_top,rgba(0,0,0,0.96),rgba(0,0,0,0.24))]"
          aria-hidden
        />
        <div className="absolute inset-x-0 top-[22%] flex flex-col items-center px-3 text-center">
          <span
            className="grid size-12 place-items-center rounded-2xl border border-white/15 bg-black/35 text-2xl grayscale"
            aria-hidden
          >
            {item.conceptEmoji}
          </span>
          <span className="mt-3 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-white/65">
            No demo yet
          </span>
        </div>
        <span className="absolute left-2 top-2 rounded-full border border-white/15 bg-black/55 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/70 backdrop-blur">
          Concept recipe
        </span>
        <div
          className={`absolute inset-x-0 bottom-0 ${compact ? "p-2.5" : "p-3 sm:p-4"}`}
        >
          <p className="line-clamp-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">
            Recipe brief · demo pending
          </p>
          <h3
            className={`mt-0.5 line-clamp-2 font-semibold text-white/85 ${
              compact ? "text-[12px] leading-snug" : "text-sm sm:text-base"
            }`}
          >
            {item.title}
          </h3>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-white/45 transition group-hover:text-white/70">
            View concept →
          </p>
        </div>
      </div>
    </Link>
  );
}
