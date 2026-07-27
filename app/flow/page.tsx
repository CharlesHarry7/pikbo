import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { listLiveWorkflows, listPreviewWorkflows } from "@/lib/workflows";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { GenerateSuiteChrome } from "@/components/GenerateSuiteChrome";
import { FlowMediaCard } from "@/components/FlowMediaCard";
import { createRemixHref } from "@/lib/remixIntent";
import { site } from "@/lib/site";
import { PREVIEW_ROBOTS } from "@/lib/seoIndex";

/** Flow Generate doors — listing spin remix (ratio/duration/channel). */
const FLOW_GENERATE_HREF = createRemixHref("360-spin-showcase");

export const metadata: Metadata = {
  title: "Flow · Creation matrix",
  description:
    "Higgsfield Flow–style creation hub for designer toys: pick a job, open Generate or Modules with media-first cards. Lab demos only.",
  alternates: { canonical: "/flow" },
  // Preview: noindex but crawlable (not robots.txt blocked) so Google can read noindex
  robots: PREVIEW_ROBOTS,
};

type FlowCard = {
  id: string;
  title: string;
  blurb: string;
  href: string;
  badge: string;
  tier: "core" | "job" | "preview";
  /** DEMO_VIDEOS id or index fallback */
  demoId?: string;
  demoIndex?: number;
};

function resolveDemo(card: FlowCard) {
  if (card.demoId) {
    const byId = DEMO_VIDEOS.find((d) => d.id === card.demoId);
    if (byId) return byId;
  }
  const i = card.demoIndex ?? 0;
  return DEMO_VIDEOS[i % DEMO_VIDEOS.length];
}

/**
 * HF Flow pattern: dense media matrix of creation surfaces.
 * Toy-vertical only — every live card deep-links a real Pikbo path.
 */
export default function FlowPage() {
  const jobCards: FlowCard[] = listLiveWorkflows()
    .filter((w) => w.id !== "toy-presets" && w.id !== "photo-to-clip")
    .map((w, i) => ({
      id: `job-${w.id}`,
      title: w.label,
      blurb: w.blurb,
      href: w.href,
      badge: w.badge || "Job",
      tier: "job" as const,
      demoIndex: i + 1,
    }));

  const core: FlowCard[] = [
    {
      id: "core-i2v",
      title: "Photo → Clip",
      blurb: "Main Generate workbench — one owned toy photo to short video.",
      // Workbench door (not forced Lab sample). Free trial CTA is in the header.
      href: "/create",
      badge: "Core",
      tier: "core",
      demoId: "scout-spin",
    },
    {
      id: "core-modules",
      title: "Toy Modules",
      blurb: "Yiha/lego-style job blocks — listing, hook, unbox, shelf.",
      href: "/modules",
      badge: "Modules",
      tier: "core",
      demoId: "moon-reveal",
    },
    {
      id: "core-presets",
      title: "Viral recipes",
      blurb: "Full recipe wall with Lab proof clips — remake in Generate.",
      href: "/effects",
      badge: "Presets",
      tier: "core",
      demoId: "orbit-cgi",
    },
    {
      id: "core-pack",
      title: "Seller Pack",
      blurb: "HF Product-studio subset: listing + reveal + social from one photo.",
      href: "/create?mode=seller-pack",
      badge: "Shop",
      tier: "core",
      demoId: "beatbot-unboxed",
    },
    {
      id: "core-lab",
      title: "PIKBO Lab",
      blurb: "Official examples — open project, then replace the toy.",
      href: "/community",
      badge: "Lab",
      tier: "core",
      demoId: "orbit-dance",
    },
    {
      id: "core-explore",
      title: "Inside projects",
      blurb: "Input · output · recipe · provenance — then Use recipe.",
      href: "/explore",
      badge: "Explore",
      tier: "core",
      demoId: "moon-glow",
    },
    {
      id: "core-cinema",
      title: "Cinema board",
      blurb: "Director board · lens / move / grade → Generate Seedance.",
      href: "/cinema",
      badge: "Cinema",
      tier: "core",
      demoId: "scout-story",
    },
    {
      id: "core-library",
      title: "Library · Assets",
      blurb: "Device clips + session jobs · publish live to Community.",
      href: "/library",
      badge: "Assets",
      tier: "core",
      demoId: "scout-spin",
    },
  ];

  const preview: FlowCard[] = [
    ...listPreviewWorkflows().map((w, i) => ({
      id: `prev-${w.id}`,
      title: w.label,
      blurb: w.blurb,
      href: w.href,
      badge: "Preview",
      tier: "preview" as const,
      demoIndex: i,
    })),
    {
      id: "prev-models",
      title: "Models shelf",
      blurb: "Seedance live · Flux stills · others Soon — no fake keys.",
      href: "/models",
      badge: "Engines",
      tier: "preview",
      demoId: "beatbot-hook",
    },
  ];

  const sections: { id: string; label: string; items: FlowCard[] }[] = [
    { id: "core", label: "Core · open these first", items: core },
    { id: "jobs", label: "Job modules · seller & collector", items: jobCards },
    { id: "preview", label: "Preview · honest capability tags", items: preview },
  ];

  return (
    <div className="min-h-screen bg-black pb-28 text-white">
      <Suspense
        fallback={
          <div className="border-b border-white/10 px-4 py-3 text-sm text-white/40">
            Flow · Creation matrix
          </div>
        }
      >
        <GenerateSuiteChrome />
      </Suspense>

      {/* HF Flow: tight header — matrix is the product */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-black/90 px-3 py-3 backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c8ff3d]">
              Flow
            </p>
            <h1 className="font-display text-lg font-black uppercase tracking-tight sm:text-xl">
              How do you want to create?
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FreeTrialCta
              path="/flow"
              variant="primary"
              labelTry="Try free"
              className="rounded-full bg-[#c8ff3d] px-4 py-2 text-xs font-black text-black"
            />
            <Link
              href={FLOW_GENERATE_HREF}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white/80"
              data-flow-video="remix"
            >
              Video
            </Link>
            <Link
              href="/effects"
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/55"
            >
              Viral presets
            </Link>
            <Link
              href="/modules"
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/55"
            >
              Modules
            </Link>
          </div>
        </div>
        <nav
          aria-label="Flow sections"
          className="mx-auto mt-2 flex max-w-[1400px] gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]"
        >
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#flow-${s.id}`}
              className="shrink-0 rounded-full border border-white/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/50 hover:border-[#c8ff3d]/40 hover:text-[#c8ff3d]"
            >
              {s.label.split("·")[0].trim()} · {s.items.length}
            </a>
          ))}
        </nav>
      </div>

      {sections.map((sec) => (
        <section
          key={sec.id}
          id={`flow-${sec.id}`}
          className="scroll-mt-28 border-b border-white/10 px-2 py-5 sm:px-3"
        >
          <div className="mx-auto max-w-[1400px]">
            <h2 className="mb-3 px-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
              {sec.label} · {sec.items.length}
            </h2>
            {/* Dense media matrix — 2→4 cols like HF Flow cards */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {sec.items.map((f) => {
                const demo = resolveDemo(f);
                const exactDemo = Boolean(
                  f.demoId && DEMO_VIDEOS.some((d) => d.id === f.demoId)
                );
                return (
                  <FlowMediaCard
                    key={f.id}
                    href={f.href}
                    title={f.title}
                    blurb={f.blurb}
                    badge={f.badge}
                    isPreview={f.tier === "preview"}
                    poster={demo.poster}
                    webm={demo.webm}
                    mp4={demo.mp4}
                    recipeSlug={demo.preset}
                    exactDemo={exactDemo}
                  />
                );
              })}
            </div>
          </div>
        </section>
      ))}

      <div className="mx-auto max-w-[1400px] px-4 py-10 text-center">
        <p className="text-sm text-white/45">
          Media matrix · every card is a real {site.name} path · Lab footage only
        </p>
        {/* HF Flow motion — core loop without fake multi-model doors */}
        <nav
          aria-label="Core product path"
          className="mx-auto mt-5 flex max-w-3xl flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-white/55"
        >
          <Link
            href={FLOW_GENERATE_HREF}
            className="rounded-full border border-[#c8ff3d]/40 bg-[#c8ff3d]/10 px-3 py-1.5 text-[#c8ff3d]"
            data-flow-path-generate="remix"
          >
            Generate
          </Link>
          <span aria-hidden className="text-white/25">
            →
          </span>
          <Link href="/modules" className="rounded-full border border-white/15 px-3 py-1.5 hover:border-white/30 hover:text-white">
            Modules
          </Link>
          <span aria-hidden className="text-white/25">
            →
          </span>
          <Link
            href="/create?mode=seller-pack"
            className="rounded-full border border-white/15 px-3 py-1.5 hover:border-white/30 hover:text-white"
          >
            Seller Pack
          </Link>
          <span aria-hidden className="text-white/25">
            →
          </span>
          <Link href="/library" className="rounded-full border border-white/15 px-3 py-1.5 hover:border-white/30 hover:text-white">
            Library
          </Link>
          <span aria-hidden className="text-white/25">
            →
          </span>
          <Link href="/community" className="rounded-full border border-white/15 px-3 py-1.5 hover:border-white/30 hover:text-white">
            Community
          </Link>
        </nav>
        <Link
          href={FLOW_GENERATE_HREF}
          className="mt-6 inline-flex rounded-full bg-[#c8ff3d] px-8 py-3.5 text-sm font-black text-black shadow-[0_0_32px_rgba(200,255,61,0.25)]"
          data-flow-start-generate="remix"
        >
          Start Generate video
        </Link>
      </div>
    </div>
  );
}
