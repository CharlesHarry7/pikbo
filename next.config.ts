import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    // G4: broken short slugs / roast evidence → real /for/* pages (200)
    return [
      {
        source: "/for/etsy-sellers",
        destination: "/for/etsy-listing-videos",
        permanent: true,
      },
      {
        source: "/for/etsy",
        destination: "/for/etsy-listing-videos",
        permanent: true,
      },
      {
        source: "/for/tiktok-shop",
        destination: "/for/tiktok-shop-product-videos",
        permanent: true,
      },
      {
        source: "/for/tiktok",
        destination: "/for/tiktok-shop-product-videos",
        permanent: true,
      },
      {
        source: "/for/amazon",
        destination: "/for/amazon-product-videos",
        permanent: true,
      },
      {
        source: "/for/amazon-sellers",
        destination: "/for/amazon-product-videos",
        permanent: true,
      },
      {
        source: "/for/instagram",
        destination: "/for/instagram-reels-for-collectors",
        permanent: true,
      },
      {
        source: "/for/collectors",
        destination: "/for/instagram-reels-for-collectors",
        permanent: true,
      },
      {
        source: "/for/blind-box",
        destination: "/for/blind-box-brand-marketing",
        permanent: true,
      },
      {
        source: "/for/whatnot",
        destination: "/for/whatnot-live-selling",
        permanent: true,
      },
      {
        source: "/for/depop",
        destination: "/for/depop-shop-videos",
        permanent: true,
      },
      // SEO Intent P0: one job → one canonical (no duplicate thin pages)
      {
        source: "/for/action-figure-video-generator",
        destination: "/for/action-figure-product-videos",
        permanent: true,
      },
      {
        source: "/for/action-figure-product-video",
        destination: "/for/action-figure-product-videos",
        permanent: true,
      },
      {
        source: "/for/blind-box-video-generator",
        destination: "/for/blind-box-brand-marketing",
        permanent: true,
      },
      {
        source: "/for/blind-box-drop-videos",
        destination: "/for/blind-box-brand-marketing",
        permanent: true,
      },
      {
        source: "/for/blind-box-marketing",
        destination: "/for/blind-box-brand-marketing",
        permanent: true,
      },
      // Reveal-clip tool job lives under /tools (not a second /for page)
      {
        source: "/for/blind-box-reveal",
        destination: "/tools/blind-box-reveal-video-maker",
        permanent: true,
      },
      {
        source: "/for/toy-unboxing-video-generator",
        destination: "/tools/blind-box-reveal-video-maker",
        permanent: true,
      },
      {
        source: "/for/blind-box-unboxing-video",
        destination: "/tools/blind-box-reveal-video-maker",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/demos/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
