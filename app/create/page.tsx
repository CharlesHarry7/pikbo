import type { Metadata } from "next";
import { CreateStudio } from "@/components/CreateStudio";
import { site } from "@/lib/site";
import { CONCEPT_ROBOTS } from "@/lib/seoIndex";
import {
  InvalidMomentNotice,
  MomentCreatePreview,
} from "@/components/MomentCreatePreview";
import { GuestMomentCreateGate } from "@/components/GuestMomentCreateGate";
import { fixedMomentCreateReturnPath } from "@/lib/clientAssets";
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
    /**
     * Durable Library same-photo handoff (`?assetId=` UUID).
     * CreateStudio auto-selects only after owner-ready recent-list proof.
     */
    assetId?: string;
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
  // Preserve durable Library same-photo handoff across guest sign-in / Magic Link.
  // Without this, an expired session on /create?assetId=… forced re-upload.
  const guestSignInNextPath = fixedMomentCreateReturnPath({
    source: sp.source || (sp.assetId ? "library" : "guest-create"),
    assetId: sp.assetId,
  });
  // MVP cut: every public or invited Create entry resolves to the one real,
  // fixed product contract. Legacy Seller Pack and generic Studio query links
  // remain harmless deep links, but no longer expose alternate product UIs.
  return (
    <GuestMomentCreateGate signInNextPath={guestSignInNextPath}>
      <div className="relative min-h-screen overflow-hidden bg-[var(--void)] pb-24 text-[var(--cream)]">
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
          initialAssetId={sp.assetId}
          fixedMomentContract
        />
      </div>
    </GuestMomentCreateGate>
  );
}
