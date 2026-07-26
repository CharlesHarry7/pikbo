import type { Metadata } from "next";
import Link from "next/link";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { MODELS } from "@/lib/catalog";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { PREVIEW_ROBOTS } from "@/lib/seoIndex";

export const metadata: Metadata = {
  title: "Models · Preview",
  description:
    "AI model integrations in PIKBO — configured paths are separated from roadmap models and cached previews are labeled.",
  alternates: { canonical: "/models" },
  // Preview: noindex + crawlable (no robots.txt dual-block)
  robots: PREVIEW_ROBOTS,
};

/** Lab posters for wired video engines only — never invent Kling/Veo media. */
function posterForModel(id: string): string | null {
  const map: Record<string, number> = {
    "seedance-2": 0,
    "seedance-mini": 1,
    "seedance-fast": 2,
  };
  const i = map[id];
  if (i === undefined) return null;
  return DEMO_VIDEOS[i % DEMO_VIDEOS.length]?.poster ?? null;
}

export default function ModelsPage() {
  const live = MODELS.filter((m) => m.live);
  const soon = MODELS.filter((m) => !m.live);

  return (
    <div className="relative px-4 py-10 sm:px-8">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(50%_70%_at_0%_0%,rgba(200,255,61,0.07),transparent_70%)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl">
        <span className="chip">Engines · honest shelf</span>
        <h1 className="mt-3 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
          Models
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
          Configured model shelf for the PIKBO workflow.{" "}
          <strong className="text-[var(--mint)]">WIRED</strong> cards open a
          workspace; live output still requires provider credentials.{" "}
          <strong className="text-[var(--fg)]">Seedance</strong> for motion ·{" "}
          <strong className="text-[var(--fg)]">Flux</strong> for stills. We
          don&apos;t fake Kling/Veo/Sora without keys.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link href="/create" className="btn btn-primary text-sm">
            Generate with Seedance →
          </Link>
          <FreeTrialCta
            path="/models"
            variant="ghost"
            labelTry="Try free · Lab"
            hideClipsChip
          />
          <Link href="/modules" className="btn btn-ghost text-sm">
            Toy Modules
          </Link>
          <Link
            href="/create?mode=seller-pack"
            className="btn btn-ghost text-sm"
          >
            Seller Pack
          </Link>
          <Link
            href="/flow"
            className="btn btn-ghost text-sm text-white/50"
            title="Preview media wall — not a live Seedance job"
          >
            Flow · Preview
          </Link>
          <Link href="/image" className="btn btn-ghost text-sm">
            Flux stills · Preview
          </Link>
          <Link href="/library" className="btn btn-ghost text-sm">
            Library
          </Link>
        </div>

        <nav
          aria-label="Suite path"
          className="mt-5 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/50"
        >
          <Link
            href="/create"
            className="rounded-full border border-[#c8ff3d]/40 bg-[#c8ff3d]/10 px-3 py-1.5 text-[#c8ff3d]"
          >
            Generate
          </Link>
          <span aria-hidden className="text-white/25">
            →
          </span>
          <span className="rounded-full border border-white/20 bg-white/[0.06] px-3 py-1.5 text-white">
            Models
          </span>
          <span aria-hidden className="text-white/25">
            →
          </span>
          <Link
            href="/library"
            className="rounded-full border border-white/15 px-3 py-1.5 hover:border-white/30 hover:text-white"
          >
            Library
          </Link>
        </nav>

        <h2 className="mt-10 mb-4 text-xs font-bold uppercase tracking-wider text-[var(--mint)]">
          Configured · {live.length}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
          {live.map((m) => {
            const poster = posterForModel(m.id);
            return (
              <Link
                key={m.id}
                href={m.href}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 transition hover:-translate-y-1 hover:border-[var(--mint)]/40"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  {poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={poster}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{ background: m.gradient }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <span className="absolute left-2 top-2 rounded-full bg-[var(--mint)] px-2 py-0.5 text-[10px] font-black text-black">
                    WIRED
                  </span>
                  {m.tag ? (
                    <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white/80">
                      {m.tag}
                    </span>
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <h2 className="text-sm font-bold text-white group-hover:text-[var(--mint)]">
                      {m.name}
                    </h2>
                    <p className="text-[10px] text-white/45">{m.vendor}</p>
                  </div>
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-xs text-white/50">{m.blurb}</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-[var(--mint)]">
                    Open workspace →
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        <h2
          id="soon"
          className="mt-12 mb-4 scroll-mt-24 text-xs font-bold uppercase tracking-wider text-[var(--fg-dim)]"
        >
          Roadmap · not sold as live
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
          {soon.map((m) => (
            <div
              key={m.id}
              className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] opacity-60"
              aria-disabled
            >
              <div
                className="relative aspect-[4/3]"
                style={{ background: m.gradient }}
              >
                <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white/75">
                  {m.tag ?? "Soon"}
                </span>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <h2 className="text-sm font-bold text-white/90">{m.name}</h2>
                  <p className="text-[10px] text-white/40">{m.vendor}</p>
                </div>
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-xs text-white/40">{m.blurb}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
