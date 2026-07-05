import { roundMoney } from "@/lib/calculations";
import type {
  CreateInternalProfitabilityAdjustmentInput,
  InternalAdjustmentSummary,
  InternalAdjustmentValidationResult,
  InternalAdjustmentWarning,
  InternalProfitabilityAdjustment,
} from "./types";

export const INTERNAL_ADJUSTMENT_STANDARD_WARNINGS: InternalAdjustmentWarning[] =
  [
    {
      code: "internal_profitability_only",
      message: "Este ajuste solo afecta a tu rentabilidad interna.",
      severity: "info",
    },
    {
      code: "not_fiscal_expense",
      message: "No se incluirá como gasto fiscal.",
      severity: "warning",
    },
    {
      code: "no_irpf_reduction",
      message: "No reducirá IRPF.",
      severity: "warning",
    },
    {
      code: "no_deductible_vat",
      message: "No generará IVA deducible.",
      severity: "warning",
    },
    {
      code: "not_exported_tax_books",
      message: "No se exportará a libros fiscales ni modelos de impuestos.",
      severity: "warning",
    },
    {
      code: "advisor_review_for_work_help",
      message:
        "Si este coste corresponde a una persona que ha trabajado en el negocio, revisa con tu gestor cómo debe formalizarse.",
      severity: "info",
    },
  ];

function newAdjustmentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `internal_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function normalizeLabel(value: string): string {
  return value.trim() || "Ajuste interno no fiscal";
}

export function validateInternalProfitabilityAdjustment(
  input: Partial<CreateInternalProfitabilityAdjustmentInput>,
): InternalAdjustmentValidationResult {
  const errors: string[] = [];
  if (!input.sourceDocumentId?.trim()) {
    errors.push("sourceDocumentId es obligatorio.");
  }
  if (!input.sourceType) {
    errors.push("sourceType es obligatorio.");
  }
  if (!input.category) {
    errors.push("category es obligatoria.");
  }
  if (!Number.isFinite(input.amount) || (input.amount ?? 0) <= 0) {
    errors.push("amount debe ser positivo.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings: INTERNAL_ADJUSTMENT_STANDARD_WARNINGS,
  };
}

export function createInternalProfitabilityAdjustment(
  input: CreateInternalProfitabilityAdjustmentInput,
): InternalProfitabilityAdjustment {
  const validation = validateInternalProfitabilityAdjustment(input);
  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }
  const now = new Date().toISOString();

  return {
    id: input.id ?? newAdjustmentId(),
    sourceDocumentId: input.sourceDocumentId,
    sourceType: input.sourceType,
    amount: roundMoney(input.amount),
    label: normalizeLabel(input.label),
    category: input.category,
    fiscalTreatment: "non_deductible",
    vatTreatment: "no_vat_deduction",
    affects: "internal_profitability_only",
    includeInTaxBooks: false,
    includeInVat: false,
    includeInIrpf: false,
    note: input.note?.trim() || undefined,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? input.createdAt ?? now,
  };
}

export function summarizeInternalAdjustments(
  adjustments: readonly InternalProfitabilityAdjustment[],
): InternalAdjustmentSummary {
  return {
    totalInternalAdjustments: roundMoney(
      adjustments.reduce((total, adjustment) => total + adjustment.amount, 0),
    ),
    adjustments: adjustments.map((adjustment) => ({ ...adjustment })),
    warnings: INTERNAL_ADJUSTMENT_STANDARD_WARNINGS,
  };
}
