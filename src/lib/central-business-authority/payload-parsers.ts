import { normalizeExpenseOriginalArchiveOnExpense } from "@/lib/expense-original-archive";
import { normalizeRecurringExpense } from "@/lib/recurring-expenses";
import { normalizeLoadedData } from "@/lib/storage";
import type {
  BusinessProfile,
  Expense,
  ExpensePurchaseLine,
  ExpenseWorkAllocation,
  RecurringExpense,
} from "@/lib/types";

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function optionalFinite(value: unknown): boolean {
  return value === undefined || finite(value);
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function optionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
}

function optionalStringArray(value: unknown): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.every((entry) => typeof entry === "string"))
  );
}

function validPurchaseLine(value: unknown): value is ExpensePurchaseLine {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.description === "string" &&
    finite(value.quantity) &&
    finite(value.unitPrice) &&
    optionalString(value.supplierReference) &&
    optionalBoolean(value.catalogProduct) &&
    optionalFinite(value.sourceQuantity) &&
    optionalFinite(value.chargeQuantity) &&
    (value.calculationBasis === undefined ||
      ["m2", "ml", "unit", "kg", "hour", "fixed", "unknown"].includes(
        String(value.calculationBasis),
      )) &&
    optionalString(value.unit) &&
    (value.dimensionUnit === undefined ||
      ["mm", "cm", "m", "unknown"].includes(String(value.dimensionUnit))) &&
    optionalFinite(value.width) &&
    optionalFinite(value.height) &&
    optionalFinite(value.length) &&
    optionalFinite(value.discountPercent) &&
    optionalFinite(value.netUnitPrice) &&
    optionalFinite(value.ivaPercent) &&
    optionalFinite(value.total) &&
    (value.calculationFormula === undefined ||
      [
        "m2*netPrice",
        "ml*netPrice",
        "units*netPrice",
        "quantity*unitPrice",
        "fixed",
        "unknown",
      ].includes(String(value.calculationFormula))) &&
    optionalFinite(value.calculationExpectedTotal) &&
    optionalFinite(value.calculationDifference) &&
    optionalFinite(value.productGroupIndex) &&
    (value.productRole === undefined ||
      [
        "main_product",
        "component",
        "service",
        "shipping",
        "discount",
        "unknown",
      ].includes(String(value.productRole)))
  );
}

function validWorkAllocation(
  value: unknown,
): value is ExpenseWorkAllocation {
  return (
    isObject(value) &&
    typeof value.workDocumentId === "string" &&
    finite(value.amount) &&
    optionalStringArray(value.includedLineIds) &&
    optionalFinite(value.fullAmountAtAllocation) &&
    typeof value.allocatedAt === "string" &&
    optionalString(value.updatedAt)
  );
}

function validPurchaseDocument(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isObject(value)) return false;
  return [
    "invoiceNumber",
    "issueDate",
    "dueDate",
    "supplierNif",
    "supplierAddress",
    "supplierPostalCode",
    "supplierCity",
    "paymentTerms",
  ].every((key) => optionalString(value[key]));
}

function validProviderSummary(value: unknown): boolean {
  if (value === undefined) return true;
  return (
    isObject(value) &&
    (value.status === "pending_original" ||
      value.status === "completed_with_original") &&
    typeof value.summaryId === "string" &&
    typeof value.importedAt === "string" &&
    optionalString(value.fileName) &&
    optionalString(value.providerName) &&
    optionalString(value.completedAt) &&
    optionalFinite(value.summaryInvoiceTotal) &&
    optionalFinite(value.summaryIvaPercent) &&
    optionalFinite(value.summaryIvaAmount) &&
    optionalFinite(value.summaryRecargoPercent) &&
    optionalFinite(value.summaryRecargoAmount)
  );
}

function validWorkAllocationRepair(value: unknown): boolean {
  if (value === undefined) return true;
  return (
    isObject(value) &&
    value.schemaVersion === 1 &&
    value.kind === "provider_summary_equivalence_surcharge_v1" &&
    typeof value.repairId === "string" &&
    (value.status === "applied" || value.status === "rolled_back") &&
    finite(value.legacyOperatingCost) &&
    finite(value.canonicalOperatingCost) &&
    typeof value.beforeFingerprint === "string" &&
    typeof value.afterFingerprint === "string" &&
    Array.isArray(value.beforeAllocations) &&
    value.beforeAllocations.every(validWorkAllocation) &&
    Array.isArray(value.afterAllocations) &&
    value.afterAllocations.every(validWorkAllocation) &&
    Array.isArray(value.events) &&
    value.events.every(
      (event) =>
        isObject(event) &&
        (event.action === "applied" || event.action === "rolled_back") &&
        typeof event.at === "string",
    )
  );
}

export function parseCentralExpensePayload(
  payload: unknown,
  entityId: string,
): Expense | null {
  if (
    !isObject(payload) ||
    payload.id !== entityId ||
    typeof payload.date !== "string" ||
    typeof payload.supplierName !== "string" ||
    typeof payload.description !== "string" ||
    !finite(payload.amount) ||
    !finite(payload.ivaPercent) ||
    typeof payload.category !== "string" ||
    typeof payload.paymentMethod !== "string" ||
    typeof payload.createdAt !== "string" ||
    (payload.origin !== undefined &&
      !["manual", "scan", "import", "recurring"].includes(
        String(payload.origin),
      )) ||
    (payload.businessKind !== undefined &&
      !["purchase", "purchase_invoice", "quick_ticket", "fixed"].includes(
        String(payload.businessKind),
      )) ||
    (payload.deductibility !== undefined &&
      !["deductible", "non_deductible", "personal"].includes(
        String(payload.deductibility),
      )) ||
    !optionalString(payload.sourceInboxItemId) ||
    !optionalString(payload.supplierId) ||
    !optionalString(payload.notes) ||
    !optionalString(payload.workDocumentId) ||
    !optionalString(payload.recurringExpenseId) ||
    !optionalString(payload.recurringOccurrenceKey) ||
    !optionalBoolean(payload.workAllocationClosed) ||
    !validPurchaseDocument(payload.purchaseDocument) ||
    (payload.purchaseLines !== undefined &&
      (!Array.isArray(payload.purchaseLines) ||
        !payload.purchaseLines.every(validPurchaseLine))) ||
    !validProviderSummary(payload.providerSummary) ||
    (payload.workAllocations !== undefined &&
      (!Array.isArray(payload.workAllocations) ||
        !payload.workAllocations.every(validWorkAllocation))) ||
    !validWorkAllocationRepair(payload.workAllocationCostRepair)
  ) {
    return null;
  }

  const parsed = JSON.parse(JSON.stringify(payload)) as Expense;
  const normalized = normalizeExpenseOriginalArchiveOnExpense(parsed);
  if (payload.originalArchive !== undefined && !normalized.originalArchive) {
    return null;
  }
  return normalized;
}

function validRecurringDueTiming(value: unknown): boolean {
  if (!isObject(value)) return false;
  if (
    value.kind === "start_of_month" ||
    value.kind === "mid_of_month" ||
    value.kind === "end_of_month"
  ) {
    return true;
  }
  return (
    value.kind === "day_of_month" &&
    finite(value.day) &&
    Number.isInteger(value.day) &&
    value.day >= 1 &&
    value.day <= 31
  );
}

function validRecurringDuration(value: unknown): boolean {
  if (!isObject(value)) return false;
  if (value.kind === "indefinite") return true;
  if (value.kind === "until_date") return typeof value.endDate === "string";
  return (
    value.kind === "occurrences" &&
    finite(value.count) &&
    Number.isInteger(value.count) &&
    value.count > 0
  );
}

export function parseCentralRecurringExpensePayload(
  payload: unknown,
  entityId: string,
): RecurringExpense | null {
  if (
    !isObject(payload) ||
    payload.id !== entityId ||
    typeof payload.supplierName !== "string" ||
    typeof payload.description !== "string" ||
    !finite(payload.amount) ||
    !finite(payload.ivaPercent) ||
    typeof payload.category !== "string" ||
    typeof payload.paymentMethod !== "string" ||
    !["monthly", "quarterly", "annual"].includes(String(payload.frequency)) ||
    !validRecurringDueTiming(payload.dueTiming) ||
    !validRecurringDuration(payload.duration) ||
    typeof payload.startDate !== "string" ||
    typeof payload.enabled !== "boolean" ||
    typeof payload.createdAt !== "string" ||
    typeof payload.updatedAt !== "string" ||
    !optionalFinite(payload.dueMonth) ||
    !optionalString(payload.scheduleAnchorDate) ||
    !optionalString(payload.notes) ||
    (payload.deductibility !== undefined &&
      !["deductible", "non_deductible", "personal"].includes(
        String(payload.deductibility),
      )) ||
    (payload.occurrenceExclusions !== undefined &&
      (!Array.isArray(payload.occurrenceExclusions) ||
        !payload.occurrenceExclusions.every(
          (entry) =>
            isObject(entry) &&
            typeof entry.key === "string" &&
            typeof entry.excludedAt === "string",
        )))
  ) {
    return null;
  }
  const dueMonth = payload.dueMonth;
  if (
    dueMonth !== undefined &&
    (!finite(dueMonth) ||
      !Number.isInteger(dueMonth) ||
      dueMonth < 1 ||
      dueMonth > 12)
  ) {
    return null;
  }
  return normalizeRecurringExpense(
    JSON.parse(JSON.stringify(payload)) as RecurringExpense,
  );
}

export function parseCentralProfilePayload(
  payload: unknown,
  entityId: string,
): BusinessProfile | null {
  if (
    entityId !== "profile" ||
    !isObject(payload) ||
    typeof payload.name !== "string" ||
    typeof payload.nif !== "string" ||
    typeof payload.address !== "string" ||
    typeof payload.city !== "string" ||
    typeof payload.postalCode !== "string" ||
    typeof payload.phone !== "string" ||
    typeof payload.email !== "string" ||
    !isObject(payload.iva) ||
    !Array.isArray(payload.iva.rates) ||
    !payload.iva.rates.every(finite) ||
    !finite(payload.iva.defaultRate) ||
    !isObject(payload.numbering) ||
    !optionalBoolean(payload.vatExempt) ||
    !optionalFinite(payload.irpfPercent) ||
    !optionalFinite(payload.quoteValidityDays)
  ) {
    return null;
  }

  return normalizeLoadedData({ profile: payload }).profile;
}
