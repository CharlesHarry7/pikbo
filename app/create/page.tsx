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
      title: { absolute: `Launch Moment · toy video studio | ${site.name}` },
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
      <div className="min-h-screen bg-[#0A0A0A] pb-28 text-[#F7F4ED] lg:pb-8">
        <div className="border-b border-white/10 bg-[#F7F4ED] px-4 py-5 text-[#0A0A0A] sm:px-8 sm:py-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/42">
                Launch Moment studio · private beta
                <span className="sr-only">
                  {" "}
                  · Public preview or invited private generation
                </span>
              </p>
              <h1 className="mt-1 font-display text-3xl font-black tracking-[-0.055em] sm:text-5xl">
                Preview a launch moment.
              </h1>
            </div>
            <p className="max-w-xl text-xs font-semibold leading-5 text-black/52 sm:text-sm">
              Choose the visual feeling first. Power-Up is Pikbo&apos;s first
              validated moment: one owned toy photo, one continuous hero shot,
              and a private result you can use on launch day. Public preview
              accepts Lab samples only; invited sellers can sign in for private
              generation. <span className="sr-only">no product photo is accepted or processed</span>
            </p>
          </div>
          <p className="mx-auto mt-3 max-w-7xl text-[10px] font-bold text-amber-800/75">
            Verified technical sample: Power-Up / Listing Spin. Other delivery
            surfaces remain format direction until their own evidence exists.
            <span className="sr-only">
              Launch Pack · 3 fixed formats · Public preview or invited private
              generation · Only Listing Spin has passed the current private
              technical check.
            </span>
          </p>
        </div>

        <section className="mx-auto max-w-7xl px-3 pt-6 sm:px-8" aria-labelledby="launch-moment-title">
          <div className="grid gap-3 rounded-[1.75rem] border border-white/10 bg-[#121214] p-4 text-white shadow-[0_30px_80px_-45px_rgba(0,0,0,0.9)] sm:grid-cols-[1.2fr_0.8fr] sm:p-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c8ff3d]">
                First moment
              </p>
              <h2 id="launch-moment-title" className="mt-2 text-2xl font-black tracking-[-0.05em] sm:text-4xl">
                Power-Up
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/58">
                A subtle energy activation, a camera move, and a hero pose. The
                toy stays recognisable; the moment makes the drop feel alive.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/52 sm:self-end">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">9:16</div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">5 sec</div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">720p beta</div>
            </div>
          </div>
        </section>

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
