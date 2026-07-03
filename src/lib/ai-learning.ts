import {
  normalizeExpenseScanPayload,
  type ExpenseScanPayload,
  type ExpenseScanPurchaseLine,
} from "./expense-scan/schema";
import type { ExpensePurchaseDocument } from "./types";

export const AI_LEARNING_POLICY_VERSION = "2026-07-03";
export const AI_LEARNING_PAYLOAD_SCHEMA_VERSION = "expense-scan-feedback-v1";

export type AiLearningAccountLabel = "owner_test" | "persianas_almar";

const AI_LEARNING_ALLOWED_ACCOUNTS = new Map<string, AiLearningAccountLabel>([
  ["puntoracingrc@gmail.com", "owner_test"],
  ["persianasalmar@gmail.com", "persianas_almar"],
]);

export interface AiLearningAccount {
  allowed: boolean;
  email: string;
  label?: AiLearningAccountLabel;
}

export interface ExpenseScanLearningFeedbackInput {
  original: unknown;
  corrected: unknown;
}

export interface AiLearningEvent {
  userId: string;
  accountLabel: AiLearningAccountLabel;
  eventType: "expense_scan_feedback";
  source: "expense_scan";
  payloadSchemaVersion: typeof AI_LEARNING_PAYLOAD_SCHEMA_VERSION;
  payload: Record<string, unknown>;
}

type PresenceChange = "same" | "added" | "removed" | "changed";
type NumberBucket = "none" | "one" | "small" | "medium" | "large";
type PercentBucket = "none" | "low" | "medium" | "high";

export function normalizeAiLearningEmail(email?: string | null): string {
  return (email ?? "").trim().toLowerCase();
}

export function aiLearningAccountForEmail(
  email?: string | null,
): AiLearningAccount {
  const normalized = normalizeAiLearningEmail(email);
  const label = AI_LEARNING_ALLOWED_ACCOUNTS.get(normalized);
  return {
    allowed: Boolean(label),
    email: normalized,
    label,
  };
}

function cleanText(value?: string | null): string {
  return (value ?? "").trim();
}

function normalizeComparableText(value?: string | null): string {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function textShape(value?: string | null): Record<string, unknown> {
  const text = cleanText(value);
  const wordCount = text ? text.split(/\s+/).length : 0;
  const upperLetters = text.replace(/[^A-ZÁÉÍÓÚÜÑ]/g, "").length;
  const letters = text.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "").length;

  return {
    bucket:
      text.length === 0
        ? "empty"
        : text.length <= 24
          ? "short"
          : text.length <= 80
            ? "medium"
            : "long",
    wordBucket:
      wordCount === 0
        ? "none"
        : wordCount <= 3
          ? "few"
          : wordCount <= 10
            ? "some"
            : "many",
    hasDigits: /\d/.test(text),
    hasSkuLikeCode: /\b[A-Z]{1,5}[-/]?\d{2,}|\d{2,}[-/]?[A-Z]{1,5}\b/.test(text),
    hasAreaToken: /\b(m2|m²|m\^2|mq)\b/i.test(text),
    hasMeasureToken: /\b(mm|cm|m|kg|g|h|ud|uds|u)\b/i.test(text),
    uppercase:
      letters === 0
        ? "none"
        : upperLetters / letters > 0.65
          ? "mostly"
          : upperLetters > 0
            ? "some"
            : "none",
  } satisfies Record<string, unknown>;
}

function textChanged(from?: string | null, to?: string | null): PresenceChange {
  const a = normalizeComparableText(from);
  const b = normalizeComparableText(to);
  if (!a && !b) return "same";
  if (!a && b) return "added";
  if (a && !b) return "removed";
  return a === b ? "same" : "changed";
}

function boolChanged(from: boolean, to: boolean): PresenceChange {
  if (from === to) return "same";
  return to ? "added" : "removed";
}

function numberChanged(from?: number, to?: number): PresenceChange {
  const hasFrom = typeof from === "number" && Number.isFinite(from);
  const hasTo = typeof to === "number" && Number.isFinite(to);
  if (!hasFrom && !hasTo) return "same";
  if (!hasFrom && hasTo) return "added";
  if (hasFrom && !hasTo) return "removed";
  return Math.abs((from ?? 0) - (to ?? 0)) < 0.01 ? "same" : "changed";
}

function countBucket(count: number): NumberBucket {
  if (count <= 0) return "none";
  if (count === 1) return "one";
  if (count <= 5) return "small";
  if (count <= 20) return "medium";
  return "large";
}

function percentBucket(value?: number): PercentBucket {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "none";
  }
  if (value <= 10) return "low";
  if (value <= 35) return "medium";
  return "high";
}

function confidenceBucket(value: number): "low" | "medium" | "high" {
  if (value < 0.7) return "low";
  if (value < 0.9) return "medium";
  return "high";
}

function normalizeUnit(value?: string | null): string {
  const unit = cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");

  if (["m2", "m²", "m^2", "mq"].includes(unit)) return "m2";
  if (["ud", "uds", "u", "unidad", "unidades"].includes(unit)) return "ud";
  if (["ml", "m.l.", "m.l", "metrolineal", "metroslineales"].includes(unit)) {
    return "ml";
  }
  if (["m", "metro", "metros"].includes(unit)) return "m";
  if (["h", "hora", "horas"].includes(unit)) return "h";
  if (["kg", "g"].includes(unit)) return unit;
  if (!unit) return "none";
  return "other";
}

function purchaseDocumentPresence(
  document?: ExpensePurchaseDocument,
): Record<keyof ExpensePurchaseDocument, boolean> {
  return {
    invoiceNumber: Boolean(document?.invoiceNumber?.trim()),
    issueDate: Boolean(document?.issueDate?.trim()),
    dueDate: Boolean(document?.dueDate?.trim()),
    supplierNif: Boolean(document?.supplierNif?.trim()),
    supplierAddress: Boolean(document?.supplierAddress?.trim()),
    supplierPostalCode: Boolean(document?.supplierPostalCode?.trim()),
    supplierCity: Boolean(document?.supplierCity?.trim()),
    paymentTerms: Boolean(document?.paymentTerms?.trim()),
  };
}

function purchaseDocumentCorrections(
  original?: ExpensePurchaseDocument,
  corrected?: ExpensePurchaseDocument,
): Record<keyof ExpensePurchaseDocument, PresenceChange> {
  const from = purchaseDocumentPresence(original);
  const to = purchaseDocumentPresence(corrected);
  return {
    invoiceNumber: boolChanged(from.invoiceNumber, to.invoiceNumber),
    issueDate: boolChanged(from.issueDate, to.issueDate),
    dueDate: boolChanged(from.dueDate, to.dueDate),
    supplierNif: boolChanged(from.supplierNif, to.supplierNif),
    supplierAddress: boolChanged(from.supplierAddress, to.supplierAddress),
    supplierPostalCode: boolChanged(from.supplierPostalCode, to.supplierPostalCode),
    supplierCity: boolChanged(from.supplierCity, to.supplierCity),
    paymentTerms: boolChanged(from.paymentTerms, to.paymentTerms),
  };
}

function linePattern(line: ExpenseScanPurchaseLine): Record<string, unknown> {
  return {
    description: textShape(line.description),
    quantityBucket: countBucket(Math.ceil(line.quantity || 0)),
    unit: normalizeUnit(line.unit),
    hasUnitPrice: Number.isFinite(line.unitPrice) && line.unitPrice > 0,
    discountBucket: percentBucket(line.discountPercent),
    ivaPercent: line.ivaPercent,
    hasTotal: Number.isFinite(line.total) && (line.total ?? 0) > 0,
  };
}

function structuralPayload(payload: ExpenseScanPayload): Record<string, unknown> {
  const lines = payload.expense.purchaseLines ?? [];
  return {
    document: {
      kind: payload.document?.kind ?? "other",
      isExpenseDocument: payload.document?.isExpenseDocument !== false,
      hasReason: Boolean(payload.document?.reason?.trim()),
    },
    supplier: {
      hasName: Boolean(payload.supplier.name.trim()),
      hasNif: Boolean(payload.supplier.nif?.trim()),
      hasSuggestedCategory: Boolean(payload.supplier.suggestedCategory?.trim()),
    },
    expense: {
      hasDate: Boolean(payload.expense.date),
      businessKind: payload.expense.businessKind ?? "purchase",
      hasDescription: Boolean(payload.expense.description.trim()),
      description: textShape(payload.expense.description),
      amountPresent: Number.isFinite(payload.expense.amount) && payload.expense.amount > 0,
      ivaPercent: payload.expense.ivaPercent,
      category: payload.expense.category,
      paymentMethod: payload.expense.paymentMethod,
      hasNotes: Boolean(payload.expense.notes?.trim()),
      purchaseDocument: purchaseDocumentPresence(payload.expense.purchaseDocument),
      lineCountBucket: countBucket(lines.length),
      lines: lines.slice(0, 20).map(linePattern),
    },
    quality: {
      confidenceBucket: confidenceBucket(payload.confidence),
      warningCountBucket: countBucket(payload.warnings.length),
    },
  };
}

function lineCorrections(
  originalLines: ExpenseScanPurchaseLine[] = [],
  correctedLines: ExpenseScanPurchaseLine[] = [],
): Array<Record<string, unknown>> {
  const max = Math.min(Math.max(originalLines.length, correctedLines.length), 20);
  return Array.from({ length: max }, (_, index) => {
    const original = originalLines[index];
    const corrected = correctedLines[index];
    return {
      index,
      status: !original ? "added" : !corrected ? "removed" : "matched",
      description: textChanged(original?.description, corrected?.description),
      quantity: numberChanged(original?.quantity, corrected?.quantity),
      unit: textChanged(original?.unit, corrected?.unit),
      unitPrice: numberChanged(original?.unitPrice, corrected?.unitPrice),
      discountPercent: numberChanged(
        original?.discountPercent,
        corrected?.discountPercent,
      ),
      ivaPercent: numberChanged(original?.ivaPercent, corrected?.ivaPercent),
      total: numberChanged(original?.total, corrected?.total),
      correctedPattern: corrected ? linePattern(corrected) : undefined,
    };
  });
}

function correctionPayload(
  original: ExpenseScanPayload,
  corrected: ExpenseScanPayload,
): Record<string, unknown> {
  return {
    documentKind: textChanged(original.document?.kind, corrected.document?.kind),
    isExpenseDocument: boolChanged(
      original.document?.isExpenseDocument !== false,
      corrected.document?.isExpenseDocument !== false,
    ),
    supplierName: textChanged(original.supplier.name, corrected.supplier.name),
    supplierNif: textChanged(original.supplier.nif, corrected.supplier.nif),
    businessKind: textChanged(
      original.expense.businessKind,
      corrected.expense.businessKind,
    ),
    description: textChanged(
      original.expense.description,
      corrected.expense.description,
    ),
    amount: numberChanged(original.expense.amount, corrected.expense.amount),
    ivaPercent: numberChanged(
      original.expense.ivaPercent,
      corrected.expense.ivaPercent,
    ),
    category: textChanged(original.expense.category, corrected.expense.category),
    paymentMethod: textChanged(
      original.expense.paymentMethod,
      corrected.expense.paymentMethod,
    ),
    notes: textChanged(original.expense.notes, corrected.expense.notes),
    purchaseDocument: purchaseDocumentCorrections(
      original.expense.purchaseDocument,
      corrected.expense.purchaseDocument,
    ),
    purchaseLines: {
      count: numberChanged(
        original.expense.purchaseLines?.length ?? 0,
        corrected.expense.purchaseLines?.length ?? 0,
      ),
      lines: lineCorrections(
        original.expense.purchaseLines,
        corrected.expense.purchaseLines,
      ),
    },
  };
}

export function buildExpenseScanLearningEvent(
  input: ExpenseScanLearningFeedbackInput,
  context: {
    userId: string;
    email?: string | null;
  },
): AiLearningEvent | null {
  const account = aiLearningAccountForEmail(context.email);
  if (!account.allowed || !account.label) return null;

  const original = normalizeExpenseScanPayload(input.original);
  const corrected = normalizeExpenseScanPayload(input.corrected);
  if (!original || !corrected) return null;

  const payload = {
    policyVersion: AI_LEARNING_POLICY_VERSION,
    privacyScope: "structure_only_no_raw_document_no_business_values",
    original: structuralPayload(original),
    corrected: structuralPayload(corrected),
    corrections: correctionPayload(original, corrected),
  };

  return {
    userId: context.userId,
    accountLabel: account.label,
    eventType: "expense_scan_feedback",
    source: "expense_scan",
    payloadSchemaVersion: AI_LEARNING_PAYLOAD_SCHEMA_VERSION,
    payload,
  };
}
