import { documentTotals, roundMoney } from "@/lib/calculations";
import { isFixedExpense } from "@/lib/expense-classification";
import {
  buildRentabilidadRealWorkProfitabilityInputFromExistingData,
  calculateRentabilidadRealWorkProfitability,
  type RentabilidadRealCalculationWarning,
  type RentabilidadRealFixedCostAllocationMethod,
} from "@/lib/rentabilidad-real/calculation";
import {
  getInternalAdjustmentsForSource,
  summarizeInternalAdjustments,
} from "@/lib/rentabilidad-real/internal-adjustments";
import type { AppData, Document } from "@/lib/types";
import { buildRentabilidadRealAnalysisUnits } from "./analysis-units";
import type {
  RentabilidadRealAnalysisUnit,
  RentabilidadRealDocumentProfitabilityReport,
  RentabilidadRealDocumentReportFilters,
  RentabilidadRealDocumentReportQualityFlag,
  RentabilidadRealDocumentReportRow,
  RentabilidadRealDocumentReportSettings,
  RentabilidadRealDocumentReportSort,
  RentabilidadRealDocumentReportSummary,
  RentabilidadRealReportSettings,
} from "./types";

function cloneSettings(
  settings: RentabilidadRealReportSettings,
): RentabilidadRealReportSettings {
  return {
    period: settings.period,
    sourceTypes: settings.sourceTypes,
    includeQuotesWithoutInvoice: settings.includeQuotesWithoutInvoice,
    includeInternalAdjustments: settings.includeInternalAdjustments,
    fixedCostAllocationMode: settings.fixedCostAllocationMode,
    irpfProvisionPercentage: settings.irpfProvisionPercentage,
    lowMarginThresholdPercentage: settings.lowMarginThresholdPercentage,
    customStartDate: settings.customStartDate,
    customEndDate: settings.customEndDate,
  };
}

function uniqueWarnings(
  warnings: RentabilidadRealCalculationWarning[],
): RentabilidadRealCalculationWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.code}:${warning.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function warning(
  code: string,
  message: string,
  severity: RentabilidadRealCalculationWarning["severity"] = "info",
): RentabilidadRealCalculationWarning {
  return { code, message, severity };
}

function documentById(appData: AppData, documentId: string): Document | undefined {
  return appData.documents.find((document) => document.id === documentId);
}

function incomeForUnit(appData: AppData, unit: RentabilidadRealAnalysisUnit): number {
  const invoice = unit.invoiceDocumentId
    ? documentById(appData, unit.invoiceDocumentId)
    : undefined;
  const quote = unit.quoteDocumentId
    ? documentById(appData, unit.quoteDocumentId)
    : undefined;
  const document = invoice ?? quote;
  return document ? roundMoney(documentTotals(document).subtotal) : 0;
}

function hasFixedCosts(appData: AppData): boolean {
  return (
    appData.expenses.some((expense) => isFixedExpense(expense)) ||
    appData.recurringExpenses.length > 0
  );
}

function includeUnitBySource(
  unit: RentabilidadRealAnalysisUnit,
  settings: RentabilidadRealReportSettings,
): boolean {
  if (unit.sourceType === "quote" && !settings.includeQuotesWithoutInvoice) {
    return false;
  }
  if (settings.sourceTypes === "both") return true;
  if (settings.sourceTypes === "invoices") {
    return unit.sourceType === "invoice" || unit.sourceType === "quote_invoice_pair";
  }
  return unit.sourceType === "quote";
}

function isDateInPeriod(
  date: string,
  settings: RentabilidadRealReportSettings,
  now = new Date(),
): boolean {
  if (settings.period === "all") return true;
  const parsed = new Date(`${date}T00:00:00`);
  if (!Number.isFinite(parsed.getTime())) return true;

  if (settings.period === "custom") {
    const start = settings.customStartDate
      ? new Date(`${settings.customStartDate}T00:00:00`)
      : null;
    const end = settings.customEndDate
      ? new Date(`${settings.customEndDate}T23:59:59`)
      : null;
    if (start && parsed < start) return false;
    if (end && parsed > end) return false;
    return true;
  }

  const sameYear = parsed.getFullYear() === now.getFullYear();
  if (settings.period === "current_month") {
    return sameYear && parsed.getMonth() === now.getMonth();
  }

  const parsedQuarter = Math.floor(parsed.getMonth() / 3);
  const currentQuarter = Math.floor(now.getMonth() / 3);
  return sameYear && parsedQuarter === currentQuarter;
}

function fixedCostMethodForReport(
  settings: RentabilidadRealDocumentReportSettings,
): RentabilidadRealFixedCostAllocationMethod {
  if (settings.fixedCostAllocationMode === "revenue_share_report") {
    return "revenue_share";
  }
  if (
    settings.fixedCostAllocationMode === "use_saved_settings" &&
    settings.savedWorkCalculationSettings
  ) {
    return settings.savedWorkCalculationSettings.fixedCostAllocationMethod;
  }
  return "none";
}

function internalAdjustmentsTotalForUnit(
  unit: RentabilidadRealAnalysisUnit,
  includeInternalAdjustments: boolean,
): number {
  if (!includeInternalAdjustments) return 0;
  const seen = new Set<string>();
  const adjustments = unit.relatedDocumentIds.flatMap((documentId) =>
    getInternalAdjustmentsForSource(documentId),
  ).filter((adjustment) => {
    if (seen.has(adjustment.id)) return false;
    seen.add(adjustment.id);
    return true;
  });

  return summarizeInternalAdjustments(adjustments).totalInternalAdjustments;
}

function qualityFlagsForRow(input: {
  unit: RentabilidadRealAnalysisUnit;
  row: Omit<RentabilidadRealDocumentReportRow, "qualityFlags">;
  hasFixedCosts: boolean;
  lowMarginThresholdPercentage: number;
}): RentabilidadRealDocumentReportQualityFlag[] {
  const flags = new Set<RentabilidadRealDocumentReportQualityFlag>();
  const warningCodes = input.row.warnings.map((item) => item.code);

  if (input.row.totalDirectCosts === 0) flags.add("no_linked_expenses");
  if (input.row.unlinkedCandidatesCount > 0) flags.add("has_unlinked_candidates");
  if (input.unit.sourceType === "quote") flags.add("quote_without_invoice");
  if (
    input.unit.sourceType === "invoice" &&
    warningCodes.some((code) => code.includes("invoice_without_quote"))
  ) {
    flags.add("invoice_without_quote");
  }
  if (input.row.marginPercentage < input.lowMarginThresholdPercentage) {
    flags.add("low_margin");
  }
  if (input.row.operatingProfit < 0) flags.add("negative_profit");
  if (input.row.internalAdjustmentsTotal > 0) {
    flags.add("has_internal_adjustments");
  }
  if (
    input.hasFixedCosts &&
    input.row.allocatedFixedCosts === 0 &&
    warningCodes.includes("fixed_cost_allocation_missing")
  ) {
    flags.add("no_fixed_cost_rule");
  }
  if (warningCodes.includes("vat_data_incomplete")) flags.add("missing_tax_data");
  if (warningCodes.includes("scanned_cost_review_recommended")) {
    flags.add("scanned_expense_review_needed");
  }

  return Array.from(flags);
}

export function calculateDocumentReportRow(
  appData: AppData,
  unit: RentabilidadRealAnalysisUnit,
  settings: RentabilidadRealDocumentReportSettings,
): RentabilidadRealDocumentReportRow | null {
  const method = fixedCostMethodForReport(settings);
  const saved = settings.savedWorkCalculationSettings;
  const workInput = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
    appData,
    {
      sourceDocumentId: unit.primaryDocumentId,
      fixedCostAllocationMethod: method,
      manualAmount:
        settings.fixedCostAllocationMode === "use_saved_settings"
          ? saved?.manualAmount
          : undefined,
      monthlyRevenue:
        settings.fixedCostAllocationMode === "revenue_share_report"
          ? settings.reportRevenueWithoutIndirectTax
          : saved?.monthlyRevenue,
      monthlyJobs: saved?.monthlyJobs,
      workHours: saved?.workHours,
      monthlyWorkHours: saved?.monthlyWorkHours,
      selectedFixedCostIds: saved?.selectedFixedCostIds,
      irpfProvisionPercentage: settings.irpfProvisionPercentage,
    },
  );

  if (!workInput) return null;

  const internalAdjustmentsTotal = internalAdjustmentsTotalForUnit(
    unit,
    settings.includeInternalAdjustments,
  );
  const result = calculateRentabilidadRealWorkProfitability({
    ...workInput,
    internalAdjustmentsTotal,
  });
  const warnings = uniqueWarnings([...unit.warnings, ...result.warnings]);
  const rowBase: Omit<RentabilidadRealDocumentReportRow, "qualityFlags"> = {
    unitId: unit.id,
    primaryDocumentId: unit.primaryDocumentId,
    sourceType: unit.sourceType,
    workSourceType: result.sourceType,
    documentLabel: unit.title,
    clientId: unit.clientId,
    clientName: unit.clientName,
    date: unit.date,
    incomeWithoutIndirectTax: result.incomeWithoutIndirectTax,
    expectedIncomeWithoutIndirectTax: result.expectedIncomeWithoutIndirectTax,
    actualIncomeWithoutIndirectTax: result.actualIncomeWithoutIndirectTax,
    totalDirectCosts: result.totalDirectCosts,
    linkedExpensesCount: result.directCosts.length,
    unlinkedCandidatesCount: workInput.candidateUnlinkedExpenses?.length ?? 0,
    allocatedFixedCosts: result.allocatedFixedCosts,
    operatingProfit: result.operatingProfit,
    marginPercentage: result.marginPercentage,
    estimatedVatToReserve: result.estimatedVatToReserve,
    estimatedIrpfProvision: result.estimatedIrpfProvision,
    prudentAvailableCash: result.prudentAvailableCash,
    internalAdjustmentsTotal: result.internalAdjustmentsTotal,
    internalRealProfit: result.internalRealProfit,
    internalPrudentAvailableCash: result.internalPrudentAvailableCash,
    warnings,
    sourceLinks: result.sourceLinks,
  };

  return {
    ...rowBase,
    qualityFlags: qualityFlagsForRow({
      unit,
      row: rowBase,
      hasFixedCosts: hasFixedCosts(appData),
      lowMarginThresholdPercentage: settings.lowMarginThresholdPercentage,
    }),
  };
}

function reportSummary(
  rows: readonly RentabilidadRealDocumentReportRow[],
): RentabilidadRealDocumentReportSummary {
  const incomeWithoutIndirectTax = roundMoney(
    rows.reduce((total, row) => total + row.incomeWithoutIndirectTax, 0),
  );
  const operatingProfit = roundMoney(
    rows.reduce((total, row) => total + row.operatingProfit, 0),
  );

  return {
    rowCount: rows.length,
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
    lowMarginDocumentsCount: rows.filter((row) =>
      row.qualityFlags.includes("low_margin"),
    ).length,
    negativeProfitDocumentsCount: rows.filter((row) =>
      row.qualityFlags.includes("negative_profit"),
    ).length,
    unlinkedCandidatesCount: rows.reduce(
      (total, row) => total + row.unlinkedCandidatesCount,
      0,
    ),
  };
}

export function buildDocumentProfitabilityReport(
  appData: AppData,
  settings: RentabilidadRealDocumentReportSettings,
): RentabilidadRealDocumentProfitabilityReport {
  const units = buildRentabilidadRealAnalysisUnits(appData).filter(
    (unit) =>
      includeUnitBySource(unit, settings) && isDateInPeriod(unit.date, settings),
  );
  const reportRevenueWithoutIndirectTax = roundMoney(
    units.reduce((total, unit) => total + incomeForUnit(appData, unit), 0),
  );
  const rowSettings = {
    ...settings,
    reportRevenueWithoutIndirectTax,
  };
  const rows = units
    .map((unit) => calculateDocumentReportRow(appData, unit, rowSettings))
    .filter((row): row is RentabilidadRealDocumentReportRow => Boolean(row));
  const warnings: RentabilidadRealCalculationWarning[] = [];

  if (
    hasFixedCosts(appData) &&
    settings.fixedCostAllocationMode === "none" &&
    rows.length > 0
  ) {
    warnings.push(
      warning(
        "report_fixed_costs_not_allocated",
        "Los gastos fijos no se han imputado en este informe porque no hay una regla de reparto seleccionada.",
        "warning",
      ),
    );
  }

  return {
    rows: sortDocumentReportRows(rows, "date_desc"),
    summary: reportSummary(rows),
    warnings,
    settings: cloneSettings(settings),
  };
}

export function sortDocumentReportRows(
  rows: readonly RentabilidadRealDocumentReportRow[],
  sort: RentabilidadRealDocumentReportSort = "date_desc",
): RentabilidadRealDocumentReportRow[] {
  const result = rows.map((row) => ({ ...row, qualityFlags: [...row.qualityFlags] }));
  return result.sort((a, b) => {
    if (sort === "date_asc") return a.date.localeCompare(b.date);
    if (sort === "client") return a.clientName.localeCompare(b.clientName);
    if (sort === "income_desc") {
      return b.incomeWithoutIndirectTax - a.incomeWithoutIndirectTax;
    }
    if (sort === "profit_asc") return a.operatingProfit - b.operatingProfit;
    if (sort === "profit_desc") return b.operatingProfit - a.operatingProfit;
    if (sort === "margin_asc") return a.marginPercentage - b.marginPercentage;
    return b.date.localeCompare(a.date);
  });
}

export function filterDocumentReportRows(
  rows: readonly RentabilidadRealDocumentReportRow[],
  filters: RentabilidadRealDocumentReportFilters,
): RentabilidadRealDocumentReportRow[] {
  return rows
    .filter((row) => !filters.clientId || row.clientId === filters.clientId)
    .filter((row) => !filters.sourceType || row.sourceType === filters.sourceType)
    .filter(
      (row) =>
        !filters.qualityFlag || row.qualityFlags.includes(filters.qualityFlag),
    )
    .map((row) => ({ ...row, qualityFlags: [...row.qualityFlags] }));
}
