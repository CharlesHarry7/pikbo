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
import {
  InvalidMomentNotice,
  MomentCreatePreview,
} from "@/components/MomentCreatePreview";
import { getMoment, parseMomentId } from "@/lib/moments";
import { PrivateSellerPackGate } from "@/components/PrivateSellerPackGate";

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
      title: { absolute: moment ? `${getMoment(moment).name} | ${site.name}` : `Moment unavailable | ${site.name}` },
      description: moment
        ? `Place your owned toy into Pikbo's ${getMoment(moment).name} local composition preview. No upload or generation occurs in the public preview.`
        : "Choose one of Pikbo's published toy Moments. Invalid Moment links do not upload or generate anything.",
      alternates: { canonical: "/create" },
      robots: CONCEPT_ROBOTS,
    };
  }
  // Cold-start: /create is the product tool but not a rank landing (home tool is).
  // Keep crawlable + follow for deep links; stay out of the 9-URL index budget.
  if (sp.mode === "seller-pack" || sp.mode === "seller") {
    return {
      title: { absolute: `Private validation | ${site.name}` },
      description:
        "Private validation workspace for invited Pikbo seller accounts. Public creation starts with one directed toy Moment.",
      alternates: { canonical: "/create?effect=street-power-up" },
      robots: CONCEPT_ROBOTS,
    };
  }
  if (sp.mode === "moment") {
    return {
      title: { absolute: `Street Power-Up · Private Moment | ${site.name}` },
      description:
        "Generate one private 9:16, 5-second, 720p toy launch moment from a photo you own when your invited seller account is enabled.",
      alternates: { canonical: "/create?mode=moment&effect=street-power-up" },
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
    /** Owner-scoped durable Pack selected from Library. */
    recover?: string;
    /** Legacy query retained for redirect compatibility; never opens public Pack UI. */
    preview?: string;
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
  const recoverPackRunId =
    typeof sp.recover === "string" && /^[0-9a-f-]{36}$/i.test(sp.recover)
      ? sp.recover
      : undefined;

  // Wave A: Seller Pack is a Create mode, not a separate suite door.
  if (sp.mode === "seller-pack" || sp.mode === "seller") {
    return (
      <PrivateSellerPackGate>
        <div className="min-h-screen bg-[#EEF0F4] pb-28 text-[#111827] lg:pb-12">
          <div className="border-b border-[#C9CED8] bg-[#EEF0F4] px-4 py-5 sm:px-8 sm:py-8">
            <div className="mx-auto grid max-w-[1480px] gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2457E6]">
                  Pikbo Launch Workspace
                </p>
                <h1 className="mt-2 max-w-4xl font-display text-[clamp(2.35rem,5vw,5.25rem)] font-black leading-[0.92] tracking-[-0.06em]">
                  Prepare a private Launch Pack.
                </h1>
              </div>
              <div className="border-l-2 border-[#2457E6] pl-4">
                <p className="text-sm font-semibold leading-6 text-[#626B78]">
                  This validation workspace is limited to eligible signed-in
                  sellers. Public creation uses one selected Moment instead.
                </p>
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#E85C45]">
                  Access is confirmed before any private asset or credit action
                </p>
              </div>
            </div>
          </div>

          <div
            className="mx-auto max-w-[1480px] px-3 sm:px-8"
            data-launch-pack-workbench
          >
            <BatchStudio
              pack="seller"
              initialSku={sp.sku}
              initialSample={firstRunSample}
              initialRecoverPackRunId={recoverPackRunId}
            />
          </div>
        </div>
      </PrivateSellerPackGate>
    );
  }

  // First real Moment contract: one owned toy photo → one private 5s clip.
  // This intentionally uses the existing CreateStudio/live gate instead of
  // creating a second generation system. Founding Studio still starts from
  // the fixed three-video Launch Pack; invited validation accounts use this
  // single-moment path for the first quality check.
  if (sp.mode === "moment") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] pb-24 text-[#F7F4ED]">
        <div className="mx-auto grid max-w-[1480px] gap-4 border-b border-white/10 px-5 py-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:px-12">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CBFF3D]">
              Pikbo Moment · private render
            </p>
            <h1 className="mt-2 max-w-4xl font-display text-[clamp(2.45rem,4.2vw,4.5rem)] font-black leading-[0.9] tracking-[-0.06em]">
              Turn one toy photo into Street Power-Up.
            </h1>
          </div>
          <p className="border-l border-[#CBFF3D]/35 pl-4 text-sm font-semibold leading-6 text-white/56">
            One fixed 9:16 · 5s · 720p Moment. Invited sellers upload privately,
            spend 10 credits only on completion, then download from Library.
          </p>
        </div>
        <CreateStudio
          initialEffect="street-power-up"
          initialModel={sp.model}
          initialResolution={sp.resolution}
          initialMode="i2v"
          initialPrompt={sp.prompt}
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
