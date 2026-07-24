"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PRESETS } from "@/lib/presets";

/** Critical path first — suite doors over vanity surfaces */
const LINKS = [
  { href: "/", label: "Home" },
  { href: "/create", label: "Generate · Toy Studio" },
  { href: "/flow", label: "Flow · creation matrix" },
  { href: "/modules", label: "Modules · job blocks" },
  { href: "/create?mode=seller-pack", label: "Seller Pack · 3 clips" },
  { href: "/create?job=etsy-listing", label: "Job · Etsy listing spin" },
  { href: "/create?job=tiktok-hook", label: "Job · TikTok hook" },
  { href: "/create?job=blind-box-drop", label: "Job · Blind-box drop" },
  { href: "/effects", label: "Toy presets / recipes" },
  { href: "/library", label: "Library" },
  { href: "/pricing", label: "Pricing · Free Mini / plans" },
  {
    href: "/create?try=1&sample=scout",
    label: "Lab sample · 0 credits (cached)",
  },
  { href: "/profile", label: "Profile · durable honesty" },
  { href: "/image", label: "Still studio · optional" },
  { href: "/supercomputer", label: "Batch agent" },
  { href: "/guides", label: "Guides" },
  { href: "/for/etsy-listing-videos", label: "For Etsy sellers" },
  { href: "/for/tiktok-shop-product-videos", label: "For TikTok Shop" },
  { href: "/explore", label: "Explore" },
  { href: "/community", label: "PIKBO Lab" },
  { href: "/apps", label: "Apps catalog" },
  { href: "/models", label: "Models (honest)" },
  { href: "/settings", label: "Settings · T6 / jobs" },
  { href: "/status", label: "System status" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQ("");
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    const pages = LINKS.filter((l) =>
      !query ? true : l.label.toLowerCase().includes(query)
    ).map((l) => ({ ...l, kind: "page" as const }));
    const presets = PRESETS.filter(
      (p) =>
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.tagline.toLowerCase().includes(query)
    )
      .slice(0, 8)
      .map((p) => ({
        href: `/effects/${p.slug}`,
        label: `${p.emoji} ${p.name}`,
        kind: "preset" as const,
      }));
    return [...pages, ...presets];
  }, [q]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--mint)]/20 bg-[#0c0c10]/96 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.9),0_0_40px_rgba(200,255,61,0.06)] backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--mint)]">
            Jump
          </span>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Generate · Flow · Modules · recipe… (⌘K)"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
            onKeyDown={(e) => {
              if (e.key === "Enter" && items[0]) {
                router.push(items[0].href);
                setOpen(false);
              }
            }}
          />
          <kbd className="hidden rounded border border-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-white/40 sm:inline">
            esc
          </kbd>
        </div>
        <ul className="max-h-72 overflow-y-auto py-2">
          {items.length === 0 ? (
            <li className="px-4 py-6 text-center text-xs text-white/40">
              No match — try Flow, Seller Pack, or a recipe name
            </li>
          ) : null}
          {items.map((item) => (
            <li key={item.href + item.label}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-4 py-2 text-sm text-white/85 transition hover:bg-[var(--mint)]/10 hover:text-white"
              >
                <span>{item.label}</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-white/35">
                  {item.kind}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
