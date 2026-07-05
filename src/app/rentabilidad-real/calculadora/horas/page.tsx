import type { Metadata } from "next";
import { RentabilidadRealHoursCalculator } from "@/components/rentabilidad-real/calculadora/RentabilidadRealHoursCalculator";

export const metadata: Metadata = {
  title: "Calculadora por horas | Rentabilidad Real",
  description:
    "Calcula rentabilidad por hora real trabajada usando documentos existentes o simulación local.",
};

export default function RentabilidadRealHoursCalculatorPage() {
  return <RentabilidadRealHoursCalculator />;
}
