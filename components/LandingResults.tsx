import Link from "next/link";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { recipeHasUniqueProof } from "@/lib/seoIndex";
import { provisionalLabQualityLabel } from "@/lib/showcaseProjects";

/** 哥飞 V2 — 结果展示块：only unique matching demos (SSR，爬虫可见文字) */
export function LandingResults({
  effectSlug,
  title = "Example results",
}: {
  effectSlug?: string;
  title?: string;
}) {
  const matched = effectSlug
    ? DEMO_VIDEOS.filter((d) => d.preset === effectSlug)
    : [];
  const hasUnique = effectSlug ? recipeHasUniqueProof(effectSlug) : matched.length > 0;

  // Phase H: never present unrelated shared loops as proof for this recipe.
  if (effectSlug && !hasUnique) {
    return (
      <section className="container-x py-12">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="mt-4 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <p className="text-[10px] font-black uppercase tracking-wide text-[var(--fg-dim)]">
            Concept recipe · no unique Lab sample yet
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
            This page is a working Create deep-link with honest limits. It is not
            indexed as proof until a distinct owned input/output sample is
            registered. Browse official cached examples for motion reference.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link href="/community" className="text-[var(--mint)] hover:underline">
              Official examples →
            </Link>
            <Link
              href={`/create?effect=${encodeURIComponent(effectSlug)}`}
              className="text-[var(--fg-muted)] hover:text-white"
            >
              Open in Generate
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const demos =
    matched.length > 0
      ? matched
      : // Hub-style call without a recipe: show a small official set only.
        DEMO_VIDEOS.slice(0, 3);

  return (
    <section className="container-x py-12">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mint)]">
        Lab proof
      </p>
      <h2 className="mt-1 font-display text-2xl font-black tracking-tight">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
        Official cached references for motion and framing
        {effectSlug
          ? " matched to this recipe"
          : ""}. Cached playback never processes a visitor upload.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {demos.map((d, i) => {
          const labQuality = provisionalLabQualityLabel(d.preset);
          return (
          <article
            key={d.id}
            className="group overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.9)] transition hover:border-[var(--mint)]/35"
          >
            <div className="relative aspect-video bg-black/50">
              {/* Poster as real img for alt + LCP-friendly first tile */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={d.poster}
                alt={`${d.title} — official Pikbo Lab demo still of ${d.character} (${d.eyebrow})`}
                className="sr-only"
                width={640}
                height={360}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
              />
              <video
                poster={d.poster}
                className="h-full w-full object-cover"
                muted
                loop
                playsInline
                preload={i === 0 ? "metadata" : "none"}
                controls
                aria-label={`${d.title}. Official cached Lab demo — not a visitor upload.`}
              >
                <source src={d.webm} type="video/webm" />
                <source src={d.mp4} type="video/mp4" />
              </video>
              <div className="pointer-events-none absolute left-2 top-2 flex max-w-[90%] flex-wrap gap-0.5">
                <span
                  className="rounded-full border border-white/10 bg-black/60 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white/80 backdrop-blur-sm"
                  title="Official Lab cached demo · not live customer output"
                >
                  Official · cached
                </span>
                {labQuality ? (
                  <span
                    className="rounded-full border border-amber-200/25 bg-black/60 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-amber-100/90 backdrop-blur-sm"
                    title="Provisional Lab self-check · all scores ≥4/5 · not external human QA"
                    data-proof-quality="provisional-lab"
                  >
                    Lab ≥4
                  </span>
                ) : null}
              </div>
            </div>
            <div className="p-3.5">
              <p className="text-sm font-semibold text-white">{d.title}</p>
              <p className="mt-0.5 text-[10px] text-white/40">
                Official example · cached · {d.character}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/50">
                {d.result}
              </p>
              <Link
                href={`/create?effect=${encodeURIComponent(d.preset)}`}
                className="mt-2.5 inline-flex text-[11px] font-bold text-[var(--mint)] opacity-90 hover:underline group-hover:opacity-100"
              >
                Remake · your toy photo →
              </Link>
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );
}
