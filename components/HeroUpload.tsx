"use client";

import { ImagePlus, Play } from "lucide-react";
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
          className="group flex min-h-28 w-full items-center gap-4 rounded-[1.15rem] bg-[#FF5A47] p-4 text-left text-white transition hover:-translate-y-0.5 hover:bg-[#f34d3a] sm:min-h-32 sm:p-5"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-2 border-white/70 bg-white text-[#17131D] shadow-[3px_3px_0_#17131D] sm:h-14 sm:w-14">
            <Play className="h-5 w-5 fill-current sm:h-6 sm:w-6" strokeWidth={2.4} />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-black tracking-[-0.025em] sm:text-lg">
              Try a sample Launch Pack
            </span>
            <span className="mt-1 block text-[11px] font-semibold leading-5 text-white/74">
              Instant format preview · no sign-in · no photo upload
            </span>
            <span className="mt-3 inline-flex rounded-full border border-white/35 bg-white/12 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.13em]">
              Pikbo Lab prototype · 0 credits
            </span>
          </span>
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
        className={`group flex min-h-28 cursor-pointer items-center gap-4 rounded-[1.15rem] border-2 p-4 transition focus-within:ring-2 focus-within:ring-[#4A55FF] sm:min-h-32 sm:p-5 ${
          hover
            ? "border-[#4A55FF] bg-[#4A55FF]/10"
            : "border-[#17131D] bg-white hover:bg-[#F6F0E5]"
        }`}
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#4A55FF] text-white shadow-[3px_3px_0_#17131D] sm:h-14 sm:w-14">
          <ImagePlus className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.4} />
        </span>
        <span className="min-w-0">
          <span className="block text-base font-black tracking-[-0.025em] text-[#17131D] sm:text-lg">
            {busy
              ? "Opening your private Launch Pack…"
              : "Upload your toy photo"}
          </span>
          <span className="mt-1 block text-[11px] font-semibold leading-5 text-[#17131D]/52">
            or tap to choose · PNG, JPG, WebP · under 2 MB
          </span>
          <span className="mt-3 inline-flex rounded-full border border-[#17131D]/14 bg-[#FFD447] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-[#17131D]">
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
        <p className="mt-2 text-xs font-semibold text-amber-200">{err}</p>
      ) : null}
    </div>
  );
}
