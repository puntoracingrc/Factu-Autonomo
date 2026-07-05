export type InternalProfitabilityAdjustmentSourceType =
  | "quote"
  | "invoice"
  | "manual_project"
  | "hours_project";

export type InternalProfitabilityAdjustmentCategory =
  | "undocumented_help"
  | "non_deductible_extra_cost"
  | "cash_out_without_tax_document"
  | "waste_or_loss"
  | "other_internal_adjustment";

export interface InternalAdjustmentWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "risk";
}

export interface InternalProfitabilityAdjustment {
  id: string;
  sourceDocumentId: string;
  sourceType: InternalProfitabilityAdjustmentSourceType;
  amount: number;
  label: string;
  category: InternalProfitabilityAdjustmentCategory;
  fiscalTreatment: "non_deductible";
  vatTreatment: "no_vat_deduction";
  affects: "internal_profitability_only";
  includeInTaxBooks: false;
  includeInVat: false;
  includeInIrpf: false;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInternalProfitabilityAdjustmentInput {
  id?: string;
  sourceDocumentId: string;
  sourceType: InternalProfitabilityAdjustmentSourceType;
  amount: number;
  label: string;
  category: InternalProfitabilityAdjustmentCategory;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InternalAdjustmentValidationResult {
  ok: boolean;
  errors: string[];
  warnings: InternalAdjustmentWarning[];
}

export interface InternalAdjustmentSummary {
  totalInternalAdjustments: number;
  adjustments: InternalProfitabilityAdjustment[];
  warnings: InternalAdjustmentWarning[];
}
