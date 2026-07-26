"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createRemixHref } from "@/lib/remixIntent";

const PRESETS_QUICK = [
  { slug: "360-spin-showcase", label: "360°" },
  { slug: "blind-box-unboxing", label: "Unbox" },
  { slug: "floating-hero", label: "Float" },
] as const;

/** Compact drop zone for video-home conversion */
export function HeroUpload() {
  const router = useRouter();
  const [hover, setHover] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [effect, setEffect] = useState<string>(PRESETS_QUICK[0].slug);

  function goWithFile(file: File | undefined | null) {
    if (!file || !file.type.startsWith("image/")) {
      setErr("PNG or JPG of a toy you own.");
      return;
    }
    if (file.size > 8_000_000) {
      setErr("Max ~8MB.");
      return;
    }
    setBusy(true);
    setErr(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        sessionStorage.setItem("pikbo_pending_still", reader.result as string);
      } catch {
        setErr("Storage full — open Generate instead.");
        setBusy(false);
        return;
      }
      // Remix contract: effect + ratio/duration/channel — still via session.
      router.push(createRemixHref(effect));
    };
    reader.onerror = () => {
      setErr("Could not read file.");
      setBusy(false);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {PRESETS_QUICK.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => setEffect(p.slug)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              effect === p.slug
                ? "border-[var(--mint)] text-[var(--mint)]"
                : "border-[var(--border)] text-[var(--fg-dim)] hover:text-[var(--fg)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setHover(true);
        }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => {
          e.preventDefault();
          setHover(false);
          goWithFile(e.dataTransfer.files?.[0]);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-5 transition-colors ${
          hover
            ? "border-[var(--mint)] bg-[var(--mint)]/10"
            : "border-[var(--border)] bg-[var(--card)] hover:border-white/20"
        }`}
      >
        <p className="text-sm font-semibold">
          {busy ? "Opening Generate…" : "Drop a toy photo → start"}
        </p>
        <p className="mt-1 text-[11px] text-[var(--fg-dim)]">
          Jumps into Generate with look preselected
        </p>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => goWithFile(e.target.files?.[0])}
        />
      </label>
      {err && (
        <p className="mt-2 text-center text-xs text-[var(--brand)]">{err}</p>
      )}
    </div>
  );
}
