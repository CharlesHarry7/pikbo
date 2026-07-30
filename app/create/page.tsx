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
      <div className="min-h-screen bg-[#09090a]">
        <div className="px-4 py-4 sm:px-8 sm:py-6">
          <div className="mx-auto max-w-7xl">
            <section className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#111113] p-4 sm:p-5">
              <div
                className="pointer-events-none absolute right-[-4rem] top-[-5rem] h-64 w-64 rounded-full bg-[#c8ff3d]/10 blur-[80px]"
                aria-hidden
              />
              <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#c8ff3d] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-black">
                      Private validation
                    </span>
                    <span className="rounded-full border border-white/12 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/52">
                      Launch Pack · 3 fixed formats
                    </span>
                  </div>
                  <p className="mt-3 text-[9px] font-black uppercase tracking-[0.16em] text-[#c8ff3d]">
                    Public preview or invited private generation
                  </p>
                  <h1 className="mt-4 max-w-3xl font-display text-2xl font-black tracking-[-0.045em] text-white sm:text-4xl">
                    Preview the fixed Pack—or create it in private beta.
                  </h1>
                  <p className="mt-2 max-w-2xl text-xs leading-5 text-white/48 sm:text-sm">
                    Public visitors choose a Pikbo Lab sample; no product photo
                    is accepted or processed. Invited accounts can upload one
                    rights-owned photo, reserve 30 credits, and receive
                    owner-only results.
                  </p>
                  <p className="mt-2 text-[10px] font-semibold text-amber-100/70">
                    Only Listing Spin has passed Pikbo&apos;s internal
                    end-to-end check so far.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-1.5 lg:w-[430px]">
                  {[
                    ["01", "Listing Spin", "1:1 · Fast 720p · 5 sec"],
                    ["02", "Blind-box Reveal", "9:16 · Fast 720p · 5 sec"],
                    ["03", "Social Flash", "9:16 · Fast 720p · 5 sec"],
                  ].map(([n, name, spec]) => (
                    <div
                      key={name}
                      className="min-w-0 rounded-xl border border-white/10 bg-white/[0.045] p-2.5 sm:p-3"
                    >
                      <span className="text-[9px] font-black text-[#c8ff3d]">
                        {n}
                      </span>
                      <p className="mt-2 text-[10px] font-black leading-tight text-white sm:text-xs">
                        {name}
                      </p>
                      <p className="mt-1 text-[7px] font-bold uppercase tracking-[0.06em] text-white/45 sm:text-[8px]">
                        {spec}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="mt-3" data-launch-pack-workbench>
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
