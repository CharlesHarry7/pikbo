import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { site } from "@/lib/site";
import { PREVIEW_ROBOTS } from "@/lib/seoIndex";

export const metadata: Metadata = {
  title: "Cinema studio · Preview",
  description:
    "Compose a cinematic prompt for toy photo → video. Preview surface — soft-launch path is Generate.",
  robots: PREVIEW_ROBOTS,
  alternates: { canonical: `${site.url}/cinema` },
};

/**
 * Frozen for launch (AIT-17 / CURRENT_LAUNCH_CONTRACT).
 * Page implementation retained under `page.tsx` for future reference.
 */
export default function CinemaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  void children;
  redirect("/");
}
