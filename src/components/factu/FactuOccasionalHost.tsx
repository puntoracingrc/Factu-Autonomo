"use client";

import { useEffect, useState } from "react";
import { FACTU_TOAST_EVENT } from "@/lib/factu/occasional";

interface ToastState {
  message: string;
  durationMs: number;
}

export function FactuOccasionalHost() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    function onToast(event: Event) {
      const custom = event as CustomEvent<ToastState>;
      if (!custom.detail?.message) return;
      setToast(custom.detail);
    }

    window.addEventListener(FACTU_TOAST_EVENT, onToast);
    return () => window.removeEventListener(FACTU_TOAST_EVENT, onToast);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.durationMs);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-16 z-40 mx-auto max-w-3xl px-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-md">
        <span className="text-xl" aria-hidden>
          🤖
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-slate-700">
            {toast.message}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-blue-600">Factu</p>
        </div>
      </div>
    </div>
  );
}
