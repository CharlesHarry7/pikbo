import Link from "next/link";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { createRemixHref } from "@/lib/remixIntent";
import { recipeHasUniqueProof } from "@/lib/seoIndex";

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
            indexed as proof until a distinct verified input/output sample is
            registered. Browse cached Lab prototypes for motion reference.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link href="/community" className="text-[var(--mint)] hover:underline">
              Lab prototypes →
            </Link>
            <Link
              href={createRemixHref(effectSlug)}
              className="text-[var(--fg-muted)] hover:text-white"
              data-landing-remake="concept"
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
      : // Hub-style call without a recipe: show a small prototype set only.
        DEMO_VIDEOS.slice(0, 3);

  return (
    <section className="container-x py-12">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mint)]">
        Lab prototypes
      </p>
      <h2 className="mt-1 font-display text-2xl font-black tracking-tight">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
        Cached prototype references for motion and framing
        {effectSlug
          ? " matched to this recipe"
          : ""}. Cached playback never processes a visitor upload.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {demos.map((d, i) => {
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
                alt={`${d.title} — cached Pikbo Lab prototype poster of ${d.character} (${d.eyebrow})`}
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
                aria-label={`${d.title}. Cached Lab prototype — not a visitor upload.`}
              >
                <source src={d.webm} type="video/webm" />
                <source src={d.mp4} type="video/mp4" />
              </video>
              <div className="pointer-events-none absolute left-2 top-2 flex max-w-[90%] flex-wrap gap-0.5">
                <span
                  className="rounded-full border border-white/10 bg-black/60 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white/80 backdrop-blur-sm"
                  title="Cached Lab prototype · provider evidence pending"
                >
                  Lab · cached prototype
                </span>
              </div>
            </div>
            <div className="p-3.5">
              <p className="text-sm font-semibold text-white">{d.title}</p>
              <p className="mt-0.5 text-[10px] text-white/40">
                PIKBO Lab cached prototype · {d.character}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/50">
                {d.result}
              </p>
              <Link
                href={createRemixHref(d.preset, d.id)}
                className="mt-2.5 inline-flex text-[11px] font-bold text-[var(--mint)] opacity-90 hover:underline group-hover:opacity-100"
                data-landing-remake="proof"
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
