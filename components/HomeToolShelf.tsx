import Link from "next/link";
import {
  CAPABILITY_STATE_LABELS,
  HOME_ENTRY_RAIL,
} from "@/lib/softLaunch";

/**
 * First-viewport Wave A product rail. The destinations, hrefs, and honest
 * availability states are shared with the shell; no parallel tool catalog.
 */
export function HomeToolShelf() {
  return (
    <section
      aria-label="Wave A product entries"
      className="border-b border-white/[0.07] bg-[#070708] px-3 py-4 sm:px-5"
      data-home-entry-rail="wave-a"
    >
      <div className="mx-auto flex max-w-[1600px] gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {HOME_ENTRY_RAIL.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            data-home-entry={item.id}
            data-capability-state={item.state}
            className={`flex min-w-[168px] shrink-0 items-center gap-3 rounded-2xl border px-3 py-3 transition hover:-translate-y-0.5 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8ff3d] ${
              item.id === "generate" || item.id === "seller_pack"
                ? "border-[var(--mint)]/35 bg-[var(--mint)]/[0.08]"
                : "border-white/[0.08] bg-white/[0.03]"
            }`}
          >
            <span
              aria-hidden
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-base ${
                item.id === "generate"
                  ? "bg-[var(--mint)] font-black text-black"
                  : "bg-white/10 text-white"
              }`}
            >
              {item.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold text-white">
                {item.homeLabel ?? item.label}
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-white/42">
                {item.description}
              </span>
              <span className="mt-1 flex min-w-0 items-center gap-1 text-[9px] font-black uppercase tracking-wide">
                <span
                  className={
                    item.state === "live"
                      ? "text-[#c8ff3d]"
                      : "text-white/55"
                  }
                >
                  {CAPABILITY_STATE_LABELS[item.state]}
                </span>
                {item.note ? (
                  <>
                    <span aria-hidden className="text-white/20">
                      ·
                    </span>
                    <span className="truncate text-white/32">{item.note}</span>
                  </>
                ) : null}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
