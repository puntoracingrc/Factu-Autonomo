import type { Metadata } from "next";
import { RentabilidadRealReportsDashboard } from "@/components/rentabilidad-real/informes/RentabilidadRealReportsDashboard";

export const metadata: Metadata = {
  title: "Informes de Rentabilidad | Rentabilidad Real",
  description:
    "Analiza rentabilidad por documento, cliente y calidad de datos sin duplicar contabilidad.",
};

export default function RentabilidadRealReportsPage() {
  return <RentabilidadRealReportsDashboard />;
}
