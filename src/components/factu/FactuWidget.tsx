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
    <div className="factu-widget-bar pointer-events-none fixed right-4 z-20 hidden factu-widget-offset sm:block sm:right-6">
      <div className="pointer-events-auto relative flex items-center gap-2">
        {bubbleText ? (
          <div
            className="absolute bottom-full right-0 mb-2 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl transition-opacity duration-200"
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
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white/95 text-xl shadow-lg backdrop-blur-md transition-transform hover:border-blue-200 hover:bg-blue-50 active:scale-95"
          title="Hablar con Factu"
          aria-label="Hablar con Factu, asistente de facturación"
        >
          <span aria-hidden>🤖</span>
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-slate-400 shadow-md backdrop-blur-md hover:bg-slate-100 hover:text-slate-700"
          aria-label="Cerrar Factu"
          title="Cerrar Factu"
        >
          ×
        </button>
      </div>
    </div>
  );
}
