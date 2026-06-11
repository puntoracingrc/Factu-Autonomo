"use client";

import { PageHeader } from "@/components/ui/Card";
import {
  RecommendationsEmptyHint,
  RecommendationsList,
} from "@/components/recommendations/RecommendationsList";
import { useAppRecommendations } from "@/hooks/useAppRecommendations";

export default function AvisosPage() {
  const { recommendations, count } = useAppRecommendations();

  return (
    <div>
      <PageHeader
        title="Avisos y recomendaciones"
        subtitle={
          count > 0
            ? `${count} aviso${count === 1 ? "" : "s"} según tu actividad reciente`
            : "Revisa aquí recordatorios útiles mientras usas la app"
        }
      />

      <RecommendationsList items={recommendations} />

      {count === 0 ? <RecommendationsEmptyHint /> : null}
    </div>
  );
}
