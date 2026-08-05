"use client";

import { ArrowUpRight, ImagePlus, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { STUDIO_NAV_OPEN_MS } from "@/lib/clientTimeout";

export type HomeLaunchAccess =
  | "checking"
  | "public-preview"
  | "private-short"
  | "private-ready";

/** Legacy homepage handoff into the single preset-first Moment path. */
export function HeroUpload({
  access,
  credits,
}: {
  access: HomeLaunchAccess;
  credits: number;
}) {
  const router = useRouter();
  const [hover, setHover] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const privateAccess =
    access === "private-short" || access === "private-ready";

  useEffect(() => {
    return () => {
      if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
    };
  }, []);

  function clearOpenTimer() {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }

  /** Never leave the hero on permanent "Opening…" if navigation stalls. */
  function armOpenTimeout() {
    clearOpenTimer();
    openTimerRef.current = window.setTimeout(() => {
      setBusy(false);
      setErr(
        "Opening Create timed out. Retry, or open Create from the nav."
      );
      openTimerRef.current = null;
    }, STUDIO_NAV_OPEN_MS);
  }

  function goWithFile(file: File | undefined | null) {
    if (!privateAccess) {
      setErr("Photo upload is available only inside the invited private beta.");
      return;
    }
    if (
      !file ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    ) {
      setErr("Choose a PNG, JPG, or WebP photo of a toy you own.");
      return;
    }
    if (file.size > 2_000_000) {
      setErr(
        "For this quick handoff, use a photo under 2 MB. Larger photos can be added inside Create."
      );
      return;
    }
    setBusy(true);
    setErr(null);
    armOpenTimeout();
    const reader = new FileReader();
    reader.onload = () => {
      try {
        sessionStorage.setItem("pikbo_pending_still", reader.result as string);
      } catch {
        clearOpenTimer();
        setErr("This browser could not prepare the photo. Open Create instead.");
        setBusy(false);
        return;
      }
      track({
        event: "upload_ready",
        path: "/",
        meta: { destination: "single-moment", outputs: 1 },
      });
      router.push("/create?effect=street-power-up&source=home-launch-pack");
    };
    reader.onerror = () => {
      clearOpenTimer();
      setErr("Pikbo could not read that photo. Try another file.");
      setBusy(false);
    };
    reader.readAsDataURL(file);
  }

  if (!privateAccess) {
    return (
      <div data-home-launch-pack="public-preview">
        <button
          type="button"
          data-launch-pack-primary-action="preview"
          disabled={access === "checking"}
          onClick={() => {
            track({
              event: "recipe_use",
              path: "/",
              recipe: "seller-starter-pack",
              demo: true,
              meta: { source: "home_public_preview" },
            });
            router.push(
              "/create?effect=street-power-up&source=home-preview&try=1&sample=scout"
            );
          }}
          className="group flex min-h-[116px] w-full items-center gap-4 rounded-2xl bg-[#2457E6] p-4 text-left text-white shadow-[0_18px_45px_-28px_rgba(36,87,230,0.9)] transition hover:-translate-y-0.5 hover:bg-[#1F4FD5] disabled:cursor-wait disabled:opacity-70 sm:p-5"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#2457E6] sm:h-12 sm:w-12">
            <Play
              className="h-5 w-5 sm:h-6 sm:w-6"
              fill="currentColor"
              strokeWidth={1.8}
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-black tracking-[-0.025em] sm:text-lg">
              {access === "checking"
                ? "Checking private beta access…"
                : "Try a sample Moment"}
            </span>
            <span className="mt-1 block text-[11px] font-semibold leading-5 text-white/72">
              No photo upload · choose a Pikbo Lab sample
            </span>
            <span className="mt-2 block text-[8px] font-black uppercase tracking-[0.12em] text-white/58">
              Public preview · 0 credits · your image is not processed
            </span>
          </span>
          <ArrowUpRight className="h-5 w-5 shrink-0 text-white/72 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>
    );
  }

  return (
    <div data-home-launch-pack="private-upload">
      <label
        data-launch-pack-primary-action="1"
        onDragOver={(event) => {
          event.preventDefault();
          setHover(true);
        }}
        onDragLeave={() => setHover(false)}
        onDrop={(event) => {
          event.preventDefault();
          setHover(false);
          goWithFile(event.dataTransfer.files?.[0]);
        }}
        className={`group flex min-h-[116px] cursor-pointer items-center gap-4 rounded-2xl border p-4 transition focus-within:ring-2 focus-within:ring-[#2457E6] sm:p-5 ${
          hover
            ? "border-[#2457E6] bg-[#E7EDFF]"
            : "border-[#C9CED8] bg-white hover:border-[#2457E6]"
        }`}
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#2457E6] text-white sm:h-12 sm:w-12">
          <ImagePlus className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.4} />
        </span>
        <span className="min-w-0">
          <span
            className="block text-base font-black tracking-[-0.025em] text-[#15171B] sm:text-lg"
            data-studio-open-state={busy ? "opening" : "idle"}
          >
            {busy
              ? "Opening your private Moment…"
              : "Upload one rights-owned toy photo"}
          </span>
          <span className="mt-1 block text-[11px] font-semibold leading-5 text-[#69717E]">
            or tap to choose · PNG, JPG, WebP · under 2 MB
          </span>
          <span className="mt-2 block text-[8px] font-black uppercase tracking-[0.12em] text-[#2457E6]">
            {access === "private-ready"
              ? "Private beta · 30-credit Pack available"
              : `Private beta · ${credits} credits · Pack needs 30`}
          </span>
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={(event) => goWithFile(event.target.files?.[0])}
        />
      </label>
      {err ? (
        <div className="mt-2" data-studio-open-error role="alert">
          <p className="text-xs font-semibold text-[#B3402D]">{err}</p>
          <button
            type="button"
            data-studio-open-retry
            onClick={() => {
              setErr(null);
              setBusy(false);
              clearOpenTimer();
            }}
            className="mt-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-[#2457E6] underline underline-offset-2"
          >
            Dismiss · try again
          </button>
        </div>
      ) : null}
    </div>
  );
}
