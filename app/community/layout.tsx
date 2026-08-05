import { redirect } from "next/navigation";

/**
 * Frozen for launch (AIT-17 / CURRENT_LAUNCH_CONTRACT).
 * Page implementation retained under `page.tsx` for future reference.
 */
export default function CommunityLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  void children;
  redirect("/");
}
