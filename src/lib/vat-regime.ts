import { documentTotals } from "./calculations";
import { inspectUsableHistoricalDocumentEvidence } from "./document-integrity/legacy-import-attestation";
import { detectLegacyImportSource } from "./document-integrity/legacy-import-attestation";
import { expenseTotals } from "./expenses";
import type { BusinessProfile, Document, Expense, LineItem } from "./types";

export function isVatExempt(
  profile: Pick<BusinessProfile, "vatExempt">,
): boolean {
  return Boolean(profile.vatExempt);
}

export function normalizeVatExempt(value?: boolean): boolean {
  return Boolean(value);
}

export function zeroIvaItems(items: LineItem[]): LineItem[] {
  return items.map((item) => ({ ...item, ivaPercent: 0 }));
}

export function documentAmounts(
  doc: Pick<Document, "items"> & Partial<Document>,
  vatExempt: boolean,
): { subtotal: number; iva: number; total: number } {
  if (doc.snapshotIntegrity?.status === "blocked") {
    return { subtotal: 0, iva: 0, total: 0 };
  }
  if (doc.legacyImportAttestation) {
    const evidence = inspectUsableHistoricalDocumentEvidence(doc as Document);
    if (!evidence.ok) return { subtotal: 0, iva: 0, total: 0 };
    return {
      subtotal: evidence.snapshot.taxSummary.subtotal,
      iva: evidence.snapshot.taxSummary.iva,
      total: evidence.snapshot.taxSummary.total,
    };
  }
  if (
    doc.documentSnapshot?.source === "legacy_backfill" &&
    detectLegacyImportSource(doc as Document)
  ) {
    return { subtotal: 0, iva: 0, total: 0 };
  }
  const frozen = doc.documentSnapshot?.taxSummary;
  if (
    doc.snapshotIntegrityRequired &&
    doc.documentSnapshot?.documentType !== "presupuesto" &&
    frozen
  ) {
    return {
      subtotal: frozen.subtotal,
      iva: frozen.iva,
      total: frozen.total,
    };
  }
  return documentTotals(doc, vatExempt);
}

export function expenseAmount(expense: Expense, vatExempt: boolean): number {
  return expenseTotals(expense, vatExempt).total;
}

export function collectedSalesTotal(
  documents: Document[],
  vatExempt: boolean,
  isCollected: (doc: Document) => boolean,
): number {
  return documents
    .filter(isCollected)
    .reduce((sum, doc) => sum + documentAmounts(doc, vatExempt).total, 0);
}

export function totalExpensesAmount(
  expenses: Expense[],
  vatExempt: boolean,
): number {
  return expenses.reduce(
    (sum, expense) => sum + expenseAmount(expense, vatExempt),
    0,
  );
}
