import type { Metadata } from "next";
import { HomeCinemaHero } from "@/components/HomeCinemaHero";
import { HomeTrustFooter } from "@/components/HomeTrustFooter";
import { HomeEffectsGrid } from "@/components/HomeSections";
import { HomeCommunityHighlights } from "@/components/HomeSections";
import { HomePricing } from "@/components/HomeSections";
import { JsonLd } from "@/components/JsonLd";
import {
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/jsonLd";
import { site } from "@/lib/site";

const HOME_DESCRIPTION =
  "Pikbo is the AI video platform for designer toys. Turn your collectible figures into stunning videos with 10+ toy-specific effects. Labubu, Dimoo, Skullpanda — bring them to life.";

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
  const lcpPoster = "/demos/beatbot-still.webp";

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
      <HomeEffectsGrid />
      <HomeCommunityHighlights />
      <HomePricing />
      <HomeTrustFooter />
    </>
  );
}
