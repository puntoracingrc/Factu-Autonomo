import { documentTotals, lineMoneyAmounts } from "./calculations";
import {
  isMeasuredCalculationKind,
  lineMeasurementDescriptionSuffix,
  measurementQuantityForUnit,
  resolveLineMeasurementKind,
  type LineMeasurementDraft,
} from "./area-calculation";
import type { LineItem } from "./types";

export interface DocumentFormAmounts {
  subtotal: number;
  iva: number;
  total: number;
}

export interface DocumentFormSignedAmountOptions {
  allowSignedAmounts?: boolean;
}

function safeFinite(
  value: number,
  options: DocumentFormSignedAmountOptions = {},
): number {
  if (!Number.isFinite(value)) return 0;
  if (!options.allowSignedAmounts && value < 0) return 0;
  return value;
}

export function sanitizeDocumentFormLineItem(
  item: LineItem,
  vatExempt = false,
  options: DocumentFormSignedAmountOptions = {},
): LineItem {
  return {
    ...item,
    description: item.description ?? "",
    quantity: safeFinite(item.quantity, options),
    unitPrice: safeFinite(item.unitPrice, options),
    ivaPercent: vatExempt ? 0 : safeFinite(item.ivaPercent),
  };
}

export function sanitizeDocumentFormItems(
  items: LineItem[],
  vatExempt = false,
  options: DocumentFormSignedAmountOptions = {},
): LineItem[] {
  return items.map((item) =>
    sanitizeDocumentFormLineItem(item, vatExempt, options),
  );
}

export function documentFormItemsForEditing(
  items: LineItem[],
  vatExempt = false,
): LineItem[] {
  return vatExempt
    ? items.map((item) => ({ ...item, ivaPercent: 0 }))
    : items.map((item) => ({ ...item }));
}

export function applyDocumentIvaToItems(
  items: LineItem[],
  ivaPercent: number,
  vatExempt = false,
): LineItem[] {
  const resolvedIva = vatExempt ? 0 : safeFinite(ivaPercent);
  return items.map((item) => ({ ...item, ivaPercent: resolvedIva }));
}

export function applyConfirmedDocumentIvaToItems(
  items: LineItem[],
  ivaPercent: number,
  confirmed: boolean,
  vatExempt = false,
): LineItem[] {
  return confirmed
    ? applyDocumentIvaToItems(items, ivaPercent, vatExempt)
    : items;
}

export function documentFormAmounts(
  items: LineItem[],
  vatExempt = false,
  options: DocumentFormSignedAmountOptions = {},
): DocumentFormAmounts {
  const safeItems = sanitizeDocumentFormItems(items, vatExempt, options);
  return documentTotals({ items: safeItems }, vatExempt);
}

export function lineItemFormTotal(
  item: LineItem,
  vatExempt = false,
  options: DocumentFormSignedAmountOptions = {},
): number {
  const safeItem = sanitizeDocumentFormLineItem(item, vatExempt, options);
  return lineMoneyAmounts(safeItem, vatExempt).total;
}

export function applyLineMeasurementDraft(
  item: LineItem,
  draft?: LineMeasurementDraft,
): LineItem {
  if (!draft) return item;
  if (
    !isMeasuredCalculationKind(resolveLineMeasurementKind(item.unit, draft))
  ) {
    return item;
  }
  const quantity = measurementQuantityForUnit(item.unit, draft);
  return { ...item, quantity };
}

export function firstDocumentFormLineIssue(
  items: LineItem[],
  options: {
    requireConcept?: boolean;
    allowSignedAmounts?: boolean;
  } = {},
): string | null {
  const requireConcept = options.requireConcept ?? true;
  const allowSignedAmounts = options.allowSignedAmounts ?? false;
  let hasValidLine = false;

  for (const [index, item] of items.entries()) {
    const lineNumber = index + 1;
    const description = item.description.trim();
    const hasPrice =
      Number.isFinite(item.unitPrice) &&
      (allowSignedAmounts ? item.unitPrice !== 0 : item.unitPrice > 0);

    if (
      !Number.isFinite(item.quantity) ||
      (!allowSignedAmounts && item.quantity < 0)
    ) {
      return `Indica una cantidad válida en la línea ${lineNumber}.`;
    }

    if (
      !Number.isFinite(item.unitPrice) ||
      (!allowSignedAmounts && item.unitPrice < 0)
    ) {
      return `Indica un precio válido en la línea ${lineNumber}.`;
    }

    if (!Number.isFinite(item.ivaPercent) || item.ivaPercent < 0) {
      return `Indica un IVA válido en la línea ${lineNumber}.`;
    }

    if (!description && hasPrice) {
      return `Completa el concepto de la línea ${lineNumber} o elimínala.`;
    }

    if (
      description &&
      (allowSignedAmounts ? item.quantity === 0 : item.quantity <= 0)
    ) {
      return allowSignedAmounts
        ? `Indica una cantidad distinta de 0 en la línea ${lineNumber}.`
        : `Indica una cantidad mayor que 0 en la línea ${lineNumber}.`;
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
    allowSignedAmounts?: boolean;
  } = {},
): LineItem[] {
  return sanitizeDocumentFormItems(items, vatExempt, options)
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
