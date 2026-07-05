import type { RentabilidadRealFixedCostAllocationMethod } from "@/lib/rentabilidad-real/calculation";

export type RentabilidadRealPriceSimulatorMode =
  | "hourly_rate"
  | "job"
  | "closed_project"
  | "monthly_revenue";

export type RentabilidadRealPriceSimulatorObjectiveType =
  | "per_job"
  | "monthly"
  | "per_hour";

export interface RentabilidadRealPriceSimulatorWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "risk";
}

export interface RentabilidadRealPriceSimulatorInput {
  mode: RentabilidadRealPriceSimulatorMode;
  objectiveType: RentabilidadRealPriceSimulatorObjectiveType;
  targetNetProfit: number;
  directCosts: number;
  monthlyFixedCosts: number;
  selfEmployedFee: number;
  selfEmployedFeeIncludedInFixedCosts: boolean;
  fixedCostAllocationMethod: RentabilidadRealFixedCostAllocationMethod;
  manualAllocatedFixedCosts?: number;
  desiredMarginPercentage: number;
  irpfProvisionPercentage: number;
  vatRate: number;
  internalAdjustments: number;
  jobsPerMonth?: number;
  monthlyBillableHours?: number;
  estimatedRealHours?: number;
  monthlyDirectCostsEstimate?: number;
  averageJobPrice?: number;
  monthlyExpectedRevenue?: number;
}

export interface RentabilidadRealPriceSimulatorResult {
  mode: RentabilidadRealPriceSimulatorMode;
  objectiveType: RentabilidadRealPriceSimulatorObjectiveType;
  targetNetProfit: number;
  targetNetProfitForCalculation: number;
  requiredOperatingProfit: number;
  minimumPriceWithoutVat: number;
  minimumInternalPriceWithoutVat: number;
  recommendedPriceWithoutVat: number;
  recommendedInternalPriceWithoutVat: number;
  priceWithVat: number;
  directCost: number;
  fixedCostAllocation: number;
  monthlyFixedCostsTotal: number;
  estimatedIrpfProvision: number;
  expectedDocumentedProfit: number;
  expectedInternalProfitAfterAdjustments: number;
  prudentCash: number;
  minimumHourlyRate: number;
  recommendedHourlyRate: number;
  monthlyMinimumRevenue: number;
  monthlyInternalMinimumRevenue: number;
  requiredJobsPerMonth: number;
  warnings: RentabilidadRealPriceSimulatorWarning[];
  calculationVersion: "price-simulator-v1";
}
