import type { Metadata } from "next";
import { RentabilidadRealPriceSimulator } from "@/components/rentabilidad-real/simulador/RentabilidadRealPriceSimulator";

export const metadata: Metadata = {
  title: "Simulador de Precio Mínimo | Rentabilidad Real",
  description:
    "Simula precio mínimo por hora, trabajo, proyecto o facturación mensual con Rentabilidad Real.",
};

export default function RentabilidadRealPriceSimulatorPage() {
  return <RentabilidadRealPriceSimulator />;
}
