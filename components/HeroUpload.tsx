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
          className="group flex min-h-[76px] w-full items-center gap-3 rounded-[0.9rem] bg-[#C8FF3D] p-3 text-left text-[#09090B] transition hover:bg-[#D6FF70] sm:min-h-[82px] sm:p-4"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#09090B] text-[#C8FF3D] sm:h-11 sm:w-11">
            <Play className="h-4 w-4 fill-current sm:h-5 sm:w-5" strokeWidth={2.4} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold tracking-[-0.02em] sm:text-base">
              Try a sample Launch Pack
            </span>
            <span className="mt-0.5 block text-[10px] font-medium leading-4 text-[#09090B]/62 sm:text-[11px]">
              Instant format preview · no sign-in · no photo upload
            </span>
          </span>
          <span className="ml-auto text-lg" aria-hidden>↗</span>
          <span className="sr-only">Pikbo Lab prototype · 0 credits</span>
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
        className={`group flex min-h-[76px] cursor-pointer items-center gap-3 rounded-[0.9rem] border p-3 transition focus-within:ring-2 focus-within:ring-[#C8FF3D] sm:min-h-[82px] sm:p-4 ${
          hover
            ? "border-[#C8FF3D]/75 bg-[#C8FF3D]/10"
            : "border-[#C8FF3D]/32 bg-[#121214] hover:border-[#C8FF3D]/62"
        }`}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#C8FF3D] text-[#09090B] sm:h-11 sm:w-11">
          <ImagePlus className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.4} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold tracking-[-0.02em] text-[#F4F4F5] sm:text-base">
            {busy
              ? "Opening your private Launch Pack…"
              : "Upload your toy photo"}
          </span>
          <span className="mt-0.5 block text-[10px] font-medium leading-4 text-[#F4F4F5]/48 sm:text-[11px]">
            or tap to choose · PNG, JPG, WebP · under 2 MB
          </span>
          <span className="mt-1.5 inline-flex text-[8px] font-semibold uppercase tracking-[0.1em] text-[#C8FF3D]">
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
