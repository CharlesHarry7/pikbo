import type { Metadata } from "next";
import Link from "next/link";
import { HomeViralWall } from "@/components/HomeViralWall";
import { HfProductRail } from "@/components/HfProductRail";
import { HomeTrustFooter } from "@/components/HomeTrustFooter";
import { JsonLd } from "@/components/JsonLd";
import {
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/jsonLd";
import { site } from "@/lib/site";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { MOMENT_CREATE_HREF } from "@/lib/softLaunch";
import { createGenerate360Href } from "@/lib/jobIntents";

const HOME_DESCRIPTION =
  "AI video for designer toys — turn one toy photo into a short product video. Free previews, private create when ready.";

export const metadata: Metadata = {
  title: { absolute: site.titleDefault },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: site.titleDefault,
    description: HOME_DESCRIPTION,
    url: site.url,
    siteName: site.name,
    type: "website",
    images: [
      {
        url: site.socialImages.openGraph,
        width: site.socialImages.width,
        height: site.socialImages.height,
        alt: site.socialImages.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: site.titleDefault,
    description: HOME_DESCRIPTION,
    images: [site.socialImages.twitter],
  },
};

const SHOWCASE_ITEMS = DEMO_VIDEOS.slice(0, 6);

export default function Home() {
  return (
    <div className="bg-[var(--bg)] text-[var(--fg)]">
      <JsonLd
        data={[
          { ...websiteJsonLd(), description: HOME_DESCRIPTION },
          { ...organizationJsonLd(), description: HOME_DESCRIPTION },
        ]}
      />

      {/* === Hero carousel (like Higgsfield top cards) === */}
      <section className="border-b border-[var(--border)] bg-white px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">
              AI video for designer toys
            </p>
            <h1 className="font-display text-[clamp(2rem,5vw,3.5rem)] font-black leading-[0.92] tracking-[-0.04em] text-[var(--fg)]">
              Turn one toy photo
              <br />
              <span className="text-[var(--brand)]">into listing motion.</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[var(--fg-muted)]">
              Upload a photo of your designer toy, pick a style, and get a short product video. Free previews, private create when ready.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={createGenerate360Href("home-hero")}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--grad-cta)] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[rgba(255,78,205,0.25)] transition hover:scale-105 active:scale-95"
              >
                Generate 360° listing spin
              </Link>
              <Link
                href={`${MOMENT_CREATE_HREF}&source=home-hero`}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-6 py-3 text-sm font-semibold text-[var(--fg)] shadow-sm transition hover:shadow-md hover:border-[var(--brand)]/30"
              >
                Create with my toy
              </Link>
            </div>
          </div>

          {/* Horizontal scroll showcase cards - like Higgsfield hero */}
          <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SHOWCASE_ITEMS.map((demo) => (
              <Link
                key={demo.id}
                href={createGenerate360Href("home-showcase")}
                className="group relative h-48 w-72 shrink-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm transition hover:shadow-md hover:-translate-y-1"
              >
                <img
                  src={demo.poster}
                  alt={demo.title}
                  className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-sm font-bold text-white">{demo.title}</p>
                  <p className="text-xs text-white/60">{demo.eyebrow}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* === Product grid (like Higgsfield product cards) === */}
      <HfProductRail />

      {/* === Banner: Get Started (like Higgsfield banners) === */}
      <section className="border-y border-[var(--border)] bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#FF4ECD] via-[#B14EFF] to-[#00D9FF] p-8 text-center shadow-lg sm:p-12">
            <h2 className="font-display text-2xl font-black text-white sm:text-3xl">
              Street Power-Up Moment
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/80">
              One fixed 9:16 · 5s · 720p video. Upload privately, pay only when it completes.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`${MOMENT_CREATE_HREF}&source=home-banner`}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[var(--fg)] shadow-lg transition hover:scale-105 active:scale-95"
              >
                Create a Moment
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                View plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* === Toy Presets wall (like Higgsfield Viral Presets grid) === */}
      <HomeViralWall />

      {/* === CTA section === */}
      <section className="border-t border-[var(--border)] bg-white px-4 py-14 text-center sm:px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-2xl font-black text-[var(--fg)] sm:text-3xl">
            Ready to create your own?
          </h2>
          <p className="mt-3 text-sm text-[var(--fg-muted)]">
            Start with a free Lab preview, then upgrade to private beta for full-resolution downloads.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={createGenerate360Href("home-cta")}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--grad-cta)] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[rgba(255,78,205,0.25)] transition hover:scale-105 active:scale-95"
            >
              Generate 360°
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-6 py-3 text-sm font-semibold text-[var(--fg)] shadow-sm transition hover:shadow-md hover:border-[var(--brand)]/30"
            >
              View plans
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Art toy · vinyl", emoji: "🧸" },
            { label: "Blind box", emoji: "🎁" },
            { label: "Mecha kit", emoji: "🤖" },
            { label: "Plush · sofubi", emoji: "🧵" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-[var(--border)] bg-white p-4 text-center shadow-sm transition hover:shadow-md hover:border-[var(--brand)]/20"
            >
              <span className="text-2xl">{item.emoji}</span>
              <p className="mt-1 text-xs font-semibold text-[var(--fg-muted)]">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <HomeTrustFooter />
    </div>
  );
}