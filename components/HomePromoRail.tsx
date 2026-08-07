import Link from "next/link";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { createGenerate360Href } from "@/lib/jobIntents";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";
import { createRemixHref } from "@/lib/remixIntent";

/**
 * HF top promo strip — large horizontal feature cards (Hell Grind / Free Mode pattern).
 * Owned Lab media only · original Pikbo 潮玩 framing · no competitor copy/assets.
 */
const PROMO_GENERATE = createGenerate360Href("home-promo-rail");
const PROMO_MOMENT = `${MOMENT_CREATE_HREF}&source=home-promo-rail` as const;

type PromoCard = {
  id: string;
  eyebrow: string;
  title: string;
  sub: string;
  href: string;
  demoIndex: number;
  hot?: boolean;
};

const CARDS: PromoCard[] = [
  {
    id: "moment",
    eyebrow: "Featured",
    title: "Toy Moment",
    sub: "One photo → one directed listing clip",
    href: PROMO_MOMENT,
    demoIndex: 1,
    hot: true,
  },
  {
    id: "seedance",
    eyebrow: "Live engine",
    title: "Seedance Toy Video",
    sub: "Photo to short product motion",
    href: PROMO_GENERATE,
    demoIndex: 4,
    hot: true,
  },
  {
    id: "presets",
    eyebrow: "Viral",
    title: "Preset wall",
    sub: "Packshot · unbox · dance · 360",
    href: "/effects",
    demoIndex: 0,
  },
  {
    id: "lab",
    eyebrow: "Lab free",
    title: "Cached Lab samples",
    sub: "0 credits · not customer results",
    href: createRemixHref("360-spin-showcase", "scout-spin"),
    demoIndex: 4,
  },
  {
    id: "academy",
    eyebrow: "Learn",
    title: "Photo guide",
    sub: "How to shoot toys for AI video",
    href: "/guides/how-to-photograph-toys-for-ai-video",
    demoIndex: 2,
  },
];

export function HomePromoRail() {
  return (
    <section
      data-home-promo-rail="true"
      className="border-b border-white/[0.07] bg-black px-3 py-3 sm:px-4"
      aria-label="Featured"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CARDS.map((card) => {
            const demo = DEMO_VIDEOS[card.demoIndex % DEMO_VIDEOS.length];
            return (
              <Link
                key={card.id}
                href={card.href}
                className={`group relative h-[11.5rem] w-[min(78vw,18.5rem)] shrink-0 overflow-hidden rounded-2xl border sm:h-[13rem] sm:w-[20rem] ${
                  card.hot
                    ? "border-white/20 ring-1 ring-white/10"
                    : "border-white/10"
                }`}
              >
                <AutoPlayVideo
                  poster={demo.poster}
                  webm={demo.webm}
                  mp4={demo.mp4}
                  focusable={false}
                  desktopPlayMode="interaction"
                  lazySources
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/20" />
                <div className="relative z-10 flex h-full flex-col justify-end p-3.5 sm:p-4">
                  <span className="w-fit rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white/70 backdrop-blur">
                    {card.eyebrow}
                  </span>
                  <p className="mt-2 text-[15px] font-black leading-tight text-white sm:text-base">
                    {card.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-white/55">
                    {card.sub}
                  </p>
                  <span className="mt-2 text-[11px] font-bold text-white/80 group-hover:text-[var(--neon-pink)]">
                    Open →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
