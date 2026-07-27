import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CreateStudio } from "@/components/CreateStudio";
import { CreateSeoFooter } from "@/components/CreateSeoFooter";
import { BatchStudio } from "@/components/BatchStudio";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { GenerateSuiteChrome } from "@/components/GenerateSuiteChrome";
import { JsonLd } from "@/components/JsonLd";
import { getPreset } from "@/lib/presets";
import { createRemixHref } from "@/lib/remixIntent";
import { site } from "@/lib/site";
import { softwareApplicationJsonLd } from "@/lib/jsonLd";
import { CONCEPT_ROBOTS } from "@/lib/seoIndex";

/** Seller Pack chrome → single recipe with remix contract. */
const CREATE_SINGLE_RECIPE_HREF = createRemixHref("360-spin-showcase");

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ effect?: string; mode?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  // Cold-start: /create is the product tool but not a rank landing (home tool is).
  // Keep crawlable + follow for deep links; stay out of the 9-URL index budget.
  if (sp.mode === "seller-pack" || sp.mode === "seller") {
    return {
      title: { absolute: `Seller Starter Pack · 3 toy-video recipes | ${site.name}` },
      description:
        "Seller Starter Pack: one owned toy photo → listing 360°, box reveal, and social hook. Cached previews cost 0 credits; eligible Live accounts see the exact three-job quote before submission.",
      alternates: { canonical: "/create?mode=seller-pack" },
      robots: CONCEPT_ROBOTS,
    };
  }
  const preset = sp.effect ? getPreset(sp.effect) : undefined;
  if (preset) {
    return {
      title: { absolute: `Generate · ${preset.name} | ${site.name}` },
      description: preset.seoDescription,
      alternates: { canonical: `/effects/${preset.slug}` },
      robots: CONCEPT_ROBOTS,
    };
  }
  return {
    title: "Generate · Toy Creative Director",
    description:
      "Pikbo Generate — upload an owned toy photo, pick a commercial goal, or configure a three-recipe Seller Starter Pack. Cached previews stay free; Live access and quotes are gated.",
    alternates: { canonical: "/create" },
    robots: CONCEPT_ROBOTS,
    openGraph: {
      title: `Generate · Toy Creative Director | ${site.name}`,
      description:
        "Upload a toy photo you own. Choose a commercial goal and recipe, preview cached Lab examples, and check Live eligibility in the workbench.",
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
    resolution?: string;
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
    /** Character bible SKU carried from post-generate Next SKU */
    sku?: string;
    /** Exact local retry handoff; paired one-time bearer. */
    retryJobId?: string;
    retryToken?: string;
  }>;
}) {
  const sp = await searchParams;

  const firstRunSample =
    sp.sample ||
    (sp.try === "1" || sp.try === "true" ? "scout" : undefined);

  // Wave A: Seller Pack is a Create mode, not a separate suite door.
  if (sp.mode === "seller-pack" || sp.mode === "seller") {
    return (
      <div>
        <Suspense
          fallback={
            <div className="border-b border-white/10 px-4 py-3 text-sm text-white/40">
              Generate · Seller Starter Pack
            </div>
          }
        >
          <GenerateSuiteChrome />
        </Suspense>
        <div className="px-4 py-8 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <span className="chip">
              Seller Starter Pack — 3 recipes · quote shown before Live
            </span>
            <h1 className="mt-3 font-display text-3xl font-black uppercase tracking-tight">
              One photo → three commercial clips
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--fg-muted)]">
              Creative Director default path: Listing 360° Spin (1:1), Box
              Reveal (9:16), Social Hook (9:16) — all{" "}
              <b className="text-white/80">video</b>, built for Etsy / TikTok /
              drop day. Own photos only. Lab demos free and labeled. Live
              charges per successful child; failures restore credits when
              confirmed.
            </p>
            <p className="mt-2 text-xs font-semibold text-white/45">
              Launch Pack — 12 recipes · pricing coming later
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <FreeTrialCta
                path="/create?mode=seller-pack"
                variant="primary"
                labelTry="Try free video first"
                className="rounded-full bg-[#c8ff3d] px-4 py-2 text-xs font-black text-black"
              />
              <Link
                href={CREATE_SINGLE_RECIPE_HREF}
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white/80"
                data-create-single-recipe="remix"
              >
                Single recipe
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
              {/* AfterPath ?sku= / ?try=1 hydrate bible + Lab still (no auto 3× run) */}
              <BatchStudio
                pack="seller"
                initialSku={sp.sku}
                initialSample={firstRunSample}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <JsonLd
        data={softwareApplicationJsonLd({
          name: `${site.name} Generate — Toy Creative Director`,
          url: `${site.url}/create`,
          description:
            "Upload a designer-toy photo you own, pick a commercial goal, and preview a cached recipe. Eligible Live access and the exact quote are checked before submission.",
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
          initialResolution={sp.resolution}
          initialMode={sp.mode === "t2v" ? "t2v" : "i2v"}
          initialPrompt={sp.prompt}
          initialSource={sp.source}
          initialRatio={sp.ratio}
          initialDuration={sp.duration}
          initialChannel={sp.channel}
          initialSample={firstRunSample}
          initialJob={sp.job}
          initialSku={sp.sku}
          initialRetryJobId={sp.retryJobId}
          initialRetryToken={sp.retryToken}
        />
      </Suspense>
      {/* SSR landing copy + internal links for crawlers */}
      <CreateSeoFooter effectSlug={sp.effect} />
    </>
  );
}
