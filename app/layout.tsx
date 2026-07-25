import type { Metadata } from "next";
import "./globals.css";
import { site } from "@/lib/site";
import { AppShell } from "@/components/AppShell";

/**
 * Network-independent fonts (Phase B).
 * next/font/google was removed so CI/offline builds never hang on fonts.googleapis.com.
 * Stack is system + generic display; premium webfonts can return later as local files.
 */
/** TDH frozen for soft launch — see lib/site.ts + docs/growth/GEFEI_LAUNCH_DECISION_2026-07-24.md */
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.titleDefault,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  keywords: [
    "Pikbo",
    "designer toy AI video",
    "toy photo to video",
    "figure video from photo",
    "photo into short video toys",
  ],
  openGraph: {
    title: site.titleDefault,
    description: site.description,
    url: site.url,
    siteName: site.name,
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: site.titleDefault,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: site.titleDefault,
    description: site.description,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "VkAMHl8YBb45TsKYpX7CWna2cyGRv2gpsYu2j2JHhqc",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" data-scroll-behavior="smooth">
      <body className="min-h-full bg-[var(--bg)] font-sans text-[var(--fg)] antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
