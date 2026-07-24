import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CreateStudio } from "@/components/CreateStudio";
import { CreateSeoFooter } from "@/components/CreateSeoFooter";
import { BatchStudio } from "@/components/BatchStudio";
import { GenerateSuiteChrome } from "@/components/GenerateSuiteChrome";
import { JsonLd } from "@/components/JsonLd";
import { getPreset } from "@/lib/presets";
import { site } from "@/lib/site";
import { softwareApplicationJsonLd } from "@/lib/jsonLd";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ effect?: string; mode?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  if (sp.mode === "seller-pack" || sp.mode === "seller") {
    return {
      title: { absolute: `Seller Pack · 3 outputs | ${site.name}` },
      description:
        "One owned toy photo → listing spin, blind-box reveal, and social hook. Three fixed seller formats. Cached demos free; live jobs charge per child.",
      alternates: { canonical: "/create?mode=seller-pack" },
    };
  }
  const preset = sp.effect ? getPreset(sp.effect) : undefined;
  if (preset) {
    return {
      title: { absolute: `Generate · ${preset.name} | ${site.name}` },
      description: preset.seoDescription,
      alternates: { canonical: `/effects/${preset.slug}` },
      robots: { index: false, follow: true },
    };
  }
  return {
    title: "Generate · Toy Studio",
    description:
      "Pikbo Generate — designer-toy workbench. Upload a photo you own, pick a listing, reveal, or social module, and export a short clip. Free Mini trial: 5s · 480p · on-player mark.",
    alternates: { canonical: "/create" },
    openGraph: {
      title: `Generate · Toy Studio | ${site.name}`,
      description:
        "Upload a toy photo you own and generate a short AI video. Free Mini trial — no card.",
      url: `${site.url}/create`,
    },
  };
}

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{
    effect?: string;
    model?: string;
    mode?: string;
    prompt?: string;
    source?: string;
    ratio?: string;
    duration?: string;
    channel?: string;
    /** One-click first-run sample: orbit | moon | scout | beatbot */
    sample?: string;
    try?: string;
    /** Job-to-be-done chip: etsy-listing | tiktok-hook | blind-box-drop | shelf-display */
    job?: string;
  }>;
}) {
  const sp = await searchParams;

  // Wave A: Seller Pack is a Create mode, not a separate suite door.
  if (sp.mode === "seller-pack" || sp.mode === "seller") {
    return (
      <div>
        <Suspense
          fallback={
            <div className="border-b border-white/10 px-4 py-3 text-sm text-white/40">
              Generate · Seller Pack
            </div>
          }
        >
          <GenerateSuiteChrome />
        </Suspense>
        <div className="px-4 py-8 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <span className="chip">Seller Pack · 3 videos</span>
            <h1 className="mt-3 font-display text-3xl font-black uppercase tracking-tight">
              One photo → three short videos
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
              Product-studio for toys: Listing Spin (1:1), Blind-box Reveal
              (9:16), Social Flash (9:16) — all <b className="text-white/80">video</b>.
              Lab demos free and labeled. Live charges per successful child;
              failures restore credits when confirmed.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/create?try=1&sample=scout"
                className="rounded-full bg-[#c8ff3d] px-4 py-2 text-xs font-black text-black"
              >
                Try free video first
              </Link>
              <Link
                href="/create"
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white/80"
              >
                Single Generate
              </Link>
              <Link
                href="/modules"
                className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/55"
              >
                Modules
              </Link>
              <Link
                href="/for/etsy-listing-videos"
                className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/55"
              >
                Etsy use case
              </Link>
            </div>
            <div className="mt-6">
              <BatchStudio pack="seller" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const firstRunSample =
    sp.sample ||
    (sp.try === "1" || sp.try === "true" ? "scout" : undefined);

  return (
    <>
      <JsonLd
        data={softwareApplicationJsonLd({
          name: `${site.name} Generate — AI Toy Video Studio`,
          url: `${site.url}/create`,
          description:
            "Upload a photo of a designer toy you own and generate a short AI video for listings, TikTok, and drops. Free Mini trial with honest caps.",
        })}
      />
      {/* V2 tool core — remix deep link: effect/source/ratio/duration/channel */}
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center text-sm text-white/40">
            Loading Generate…
          </div>
        }
      >
        <CreateStudio
          initialEffect={sp.effect}
          initialModel={sp.model}
          initialMode={sp.mode === "t2v" ? "t2v" : "i2v"}
          initialPrompt={sp.prompt}
          initialSource={sp.source}
          initialRatio={sp.ratio}
          initialDuration={sp.duration}
          initialChannel={sp.channel}
          initialSample={firstRunSample}
          initialJob={sp.job}
        />
      </Suspense>
      {/* SSR landing copy + internal links for crawlers */}
      <CreateSeoFooter effectSlug={sp.effect} />
    </>
  );
}
