import type { Metadata } from "next";
import { HomeCinemaHero } from "@/components/HomeCinemaHero";
import { HomeTrustFooter } from "@/components/HomeTrustFooter";
import { JsonLd } from "@/components/JsonLd";
import {
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/jsonLd";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: site.titleDefault },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: site.titleDefault,
    description: site.description,
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
    description: site.description,
    images: [site.socialImages.twitter],
  },
};

export default function Home() {
  const lcpPoster = "/moments/capsule-reveal.jpg";

  return (
    <>
      <link rel="preload" as="image" href={lcpPoster} fetchPriority="high" />
      <JsonLd
        data={[
          websiteJsonLd(),
          organizationJsonLd(),
        ]}
      />

      <HomeCinemaHero />
      <HomeTrustFooter />
    </>
  );
}
