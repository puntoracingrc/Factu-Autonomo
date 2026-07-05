import type { Metadata } from "next";
import { RentabilidadRealWizard } from "@/components/rentabilidad-real/RentabilidadRealWizard";

export const metadata: Metadata = {
  title: "Test de Rentabilidad Real",
  description:
    "Test guiado para detectar el motor de Rentabilidad Real recomendado.",
};

export default function RentabilidadRealTestPage() {
  return <RentabilidadRealWizard />;
}
