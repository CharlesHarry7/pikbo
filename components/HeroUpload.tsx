"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { track } from "@/lib/analytics";

/** Homepage handoff into the fixed three-output Launch Pack path. */
export function HeroUpload() {
  const router = useRouter();
  const [hover, setHover] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      track({
        event: "upload_ready",
        path: "/",
        meta: { destination: "launch-pack", outputs: 3 },
      });
      router.push("/create?mode=seller-pack&source=home-launch-pack");
    };
    reader.onerror = () => {
      setErr("Could not read file.");
      setBusy(false);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div data-home-launch-pack="fixed-three">
      <div className="mb-3 grid grid-cols-3 gap-2 text-[10px] font-bold uppercase tracking-wide text-white/65">
        <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-center">
          Listing · 1:1
        </span>
        <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-center">
          Reveal · 9:16
        </span>
        <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-center">
          Hook · 9:16
        </span>
      </div>
      <label
        data-launch-pack-primary-action="1"
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
          {busy ? "Opening Launch Pack…" : "Upload one toy photo → build 3 assets"}
        </p>
        <p className="mt-1 text-[11px] text-[var(--fg-dim)]">
          Next: confirm ownership, then generate · no recipe hunting
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
