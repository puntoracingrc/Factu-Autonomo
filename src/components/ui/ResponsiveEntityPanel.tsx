"use client";

import { useEffect, type ReactNode } from "react";
import { X, type LucideIcon } from "lucide-react";

interface ResponsiveEntityPanelProps {
  open: boolean;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  onClose: () => void;
  children: ReactNode;
}

export function ResponsiveEntityPanel({
  open,
  title,
  subtitle,
  icon: Icon,
  onClose,
  children,
}: ResponsiveEntityPanelProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" aria-live="polite">
      <button
        type="button"
        className="absolute inset-0 hidden bg-slate-950/35 backdrop-blur-[2px] lg:block"
        aria-label="Cerrar panel"
        onClick={onClose}
      />
      <section className="absolute inset-0 flex items-stretch justify-end">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="responsive-panel-title"
          className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl lg:max-w-3xl lg:border-l lg:border-slate-200"
        >
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              {Icon ? (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon className="h-5 w-5" />
                </span>
              ) : null}
              <div className="min-w-0">
                <h2
                  id="responsive-panel-title"
                  className="text-xl font-black text-slate-950"
                >
                  {title}
                </h2>
                {subtitle ? (
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {children}
          </div>
        </div>
      </section>
    </div>
  );
}
