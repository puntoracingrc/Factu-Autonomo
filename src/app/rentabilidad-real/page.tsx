import type { Metadata } from "next";
import { RentabilidadRealShell } from "@/components/rentabilidad-real/RentabilidadRealShell";

export const metadata: Metadata = {
  title: "Rentabilidad Real",
  description:
    "Marketplace interno de módulos para medir rentabilidad real de autónomos persona física hasta nivel 4.",
};

export default function RentabilidadRealPage() {
  return <RentabilidadRealShell />;
}
