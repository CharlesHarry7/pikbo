import type { Metadata } from "next";
import { site } from "@/lib/site";
import { PREVIEW_ROBOTS } from "@/lib/seoIndex";

export const metadata: Metadata = {
  title: "Cinema studio · Preview",
  description:
    "Compose a cinematic prompt for toy photo → video. Preview surface — soft-launch path is Generate.",
  robots: PREVIEW_ROBOTS,
  alternates: { canonical: `${site.url}/cinema` },
};

export default function CinemaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
