import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExpenseDeductibilityAnalyzer } from "@/components/consultor-fiscal/ExpenseDeductibilityAnalyzer";
import { isFiscalAiFallbackEnabled } from "@/lib/expense-deductibility/ai-fallback/server-config";
import { isConsultorFiscalEnabled } from "@/lib/expense-deductibility/config";

export const metadata: Metadata = {
  title: "Consultor fiscal",
  description:
    "Analizador Beta de gastos deducibles para autónomos en IRPF e IVA.",
};

export default function ConsultorFiscalPage() {
  if (!isConsultorFiscalEnabled()) notFound();

  return (
    <ExpenseDeductibilityAnalyzer
      aiFallbackEnabled={isFiscalAiFallbackEnabled()}
    />
  );
}
