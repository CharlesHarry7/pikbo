import type { Metadata } from "next";
import { HomeBrowseCta } from "@/components/HomeBrowseCta";
import { HomeCinemaHero } from "@/components/HomeCinemaHero";
import { HomeDesignerGallery } from "@/components/HomeDesignerGallery";
import { HomeTrustFooter } from "@/components/HomeTrustFooter";
import { JsonLd } from "@/components/JsonLd";
import {
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/jsonLd";
import { site } from "@/lib/site";

const HOME_DESCRIPTION =
  "AI product video for designer toys and 潮玩 — art toys, blind boxes, vinyl, mecha kits, and plush. One photo to directed listing motion. Private creation when you are ready.";

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

/**
 * Gallery-calm home (boss feedback):
 * - One hero + one designer-toy still gallery + trust
 * - Floating Generate→360 door below the fold (HomeBrowseCta)
 * - No multi-rail stack, no carnival neon, no cartoon demo wall
 */
export default function Home() {
  const lcpPoster = "/style-studies/art-vinyl-guardian-v1.jpg";

  return (
    <>
      <link rel="preload" as="image" href={lcpPoster} fetchPriority="high" />
      <JsonLd
        data={[
          { ...websiteJsonLd(), description: HOME_DESCRIPTION },
          { ...organizationJsonLd(), description: HOME_DESCRIPTION },
        ]}
      />

      <HomeCinemaHero />
      {/* Last gallery folds clear floating Generate + home indicator */}
      <div
        className="pb-[var(--home-browse-cta-pad)] lg:pb-0"
        data-home-content-pad="home-browse-cta"
      >
        <HomeDesignerGallery />
      </div>
      {/* AIT-438: calm floating Generate→360 while browsing the shelf */}
      <HomeBrowseCta />
      <HomeTrustFooter />
    </>
  );
}
