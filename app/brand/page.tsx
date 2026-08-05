import type { Metadata } from "next";
import { BrandKit } from "@/components/BrandKit";

export const metadata: Metadata = {
  title: "Brand kit",
  description:
    "Pikbo collectible design tokens — palette, type, cards, and motion.",
  robots: {
    index: false,
    follow: false,
  },
};

/** Alias of /dev/design-system for easier internal linking. */
export default function BrandPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <BrandKit />
    </main>
  );
}
