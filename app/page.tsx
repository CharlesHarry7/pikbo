import type { Metadata } from "next";
import { HomeCinemaHero } from "@/components/HomeCinemaHero";
import { HomeTrustFooter } from "@/components/HomeTrustFooter";
import { JsonLd } from "@/components/JsonLd";
import {
  organizationJsonLd,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from "@/lib/jsonLd";
import { pageSocialMeta } from "@/lib/pageMeta";
import { site } from "@/lib/site";

const HOME_DESCRIPTION =
  "Preview one Street Power-Up Moment for designer toys. Pikbo's public sample is cached and costs 0 credits; invited private beta sellers can submit one owned toy photo for one private result.";

export const metadata: Metadata = {
  title: { absolute: site.titleDefault },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  ...pageSocialMeta({
    title: site.titleDefault,
    description: HOME_DESCRIPTION,
    path: "/",
  }),
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
          softwareApplicationJsonLd({
            name: `${site.name} — Street Power-Up Moment`,
            description: HOME_DESCRIPTION,
            url: site.url,
          }),
        ]}
      />

      <HomeCinemaHero />
      <HomeTrustFooter />
    </>
  );
}
