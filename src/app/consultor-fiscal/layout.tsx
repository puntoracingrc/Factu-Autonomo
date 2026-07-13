import { AdvisorAreaNavigation } from "@/components/consultor-fiscal/AdvisorAreaNavigation";
import { isConsultorFiscalEnabled } from "@/lib/expense-deductibility/config";

export default function ConsultorFiscalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const consultorFiscalEnabled = isConsultorFiscalEnabled();
  return (
    <>
      <AdvisorAreaNavigation
        expenseAnalysisEnabled={consultorFiscalEnabled}
        notificationsEnabled
      />
      {children}
    </>
  );
}
