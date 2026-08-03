import type { Metadata } from "next";
import { HomeCinemaHero } from "@/components/HomeCinemaHero";
import { HomeTrustFooter } from "@/components/HomeTrustFooter";
import { JsonLd } from "@/components/JsonLd";
import {
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/jsonLd";
import { site } from "@/lib/site";

const HOME_DESCRIPTION =
  "Preview one Street Power-Up Moment for designer toys. Pikbo's public sample is cached and costs 0 credits; invited private beta sellers can submit one owned toy photo for one private result.";

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
      <HomeTrustFooter />
    </>
  );
}
