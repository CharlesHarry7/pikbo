"use client";

import Link from "next/link";
import { createGenerate360Href } from "@/lib/jobIntents";
import { useEffect, useMemo, useState } from "react";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { GenerateAfterPath } from "@/components/GenerateAfterPath";
import { DEMO_VIDEOS } from "@/lib/demoVideos";
import { PRESETS } from "@/lib/presets";
import { createRemixHref } from "@/lib/remixIntent";
import { viralName } from "@/lib/viralNames";
import { loadToyIdentity } from "@/lib/toyIdentity";

/** Cinema Generate door — listing spin remix (ratio/duration/channel). */
const CINEMA_GENERATE_HREF = createGenerate360Href("cinema");

const LENSES = ["24mm", "35mm", "50mm", "85mm", "100mm macro"] as const;
const MOVES = [
  "Static",
  "Slow push-in",
  "Orbit",
  "Handheld",
  "Crane up",
] as const;
const LOOKS = [
  "Clean product",
  "Neon night",
  "Soft daylight",
  "Cine teal-orange",
  "Display case glam",
] as const;

const SHOT_TEMPLATES = [
  {
    id: "packshot",
    label: "Packshot hero",
    brief:
      "Designer vinyl figure on seamless, sharp sculpt and paint, premium catalog lighting, toy photography",
  },
  {
    id: "shelf",
    label: "Shelf diorama",
    brief:
      "Figure in a miniature shelf world, scale props, soft practical lights, collector display vibe",
  },
  {
    id: "drop",
    label: "Drop unbox",
    brief:
      "Blind-box style reveal moment for a designer toy, dramatic rim light, product-focused framing",
  },
  {
    id: "street",
    label: "Street macro",
    brief:
      "Close-up street-style toy photography, shallow depth of field, urban bokeh, figure identity locked",
  },
] as const;

/**
 * Cinema Studio — HF-class director board for toy video.
 * Compose lens / move / grade → gated Generate workbench (Preview · not renderer).
 */
export default function CinemaPage() {
  const [lens, setLens] = useState<(typeof LENSES)[number]>(LENSES[1]);
  const [move, setMove] = useState<(typeof MOVES)[number]>(MOVES[1]);
  const [look, setLook] = useState<(typeof LOOKS)[number]>(LOOKS[0]);
  const [shot, setShot] = useState<string>(SHOT_TEMPLATES[0].brief);
  const [effect, setEffect] = useState(PRESETS[0]?.slug ?? "360-spin-showcase");
  const [boardShot, setBoardShot] = useState(0);
  /** Device-local bible — primary CTA + AfterPath commercial carry. */
  const [toySku, setToySku] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const id = loadToyIdentity();
        if (id.sku) setToySku(id.sku);
      } catch {
        /* private mode */
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const composed = useMemo(
    () =>
      [
        shot,
        `Lens ${lens}.`,
        `Camera: ${move}.`,
        `Grade: ${look}.`,
        "Cinematic, high detail, stable toy subject, no brand logos invented.",
      ].join(" "),
    [shot, lens, move, look]
  );

  /**
   * Compose → Generate handoff: full remix contract (effect+ratio+duration+channel)
   * plus director prompt + optional device-local SKU. Never bare /create?effect only.
   */
  const href = useMemo(() => {
    const base = createRemixHref(effect, undefined, toySku || null);
    const prompt = composed.trim().slice(0, 1500);
    if (!prompt) return base;
    const joiner = base.includes("?") ? "&" : "?";
    return `${base}${joiner}prompt=${encodeURIComponent(prompt)}`;
  }, [effect, composed, toySku]);
  const board = DEMO_VIDEOS.slice(0, 3);
  const activeBoard = board[boardShot] ?? board[0];
  const cinemaPresets = PRESETS.filter((p) =>
    ["360-spin-showcase", "floating-hero", "display-case-glam", "miniature-scene", "paparazzi-flash", "mystery-box-reveal", "blind-box-unboxing", "make-figure-walk"].includes(
      p.slug
    )
  );
  const presetChips =
    cinemaPresets.length >= 4 ? cinemaPresets : PRESETS.slice(0, 8);

  return (
    <div
      className="relative min-h-screen pb-[var(--sticky-generate-pad)] lg:pb-0"
      data-cinema-content-pad="sticky-generate"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[min(420px,50vh)] overflow-hidden opacity-45">
        <video
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster={activeBoard?.poster || "/demos/scout-still.webp"}
          aria-label="Cinema ambient Lab demo"
        >
          <source
            src={activeBoard?.webm || "/demos/scout-packshot-spin.webm"}
            type="video/webm"
          />
          <source
            src={activeBoard?.mp4 || "/demos/scout-packshot-spin.mp4"}
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/80 to-black" />
      </div>

      <div className="relative z-10 border-b border-white/10 bg-black/50 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mint)]">
              Cinema Studio · Preview
            </p>
            <p className="mt-0.5 text-xs text-white/45">
              Director board for toys → opens the gated Generate workbench ·
              not a separate renderer
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap justify-end gap-2">
              <Link
                href={CINEMA_GENERATE_HREF}
                className="btn btn-ghost !px-3 !py-1.5 text-xs"
                data-cinema-generate="remix"
              >
                Generate
              </Link>
              <Link
                href="/library"
                className="btn btn-ghost !px-3 !py-1.5 text-xs"
              >
                Library
              </Link>
              <FreeTrialCta
                path="/cinema"
                variant="ghost"
                className="btn btn-ghost !px-3 !py-1.5 text-xs"
                hideClipsChip
              />
            </div>
            <GenerateAfterPath
              compact
              demo
              className="justify-end"
              effectSlug={effect}
              sku={toySku || null}
            />
          </div>
        </div>
      </div>

      <div className="relative z-10 px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
                Director board
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/55">
                Lens · camera · grade for your figure — then render in Generate.
                Single-shot now; multi-shot timeline stays Soon.
              </p>
            </div>
            <Link
              href={href}
              className="hidden rounded-full bg-[var(--mint)] px-6 py-3 text-sm font-black text-black shadow-[0_0_32px_rgba(200,255,61,0.3)] lg:inline-flex"
            >
              Render in Generate →
            </Link>
          </div>

          {/* Shot templates — HF density chips */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SHOT_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setShot(t.brief)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition ${
                  shot === t.brief
                    ? "border-[var(--mint)] bg-[var(--mint)] text-black"
                    : "border-white/15 bg-white/[0.04] text-white/70 hover:border-white/30"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                  Shot brief
                </span>
                <textarea
                  value={shot}
                  onChange={(e) => setShot(e.target.value)}
                  rows={4}
                  className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/50 px-3.5 py-3 text-sm leading-relaxed text-white outline-none focus:border-[var(--mint)]/50"
                />
              </label>

              <ChipField label="Lens" value={lens} options={LENSES} onChange={setLens} />
              <ChipField label="Camera move" value={move} options={MOVES} onChange={setMove} />
              <ChipField label="Look / grade" value={look} options={LOOKS} onChange={setLook} />

              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                  Base recipe
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {presetChips.map((p) => (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => setEffect(p.slug)}
                      className={`rounded-full border px-2.5 py-1.5 text-[11px] font-bold ${
                        effect === p.slug
                          ? "border-[var(--mint)] bg-[var(--mint)]/15 text-[var(--mint)]"
                          : "border-white/10 text-white/55 hover:border-white/25"
                      }`}
                    >
                      {p.emoji} {viralName(p.slug, p.name)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                  Composed prompt · feeds Generate
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  {composed}
                </p>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
                <div className="relative aspect-[9/14] sm:aspect-video">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeBoard?.poster || "/demos/scout-still.webp"}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--mint)]">
                      Storyboard ref · Lab
                    </p>
                    <p className="mt-1 text-sm font-black text-white">
                      {activeBoard?.title || "Hero still"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/50">
                      {lens} · {move} · {look}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                  Shot list
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {board.map((d, i) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setBoardShot(i)}
                      className={`overflow-hidden rounded-xl border text-left transition ${
                        boardShot === i
                          ? "border-[var(--mint)] ring-1 ring-[var(--mint)]/40"
                          : "border-white/10 hover:border-white/25"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={d.poster}
                        alt=""
                        className="aspect-[3/4] w-full object-cover"
                      />
                      <p className="px-1.5 py-1 text-[9px] font-bold uppercase text-white/60">
                        {i + 1}. {["Wide", "Hero", "Detail"][i]}
                      </p>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-white/40">
                  Single-shot cinema now: one brief + recipe → Generate. Multi-shot
                  queue is Soon (no fake timeline render).
                </p>
              </div>

              <Link
                href={href}
                className="flex w-full items-center justify-center rounded-full bg-[var(--mint)] py-3.5 text-sm font-black text-black shadow-[0_0_32px_rgba(200,255,61,0.28)]"
                data-cinema-compose="remix"
              >
                Render in Generate →
              </Link>
              <Link
                href={`/effects/${effect}`}
                className="flex w-full items-center justify-center rounded-full border border-white/15 py-2.5 text-sm font-bold text-white/70 hover:border-white/30"
              >
                Open tool page
              </Link>
            </aside>
          </div>
        </div>
      </div>

      {/* Mobile sticky primary — above AppShell tab + home indicator (AIT-71) */}
      <div
        data-floating-generate="cinema"
        className="fixed inset-x-0 bottom-[var(--mobile-nav-clearance)] z-[var(--floating-generate-z)] border-t border-white/10 bg-black/92 px-4 py-2.5 backdrop-blur-xl lg:hidden"
      >
        <Link
          href={href}
          className="btn btn-primary flex w-full items-center justify-center py-3.5 text-[15px] font-black"
          data-cinema-compose="remix"
        >
          Render in Generate →
        </Link>
      </div>
    </div>
  );
}

function ChipField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
        {label}
      </span>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
              value === o
                ? "border-[var(--mint)] bg-[var(--mint)] text-black"
                : "border-white/12 bg-white/[0.03] text-white/60 hover:border-white/25"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
