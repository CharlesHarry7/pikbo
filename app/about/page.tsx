import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { CONCEPT_ROBOTS } from "@/lib/seoIndex";
import { FreeTrialCta } from "@/components/FreeTrialCta";

/**
 * Trust / E-E-A-T surface — short, honest, no fake team headcount.
 * Cold-start: noindex (follow) so crawl budget stays on rank URLs.
 */
export const metadata: Metadata = {
  title: { absolute: `About ${site.name} · Designer-toy AI video` },
  description:
    "Pikbo is a designer-toy AI video suite: turn photos of figures you own into listing, reveal, and social clips. Soft launch honesty — Free Mini caps, no fake multi-model zoo.",
  alternates: { canonical: "/about" },
  robots: CONCEPT_ROBOTS,
  openGraph: {
    title: `About ${site.name}`,
    description:
      "Toy-vertical photo → short video for sellers and collectors. Owned photos only.",
    url: `${site.url}/about`,
  },
};

export default function AboutPage() {
  return (
    <div className="bg-black text-white">
      <div className="container-x max-w-3xl py-12 sm:py-16">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mint)]">
          About
        </p>
        <h1 className="mt-2 font-display text-3xl font-black tracking-tight sm:text-4xl">
          Designer-toy AI video — not a generic model zoo
        </h1>
        <p className="mt-4 text-base leading-relaxed text-white/60">
          {site.name} ({site.domain}) helps collectors and sellers turn{" "}
          <strong className="text-white/85">photos of toys they own</strong> into
          short clips for listings, drops, and social. Soft launch runs a
          constrained Free Mini path with honest caps — not unlimited free 4K
          and not fake multi-model live labels.
        </p>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-bold text-white">What we optimize for</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-white/55">
            <li>Toy identity: paint, sculpt, and packaging stay the reference</li>
            <li>
              Commercial jobs: 360 listing spin, blind-box reveal, social hook,
              Seller Starter Pack
            </li>
            <li>
              Rights: live jobs require confirming you own the photo / rights
            </li>
            <li>
              Ledger honesty: confirmed failures restore credits; cancel/timeout
              may stay unconfirmed
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-bold text-white">What we will not claim</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-white/55">
            <li>Guaranteed sales, rankings, or viral reach</li>
            <li>Live models that are not actually wired (those stay Soon)</li>
            <li>Customer UGC we do not have — Lab examples are cached Lab prototype demos</li>
            <li>Franchise IP cloning from packaging you do not control</li>
          </ul>
        </section>

        <section className="mt-10 space-y-3">
          <h2 className="text-lg font-bold text-white">Start here</h2>
          <div className="flex flex-wrap gap-2">
            <FreeTrialCta
              path="/about"
              variant="primary"
              labelTry="Try Free Mini"
              className="rounded-full bg-[#c8ff3d] px-4 py-2 text-xs font-black text-black"
            />
            <Link
              href="/tools/ai-toy-video-generator"
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white/80"
            >
              AI toy video generator
            </Link>
            <Link
              href="/create?mode=seller-pack"
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/55"
            >
              Seller Starter Pack
            </Link>
            <Link
              href="/guides/designer-toy-ai-video-vs-generic-tools"
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/55"
            >
              Why toy-vertical
            </Link>
          </div>
        </section>

        <p className="mt-12 text-xs leading-relaxed text-white/35">
          Contact for product questions: use in-app support paths when available.
          Privacy:{" "}
          <Link href="/privacy" className="text-white/50 underline">
            /privacy
          </Link>
          . Terms:{" "}
          <Link href="/terms" className="text-white/50 underline">
            /terms
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
