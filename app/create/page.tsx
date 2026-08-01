import type { Metadata } from "next";
import type { CSSProperties } from "react";
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
      <div className="min-h-screen bg-[#F7F3EA] pb-28 text-[#111111] lg:pb-10">
        <div className="border-b border-[#D9D0C3] px-4 py-7 sm:px-8 sm:py-10">
          <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#E94B35] sm:text-[10px]">
                Launch Pack · 3 fixed formats
                <span className="sr-only">
                  {" "}
                  · Public preview or invited private generation
                </span>
              </p>
              <h1 className="mt-2 font-display text-4xl font-black leading-[0.92] tracking-[-0.06em] sm:text-6xl">
                Preview a Launch Pack.
              </h1>
            </div>
            <p className="max-w-xl text-xs font-semibold leading-5 text-[#111111]/54 sm:text-sm sm:leading-6">
              Choose a Pikbo Lab sample to preview the three fixed formats.
              Public preview: no product photo is accepted or processed.
              Invited sellers can sign in for private generation.
            </p>
          </div>
          <p className="mx-auto mt-4 max-w-7xl border-l-2 border-[#E94B35] pl-3 text-[10px] font-bold text-[#111111]/48">
            Only Listing Spin has passed Pikbo&apos;s current private technical
            check so far.
          </p>
        </div>

        <div
          className="mx-auto mt-4 max-w-7xl rounded-t-[1.5rem] bg-[#111111] px-3 pb-5 pt-1 text-[#F7F3EA] shadow-[0_24px_70px_rgba(17,17,17,0.12)] sm:mt-8 sm:rounded-[2rem] sm:px-8 sm:pb-8 lg:px-10"
          data-launch-pack-workbench
          style={
            {
              "--brand": "#E94B35",
              "--mint": "#E94B35",
              "--lime": "#E94B35",
              "--grad-soft":
                "linear-gradient(135deg, rgba(233, 75, 53, 0.16), rgba(247, 243, 234, 0.05))",
              "--ring": "rgba(233, 75, 53, 0.55)",
            } as CSSProperties
          }
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
