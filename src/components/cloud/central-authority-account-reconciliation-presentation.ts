import type {
  CentralInvoiceAuthorityAccountSeriesReconciliationClientResult,
} from "@/lib/central-invoice-authority/account-series-reconciliation-client";

export type CentralInvoiceAuthorityAccountReconciliationNotice = {
  tone: "success" | "warning" | "error";
  message: string;
};

export function describeCentralInvoiceAuthorityAccountReconciliation(
  result: CentralInvoiceAuthorityAccountSeriesReconciliationClientResult,
): CentralInvoiceAuthorityAccountReconciliationNotice {
  if (!result.ok) {
    return {
      tone: result.status === 409 ? "warning" : "error",
      message: result.message,
    };
  }
  const committed = result.results.filter(
    (entry) => entry.status === "committed",
  ).length;
  const replayed = result.results.length - committed;
  return {
    tone: "success",
    message: `${result.results.length} series verificadas: ${committed} actualizadas y ${replayed} ya conciliadas.`,
  };
}
