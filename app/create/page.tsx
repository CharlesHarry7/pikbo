import type { Metadata } from "next";
import { CreateStudio } from "@/components/CreateStudio";
import { site } from "@/lib/site";
import { CONCEPT_ROBOTS } from "@/lib/seoIndex";
import {
  InvalidMomentNotice,
  MomentCreatePreview,
} from "@/components/MomentCreatePreview";
import { GuestMomentCreateGate } from "@/components/GuestMomentCreateGate";
import { getMoment, parseMomentId } from "@/lib/moments";

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
  return {
    title: { absolute: `Street Power-Up · Private Moment | ${site.name}` },
    description:
      "Preview Pikbo's cached Street Power-Up sample, then request the owner-only private beta path.",
    alternates: { canonical: "/create?mode=moment&effect=street-power-up" },
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
  // MVP cut: every public or invited Create entry resolves to the one real,
  // fixed product contract. Legacy Seller Pack and generic Studio query links
  // remain harmless deep links, but no longer expose alternate product UIs.
  return (
    <GuestMomentCreateGate>
      <div className="create-ritual min-h-screen pb-24 text-[var(--fg)]">
        <div className="create-ritual-grid" aria-hidden />
        <header className="relative z-[1] mx-auto max-w-[1480px] px-5 py-5 sm:px-8 lg:px-12">
          <div className="collection-card toy-sticker-enter grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:items-end">
            <span className="toy-corner-mark toy-corner-mark-tl" aria-hidden />
            <span className="toy-corner-mark toy-corner-mark-br" aria-hidden />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="toy-sticker toy-sticker-lime">
                  Pikbo Moment
                </span>
                <span className="toy-sticker toy-sticker-grape">
                  Private render
                </span>
                <span className="toy-sticker toy-sticker-outline">
                  Owner photo only
                </span>
              </div>
              <h1 className="mt-4 max-w-4xl font-display text-[clamp(2.35rem,4vw,4.25rem)] font-black leading-[0.9] tracking-[-0.06em]">
                Turn one toy photo into{" "}
                <span className="text-grad">Street Power-Up.</span>
              </h1>
            </div>
            <div className="status-card" data-tone="progress">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--aqua)]">
                Fixed contract
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/58">
                One fixed 9:16 · 5s · 720p video. Upload privately, pay 10
                credits only when it completes, then recover and download it
                from Library.
              </p>
            </div>
          </div>
        </header>
        <div className="relative z-[1]">
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
      </div>
    </GuestMomentCreateGate>
  );
}
