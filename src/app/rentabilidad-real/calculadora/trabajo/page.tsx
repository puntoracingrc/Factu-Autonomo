import type { Metadata } from "next";
import { RentabilidadRealWorkCalculator } from "@/components/rentabilidad-real/calculadora/RentabilidadRealWorkCalculator";

export const metadata: Metadata = {
  title: "Calculadora de trabajo | Rentabilidad Real",
  description:
    "Calcula la rentabilidad de una obra o servicio usando presupuestos, facturas y gastos existentes.",
};

export default function RentabilidadRealWorkCalculatorPage() {
  return <RentabilidadRealWorkCalculator />;
}
