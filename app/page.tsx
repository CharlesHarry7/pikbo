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

export default function Home() {
  return (
    <div className="bg-[var(--bg)] text-[var(--fg)]">
      <JsonLd
        data={[
          { ...websiteJsonLd(), description: HOME_DESCRIPTION },
          { ...organizationJsonLd(), description: HOME_DESCRIPTION },
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--border)] px-4 py-20 sm:px-6 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(139,92,246,0.12),transparent)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">
            AI video for designer toys
          </p>
          <h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] font-black leading-[0.92] tracking-[-0.04em] text-white">
            Turn one toy photo
            <br />
            <span className="text-[var(--brand)]">into listing motion.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[var(--fg-muted)] sm:text-base">
            Upload a photo of your designer toy, pick a style, and get a short product video. Built for art toys, blind boxes, vinyl, and plush.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={createGenerate360Href("home-hero")}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[rgba(139,92,246,0.3)] transition hover:scale-105 active:scale-95"
            >
              Generate 360° listing spin
            </Link>
            <Link
              href={`${MOMENT_CREATE_HREF}&source=home-hero`}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/[0.04] px-6 py-3 text-sm font-semibold text-[var(--fg)] transition hover:bg-white/[0.08] hover:border-white/20"
            >
              Create with my toy
            </Link>
          </div>
          <p className="mt-4 text-xs text-[var(--fg-dim)]">
            Lab previews free · private beta when ready
          </p>
        </div>
      </section>

      {/* Product Rail */}
      <HfProductRail />

      {/* Motion Wall */}
      <HomeViralWall />

      {/* CTA */}
      <section className="border-t border-[var(--border)] px-4 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-2xl font-black text-white sm:text-3xl">
            Ready to create your own?
          </h2>
          <p className="mt-3 text-sm text-[var(--fg-muted)]">
            Start with a free Lab preview, then upgrade to private beta for full-resolution downloads.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={createGenerate360Href("home-cta")}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[rgba(139,92,246,0.3)] transition hover:scale-105 active:scale-95"
            >
              Generate 360°
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/[0.04] px-6 py-3 text-sm font-semibold text-[var(--fg)] transition hover:bg-white/[0.08] hover:border-white/20"
            >
              View plans
            </Link>
          </div>
        </div>
      </section>

      <HomeTrustFooter />
    </div>
  );
}
