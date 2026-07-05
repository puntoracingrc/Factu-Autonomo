import { roundMoney } from "@/lib/calculations";
import {
  mapExistingExpenseToProfitabilityFixedCost,
  mapExistingRecurringExpenseToProfitabilityFixedCost,
  type ProfitabilityFixedCostSource,
} from "@/lib/rentabilidad-real/integrations";
import type { AppData } from "@/lib/types";
import { buildRentabilidadRealWorkProfitabilityInputFromExistingData } from "./work-profitability-builder";
import type {
  RentabilidadRealCalculationWarning,
  RentabilidadRealHoursBillingModel,
  RentabilidadRealHoursProfitabilityInput,
  RentabilidadRealHoursSourceType,
  RentabilidadRealManualDirectCost,
  RentabilidadRealWorkCost,
} from "./types";
import type { RentabilidadRealFixedCostAllocationMethod } from "./types";

export interface BuildRentabilidadRealHoursProfitabilityInputParams {
  sourceType: RentabilidadRealHoursSourceType;
  selectedDocumentId?: string;
  projectName?: string;
  customerName?: string;
  billingModel?: RentabilidadRealHoursBillingModel;
  incomeWithoutIndirectTax?: number;
  vatPercent?: number;
  manualDirectCosts?: RentabilidadRealManualDirectCost[];
  fixedCostAllocationMethod?: RentabilidadRealFixedCostAllocationMethod;
  manualAmount?: number;
  monthlyRevenue?: number;
  monthlyWorkHours?: number;
  billedHours?: number;
  realWorkedHours?: number;
  nonBillableHours?: number;
  meetingHours?: number;
  revisionHours?: number;
  adminHours?: number;
  totalRealHoursOverride?: number;
  irpfProvisionPercentage?: number;
}

function fixedCostFromSource(source: ProfitabilityFixedCostSource): RentabilidadRealWorkCost {
  return {
    id: source.id,
    sourceType:
      source.sourceLink.sourceType === "recurring_expense"
        ? "recurring_expense"
        : "expense",
    date: source.date,
    supplierName: source.supplierName,
    description: source.description,
    amount: source.amount,
    ivaAmount: source.ivaAmount,
    total: source.total,
    category: source.category,
    origin:
      source.sourceLink.sourceType === "recurring_expense"
        ? "recurring"
        : undefined,
    sourceLink: source.sourceLink,
  };
}

function fixedCostCandidatesFromData(data: AppData): RentabilidadRealWorkCost[] {
  return [
    ...data.expenses
      .map(mapExistingExpenseToProfitabilityFixedCost)
      .filter((item): item is ProfitabilityFixedCostSource => Boolean(item)),
    ...data.recurringExpenses.map(
      mapExistingRecurringExpenseToProfitabilityFixedCost,
    ),
  ].map(fixedCostFromSource);
}

function manualCostToWorkCost(
  cost: RentabilidadRealManualDirectCost,
): RentabilidadRealWorkCost {
  return {
    id: cost.id,
    sourceType: "expense",
    date: "",
    supplierName: "Simulación local",
    description: cost.description,
    amount: roundMoney(cost.amount),
    ivaAmount: roundMoney(cost.ivaAmount ?? 0),
    total: roundMoney(cost.amount + (cost.ivaAmount ?? 0)),
    category: "Simulación",
    sourceLink: {
      sourceType: "expense",
      label: "Coste directo manual",
    },
  };
}

function sumFixedCosts(costs: RentabilidadRealWorkCost[]): number {
  return roundMoney(costs.reduce((total, cost) => total + cost.amount, 0));
}

export function buildRentabilidadRealHoursProfitabilityInputFromExistingData(
  data: AppData,
  params: BuildRentabilidadRealHoursProfitabilityInputParams,
): RentabilidadRealHoursProfitabilityInput | null {
  const warnings: RentabilidadRealCalculationWarning[] = [];
  const billingModel = params.billingModel ?? "hours";
  const fixedCostCandidates = fixedCostCandidatesFromData(data);
  const fixedCostAllocationInput = {
    method: params.fixedCostAllocationMethod ?? "hours",
    totalFixedCostsForPeriod: sumFixedCosts(fixedCostCandidates),
    manualAmount: params.manualAmount,
    monthlyRevenue: params.monthlyRevenue,
    monthlyWorkHours: params.monthlyWorkHours,
  };

  if (params.sourceType === "document" && params.selectedDocumentId) {
    const workInput = buildRentabilidadRealWorkProfitabilityInputFromExistingData(
      data,
      {
        sourceDocumentId: params.selectedDocumentId,
        fixedCostAllocationMethod: params.fixedCostAllocationMethod ?? "hours",
        manualAmount: params.manualAmount,
        monthlyRevenue: params.monthlyRevenue,
        monthlyWorkHours: params.monthlyWorkHours,
        irpfProvisionPercentage: params.irpfProvisionPercentage,
      },
    );
    if (!workInput) return null;

    const income = workInput.invoiceSummary ?? workInput.quoteSummary;
    if (!income) return null;
    return {
      sourceType: "document",
      sourceDocumentId: workInput.source.sourceDocumentId,
      sourceQuoteDocumentId: workInput.source.sourceQuoteDocumentId,
      projectName: params.projectName?.trim() || income.number,
      customerName: income.customerName,
      billingModel,
      incomeWithoutIndirectTax: income.subtotal,
      vatFromIncome: income.iva,
      directCosts: workInput.directCosts,
      fixedCostCandidates: workInput.fixedCostCandidates,
      fixedCostAllocationInput: {
        ...workInput.fixedCostAllocationInput,
        method: params.fixedCostAllocationMethod ?? "hours",
        monthlyWorkHours: params.monthlyWorkHours,
      },
      billedHours: params.billedHours,
      realWorkedHours: params.realWorkedHours,
      nonBillableHours: params.nonBillableHours,
      meetingHours: params.meetingHours,
      revisionHours: params.revisionHours,
      adminHours: params.adminHours,
      totalRealHoursOverride: params.totalRealHoursOverride,
      irpfProvisionPercentage: params.irpfProvisionPercentage,
      warnings: workInput.warnings,
      sourceLinks: workInput.sourceLinks,
    };
  }

  const incomeWithoutIndirectTax = params.incomeWithoutIndirectTax ?? 0;
  const vatPercent = params.vatPercent ?? data.profile.iva.defaultRate;
  if (!params.projectName?.trim()) {
    warnings.push({
      code: "manual_project_name_missing",
      message: "Falta nombre de proyecto para la simulación manual.",
      severity: "info",
    });
  }

  return {
    sourceType: "manual",
    projectName: params.projectName?.trim() || "Proyecto manual",
    customerName: params.customerName,
    billingModel,
    incomeWithoutIndirectTax,
    vatFromIncome: roundMoney(incomeWithoutIndirectTax * (vatPercent / 100)),
    directCosts: (params.manualDirectCosts ?? []).map(manualCostToWorkCost),
    fixedCostCandidates,
    fixedCostAllocationInput,
    billedHours: params.billedHours,
    realWorkedHours: params.realWorkedHours,
    nonBillableHours: params.nonBillableHours,
    meetingHours: params.meetingHours,
    revisionHours: params.revisionHours,
    adminHours: params.adminHours,
    totalRealHoursOverride: params.totalRealHoursOverride,
    irpfProvisionPercentage: params.irpfProvisionPercentage,
    warnings,
    sourceLinks: [
      {
        sourceType: "tax_summary",
        label: "Impuestos",
        href: "/impuestos",
      },
    ],
  };
}
