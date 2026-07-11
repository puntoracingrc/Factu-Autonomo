import { roundMoney } from "@/lib/calculations";
import type { TaxSummary } from "@/lib/taxes";
import type { ProfitabilityTaxContext } from "./types";

export function mapExistingTaxSummaryToProfitabilityTaxContext(
  summary: TaxSummary,
): ProfitabilityTaxContext {
  return {
    vatExempt: summary.vatExempt,
    salesBase: roundMoney(summary.salesBase),
    salesIva: roundMoney(summary.salesIva),
    expenseBase: roundMoney(summary.expenseBase),
    expenseIva: roundMoney(summary.expenseIva),
    netIva: roundMoney(summary.netIva),
    ivaToPay: roundMoney(summary.ivaToPay),
    ivaCredit: roundMoney(summary.ivaCredit),
    grossProfit: roundMoney(summary.grossProfit),
    irpfPercent: summary.irpfPercent,
    irpfEstimate: roundMoney(summary.irpfEstimate),
    profitAfterIrpfReserve: roundMoney(summary.profitAfterIrpfReserve),
    sourceLink: {
      sourceType: "tax_summary",
      label: "Resumen fiscal",
      href: "/impuestos",
    },
  };
}
