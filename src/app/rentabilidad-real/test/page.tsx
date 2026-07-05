import type { Metadata } from "next";
import { RentabilidadRealWizard } from "@/components/rentabilidad-real/RentabilidadRealWizard";

export const metadata: Metadata = {
  title: "Test de Rentabilidad Real",
  description:
    "Test guiado para detectar los modos de Rentabilidad Real recomendados.",
};

export default function RentabilidadRealTestPage() {
  return <RentabilidadRealWizard />;
}
