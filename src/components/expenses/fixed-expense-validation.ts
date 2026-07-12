import type { FormErrorItem } from "@/components/ui/FormErrorSummary";
import type { RecurringDuration } from "@/lib/types";

export type FixedExpenseStartDateFieldId =
  | "recurring-start-date"
  | "recurring-effective-date";

interface FixedExpenseValidationInput {
  supplierName: string;
  description: string;
  amount: number;
  startDate: string;
  startDateFieldId: FixedExpenseStartDateFieldId;
  durationKind: RecurringDuration["kind"];
  endDate: string;
}

export function fixedExpenseValidationErrors({
  supplierName,
  description,
  amount,
  startDate,
  startDateFieldId,
  durationKind,
  endDate,
}: FixedExpenseValidationInput): FormErrorItem[] {
  const errors: FormErrorItem[] = [];

  if (!supplierName.trim()) {
    errors.push({
      fieldId: "recurring-supplier-name",
      message: "Indica el proveedor o la entidad.",
    });
  }
  if (!description.trim()) {
    errors.push({
      fieldId: "recurring-description",
      message: "Indica el concepto del gasto fijo.",
    });
  }
  if (amount <= 0) {
    errors.push({
      fieldId: "recurring-amount",
      message: "Introduce un importe mayor que cero.",
    });
  }
  if (!startDate) {
    errors.push({
      fieldId: startDateFieldId,
      message: "Indica desde qué fecha se aplica el gasto.",
    });
  }
  if (durationKind === "until_date" && endDate && endDate < startDate) {
    errors.push({
      fieldId: "recurring-end-date",
      message: "La fecha final no puede ser anterior al inicio del tramo.",
    });
  }

  return errors;
}
