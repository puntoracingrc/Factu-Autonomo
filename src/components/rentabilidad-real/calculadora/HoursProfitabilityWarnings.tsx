"use client";

import { WorkProfitabilityWarnings } from "./WorkProfitabilityWarnings";
import type { RentabilidadRealCalculationWarning } from "@/lib/rentabilidad-real/calculation";

export function HoursProfitabilityWarnings({
  warnings,
}: {
  warnings: RentabilidadRealCalculationWarning[];
}) {
  return <WorkProfitabilityWarnings warnings={warnings} />;
}
