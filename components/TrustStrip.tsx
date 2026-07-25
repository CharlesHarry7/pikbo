import Link from "next/link";

export function TrustStrip() {
  return (
    <section className="border-y border-white/10 bg-gradient-to-r from-black via-[#0a0a0c] to-black px-4 py-5 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center text-xs tracking-wide text-white/50">
        <span>
          <strong className="font-semibold text-[var(--mint)]">Seedance</strong>{" "}
          live path when configured
        </span>
        <span className="hidden h-3 w-px bg-white/15 sm:block" />
        <span>Cached demos clearly labeled</span>
        <span className="hidden h-3 w-px bg-white/15 sm:block" />
        <span>Free Mini · 5s · 480p · on-player mark · failed jobs refund</span>
        <span className="hidden h-3 w-px bg-white/15 sm:block" />
        <span>
          Made for{" "}
          <Link
            href="/for/etsy-listing-videos"
            className="font-medium text-white/80 underline-offset-2 hover:text-[var(--mint)] hover:underline"
          >
            Etsy
          </Link>
          {" · "}
          <Link
            href="/for/tiktok-shop-product-videos"
            className="font-medium text-white/80 underline-offset-2 hover:text-[var(--mint)] hover:underline"
          >
            TikTok Shop
          </Link>
          {" · "}
          <Link
            href="/tools/ai-toy-video-generator"
            className="font-medium text-white/80 underline-offset-2 hover:text-[var(--mint)] hover:underline"
          >
            AI toy video generator
          </Link>
        </span>
      </div>
    </section>
  );
}
