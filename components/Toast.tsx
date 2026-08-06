"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ToastItem = { id: number; text: string };

const ToastCtx = createContext<(text: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((text: string) => {
    const id = Date.now();
    setItems((prev) => [...prev, { id, text }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {/*
        Clearance follows shell chrome via --toast-stack-clearance (AIT-286):
        tab surfaces → mobile-nav-clearance; nav-less → floating-cta-safe-bottom.
        Desktop keeps a simple inset (lg:bottom-6).
      */}
      <div
        data-toast-stack="safe"
        className="pointer-events-none fixed bottom-[var(--toast-stack-clearance)] right-4 z-[120] flex max-w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 lg:bottom-6"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-xl border border-[var(--mint)]/25 bg-[#0c0c10]/95 px-4 py-2.5 text-sm font-medium text-white shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8),0_0_24px_rgba(200,255,61,0.08)] backdrop-blur-md"
          >
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[var(--mint)] shadow-[0_0_8px_rgba(200,255,61,0.8)]" />
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
