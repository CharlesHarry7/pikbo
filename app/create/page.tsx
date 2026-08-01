import type { Metadata } from "next";
import { Suspense } from "react";
import { CreateStudio } from "@/components/CreateStudio";
import { CreateSeoFooter } from "@/components/CreateSeoFooter";
import { BatchStudio } from "@/components/BatchStudio";
import { JsonLd } from "@/components/JsonLd";
import { getPreset } from "@/lib/presets";
import { site } from "@/lib/site";
import { softwareApplicationJsonLd } from "@/lib/jsonLd";
import { CONCEPT_ROBOTS } from "@/lib/seoIndex";

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
      title: { absolute: `Launch Pack · 3 toy-video assets | ${site.name}` },
      description:
        "Preview Pikbo's fixed Listing Spin, Blind-box Reveal, and Social Flash with a Lab sample. Invited private-beta accounts can upload an authorized toy photo and see the exact three-job quote.",
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
      "Pikbo Generate — inspect cached Lab formats publicly, or use an authorized toy photo inside the invited private beta.",
    alternates: { canonical: "/create" },
    robots: CONCEPT_ROBOTS,
    openGraph: {
      title: `Generate · Toy Creative Director | ${site.name}`,
      description:
        "Inspect cached Lab examples, choose a commercial goal, and use an authorized toy photo only when invited private-beta access is enabled.",
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
      <div className="min-h-screen bg-[#17131D] pb-28 text-[#F6F0E5] lg:pb-8">
        <div className="border-b-2 border-[#17131D] bg-[#F6F0E5] px-4 py-5 text-[#17131D] sm:px-8 sm:py-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex rotate-[-1deg] rounded-full bg-[#FF5A47] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white">
                Toy Drop Workbench · 3 fixed formats
                <span className="sr-only">
                  {" "}
                  · Public preview or invited private generation
                </span>
              </p>
              <h1 className="mt-3 font-display text-4xl font-black leading-[0.9] tracking-[-0.06em] sm:text-6xl">
                Build one complete toy drop.
              </h1>
            </div>
            <p className="max-w-xl text-xs font-semibold leading-5 text-[#17131D]/55 sm:text-sm">
              Start with a Pikbo Lab toy and inspect all three outcomes. Invited
              sellers can replace it with one rights-owned product photo for
              private generation and Library delivery.
            </p>
          </div>
          <div className="mx-auto mt-4 flex max-w-7xl flex-wrap gap-2 text-[9px] font-black uppercase tracking-[0.12em]">
            <span className="rounded-full bg-[#4A55FF] px-3 py-1.5 text-white">01 · Listing Spin</span>
            <span className="rounded-full bg-[#FF5A47] px-3 py-1.5 text-white">02 · Blind-box Reveal</span>
            <span className="rounded-full bg-[#FFD447] px-3 py-1.5 text-[#17131D]">03 · Social Flash</span>
            <span className="rounded-full border border-[#17131D]/20 px-3 py-1.5 text-[#17131D]/55">Listing Spin is the verified technical run</span>
          </div>
          <p className="sr-only">
            In public preview, no product photo is accepted or processed.
          </p>
        </div>

        <div
          className="mx-auto max-w-7xl px-3 sm:px-8"
          data-launch-pack-workbench
        >
          {/* Public samples and invited private generation share one gated workbench. */}
          <BatchStudio
            pack="seller"
            initialSku={sp.sku}
            initialSample={firstRunSample}
          />
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
      <h1 className="sr-only">Generate toy video from one owned photo</h1>
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
