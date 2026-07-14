import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TaxModelDiagnosticWizard } from "@/components/tax-model-diagnostic/TaxModelDiagnosticWizard";
import { isTaxModelDiagnosticEnabled } from "@/lib/tax-model-diagnostic/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Configurar mi actividad fiscal",
  description:
    "Cuestionario orientativo para identificar los modelos tributarios que puede necesitar una actividad.",
  robots: { index: false, follow: false },
};

export default function TaxModelDiagnosticPage() {
  if (!isTaxModelDiagnosticEnabled()) notFound();
  return <TaxModelDiagnosticWizard />;
}

