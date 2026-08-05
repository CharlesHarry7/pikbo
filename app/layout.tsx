import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { site } from "@/lib/site";
import { AppShell } from "@/components/AppShell";

/**
 * AIT-30/31 toy faces via next/font/local (offline-safe; no fonts.googleapis.com).
 * Display = collection-label geometry (Plus Jakarta Sans); body = DM Sans.
 */
const fontDisplay = localFont({
  src: [
    {
      path: "../public/fonts/PlusJakartaSans-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/PlusJakartaSans-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-display",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const fontSans = localFont({
  src: [
    {
      path: "../public/fonts/DMSans-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/DMSans-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/DMSans-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/DMSans-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

/** TDH frozen for soft launch — see lib/site.ts + docs/growth/GEFEI_LAUNCH_DECISION_2026-07-24.md */
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.titleDefault,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: {
    title: site.titleDefault,
    description: site.description,
    url: site.url,
    siteName: site.name,
    type: "website",
    images: [
      {
        url: site.socialImages.openGraph,
        width: site.socialImages.width,
        height: site.socialImages.height,
        alt: site.socialImages.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: site.titleDefault,
    description: site.description,
    images: [site.socialImages.twitter],
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
    <html
      lang="en"
      className={`h-full ${fontDisplay.variable} ${fontSans.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full bg-[var(--bg)] font-sans text-[var(--fg)] antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
