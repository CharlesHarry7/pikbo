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
  // Mobile header is compact (≤640px) so Studio upload stays above the fold;
  // desktop keeps the denser title + contract band.
  return (
    <GuestMomentCreateGate>
      <div className="relative min-h-screen overflow-hidden bg-[var(--void)] pb-24 text-[var(--cream)]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(50%_80%_at_12%_0%,rgba(177,78,255,0.22),transparent_70%),radial-gradient(40%_60%_at_88%_0%,rgba(255,78,205,0.16),transparent_65%)] sm:h-72"
          aria-hidden
        />
        <header
          data-create-header="compact-mobile"
          className="relative mx-auto grid max-w-[1480px] gap-1.5 border-b border-[#FF4ECD]/15 px-4 py-2.5 sm:gap-4 sm:px-8 sm:py-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:px-12"
        >
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#FF4ECD] sm:text-[10px] sm:tracking-[0.2em]">
              Pikbo Moment · private render
            </p>
            <h1 className="mt-1 max-w-4xl font-display text-[1.55rem] font-black leading-[0.95] tracking-[-0.04em] text-bling sm:mt-2 sm:text-[clamp(2.45rem,4.2vw,4.5rem)] sm:leading-[0.9] sm:tracking-[-0.06em]">
              Turn one toy photo into Street Power-Up.
            </h1>
          </div>
          <p className="border-l border-[#B14EFF]/50 pl-3 text-[11px] font-semibold leading-snug text-white/56 sm:pl-4 sm:text-sm sm:leading-6">
            <span className="sm:hidden">
              9:16 · 5s · 720p · 10 credits · private · Library download
            </span>
            <span className="hidden sm:inline">
              One fixed 9:16 · 5s · 720p video. Upload privately, pay 10
              credits only when it completes, then recover and download it from
              Library.
            </span>
          </p>
        </header>
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
