"use client";

import { FactuAvisosEmptyState } from "@/components/recommendations/FactuAvisosEmptyState";
import {
  RecommendationsEmptyHint,
  RecommendationsList,
} from "@/components/recommendations/RecommendationsList";
import { FactuTipsList } from "@/components/recommendations/FactuTipsList";
import type { AppRecommendation } from "@/lib/recommendations";

interface AutomaticosPanelProps {
  alerts: AppRecommendation[];
  factuTips: AppRecommendation[];
}

export function AutomaticosPanel({ alerts, factuTips }: AutomaticosPanelProps) {
  if (alerts.length === 0 && factuTips.length === 0) {
    return (
      <>
        <FactuAvisosEmptyState />
        <RecommendationsEmptyHint />
      </>
    );
  }

  return (
    <div className="space-y-6">
      {factuTips.length > 0 ? (
        <section aria-labelledby="factu-tips-heading">
          <h3
            id="factu-tips-heading"
            className="mb-3 text-base font-bold text-slate-900"
          >
            Descubre la app con Factu
          </h3>
          <FactuTipsList items={factuTips} />
        </section>
      ) : null}

      {alerts.length > 0 ? (
        <section aria-labelledby="auto-alerts-heading">
          <h3
            id="auto-alerts-heading"
            className="mb-3 text-base font-bold text-slate-900"
          >
            Avisos importantes
          </h3>
          <RecommendationsList items={alerts} />
        </section>
      ) : (
        <RecommendationsEmptyHint />
      )}
    </div>
  );
}
