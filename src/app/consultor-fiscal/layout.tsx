import { AdvisorAreaNavigation } from "@/components/consultor-fiscal/AdvisorAreaNavigation";
import { isConsultorFiscalEnabled } from "@/lib/expense-deductibility/config";

export default function ConsultorFiscalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AdvisorAreaNavigation
        expenseAnalysisEnabled={isConsultorFiscalEnabled()}
      />
      {children}
    </>
  );
}
