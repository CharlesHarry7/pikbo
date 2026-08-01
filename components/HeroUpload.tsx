"use client";

import { ArrowUpRight, ImagePlus, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { track } from "@/lib/analytics";

export type HomeLaunchAccess =
  | "checking"
  | "public-preview"
  | "private-short"
  | "private-ready";

/** Homepage handoff into the fixed three-output Launch Pack path. */
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
  const privateAccess =
    access === "private-short" || access === "private-ready";

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
        "For this quick handoff, use a photo under 2 MB. Larger photos can be added inside Launch Pack."
      );
      return;
    }
    setBusy(true);
    setErr(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        sessionStorage.setItem("pikbo_pending_still", reader.result as string);
      } catch {
        setErr("This browser could not prepare the photo. Open Launch Pack instead.");
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
              "/create?mode=seller-pack&source=home-preview&try=1&sample=scout"
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
                : "Try a sample Launch Pack"}
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
          <span className="block text-base font-black tracking-[-0.025em] text-[#15171B] sm:text-lg">
            {busy
              ? "Opening your private Launch Pack…"
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
        <p className="mt-2 text-xs font-semibold text-[#B3402D]">{err}</p>
      ) : null}
    </div>
  );
}
