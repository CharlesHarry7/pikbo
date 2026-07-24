import type { Metadata } from "next";
import { PRIVATE_ROBOTS } from "@/lib/seoIndex";

export const metadata: Metadata = {
  title: "Settings",
  description: "Device data and Pikbo session settings.",
  robots: PRIVATE_ROBOTS,
};

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
