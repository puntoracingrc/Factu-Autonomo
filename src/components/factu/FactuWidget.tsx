"use client";

import { useEffect, useState } from "react";
import { pickFactuJoke } from "@/lib/factu/copy";
import { dismissFactuWidget } from "@/lib/factu/occasional";

interface FactuWidgetProps {
  onDismiss?: () => void;
}

export function FactuWidget({ onDismiss }: FactuWidgetProps) {
  const [bubbleText, setBubbleText] = useState<string | null>(null);

  useEffect(() => {
    if (!bubbleText) return;
    const timer = window.setTimeout(() => setBubbleText(null), 4500);
    return () => window.clearTimeout(timer);
  }, [bubbleText]);

  function triggerJoke() {
    setBubbleText(pickFactuJoke());
  }

  function handleDismiss() {
    dismissFactuWidget();
    onDismiss?.();
  }

  return (
    <div className="factu-widget-bar pointer-events-none fixed left-0 right-0 z-20 mx-auto max-w-3xl px-4 factu-widget-offset">
      <div className="pointer-events-auto relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 pr-12 shadow-lg backdrop-blur-md">
        {bubbleText ? (
          <div
            className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl transition-opacity duration-200"
            role="status"
          >
            <p className="text-xs font-medium leading-normal text-slate-600">
              &ldquo;{bubbleText}&rdquo;
            </p>
            <p className="mt-1 text-[10px] font-semibold text-blue-600">— Factu</p>
          </div>
        ) : null}

        <button
          onClick={triggerJoke}
          type="button"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xl transition-transform hover:bg-slate-100 active:scale-95"
          title="Hablar con Factu"
          aria-label="Hablar con Factu, asistente de facturación"
        >
          <span aria-hidden>🤖</span>
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
        </button>

        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-xs font-bold text-slate-800">Factu</p>
          <p className="truncate text-[10px] font-semibold text-blue-600">
            Veri Legal y Very Bonito
          </p>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Cerrar Factu"
          title="Cerrar Factu"
        >
          ×
        </button>
      </div>
    </div>
  );
}
