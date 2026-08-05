"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  clearLocalToyDraft,
  clampToyStageTransform,
  loadLocalToyDraft,
  saveLocalToyDraft,
  validateLocalToyImage,
  type ToyStageTransform,
} from "@/lib/localToyDraft";
import type { PikboMoment } from "@/lib/moments";
import {
  canPreparePrivateInput,
  canUsePrivateLaunch,
  fetchMe,
  type MeResponse,
} from "@/lib/meClient";
import { STUDIO_SESSION_BOOT_MS } from "@/lib/clientTimeout";
import { cn } from "@/lib/utils";
import { AutoPlayVideo } from "@/components/AutoPlayVideo";

type DraftStatus = "loading" | "empty" | "ready" | "tab-only";

const PRIVATE_BETA_MAILTO =
  "mailto:support@pikbo.ai?subject=Pikbo%20private%20beta%20request&body=I%20sell%20designer%20toys%20and%20would%20like%20to%20request%20private%20beta%20access.";

async function decodeImage(blob: Blob): Promise<boolean> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob);
      const valid = bitmap.width >= 64 && bitmap.height >= 64;
      bitmap.close();
      return valid;
    } catch {
      return false;
    }
  }
  return await new Promise<boolean>((resolve) => {
    const url = URL.createObjectURL(blob);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image.naturalWidth >= 64 && image.naturalHeight >= 64);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    image.src = url;
  });
}

export function MomentCreatePreview({ moment }: { moment: PikboMoment }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [transform, setTransform] = useState<ToyStageTransform>(() =>
    clampToyStageTransform(null)
  );
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [meResolved, setMeResolved] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    transform: ToyStageTransform;
  } | null>(null);

  const replaceObjectUrl = useCallback((nextBlob: Blob | null) => {
    setObjectUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return nextBlob ? URL.createObjectURL(nextBlob) : null;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadLocalToyDraft()
      .then((draft) => {
        if (cancelled) return;
        if (draft?.selectedMomentId === moment.id) {
          setBlob(draft.imageBlob);
          replaceObjectUrl(draft.imageBlob);
          setTransform(clampToyStageTransform(draft.transform));
          setDraftStatus("ready");
        } else {
          setDraftStatus("empty");
        }
      })
      .catch(() => {
        if (!cancelled) setDraftStatus("empty");
      });
    return () => {
      cancelled = true;
    };
  }, [moment.id, replaceObjectUrl]);

  useEffect(() => {
    let cancelled = false;
    void fetchMe({ timeoutMs: STUDIO_SESSION_BOOT_MS }).then((next) => {
      if (cancelled) return;
      setMe(next);
      setMeResolved(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const persist = useCallback(
    async (nextBlob: Blob, nextTransform: ToyStageTransform) => {
      try {
        await saveLocalToyDraft({
          imageBlob: nextBlob,
          selectedMomentId: moment.id,
          transform: nextTransform,
        });
        setDraftStatus("ready");
      } catch {
        setDraftStatus("tab-only");
      }
    },
    [moment.id]
  );

  const onChooseFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setError(null);
      const validation = await validateLocalToyImage(file);
      if (!validation.ok) {
        setError(validation.error);
        return;
      }
      if (!(await decodeImage(file))) {
        setError("That image could not be decoded. Choose another toy photo.");
        return;
      }
      const nextTransform = clampToyStageTransform(null);
      setBlob(file);
      replaceObjectUrl(file);
      setTransform(nextTransform);
      await persist(file, nextTransform);
    },
    [persist, replaceObjectUrl]
  );

  const saveTransform = useCallback(
    (next: ToyStageTransform) => {
      const clamped = clampToyStageTransform(next);
      setTransform(clamped);
      if (blob) void persist(blob, clamped);
    },
    [blob, persist]
  );

  const clearDraft = useCallback(async () => {
    setBlob(null);
    replaceObjectUrl(null);
    setTransform(clampToyStageTransform(null));
    setError(null);
    setDraftStatus("empty");
    try {
      await clearLocalToyDraft();
    } catch {
      // The in-memory preview is already gone; storage cleanup can fail closed.
    }
  }, [replaceObjectUrl]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!objectUrl) return;
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        transform,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [objectUrl, transform]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      setTransform(
        clampToyStageTransform({
          ...drag.transform,
          x: drag.transform.x + ((event.clientX - drag.startX) / bounds.width) * 100,
          y: drag.transform.y + ((event.clientY - drag.startY) / bounds.height) * 100,
        })
      );
    },
    []
  );

  const finishDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (dragRef.current?.pointerId !== event.pointerId) return;
      dragRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      saveTransform(transform);
    },
    [saveTransform, transform]
  );

  const onWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!objectUrl) return;
      event.preventDefault();
      saveTransform({
        ...transform,
        scale: transform.scale + (event.deltaY > 0 ? -0.08 : 0.08),
      });
    },
    [objectUrl, saveTransform, transform]
  );

  const cta = useMemo(() => {
    if (!blob) {
      return {
        label: "Add your toy first",
        href: null,
        note: "Choose one owned toy photo to make a local composition preview.",
      };
    }
    if (!meResolved) {
      return {
        label: "Checking private access…",
        href: null,
        note: "No upload or generation starts during this check.",
      };
    }
    if (!me?.signedIn) {
      return {
        label: "Sign in to continue",
        href: `/login?next=${encodeURIComponent(`/create?moment=${moment.id}`)}`,
        note: "Your local draft can be restored in this browser after sign-in.",
      };
    }
    if (canUsePrivateLaunch(me)) {
      return {
        label: "Create my private Moment",
        href: `/create?mode=moment&effect=street-power-up&source=moment-${moment.id}`,
        note: "Private beta currently renders the supported Street Power-Up contract: one owned toy photo, one private clip.",
      };
    }
    if (canPreparePrivateInput(me)) {
      return {
        label: "Verify private photo",
        href: `/create?mode=moment&effect=street-power-up&source=moment-input-${moment.id}`,
        note: "Private photo verification is available. Provider generation and credit reservation remain closed until this account is admitted.",
      };
    }
    return {
      label: "Request private access",
      href: PRIVATE_BETA_MAILTO,
      note: "Private generation is invitation-only. No Provider call or credit reservation will start here.",
    };
  }, [blob, me, meResolved, moment.id]);

  return (
    <main
      className="min-h-[calc(100vh-64px)] bg-[#F2EFE7] px-4 pb-12 pt-8 text-[#171719] sm:px-7 lg:px-10 lg:pt-7"
      data-moment-create-preview={moment.id}
    >
      <div className="mx-auto max-w-[1360px]">
        <div className="mb-7 grid gap-5 lg:grid-cols-[700px_1fr] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F04E30]">
              Selected moment · {moment.name}
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-[clamp(3.3rem,5.4vw,5.2rem)] font-black leading-[0.86] tracking-[-0.07em]">
              Bring your toy into this moment.
            </h1>
          </div>
          <div className="border-l border-[#171719]/20 pl-5">
            <p className="text-lg font-semibold leading-7 text-[#4A4843]">
              {moment.desire}
            </p>
            <Link
              href="/#moment-stage"
              className="mt-3 inline-flex text-[10px] font-black uppercase tracking-[0.18em] text-[#6F6B64] underline decoration-[#171719]/25 underline-offset-4 hover:text-[#171719]"
            >
              Choose another moment
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[700px_minmax(0,1fr)]">
          <section>
            <div
              className="relative aspect-[7/5] min-h-0 touch-none overflow-hidden rounded-[10px] bg-[#171719] select-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              onWheel={onWheel}
              aria-label="Toy Stage Preview. Drag your photo to position it and use the wheel or trackpad to scale it."
              data-toy-stage-preview
            >
              <Image
                src={moment.media}
                alt={moment.alt}
                fill
                priority
                sizes="700px"
                className="object-cover opacity-[0.86]"
                style={{ objectPosition: moment.objectPosition }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/35" />
              <span className="absolute left-4 top-4 z-10 border border-white/55 bg-black/45 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                Official Concept
              </span>
              <span className="absolute right-4 top-4 z-10 border border-white/35 bg-black/45 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                Preview composition
              </span>

              {objectUrl ? (
                <div
                  className="absolute z-20 w-[31%] min-w-[150px] max-w-[260px] cursor-grab border border-white bg-[#F5F1E8] p-1 active:cursor-grabbing"
                  style={{
                    left: `${transform.x}%`,
                    top: `${transform.y}%`,
                    transform: `translate(-50%, -50%) scale(${transform.scale})`,
                  }}
                  data-local-toy-layer
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={objectUrl}
                    alt="Your local toy preview"
                    draggable={false}
                    className="block aspect-square w-full object-contain bg-[#ECE8DE]"
                  />
                  <span className="absolute -top-6 left-0 bg-[#F5F1E8] px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-[#171719]">
                    Your toy
                  </span>
                </div>
              ) : (
                <label className="absolute left-1/2 top-1/2 z-20 grid h-48 w-48 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center border border-dashed border-white/70 bg-black/30 text-center text-white backdrop-blur-[2px] transition hover:bg-black/45">
                  <span>
                    <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-white/65">
                      Your toy goes here
                    </span>
                    <span className="mt-2 block text-sm font-black">Choose photo ↗</span>
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => void onChooseFile(event.target.files?.[0])}
                    data-local-toy-file-input
                  />
                </label>
              )}

              <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 bg-black/62 px-4 py-3 text-[9px] font-black uppercase tracking-[0.14em] text-white/80 backdrop-blur-sm">
                <span>Preview composition only. This is not a generated result.</span>
                {objectUrl ? <span>Drag to position · wheel to scale</span> : null}
              </div>
            </div>

            <div className="mt-4 grid gap-4 border border-[#171719]/15 bg-[#E8E3D9] p-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-stretch">
              <div className="flex flex-col justify-between gap-6 py-1">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F04E30]">
                    Motion proof
                  </p>
                  <h2 className="mt-3 max-w-sm font-display text-3xl font-black leading-[0.92] tracking-[-0.05em]">
                    Watch a finished reveal.
                  </h2>
                  <p className="mt-3 max-w-sm text-xs font-semibold leading-5 text-[#57544E]">
                    Archived format study · separate sample toy · not your output.
                    Use it to judge the motion before requesting private access.
                  </p>
                </div>
                <Link
                  href="/#archive-selector"
                  className="text-[10px] font-black uppercase tracking-[0.16em] text-[#171719] underline decoration-[#F04E30]/60 underline-offset-4 hover:text-[#F04E30]"
                >
                  Explore the Moment archive →
                </Link>
              </div>
              <div className="relative min-h-[250px] overflow-hidden bg-[#171719]">
                <AutoPlayVideo
                  poster="/demos/moon-float.webp"
                  webm="/demos/moon-box-reveal.webm"
                  mp4="/demos/moon-box-reveal.mp4"
                  className="h-full min-h-[250px] w-full object-cover"
                  lazySources
                  label="Archived blind-box reveal format study"
                  showControls
                />
                <span className="pointer-events-none absolute inset-x-3 bottom-3 z-20 bg-black/65 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/85">
                  Archived study · separate sample toy
                </span>
              </div>
            </div>
          </section>

          <aside className="flex min-h-[500px] flex-col border-y border-[#171719]/20 py-6">
            <div className="flex items-center justify-between gap-4 text-[10px] font-black uppercase tracking-[0.18em] text-[#77736C]">
              <span>{moment.toyType}</span>
              <span>{moment.sellerUse}</span>
            </div>

            <div className="my-auto py-8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F04E30]">
                Add your toy
              </p>
              <h2 className="mt-3 max-w-lg font-display text-5xl font-black leading-[0.9] tracking-[-0.06em]">
                Your toy. Its next world.
              </h2>
              <p className="mt-5 max-w-lg text-sm font-semibold leading-6 text-[#57544E]">
                Choose one clear photo of a toy you own or are authorized to use.
                This preview keeps the original photo boundary visible and does not
                fake lighting, shadows, or generation.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <label className="inline-flex min-h-12 cursor-pointer items-center border border-[#171719] bg-[#171719] px-5 text-xs font-black text-[#F5F1E8] transition hover:bg-[#F04E30]">
                  {blob ? "Replace toy photo" : "Drop your toy image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => void onChooseFile(event.target.files?.[0])}
                  />
                </label>
                {blob ? (
                  <button
                    type="button"
                    onClick={() => void clearDraft()}
                    className="min-h-12 border border-[#171719]/25 px-5 text-xs font-black text-[#57544E] hover:border-[#171719] hover:text-[#171719]"
                  >
                    Clear local photo
                  </button>
                ) : null}
              </div>

              {error ? (
                <p className="mt-3 text-xs font-bold text-[#B52C1B]" role="alert">
                  {error}
                </p>
              ) : null}
              <p
                className="mt-4 text-[10px] font-black uppercase tracking-[0.14em] text-[#77736C]"
                data-device-local-truth
              >
                {draftStatus === "ready"
                  ? "Saved in this browser for 24 hours · no upload · no generation · 0 credits"
                  : draftStatus === "tab-only"
                    ? "Local saving is unavailable · preview remains in this tab only"
                    : "Your photo stays on this device · no upload · no generation · 0 credits"}
              </p>
            </div>

            <div className="border-t border-[#171719]/20 pt-5">
              {cta.href ? (
                <Link
                  href={cta.href}
                  className="inline-flex min-h-14 w-full items-center justify-between bg-[#FF5A36] px-5 text-sm font-black text-[#171719] transition hover:bg-[#FF7354]"
                  data-moment-access-cta
                >
                  {cta.label}
                  <span aria-hidden>→</span>
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-14 w-full items-center justify-between bg-[#D7D2C8] px-5 text-sm font-black text-[#78746D]"
                  data-moment-access-cta
                >
                  {cta.label}
                  <span aria-hidden>—</span>
                </button>
              )}
              <p className="mt-3 text-[11px] font-semibold leading-5 text-[#66625B]">
                {cta.note}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export function InvalidMomentNotice() {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#F2EFE7] px-6 py-20 text-[#171719]">
      <div className="mx-auto max-w-xl border-y border-[#171719]/20 py-12">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F04E30]">
          Moment unavailable
        </p>
        <h1 className="mt-4 font-display text-6xl font-black leading-[0.9] tracking-[-0.065em]">
          Choose a real Pikbo moment.
        </h1>
        <p className="mt-5 text-sm font-semibold leading-6 text-[#5B5750]">
          That link does not match a published Moment. Nothing was uploaded or generated.
        </p>
        <Link
          href="/#moment-stage"
          className={cn(
            "mt-8 inline-flex min-h-12 items-center bg-[#171719] px-5 text-xs font-black text-[#F5F1E8]"
          )}
        >
          Explore official moments →
        </Link>
      </div>
    </main>
  );
}
