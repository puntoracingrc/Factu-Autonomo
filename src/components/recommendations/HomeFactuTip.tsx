"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAppRecommendations } from "@/hooks/useAppRecommendations";

/** Un consejo de Factu en Inicio para descubrir funciones de la app. */
export function HomeFactuTip() {
  const { factuTips } = useAppRecommendations();
  const tip = factuTips[0];
  if (!tip) return null;

  return (
    <section className="mb-6" aria-label="Consejo de Factu">
      <Link
        href={tip.href ?? "/avisos"}
        className="block rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-white p-4 transition hover:border-violet-300 hover:shadow-sm"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden>
            🤖
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
              Factu te sugiere
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">{tip.title}</p>
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">
              {tip.message}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 self-center text-sm font-semibold text-violet-700">
            Ver
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </section>
  );
}
