import { redirect } from "next/navigation";

/**
 * Frozen for launch (AIT-17 / CURRENT_LAUNCH_CONTRACT).
 * Covers `/effects` and `/effects/[slug]`. Page implementations retained.
 */
export default function EffectsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  void children;
  redirect("/");
}
