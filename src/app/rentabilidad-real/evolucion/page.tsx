import type { Metadata } from "next";
import { RentabilidadRealEvolutionDashboard } from "@/components/rentabilidad-real/evolucion/RentabilidadRealEvolutionDashboard";

export const metadata: Metadata = {
  title: "Evolución de Rentabilidad | Rentabilidad Real",
  description:
    "Consulta la evolución mensual o trimestral de rentabilidad real sin guardar snapshots contables.",
};

export default function RentabilidadRealEvolutionPage() {
  return <RentabilidadRealEvolutionDashboard />;
}
