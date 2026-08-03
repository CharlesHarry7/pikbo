import Link from "next/link";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { createRemixHref } from "@/lib/remixIntent";

/**
 * Higgsfield-class top campaign cards — horizontal promo strip.
 * Toy-vertical only; no fake multi-model or invented social proof.
 */
const GENERATE = createRemixHref("360-spin-showcase");

const CAMPAIGNS = [
  {
    id: "free-lab",
    eyebrow: "Free",
    title: "Toy video Lab",
    body: "Watch 8 designer-toy recipes free. Sign in to generate with your figure.",
    cta: "Open Generate",
    href: GENERATE,
    accent: true,
    poster: DEMO_VIDEOS[0]?.poster,
  },
  {
    id: "seedance",
    eyebrow: "Flagship",
    title: "Seedance Video",
    body: "Photo → short listing / TikTok clip. One live engine for toys.",
    cta: "Generate video",
    href: GENERATE,
    accent: false,
    poster: DEMO_VIDEOS[1]?.poster || DEMO_VIDEOS[0]?.poster,
  },
  {
    id: "presets",
    eyebrow: "Presets",
    title: "Viral toy presets",
    body: "Spin, unbox, float, shelf — one tap remake paths.",
    cta: "Browse presets",
    href: "/effects",
    accent: false,
    poster: DEMO_VIDEOS[2]?.poster || DEMO_VIDEOS[0]?.poster,
  },
  {
    id: "modules",
    eyebrow: "Jobs",
    title: "Seller modules",
    body: "Fixed video jobs for drops and listings.",
    cta: "Open modules",
    href: "/modules",
    accent: false,
    poster: DEMO_VIDEOS[3]?.poster || DEMO_VIDEOS[0]?.poster,
  },
  {
    id: "community",
    eyebrow: "Community",
    title: "Inside every project",
    body: "Browse Lab prototypes — remix a recipe onto your toy.",
    cta: "Open community",
    href: "/community",
    accent: false,
    poster: DEMO_VIDEOS[4]?.poster || DEMO_VIDEOS[0]?.poster,
  },
] as const;

export function HfPromoCampaignStrip() {
  return (
    <section
      aria-label="Pikbo campaign doors"
      className="border-b border-white/10 bg-black px-3 py-5 sm:px-5"
      data-hf-promo="campaign-strip"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c8ff3d]">
              Designer-toy creative suite
            </p>
            <p className="mt-1 text-sm font-semibold text-white/55">
              Same OS shape as a full AI video stack — built for figures, blind
              boxes, and shelf drops.
            </p>
          </div>
          <Link
            href={GENERATE}
            className="hidden shrink-0 rounded-full bg-[#c8ff3d] px-4 py-2 text-[11px] font-black text-black sm:inline-flex"
          >
            Generate →
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CAMPAIGNS.map((card) => (
            <Link
              key={card.id}
              href={card.href}
              className={`group relative h-[11.5rem] w-[15.5rem] shrink-0 overflow-hidden rounded-2xl border p-4 transition duration-300 hover:-translate-y-0.5 sm:h-[12.5rem] sm:w-[17rem] ${
                card.accent
                  ? "border-[#c8ff3d]/50 bg-[#c8ff3d]/[0.1] shadow-[0_0_36px_rgba(200,255,61,0.12)]"
                  : "border-white/10 bg-white/[0.03] hover:border-[#c8ff3d]/35"
              }`}
            >
              {card.poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.poster}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-35 transition duration-500 group-hover:scale-105 group-hover:opacity-45"
                  loading="lazy"
                  decoding="async"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
              <div className="relative z-10 flex h-full flex-col">
                <span
                  className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                    card.accent
                      ? "bg-[#c8ff3d] text-black"
                      : "border border-white/20 bg-black/50 text-[#c8ff3d]"
                  }`}
                >
                  {card.eyebrow}
                </span>
                <p className="mt-2 text-[15px] font-black leading-tight text-white sm:text-base">
                  {card.title}
                </p>
                <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-white/60">
                  {card.body}
                </p>
                <span className="mt-auto pt-3 text-[11px] font-black text-[#c8ff3d]">
                  {card.cta} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
