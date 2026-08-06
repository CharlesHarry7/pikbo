import type { Metadata } from "next";
import { HomeCinemaHero } from "@/components/HomeCinemaHero";
import { HomeDesignerGallery } from "@/components/HomeDesignerGallery";
import { HomeExploreRecipeRail } from "@/components/HomeExploreRecipeRail";
import { HomeTrustFooter } from "@/components/HomeTrustFooter";
import { JsonLd } from "@/components/JsonLd";
import {
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/jsonLd";
import { site } from "@/lib/site";
import { buildHomeShowcaseFeed } from "@/lib/videoFeed";

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
 * Gallery-calm home + thin Lab density (AIT-449):
 * - Hero: one primary Generate→360 + Moment secondary, honest Lab/Live copy
 * - Thin Explore recipe rail (Lab cache only — not carnival multi-rail)
 * - Designer-toy still gallery + trust
 * - No Community UGC, Cinema expansion, batch tools, or model marketplace
 */
export default function Home() {
  const lcpPoster = "/style-studies/art-vinyl-guardian-v1.jpg";
  const proofRail = buildHomeShowcaseFeed();

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
      <HomeExploreRecipeRail items={proofRail} />
      <HomeDesignerGallery />
      <HomeTrustFooter />
    </>
  );
}
