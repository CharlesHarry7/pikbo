"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DeliveryItem } from "@/lib/deliveryPack";
import { deliveryChecklistStorageKey } from "@/lib/deliveryPack";
import { markActivationShared } from "@/components/ActivationChecklist";
import { useI18n } from "@/components/LanguageProvider";

/**
 * Interactive post-success checklist — ticks stay on this device (sessionStorage).
 * Not fake "posted" analytics; seller self-checks export/post jobs.
 */
export function DeliveryChecklist({
  title = "Delivery · next steps",
  surface,
  items,
  className = "",
}: {
  title?: string;
  /** Namespaces sessionStorage — e.g. create:etsy-listing · seller-pack */
  surface: string;
  items: DeliveryItem[];
  className?: string;
}) {
  const { t } = useI18n();
  const storageKey = useMemo(
    () => deliveryChecklistStorageKey(surface),
    [surface]
  );
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (!raw) {
          setChecked({});
          return;
        }
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        setChecked(parsed && typeof parsed === "object" ? parsed : {});
      } catch {
        setChecked({});
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [storageKey]);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      if (next[id] && (id === "download" || id === "export" || id === "post")) {
        markActivationShared();
      }
      return next;
    });
  }

  if (items.length === 0) return null;

  const done = items.filter((it) => checked[it.id]).length;
  const pct = Math.round((done / items.length) * 100);
  const allDone = done === items.length;

  return (
    <div
      className={`rounded-2xl border px-3.5 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm ${
        allDone
          ? "border-[var(--neon-pink)]/35 bg-[var(--neon-pink)]/[0.08]"
          : "border-white/10 bg-black/55"
      } ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--neon-pink)]/90">
          {title}
          <span className="ml-1.5 font-semibold normal-case tracking-normal text-white/45">
            · {done}/{items.length}
          </span>
        </p>
        {done > 0 ? (
          <button
            type="button"
            className="text-[10px] text-white/35 hover:text-white/60"
            onClick={() => {
              setChecked({});
              try {
                sessionStorage.removeItem(storageKey);
              } catch {
                /* ignore */
              }
            }}
          >
            {t("delivery.reset")}
          </button>
        ) : null}
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[var(--neon-pink)] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-2.5 space-y-1.5 text-[11px] text-white/65">
        {items.map((item) => {
          const ok = Boolean(checked[item.id]);
          return (
            <li
              key={item.id}
              className={`flex gap-2 rounded-lg px-1.5 py-1 transition ${
                ok ? "bg-white/[0.02]" : "hover:bg-white/[0.03]"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border text-[9px] font-black transition ${
                  ok
                    ? "border-[var(--neon-pink)]/60 bg-[var(--neon-pink)] text-[var(--void)] shadow-[0_0_10px_rgba(255,78,205,0.35)]"
                    : "border-white/25 bg-black/40 text-transparent hover:border-[var(--neon-pink)]/40"
                }`}
                aria-pressed={ok}
                aria-label={ok ? `Unmark ${item.label}` : `Mark ${item.label}`}
              >
                ✓
              </button>
              {item.href ? (
                <Link
                  href={item.href}
                  className={`font-medium hover:underline ${
                    ok ? "text-white/40 line-through" : "text-[var(--neon-pink)]"
                  }`}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={`text-left ${
                    ok ? "text-white/40 line-through" : "text-white/75"
                  }`}
                >
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {allDone ? (
        <p className="mt-2 text-[10px] font-semibold leading-snug text-[var(--neon-pink)]/90">
          {t("delivery.complete")}
        </p>
      ) : (
        <p className="mt-2 text-[10px] leading-snug text-white/35">
          {t("delivery.footer")}
        </p>
      )}
    </div>
  );
}
