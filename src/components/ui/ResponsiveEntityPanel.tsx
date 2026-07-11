"use client";

import { useId, type ReactNode } from "react";
import { X, type LucideIcon } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

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
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={titleId}
      descriptionId={subtitle ? descriptionId : undefined}
      overlayClassName="fixed inset-0 z-50 flex items-stretch justify-end bg-transparent lg:bg-slate-950/35 lg:backdrop-blur-[2px]"
      panelClassName="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl lg:max-w-3xl lg:border-l lg:border-slate-200"
      testId="responsive-entity-panel"
    >
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Icon className="h-5 w-5" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-black text-slate-950">
              {title}
            </h2>
            {subtitle ? (
              <p
                id={descriptionId}
                className="mt-1 text-sm font-medium text-slate-500"
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          aria-label="Cerrar"
          title="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {children}
      </div>
    </Modal>
  );
}
