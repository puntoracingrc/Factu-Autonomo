import type { Metadata } from "next";
import { TaxDiagnosticInsightsPanel } from "@/components/admin/TaxDiagnosticInsightsPanel";

export const metadata: Metadata = {
  title: "Uso del diagnóstico fiscal | Administración",
  robots: { index: false, follow: false },
};

export default function TaxDiagnosticInsightsPage() {
  return <TaxDiagnosticInsightsPanel />;
}
