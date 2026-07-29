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
      <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-2xl border border-[#c8ff3d]/20 bg-[linear-gradient(110deg,rgba(200,255,61,0.1),rgba(255,255,255,0.025)_55%,rgba(127,230,180,0.06))] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c8ff3d]">
            Seller result thread
          </p>
          <h2 className="mt-2 text-xl font-black tracking-tight text-white sm:text-2xl">
            Keep the recipe, project evidence, and next draft connected.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            Start with a toy photo you own, reuse a clear motion recipe, inspect
            what the example actually proves, then return to the same context
            from your device-local Library.
          </p>
        </div>
        <Link
          href={WAVE_A_DESTINATIONS.seller_pack.href}
          data-capability-state={WAVE_A_DESTINATIONS.seller_pack.state}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-[#c8ff3d]/40 bg-[#c8ff3d]/10 px-5 text-xs font-black text-[#c8ff3d] transition hover:-translate-y-0.5 hover:bg-[#c8ff3d] hover:text-black"
        >
          Review the 3-job pack →
        </Link>
      </div>
    </section>
  );
}
