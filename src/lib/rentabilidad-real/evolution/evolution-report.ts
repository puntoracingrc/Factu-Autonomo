import { roundMoney } from "@/lib/calculations";
import type { AppData } from "@/lib/types";
import { RENTABILIDAD_REAL_DOCUMENT_ANALYSIS_MODES } from "@/lib/rentabilidad-real/document-analysis-modes";
import {
  buildDocumentProfitabilityReport,
  type RentabilidadRealDocumentReportRow,
} from "@/lib/rentabilidad-real/reports";
import type {
  RentabilidadRealEvolutionGrouping,
  RentabilidadRealEvolutionModeBreakdownRow,
  RentabilidadRealEvolutionPeriodRow,
  RentabilidadRealEvolutionReport,
  RentabilidadRealEvolutionReportSettings,
  RentabilidadRealEvolutionSummary,
} from "./types";

const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

interface ParsedDateParts {
  year: number;
  month: number;
  day: number;
}

function parseDateParts(date: string): ParsedDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  return { year, month, day };
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function periodForDate(
  date: string,
  grouping: RentabilidadRealEvolutionGrouping,
): {
  periodId: string;
  periodLabel: string;
  periodStartDate: string;
  periodEndDate: string;
} {
  const parsed = parseDateParts(date);
  if (!parsed) {
    return {
      periodId: "sin-fecha",
      periodLabel: "Sin fecha",
      periodStartDate: "0000-01-01",
      periodEndDate: "0000-12-31",
    };
  }

  if (grouping === "quarterly") {
    const quarter = Math.floor((parsed.month - 1) / 3) + 1;
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    return {
      periodId: `${parsed.year}-Q${quarter}`,
      periodLabel: `${quarter}T ${parsed.year}`,
      periodStartDate: isoDate(parsed.year, startMonth, 1),
      periodEndDate: isoDate(
        parsed.year,
        endMonth,
        lastDayOfMonth(parsed.year, endMonth),
      ),
    };
  }

  return {
    periodId: `${parsed.year}-${String(parsed.month).padStart(2, "0")}`,
    periodLabel: `${MONTH_LABELS[parsed.month - 1]} ${parsed.year}`,
    periodStartDate: isoDate(parsed.year, parsed.month, 1),
    periodEndDate: isoDate(
      parsed.year,
      parsed.month,
      lastDayOfMonth(parsed.year, parsed.month),
    ),
  };
}

function emptyPeriodRow(
  row: RentabilidadRealDocumentReportRow,
  grouping: RentabilidadRealEvolutionGrouping,
): RentabilidadRealEvolutionPeriodRow {
  return {
    ...periodForDate(row.date, grouping),
    documentCount: 0,
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
    documentsWithoutAnalysisMode: 0,
    modeBreakdown: [],
  };
}

function addDocumentRowToPeriod(
  period: RentabilidadRealEvolutionPeriodRow,
  row: RentabilidadRealDocumentReportRow,
): void {
  period.documentCount += 1;
  period.incomeWithoutIndirectTax = roundMoney(
    period.incomeWithoutIndirectTax + row.incomeWithoutIndirectTax,
  );
  period.totalDirectCosts = roundMoney(
    period.totalDirectCosts + row.totalDirectCosts,
  );
  period.allocatedFixedCosts = roundMoney(
    period.allocatedFixedCosts + row.allocatedFixedCosts,
  );
  period.operatingProfit = roundMoney(period.operatingProfit + row.operatingProfit);
  period.estimatedVatToReserve = roundMoney(
    period.estimatedVatToReserve + row.estimatedVatToReserve,
  );
  period.estimatedIrpfProvision = roundMoney(
    period.estimatedIrpfProvision + row.estimatedIrpfProvision,
  );
  period.prudentAvailableCash = roundMoney(
    period.prudentAvailableCash + row.prudentAvailableCash,
  );
  period.internalAdjustmentsTotal = roundMoney(
    period.internalAdjustmentsTotal + row.internalAdjustmentsTotal,
  );
  period.internalRealProfit = roundMoney(
    period.internalRealProfit + row.internalRealProfit,
  );
  period.internalPrudentAvailableCash = roundMoney(
    period.internalPrudentAvailableCash + row.internalPrudentAvailableCash,
  );
  period.lowMarginDocumentsCount += row.qualityFlags.includes("low_margin") ? 1 : 0;
  period.negativeProfitDocumentsCount += row.qualityFlags.includes(
    "negative_profit",
  )
    ? 1
    : 0;
  period.unlinkedCandidatesCount += row.unlinkedCandidatesCount;
  period.documentsWithoutAnalysisMode += row.analysisMode === "unknown" ? 1 : 0;
}

function modeBreakdownForRows(
  rows: readonly RentabilidadRealDocumentReportRow[],
): RentabilidadRealEvolutionModeBreakdownRow[] {
  return RENTABILIDAD_REAL_DOCUMENT_ANALYSIS_MODES.map((mode) => {
    const matchingRows = rows.filter((row) => row.analysisMode === mode);
    return {
      analysisMode: mode,
      documentCount: matchingRows.length,
      incomeWithoutIndirectTax: roundMoney(
        matchingRows.reduce(
          (total, row) => total + row.incomeWithoutIndirectTax,
          0,
        ),
      ),
      operatingProfit: roundMoney(
        matchingRows.reduce((total, row) => total + row.operatingProfit, 0),
      ),
    };
  }).filter((item) => item.documentCount > 0);
}

function finalizePeriodRow(
  period: RentabilidadRealEvolutionPeriodRow,
  rows: readonly RentabilidadRealDocumentReportRow[],
): RentabilidadRealEvolutionPeriodRow {
  return {
    ...period,
    averageMarginPercentage:
      period.incomeWithoutIndirectTax > 0
        ? roundMoney(
            (period.operatingProfit / period.incomeWithoutIndirectTax) * 100,
          )
        : 0,
    modeBreakdown: modeBreakdownForRows(rows),
  };
}

function buildSummary(
  rows: readonly RentabilidadRealEvolutionPeriodRow[],
): RentabilidadRealEvolutionSummary {
  const incomeWithoutIndirectTax = roundMoney(
    rows.reduce((total, row) => total + row.incomeWithoutIndirectTax, 0),
  );
  const operatingProfit = roundMoney(
    rows.reduce((total, row) => total + row.operatingProfit, 0),
  );

  return {
    periodCount: rows.length,
    documentCount: rows.reduce((total, row) => total + row.documentCount, 0),
    incomeWithoutIndirectTax,
    totalDirectCosts: roundMoney(
      rows.reduce((total, row) => total + row.totalDirectCosts, 0),
    ),
    allocatedFixedCosts: roundMoney(
      rows.reduce((total, row) => total + row.allocatedFixedCosts, 0),
    ),
    operatingProfit,
    averageMarginPercentage:
      incomeWithoutIndirectTax > 0
        ? roundMoney((operatingProfit / incomeWithoutIndirectTax) * 100)
        : 0,
    estimatedVatToReserve: roundMoney(
      rows.reduce((total, row) => total + row.estimatedVatToReserve, 0),
    ),
    estimatedIrpfProvision: roundMoney(
      rows.reduce((total, row) => total + row.estimatedIrpfProvision, 0),
    ),
    prudentAvailableCash: roundMoney(
      rows.reduce((total, row) => total + row.prudentAvailableCash, 0),
    ),
    internalAdjustmentsTotal: roundMoney(
      rows.reduce((total, row) => total + row.internalAdjustmentsTotal, 0),
    ),
    internalRealProfit: roundMoney(
      rows.reduce((total, row) => total + row.internalRealProfit, 0),
    ),
    internalPrudentAvailableCash: roundMoney(
      rows.reduce((total, row) => total + row.internalPrudentAvailableCash, 0),
    ),
    lowMarginDocumentsCount: rows.reduce(
      (total, row) => total + row.lowMarginDocumentsCount,
      0,
    ),
    negativeProfitDocumentsCount: rows.reduce(
      (total, row) => total + row.negativeProfitDocumentsCount,
      0,
    ),
    unlinkedCandidatesCount: rows.reduce(
      (total, row) => total + row.unlinkedCandidatesCount,
      0,
    ),
    documentsWithoutAnalysisMode: rows.reduce(
      (total, row) => total + row.documentsWithoutAnalysisMode,
      0,
    ),
  };
}

export function buildRentabilidadRealEvolutionReport(
  appData: AppData,
  settings: RentabilidadRealEvolutionReportSettings,
): RentabilidadRealEvolutionReport {
  const documentReport = buildDocumentProfitabilityReport(
    appData,
    settings.documentReportSettings,
  );
  const grouped = new Map<
    string,
    {
      period: RentabilidadRealEvolutionPeriodRow;
      rows: RentabilidadRealDocumentReportRow[];
    }
  >();

  for (const row of documentReport.rows) {
    const period = periodForDate(row.date, settings.grouping);
    const current =
      grouped.get(period.periodId) ??
      {
        period: emptyPeriodRow(row, settings.grouping),
        rows: [],
      };
    addDocumentRowToPeriod(current.period, row);
    current.rows.push(row);
    grouped.set(period.periodId, current);
  }

  const rows = Array.from(grouped.values())
    .map((item) => finalizePeriodRow(item.period, item.rows))
    .sort((a, b) => b.periodStartDate.localeCompare(a.periodStartDate));

  return {
    rows,
    summary: buildSummary(rows),
    warnings: documentReport.warnings,
  };
}
