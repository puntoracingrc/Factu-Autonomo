import type { ReactNode } from "react";
import {
  FACTU_EMPTY_MESSAGES,
  type FactuEmptyVariant,
} from "@/lib/factu/copy";

interface FactuEmptyStateProps {
  variant: FactuEmptyVariant;
  message?: string;
  action?: ReactNode;
}

export function FactuEmptyState({
  variant,
  message,
  action,
}: FactuEmptyStateProps) {
  const text = message ?? FACTU_EMPTY_MESSAGES[variant];

  return (
    <div className="my-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
      <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-slate-100 bg-white shadow-md">
        <span className="text-3xl" aria-hidden>
          🤖
        </span>
        <span className="absolute -right-1 -top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-xs font-bold text-white">
          €
        </span>
      </div>
      <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium leading-relaxed text-slate-700">
          &ldquo;{text}&rdquo;
        </p>
        <p className="mt-2 text-xs font-semibold text-blue-600">— Factu</p>
      </div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
