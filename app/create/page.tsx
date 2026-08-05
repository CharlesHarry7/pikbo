import type { Metadata } from "next";
import { Suspense } from "react";
import { CreateStudio } from "@/components/CreateStudio";
import { CreateSeoFooter } from "@/components/CreateSeoFooter";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";
import { CONCEPT_ROBOTS } from "@/lib/seoIndex";
import {
  InvalidMomentNotice,
  MomentCreatePreview,
} from "@/components/MomentCreatePreview";
import { GuestMomentCreateGate } from "@/components/GuestMomentCreateGate";
import { getMoment, parseMomentId } from "@/lib/moments";
import { getPreset } from "@/lib/presets";
import { softwareApplicationJsonLd } from "@/lib/jsonLd";
import {
  FIXED_MOMENT_EFFECT,
  FIXED_MOMENT_MODE,
  isGenerate360Effect,
  resolveCreateRouteContract,
} from "@/lib/createRouteContract";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{
    effect?: string;
    mode?: string;
    preview?: string;
    moment?: string | string[];
  }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const moment = Array.isArray(sp.moment) ? null : parseMomentId(sp.moment);
  if (sp.moment !== undefined) {
    return {
      title: {
        absolute: moment
          ? `${getMoment(moment).name} | ${site.name}`
          : `Moment unavailable | ${site.name}`,
      },
      description: moment
        ? `Place your owned toy into Pikbo's ${getMoment(moment).name} local composition preview. No upload or generation occurs in the public preview.`
        : "Choose one of Pikbo's published toy Moments. Invalid Moment links do not upload or generate anything.",
      alternates: { canonical: "/create" },
      robots: CONCEPT_ROBOTS,
    };
  }

  const contract = resolveCreateRouteContract(sp);
  if (contract === "generate-workbench") {
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
    };
  }

  return {
    title: { absolute: `Street Power-Up · Private Moment | ${site.name}` },
    description:
      "Preview Pikbo's cached Street Power-Up sample, then request the owner-only private beta path.",
    alternates: {
      canonical: `/create?mode=${FIXED_MOMENT_MODE}&effect=${FIXED_MOMENT_EFFECT}`,
    },
    robots: CONCEPT_ROBOTS,
  };
}

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{
    effect?: string;
    mode?: string;
    source?: string;
    channel?: string;
    ratio?: string;
    duration?: string;
    model?: string;
    resolution?: string;
    prompt?: string;
    /** One-click first-run sample: orbit | moon | scout | beatbot */
    sample?: string;
    try?: string;
    job?: string;
    sku?: string;
    retryJobId?: string;
    retryToken?: string;
    /** Truthful device-local Moment preview; never enters generation by itself. */
    moment?: string | string[];
  }>;
}) {
  const sp = await searchParams;

  // A present Moment query is a fail-closed product surface. It never falls
  // through to the generic Studio or Seller Pack routes.
  if (sp.moment !== undefined) {
    const momentId = Array.isArray(sp.moment) ? null : parseMomentId(sp.moment);
    if (!momentId) return <InvalidMomentNotice />;
    return <MomentCreatePreview moment={getMoment(momentId)} />;
  }

  const firstRunSample =
    sp.sample ||
    (sp.try === "1" || sp.try === "true" ? "scout" : undefined);

  const contract = resolveCreateRouteContract(sp);

  // Generate→360 and other registered remix deep links: honest workbench.
  // Do not wrap in GuestMomentCreateGate (Street Power-Up sample). Omit the
  // fixed Moment prop so CreateStudio uses remix effect/ratio/duration/channel.
  if (contract === "generate-workbench") {
    const effectSlug = (sp.effect || "").trim();
    const preset = getPreset(effectSlug);
    const is360 = isGenerate360Effect(effectSlug);
    return (
      <div
        className="relative min-h-screen overflow-hidden bg-[var(--void)] pb-24 text-[var(--cream)]"
        data-create-contract="generate-workbench"
        data-generate-effect={effectSlug}
        data-generate-360={is360 ? "true" : "false"}
      >
        <JsonLd
          data={softwareApplicationJsonLd({
            name: `${site.name} Generate — ${preset?.name ?? "Toy Creative Director"}`,
            url: `${site.url}/create`,
            description:
              preset?.seoDescription ??
              "Upload a designer-toy photo you own, pick a commercial goal, and preview a cached recipe. Eligible Live access and the exact quote are checked before submission.",
          })}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(50%_80%_at_12%_0%,rgba(177,78,255,0.18),transparent_70%),radial-gradient(40%_60%_at_88%_0%,rgba(0,217,255,0.12),transparent_65%)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-[1480px] gap-4 border-b border-white/10 px-5 py-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:px-12">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00D9FF]">
              {is360
                ? "Pikbo Generate · 360° listing spin"
                : "Pikbo Generate · workbench"}
            </p>
            <h1 className="mt-2 max-w-4xl font-display text-[clamp(2.45rem,4.2vw,4.5rem)] font-black leading-[0.9] tracking-[-0.06em] text-bling">
              {preset?.h1 ??
                (is360
                  ? "One photo → a square 360° listing spin."
                  : "One owned toy photo → a short product clip.")}
            </h1>
          </div>
          <p className="border-l border-white/15 pl-4 text-sm font-semibold leading-6 text-white/56">
            {preset?.tagline ??
              "Remix recipe, ratio, and channel from your deep link. Lab preview is free; private Live is checked before any credit spend."}
          </p>
        </div>
        <Suspense
          fallback={
            <div className="flex min-h-[40vh] items-center justify-center text-sm text-white/40">
              Loading Generate…
            </div>
          }
        >
          <CreateStudio
            initialEffect={effectSlug}
            initialModel={sp.model}
            initialResolution={sp.resolution}
            initialMode="i2v"
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
        <CreateSeoFooter effectSlug={effectSlug} />
      </div>
    );
  }

  // Fixed Moment path: mode=moment, bare street-power-up, default /create,
  // and unknown effects. AIT-140 coerce (when present) funnels bare
  // street-power-up into mode=moment; this branch stays the product home.
  return (
    <GuestMomentCreateGate>
      <div
        className="relative min-h-screen overflow-hidden bg-[var(--void)] pb-24 text-[var(--cream)]"
        data-create-contract="fixed-moment"
        data-fixed-moment-effect={FIXED_MOMENT_EFFECT}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(50%_80%_at_12%_0%,rgba(177,78,255,0.22),transparent_70%),radial-gradient(40%_60%_at_88%_0%,rgba(255,78,205,0.16),transparent_65%)]"
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-[1480px] gap-4 border-b border-[#FF4ECD]/15 px-5 py-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:px-12">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF4ECD]">
              Pikbo Moment · private render
            </p>
            <h1 className="mt-2 max-w-4xl font-display text-[clamp(2.45rem,4.2vw,4.5rem)] font-black leading-[0.9] tracking-[-0.06em] text-bling">
              Turn one toy photo into Street Power-Up.
            </h1>
          </div>
          <p className="border-l border-[#B14EFF]/50 pl-4 text-sm font-semibold leading-6 text-white/56">
            One fixed 9:16 · 5s · 720p video. Upload privately, pay 10
            credits only when it completes, then recover and download it from
            Library.
          </p>
        </div>
        <CreateStudio
          initialEffect="street-power-up"
          initialMode="i2v"
          initialSource={sp.source}
          initialRatio="9:16"
          initialDuration="5"
          initialChannel={sp.channel}
          initialSample={firstRunSample}
          initialJob={sp.job}
          initialSku={sp.sku}
          initialRetryJobId={sp.retryJobId}
          initialRetryToken={sp.retryToken}
          fixedMomentContract
        />
      </div>
    </GuestMomentCreateGate>
  );
}
