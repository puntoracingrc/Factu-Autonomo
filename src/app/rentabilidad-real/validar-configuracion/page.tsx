import type { Metadata } from "next";
import { RentabilidadRealAdvisorValidation } from "@/components/rentabilidad-real/RentabilidadRealAdvisorValidation";

export const metadata: Metadata = {
  title: "Validar configuración de Rentabilidad Real",
  description:
    "Resumen local para revisar la configuración de Rentabilidad Real con tu gestor.",
};

export default function RentabilidadRealAdvisorValidationPage() {
  return <RentabilidadRealAdvisorValidation />;
}
