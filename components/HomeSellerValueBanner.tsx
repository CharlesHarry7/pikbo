import Link from "next/link";
import { WAVE_A_DESTINATIONS } from "@/lib/softLaunch";

/** Original seller-value bridge: no discount, invented metric, or outcome claim. */
export function HomeSellerValueBanner() {
  return (
    <section
      className="border-b border-white/[0.07] bg-[#050506] px-4 py-5 sm:px-6"
      aria-label="Seller workflow value"
      data-home-value-banner="seller-result-thread"
    >
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl border border-white/10">
        <div className="absolute inset-0" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/demos/recipes/blind-box-unboxing.webp"
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center opacity-40"
          />
          <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(0,0,0,0.96)_22%,rgba(0,0,0,0.78)_55%,rgba(0,0,0,0.25)_100%)]" />
        </div>
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c8ff3d]">
              Seller result thread
            </p>
            <h2 className="mt-2 font-display text-xl font-black tracking-tight text-white sm:text-2xl">
              Keep the recipe, project evidence, and next draft connected.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Start with a toy photo you own, reuse a clear motion recipe,
              inspect what the example actually proves, then return to the same
              context from your device-local Library.
            </p>
          </div>
          <Link
            href={WAVE_A_DESTINATIONS.seller_pack.href}
            data-capability-state={WAVE_A_DESTINATIONS.seller_pack.state}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#c8ff3d] px-5 text-xs font-black text-black transition hover:-translate-y-0.5 hover:bg-[#d5ff6b]"
          >
            Review the 3-job pack →
          </Link>
        </div>
      </div>
    </section>
  );
}
