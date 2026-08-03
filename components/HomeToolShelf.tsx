import Link from "next/link";
import { createRemixHref } from "@/lib/remixIntent";

const SHELF_GENERATE_HREF = createRemixHref("360-spin-showcase");

/**
 * Suite chips under home — product doors first (Generate / Modules / Pack).
 * Cinema & multi-model demoted: not the critical path.
 */
type ToolChip = {
  href: string;
  label: string;
  sub: string;
  emoji: string;
  hot?: boolean;
};

const TOOLS: ToolChip[] = [
  { href: SHELF_GENERATE_HREF, label: "Generate", sub: "Workbench", emoji: "✦", hot: true },
  { href: "/modules", label: "Modules", sub: "Job blocks", emoji: "▦", hot: true },
  {
    href: "/create?effect=street-power-up",
    label: "Create one Moment",
    sub: "1 directed clip",
    emoji: "🛍️",
    hot: true,
  },
  { href: "/effects", label: "Recipes", sub: "Presets", emoji: "▶" },
  { href: "/library", label: "Library", sub: "Local", emoji: "▢" },
  { href: "/community", label: "PIKBO Lab", sub: "Examples", emoji: "◉" },
  { href: "/image", label: "Stills", sub: "Preview", emoji: "▣" },
  { href: "/guides", label: "Learn", sub: "Free", emoji: "◎" },
];

export function HomeToolShelf() {
  return (
    <section className="px-3 py-4 sm:px-4">
      <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TOOLS.map((t) => (
          <Link
            key={t.href + t.label}
            href={t.href}
            className={`flex min-w-[148px] shrink-0 items-center gap-3 rounded-2xl border px-3 py-3 transition hover:bg-white/[0.05] ${
              t.hot
                ? "border-[var(--mint)]/35 bg-[var(--mint)]/[0.08]"
                : "border-white/[0.08] bg-white/[0.03]"
            }`}
          >
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-base ${
                t.hot
                  ? "bg-[var(--mint)] font-black text-black"
                  : "bg-white/10 text-white"
              }`}
            >
              {t.emoji}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-bold text-white">
                {t.label}
              </span>
              <span className="block truncate text-[11px] text-white/45">
                {t.sub}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
