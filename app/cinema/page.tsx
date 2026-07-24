"use client";

import Link from "next/link";
import { useState } from "react";
import { FreeTrialCta } from "@/components/FreeTrialCta";
import { PRESETS } from "@/lib/presets";

const LENSES = ["24mm", "35mm", "50mm", "85mm", "100mm macro"];
const MOVES = ["Static", "Slow push-in", "Orbit", "Handheld", "Crane up"];
const LOOKS = ["Clean product", "Neon night", "Soft daylight", "Cine teal-orange"];

/**
 * Cinema Studio — feature parity surface with big AI film tools.
 * Feeds into Generate with composed prompt (live Seedance).
 */
export default function CinemaPage() {
  const [lens, setLens] = useState(LENSES[1]);
  const [move, setMove] = useState(MOVES[1]);
  const [look, setLook] = useState(LOOKS[0]);
  const [shot, setShot] = useState(
    "Designer vinyl figure on seamless, sharp sculpt and paint, premium catalog lighting, toy photography"
  );
  const [effect, setEffect] = useState(PRESETS[0]?.slug ?? "360-spin-showcase");

  const composed = [
    shot,
    `Lens ${lens}.`,
    `Camera: ${move}.`,
    `Grade: ${look}.`,
    "Cinematic, high detail, stable subject.",
  ].join(" ");

  const href = `/create?effect=${encodeURIComponent(effect)}&prompt=${encodeURIComponent(composed)}`;

  return (
    <div className="relative min-h-screen pb-24">
      {/* HF-style full-bleed cinema chrome */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[min(420px,50vh)] overflow-hidden opacity-50">
        <video
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster="/demos/scout-still.webp"
          aria-label="Cinema ambient Lab demo"
        >
          <source src="/demos/scout-packshot-spin.webm" type="video/webm" />
          <source src="/demos/scout-packshot-spin.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-[var(--bg)]/85 to-[var(--bg)]" />
      </div>
      <div className="relative z-10 border-b border-white/10 bg-black/40 px-4 py-3 backdrop-blur sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--mint)]/80">
          Cinema · Preview suite door
        </p>
        <p className="mt-0.5 text-xs text-white/45">
          Compose lens / move / grade → opens Generate with Seedance (not a
          separate offline renderer). Same live Mini honesty as Create.
        </p>
      </div>

      <div className="relative px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--lime)]">
              Cinema · Preview composer
            </p>
            <h1 className="mt-1 text-3xl font-bold">Director board</h1>
            <p className="mt-2 max-w-xl text-sm text-[var(--fg-muted)]">
              Lens & camera language for your figure — then open Generate with
              Seedance. Not a full HF Cinema rebuild; toy-native prompt board
              only.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link href="/flow" className="btn btn-ghost !px-3 !py-1.5 text-xs">
                Flow
              </Link>
              <Link href="/modules" className="btn btn-ghost !px-3 !py-1.5 text-xs">
                Modules
              </Link>
              <Link
                href="/create?mode=seller-pack"
                className="btn btn-ghost !px-3 !py-1.5 text-xs"
              >
                Seller Pack
              </Link>
              <FreeTrialCta
                path="/cinema"
                variant="ghost"
                className="btn btn-ghost !px-3 !py-1.5 text-xs"
              />
            </div>
          </div>
          <Link
            href={href}
            className="btn btn-primary px-5 py-2.5 text-sm"
          >
            Open Generate →
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-[var(--fg-dim)]">
                Shot brief
              </span>
              <textarea
                value={shot}
                onChange={(e) => setShot(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm outline-none focus:border-[var(--lime)]"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Lens" value={lens} options={LENSES} onChange={setLens} />
              <Field label="Camera move" value={move} options={MOVES} onChange={setMove} />
              <Field label="Look" value={look} options={LOOKS} onChange={setLook} />
            </div>

            <div>
              <span className="text-xs font-semibold text-[var(--fg-dim)]">
                Base preset
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESETS.slice(0, 8).map((p) => (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => setEffect(p.slug)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                      effect === p.slug
                        ? "border-[var(--brand)] text-[var(--brand)]"
                        : "border-[var(--border)] text-[var(--fg-muted)]"
                    }`}
                  >
                    {p.emoji} {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-black/40 p-4">
              <p className="text-[10px] font-bold uppercase text-[var(--fg-dim)]">
                Composed prompt
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
                {composed}
              </p>
            </div>
          </div>

          <aside className="card h-fit space-y-3 p-5">
            <h2 className="font-semibold">Shot list (storyboard)</h2>
            {["Wide establish", "Hero medium", "Detail insert"].map((s, i) => (
              <div
                key={s}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm"
              >
                <span className="text-[var(--fg-dim)]">{i + 1}.</span> {s}
              </div>
            ))}
            <p className="text-[11px] text-[var(--fg-dim)]">
              Single-shot cinema renders now: prompt + preset open in Generate
              with Seedance. Multi-shot queue later.
            </p>
            <Link href={href} className="btn btn-primary w-full text-sm">
              Render in Generate →
            </Link>
            <Link
              href={`/effects/${effect}`}
              className="btn btn-ghost w-full text-sm"
            >
              Or open tool page
            </Link>
          </aside>
        </div>
      </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[var(--fg-dim)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
