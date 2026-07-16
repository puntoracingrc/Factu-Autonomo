import { createElement } from "react";
import { FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1 } from "@/lib/fiscal-notifications/guide/catalog.v1";

export function FiscalNotificationGuideCoverageSummary() {
  const automaticGuideCount = FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1.filter(
    (entry) => entry.recognitionMode === "AUTOMATIC_REVIEW_ONLY",
  ).length;
  const manualGuideCount =
    FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1.length - automaticGuideCount;

  return createElement(
    "p",
    { className: "mt-1 text-sm leading-6 text-amber-900 dark:text-amber-200" },
    `Hay ${FISCAL_NOTIFICATION_GUIDE_ENTRIES_V1.length} guías explicadas: ${automaticGuideCount} con lectura automática y revisión obligatoria, y ${manualGuideCount} disponibles para consulta manual, sin lectura automática. La guía no paga, recurre ni cambia datos por sí sola: te ayuda a entender el documento y deja visibles las fuentes oficiales.`,
  );
}
