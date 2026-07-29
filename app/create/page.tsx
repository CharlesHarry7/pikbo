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
        "Pikbo Launch Pack: one owned toy photo → listing 360°, box reveal, and social hook. Cached previews cost 0 credits; eligible Live accounts see the exact three-job quote before submission.",
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
      "Pikbo Generate — upload an owned toy photo, pick a commercial goal, or configure a three-format Launch Pack. Cached previews stay free; Live access and quotes are gated.",
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
      <div className="min-h-screen bg-[#09090a]">
        <div className="px-4 py-6 sm:px-8 sm:py-10">
          <div className="mx-auto max-w-7xl">
            <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#111113] p-5 sm:p-8 lg:p-10">
              <div
                className="pointer-events-none absolute right-[-4rem] top-[-5rem] h-64 w-64 rounded-full bg-[#c8ff3d]/10 blur-[80px]"
                aria-hidden
              />
              <div className="relative grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#c8ff3d] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-black">
                      Private beta · invite only
                    </span>
                    <span className="rounded-full border border-white/12 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/52">
                      Launch Pack — 3 private videos · 30 credits
                    </span>
                  </div>
                  <p className="mt-7 text-[10px] font-black uppercase tracking-[0.18em] text-[#c8ff3d]">
                    One photo → your Launch Pack
                  </p>
                  <h1 className="mt-3 max-w-3xl font-display text-4xl font-black tracking-[-0.055em] text-white sm:text-6xl">
                    Build three product videos from one toy photo.
                  </h1>
                  <p className="mt-5 max-w-2xl text-sm leading-6 text-white/52">
                    Use a clear photo you own. Pikbo fixes the format, duration,
                    and delivery so you can focus on one SKU—not a maze of
                    models and controls.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["01", "Listing Spin", "1:1 · 5 sec · 720p"],
                    ["02", "Blind-box Reveal", "9:16 · 5 sec · 720p"],
                    ["03", "Social Flash", "9:16 · 5 sec · 720p"],
                  ].map(([n, name, spec]) => (
                    <div
                      key={name}
                      className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] p-3 sm:p-4"
                    >
                      <span className="text-[9px] font-black text-[#c8ff3d]">
                        {n}
                      </span>
                      <p className="mt-4 text-[11px] font-black leading-tight text-white sm:mt-5 sm:text-sm">
                        {name}
                      </p>
                      <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.08em] text-white/55 sm:text-[9px] sm:tracking-[0.1em]">
                        {spec}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="relative mt-7 border-t border-white/10 pt-5 text-xs font-semibold leading-5 text-white/62">
                Only completed private clips can be downloaded. A confirmed
                failed format restores its own 10-credit charge. Public
                visitors see cached previews; their uploads are not processed.
              </p>
            </section>

            <div className="mt-6" data-launch-pack-workbench>
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
