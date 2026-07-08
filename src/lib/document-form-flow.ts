import {
  lineIva,
  lineSubtotal,
  lineTotal,
  roundMoney,
} from "./calculations";
import {
  isAreaDocumentUnit,
  isLinearDocumentUnit,
  lineMeasurementDescriptionSuffix,
  measurementQuantityForUnit,
  type LineMeasurementDraft,
} from "./area-calculation";
import type { LineItem } from "./types";

export interface DocumentFormAmounts {
  subtotal: number;
  iva: number;
  total: number;
}

function nonNegativeFinite(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export function sanitizeDocumentFormLineItem(
  item: LineItem,
  vatExempt = false,
): LineItem {
  return {
    ...item,
    description: item.description ?? "",
    quantity: nonNegativeFinite(item.quantity),
    unitPrice: nonNegativeFinite(item.unitPrice),
    ivaPercent: vatExempt ? 0 : nonNegativeFinite(item.ivaPercent),
  };
}

export function sanitizeDocumentFormItems(
  items: LineItem[],
  vatExempt = false,
): LineItem[] {
  return items.map((item) => sanitizeDocumentFormLineItem(item, vatExempt));
}

export function documentFormAmounts(
  items: LineItem[],
  vatExempt = false,
): DocumentFormAmounts {
  const safeItems = sanitizeDocumentFormItems(items, vatExempt);
  const subtotal = safeItems.reduce((sum, item) => sum + lineSubtotal(item), 0);
  const iva = vatExempt
    ? 0
    : safeItems.reduce((sum, item) => sum + lineIva(item), 0);

  return {
    subtotal: roundMoney(subtotal),
    iva: roundMoney(iva),
    total: roundMoney(subtotal + iva),
  };
}

export function lineItemFormTotal(item: LineItem, vatExempt = false): number {
  const safeItem = sanitizeDocumentFormLineItem(item, vatExempt);
  return roundMoney(vatExempt ? lineSubtotal(safeItem) : lineTotal(safeItem));
}

export function applyLineMeasurementDraft(
  item: LineItem,
  draft?: LineMeasurementDraft,
): LineItem {
  if (draft && (isAreaDocumentUnit(item.unit) || isLinearDocumentUnit(item.unit))) {
    return { ...item, quantity: measurementQuantityForUnit(item.unit, draft) };
  }
  const quantity = measurementQuantityForUnit(item.unit, draft);
  if (quantity <= 0) return item;
  return { ...item, quantity };
}

export function firstDocumentFormLineIssue(
  items: LineItem[],
  options: { requireConcept?: boolean } = {},
): string | null {
  const requireConcept = options.requireConcept ?? true;
  let hasValidLine = false;

  for (const [index, item] of items.entries()) {
    const lineNumber = index + 1;
    const description = item.description.trim();
    const hasPrice = Number.isFinite(item.unitPrice) && item.unitPrice > 0;

    if (!Number.isFinite(item.quantity) || item.quantity < 0) {
      return `Indica una cantidad válida en la línea ${lineNumber}.`;
    }

    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      return `Indica un precio válido en la línea ${lineNumber}.`;
    }

    if (!Number.isFinite(item.ivaPercent) || item.ivaPercent < 0) {
      return `Indica un IVA válido en la línea ${lineNumber}.`;
    }

    if (!description && hasPrice) {
      return `Completa el concepto de la línea ${lineNumber} o elimínala.`;
    }

    if (description && item.quantity <= 0) {
      return `Indica una cantidad mayor que 0 en la línea ${lineNumber}.`;
    }

    if (description) hasValidLine = true;
  }

  return hasValidLine || !requireConcept ? null : "Añade al menos un concepto.";
}

export function documentFormItemsForSave(
  items: LineItem[],
  vatExempt = false,
  options: {
    lineMeasurementDrafts?: Record<string, LineMeasurementDraft>;
  } = {},
): LineItem[] {
  return sanitizeDocumentFormItems(items, vatExempt)
    .map((item) => {
      const measuredItem = applyLineMeasurementDraft(
        item,
        options.lineMeasurementDrafts?.[item.id],
      );
      const description = measuredItem.description.trim();
      const measurementSuffix = lineMeasurementDescriptionSuffix(
        measuredItem.unit,
        options.lineMeasurementDrafts?.[item.id],
      );

      return {
        ...measuredItem,
        description:
          description && measurementSuffix
            ? `${description} (${measurementSuffix})`
            : description,
      };
    })
    .filter((item) => item.description.length > 0);
}
