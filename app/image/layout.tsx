import type { Metadata } from "next";
import { site } from "@/lib/site";
import { PREVIEW_ROBOTS } from "@/lib/seoIndex";

export const metadata: Metadata = {
  title: "Still studio · Preview",
  description:
    "Flux stills workspace for toy product photos. Device-local history — not indexed.",
  robots: PREVIEW_ROBOTS,
  alternates: { canonical: `${site.url}/image` },
};

export default function ImageLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
