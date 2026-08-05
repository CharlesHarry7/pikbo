import type { Metadata } from "next";
import { BrandKit } from "@/components/BrandKit";

export const metadata: Metadata = {
  title: "Design system",
  description:
    "Pikbo collectible design tokens — palette, type, cards, and motion.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DesignSystemPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <BrandKit />
    </main>
  );
}
