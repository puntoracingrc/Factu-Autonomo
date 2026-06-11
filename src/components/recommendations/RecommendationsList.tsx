"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FactuAvisosEmptyState } from "@/components/recommendations/FactuAvisosEmptyState";
import {
  CATEGORY_LABELS,
  priorityStyles,
  type AppRecommendation,
  type RecommendationPriority,
} from "@/lib/recommendations";

const PRIORITY_LABELS: Record<RecommendationPriority, string> = {
  critical: "Urgente",
  warning: "Importante",
  info: "Aviso",
  tip: "Consejo",
};

interface RecommendationsListProps {
  items: AppRecommendation[];
}

export function RecommendationsList({
  items,
}: RecommendationsListProps) {
  if (items.length === 0) {
    return <FactuAvisosEmptyState />;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const styles = priorityStyles(item.priority);
        return (
          <li key={item.id}>
            <Card className={`${styles.card} p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles.badge}`}
                    >
                      {PRIORITY_LABELS[item.priority]}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {CATEGORY_LABELS[item.category]}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-700">{item.message}</p>
                </div>
                {item.href && (
                  <Link
                    href={item.href}
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white/80 px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:bg-white"
                  >
                    {item.actionLabel ?? "Ver"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

export function RecommendationsEmptyHint() {
  return (
    <Card className="mt-6 border-slate-200 bg-slate-50">
      <div>
        <p className="font-semibold text-slate-800">¿Qué aparece aquí?</p>
        <p className="mt-1 text-sm text-slate-600">
          Recordatorios de perfil, facturas impagadas, gastos fijos, plazos
          fiscales, límites del plan y consejos de Factu para funciones que aún
          no has probado.
        </p>
        <ButtonLink href="/ayuda/inicio" variant="secondary" className="mt-3">
          Ver ayuda de inicio
        </ButtonLink>
      </div>
    </Card>
  );
}
