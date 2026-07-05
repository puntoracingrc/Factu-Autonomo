import { roundMoney } from "@/lib/calculations";
import type { RentabilidadRealCalculationWarning } from "@/lib/rentabilidad-real/calculation";
import type {
  RentabilidadRealClientProfitabilityReport,
  RentabilidadRealClientReportRow,
  RentabilidadRealClientReportSort,
  RentabilidadRealDocumentReportRow,
} from "./types";

function warning(
  code: string,
  message: string,
  severity: RentabilidadRealCalculationWarning["severity"] = "info",
): RentabilidadRealCalculationWarning {
  return { code, message, severity };
}

function weightedMargin(operatingProfit: number, income: number): number {
  if (!Number.isFinite(income) || income <= 0) return 0;
  return roundMoney((operatingProfit / income) * 100);
}

function warningsForClient(row: RentabilidadRealClientReportRow) {
  const warnings: RentabilidadRealCalculationWarning[] = [];
  if (row.negativeProfitDocumentsCount > 0) {
    warnings.push(
      warning(
        "client_has_negative_profit_documents",
        "Este cliente tiene documentos con beneficio negativo.",
        "warning",
      ),
    );
  }
  if (row.lowMarginDocumentsCount > 0) {
    warnings.push(
      warning(
        "client_has_low_margin_documents",
        "Este cliente tiene documentos con margen bajo.",
        "warning",
      ),
    );
  }
  if (row.unlinkedCandidatesCount > 0) {
    warnings.push(
      warning(
        "client_has_unlinked_candidate_expenses",
        "Hay gastos candidatos sin enlazar que podrían afectar a este cliente.",
        "info",
      ),
    );
  }
  if (row.internalRealProfit < row.operatingProfit) {
    warnings.push(
      warning(
        "client_internal_profit_lower_than_documented",
        "El beneficio interno es menor que el beneficio documentado.",
        "info",
      ),
    );
  }
  return warnings;
}

export function buildClientProfitabilityReport(
  documentRows: readonly RentabilidadRealDocumentReportRow[],
): RentabilidadRealClientProfitabilityReport {
  const grouped = new Map<string, RentabilidadRealClientReportRow>();

  for (const row of documentRows) {
    const clientId = row.clientId || "unknown_client";
    const current = grouped.get(clientId) ?? {
      clientId,
      clientName: row.clientName || "Cliente sin identificar",
      documentCount: 0,
      invoiceCount: 0,
      quoteOnlyCount: 0,
      incomeWithoutIndirectTax: 0,
      totalDirectCosts: 0,
      allocatedFixedCosts: 0,
      operatingProfit: 0,
      averageMarginPercentage: 0,
      estimatedVatToReserve: 0,
      estimatedIrpfProvision: 0,
      prudentAvailableCash: 0,
      internalAdjustmentsTotal: 0,
      internalRealProfit: 0,
      internalPrudentAvailableCash: 0,
      lowMarginDocumentsCount: 0,
      negativeProfitDocumentsCount: 0,
      unlinkedCandidatesCount: 0,
      warnings: [],
    };

    current.documentCount += 1;
    current.invoiceCount += row.sourceType === "quote" ? 0 : 1;
    current.quoteOnlyCount += row.sourceType === "quote" ? 1 : 0;
    current.incomeWithoutIndirectTax = roundMoney(
      current.incomeWithoutIndirectTax + row.incomeWithoutIndirectTax,
    );
    current.totalDirectCosts = roundMoney(
      current.totalDirectCosts + row.totalDirectCosts,
    );
    current.allocatedFixedCosts = roundMoney(
      current.allocatedFixedCosts + row.allocatedFixedCosts,
    );
    current.operatingProfit = roundMoney(
      current.operatingProfit + row.operatingProfit,
    );
    current.estimatedVatToReserve = roundMoney(
      current.estimatedVatToReserve + row.estimatedVatToReserve,
    );
    current.estimatedIrpfProvision = roundMoney(
      current.estimatedIrpfProvision + row.estimatedIrpfProvision,
    );
    current.prudentAvailableCash = roundMoney(
      current.prudentAvailableCash + row.prudentAvailableCash,
    );
    current.internalAdjustmentsTotal = roundMoney(
      current.internalAdjustmentsTotal + row.internalAdjustmentsTotal,
    );
    current.internalRealProfit = roundMoney(
      current.internalRealProfit + row.internalRealProfit,
    );
    current.internalPrudentAvailableCash = roundMoney(
      current.internalPrudentAvailableCash + row.internalPrudentAvailableCash,
    );
    current.lowMarginDocumentsCount += row.qualityFlags.includes("low_margin")
      ? 1
      : 0;
    current.negativeProfitDocumentsCount += row.qualityFlags.includes(
      "negative_profit",
    )
      ? 1
      : 0;
    current.unlinkedCandidatesCount += row.unlinkedCandidatesCount;

    grouped.set(clientId, current);
  }

  const rows = Array.from(grouped.values()).map((row) => {
    const completed = {
      ...row,
      averageMarginPercentage: weightedMargin(
        row.operatingProfit,
        row.incomeWithoutIndirectTax,
      ),
    };
    return {
      ...completed,
      warnings: warningsForClient(completed),
    };
  });
  const sortedByProfit = sortClientReportRows(rows, "profit_desc");

  return {
    rows: sortClientReportRows(rows, "profit_desc"),
    mostProfitableClient: sortedByProfit[0],
    leastProfitableClient: sortedByProfit[sortedByProfit.length - 1],
    clientWithMostLowMarginDocuments: sortClientReportRows(
      rows,
      "low_margin_desc",
    )[0],
    clientWithMostUnlinkedCandidates: sortClientReportRows(
      rows,
      "unlinked_candidates_desc",
    )[0],
    clientsWithInternalProfitLowerThanDocumented: rows
      .filter((row) => row.internalRealProfit < row.operatingProfit)
      .map((row) => ({ ...row, warnings: [...row.warnings] })),
  };
}

export function sortClientReportRows(
  rows: readonly RentabilidadRealClientReportRow[],
  sort: RentabilidadRealClientReportSort = "profit_desc",
): RentabilidadRealClientReportRow[] {
  const result = rows.map((row) => ({ ...row, warnings: [...row.warnings] }));
  return result.sort((a, b) => {
    if (sort === "profit_asc") return a.operatingProfit - b.operatingProfit;
    if (sort === "income_desc") {
      return b.incomeWithoutIndirectTax - a.incomeWithoutIndirectTax;
    }
    if (sort === "margin_asc") {
      return a.averageMarginPercentage - b.averageMarginPercentage;
    }
    if (sort === "low_margin_desc") {
      return b.lowMarginDocumentsCount - a.lowMarginDocumentsCount;
    }
    if (sort === "unlinked_candidates_desc") {
      return b.unlinkedCandidatesCount - a.unlinkedCandidatesCount;
    }
    if (sort === "client") return a.clientName.localeCompare(b.clientName);
    return b.operatingProfit - a.operatingProfit;
  });
}
