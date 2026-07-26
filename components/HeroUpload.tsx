"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      router.push(`/create?effect=${encodeURIComponent(effect)}`);
    };
    reader.onerror = () => {
      setErr("Could not read file.");
      setBusy(false);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
          Choose a recipe
        </p>
        <p className="hidden text-[10px] text-white/35 sm:block">
          Photo you own · max 8MB
        </p>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {PRESETS_QUICK.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => setEffect(p.slug)}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
              effect === p.slug
                ? "border-[#c8ff3d] bg-[#c8ff3d]/10 text-[#c8ff3d]"
                : "border-white/10 text-white/55 hover:border-white/25 hover:text-white"
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
        className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 transition-all ${
          hover
            ? "border-[#c8ff3d] bg-[#c8ff3d]/15"
            : "border-[#c8ff3d]/50 bg-[#c8ff3d] hover:-translate-y-0.5 hover:brightness-105"
        }`}
      >
        <span>
          <span className="block text-sm font-black text-black">
            {busy ? "Opening Generate…" : "Upload photo & Generate"}
          </span>
          <span className="mt-0.5 block text-[10px] font-semibold text-black/60">
            Recipe and image continue into Create
          </span>
        </span>
        <span
          aria-hidden="true"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black text-lg font-black text-[#c8ff3d]"
        >
          ↗
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => goWithFile(e.target.files?.[0])}
        />
      </label>
      {err && (
        <p className="mt-2 text-xs font-semibold text-rose-300">{err}</p>
      )}
    </div>
  );
}
