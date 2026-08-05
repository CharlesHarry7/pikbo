import type { Metadata } from "next";
import { CreateStudio } from "@/components/CreateStudio";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";
import { CONCEPT_ROBOTS } from "@/lib/seoIndex";
import { pageSocialMeta } from "@/lib/pageMeta";
import { softwareApplicationJsonLd } from "@/lib/jsonLd";
import {
  InvalidMomentNotice,
  MomentCreatePreview,
} from "@/components/MomentCreatePreview";
import { GuestMomentCreateGate } from "@/components/GuestMomentCreateGate";
import { getMoment, parseMomentId } from "@/lib/moments";

const CREATE_TITLE = `Street Power-Up · Private Moment | ${site.name}`;
const CREATE_DESCRIPTION =
  "Preview Pikbo's cached Street Power-Up sample, then request the owner-only private beta path.";
const CREATE_CANONICAL = "/create?mode=moment&effect=street-power-up";

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
    const title = moment
      ? `${getMoment(moment).name} | ${site.name}`
      : `Moment unavailable | ${site.name}`;
    const description = moment
      ? `Place your owned toy into Pikbo's ${getMoment(moment).name} local composition preview. No upload or generation occurs in the public preview.`
      : "Choose one of Pikbo's published toy Moments. Invalid Moment links do not upload or generate anything.";
    return {
      title: { absolute: title },
      description,
      alternates: { canonical: "/create" },
      robots: CONCEPT_ROBOTS,
      ...pageSocialMeta({
        title,
        description,
        path: "/create",
        imageAlt: moment
          ? `${getMoment(moment).name} local composition preview`
          : site.socialImages.alt,
      }),
    };
  }
  return {
    title: { absolute: CREATE_TITLE },
    description: CREATE_DESCRIPTION,
    alternates: { canonical: CREATE_CANONICAL },
    robots: CONCEPT_ROBOTS,
    ...pageSocialMeta({
      title: CREATE_TITLE,
      description: CREATE_DESCRIPTION,
      path: CREATE_CANONICAL,
      imageAlt: "Pikbo Street Power-Up private Moment preview",
    }),
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
  const productLd = softwareApplicationJsonLd({
    name: `${site.name} Street Power-Up Moment`,
    description: CREATE_DESCRIPTION,
    url: `${site.url}/create`,
  });

  // A present Moment query is a fail-closed product surface. It never falls
  // through to the generic Studio or Seller Pack routes.
  if (sp.moment !== undefined) {
    const momentId = Array.isArray(sp.moment) ? null : parseMomentId(sp.moment);
    if (!momentId) {
      return (
        <>
          <JsonLd data={productLd} />
          <InvalidMomentNotice />
        </>
      );
    }
    return (
      <>
        <JsonLd data={productLd} />
        <MomentCreatePreview moment={getMoment(momentId)} />
      </>
    );
  }

  const firstRunSample =
    sp.sample ||
    (sp.try === "1" || sp.try === "true" ? "scout" : undefined);
  // MVP cut: every public or invited Create entry resolves to the one real,
  // fixed product contract. Legacy Seller Pack and generic Studio query links
  // remain harmless deep links, but no longer expose alternate product UIs.
  return (
    <>
      <JsonLd data={productLd} />
      <GuestMomentCreateGate>
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
    </>
  );
}
