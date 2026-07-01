import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "../types";
import {
  inferScannedExpenseBusinessKind,
  normalizeExpenseBusinessKind,
} from "../expense-classification";
import { roundMoney } from "../calculations";
import type {
  ExpenseBusinessKind,
  ExpensePurchaseDocument,
  ExpensePurchaseLine,
} from "../types";

export type ExpenseScanPurchaseLine = Omit<ExpensePurchaseLine, "id">;
export type ExpenseScanDocumentKind =
  | "expense_invoice"
  | "ticket"
  | "quote_or_order"
  | "proforma"
  | "other";

export interface ExpenseScanPayload {
  document?: {
    kind: ExpenseScanDocumentKind;
    isExpenseDocument: boolean;
    reason?: string | null;
  };
  supplier: {
    name: string;
    nif?: string | null;
    suggestedCategory?: string | null;
  };
  expense: {
    date: string;
    businessKind?: ExpenseBusinessKind;
    description: string;
    amount: number;
    ivaPercent: number;
    category: string;
    paymentMethod: string;
    notes?: string | null;
    purchaseDocument?: ExpensePurchaseDocument;
    purchaseLines?: ExpenseScanPurchaseLine[];
  };
  confidence: number;
  warnings: string[];
}

function pickClosest(value: string, options: readonly string[]): string {
  const normalized = value.trim().toLowerCase();
  const exact = options.find((o) => o.toLowerCase() === normalized);
  if (exact) return exact;
  const partial = options.find((o) => normalized.includes(o.toLowerCase()));
  return partial ?? options[0];
}

function parseDate(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return new Date().toISOString().slice(0, 10);
  }
  const iso = value.trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const dmy = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    let year = dmy[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }
  return new Date().toISOString().slice(0, 10);
}

function parseDateOptional(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const normalized = parseDate(value);
  return normalized || undefined;
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

const NON_EXPENSE_DOCUMENT_PATTERNS = [
  /\bcomanda\s*\/\s*pedido\b/i,
  /\bs\/ref\.?\s*:?\s*pressupost\b/i,
  /\bpressupost\b/i,
  /\bvalid[oa]\s+durante\b/i,
  /\bvalid\s+durant\b/i,
  /\bpara\s+generar\s+el\s+pedido\b/i,
  /\bno\s+constituye\s+factura\b/i,
];

const NON_EXPENSE_DOCUMENT_TITLE_PATTERNS = [
  /^\s*(oferta|presupuesto|pedido|comanda|proforma|cotizaci[oó]n)\b/i,
  /^\s*(pressupost)\b/i,
];

export function detectNonExpenseDocumentReason(text: string): string | null {
  const normalized = text.trim();
  if (!normalized) return null;
  const firstLines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);
  const hasInvoiceHeader = firstLines
    .slice(0, 5)
    .some((line) => /^(factura|fra\.?|invoice)\b/i.test(line));
  if (hasInvoiceHeader) return null;

  if (
    NON_EXPENSE_DOCUMENT_PATTERNS.some((pattern) => pattern.test(normalized)) ||
    firstLines.some((line) =>
      NON_EXPENSE_DOCUMENT_TITLE_PATTERNS.some((pattern) => pattern.test(line)),
    )
  ) {
    return "Parece una oferta, presupuesto, pedido o proforma. No se guardará como gasto.";
  }
  return null;
}

function parsePositiveNumber(value: unknown): number | undefined {
  const number = Number(
    typeof value === "string" ? value.replace(",", ".").trim() : value,
  );
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function parseNonNegativeNumber(value: unknown): number | undefined {
  const number = Number(
    typeof value === "string" ? value.replace(",", ".").trim() : value,
  );
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function normalizePurchaseLine(raw: unknown): ExpenseScanPurchaseLine | null {
  if (!raw || typeof raw !== "object") return null;
  const line = raw as Record<string, unknown>;
  const description = cleanText(line.description);
  const quantity = parsePositiveNumber(line.quantity) ?? 1;
  const unitPrice = parsePositiveNumber(line.unitPrice);
  const total = parsePositiveNumber(line.total);

  if (!description || (!unitPrice && !total)) return null;

  const discountPercent = parseNonNegativeNumber(line.discountPercent);
  const ivaPercent = parseNonNegativeNumber(line.ivaPercent);

  return {
    description,
    quantity,
    unit: cleanText(line.unit) || undefined,
    unitPrice: roundMoney(unitPrice ?? (total ? total / quantity : 0)),
    discountPercent:
      discountPercent === undefined
        ? undefined
        : Math.min(Math.max(discountPercent, 0), 100),
    ivaPercent,
    total: total ? roundMoney(total) : undefined,
  };
}

function normalizePurchaseDocument(
  raw: unknown,
  fallback: { date: string; supplierNif?: string | null },
): ExpensePurchaseDocument | undefined {
  const source = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const document: ExpensePurchaseDocument = {
    invoiceNumber: cleanText(source.invoiceNumber) || undefined,
    issueDate: parseDateOptional(source.issueDate) ?? fallback.date,
    dueDate: parseDateOptional(source.dueDate),
    supplierNif:
      cleanText(source.supplierNif) || fallback.supplierNif?.trim() || undefined,
    supplierAddress: cleanText(source.supplierAddress) || undefined,
    supplierPostalCode: cleanText(source.supplierPostalCode) || undefined,
    supplierCity: cleanText(source.supplierCity) || undefined,
    paymentTerms: cleanText(source.paymentTerms) || undefined,
  };

  return Object.values(document).some(Boolean) ? document : undefined;
}

export function normalizeExpenseScanPayload(
  raw: unknown,
): ExpenseScanPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const supplierRaw = data.supplier;
  const expenseRaw = data.expense;
  if (!supplierRaw || typeof supplierRaw !== "object") return null;
  if (!expenseRaw || typeof expenseRaw !== "object") return null;

  const supplier = supplierRaw as Record<string, unknown>;
  const expense = expenseRaw as Record<string, unknown>;

  const name =
    typeof supplier.name === "string" ? supplier.name.trim() : "";
  const description =
    typeof expense.description === "string" ? expense.description.trim() : "";
  const amount = Number(expense.amount);

  if (!name || !description || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const ivaPercent = Number(expense.ivaPercent);
  const category =
    typeof expense.category === "string"
      ? pickClosest(expense.category, EXPENSE_CATEGORIES)
      : EXPENSE_CATEGORIES[0];
  const paymentMethod =
    typeof expense.paymentMethod === "string"
      ? pickClosest(expense.paymentMethod, PAYMENT_METHODS)
      : PAYMENT_METHODS[1];
  const businessKind =
    normalizeExpenseBusinessKind(expense.businessKind) ??
    inferScannedExpenseBusinessKind({
      supplierNif: typeof supplier.nif === "string" ? supplier.nif : null,
      description,
      category,
      notes: typeof expense.notes === "string" ? expense.notes : null,
    });
  const normalizedDate = parseDate(expense.date);
  const documentRaw =
    data.document && typeof data.document === "object"
      ? data.document as Record<string, unknown>
      : {};
  const documentKindRaw = cleanText(documentRaw.kind);
  const documentKind = (
    [
      "expense_invoice",
      "ticket",
      "quote_or_order",
      "proforma",
      "other",
    ] as const
  ).includes(documentKindRaw as ExpenseScanDocumentKind)
    ? (documentKindRaw as ExpenseScanDocumentKind)
    : undefined;
  const explicitlyNotExpense =
    documentRaw.isExpenseDocument === false ||
    cleanText(documentRaw.isExpenseDocument).toLowerCase() === "false";

  const warnings = Array.isArray(data.warnings)
    ? data.warnings.filter((w): w is string => typeof w === "string")
    : [];
  const purchaseLines = Array.isArray(expense.purchaseLines)
    ? expense.purchaseLines
        .map(normalizePurchaseLine)
        .filter((line): line is ExpenseScanPurchaseLine => Boolean(line))
        .slice(0, 50)
    : [];

  const confidence = Number(data.confidence);
  if (Number.isFinite(confidence) && confidence < 0.7) {
    warnings.push("Confianza baja: revisa todos los campos antes de guardar.");
  }
  const purchaseDocument = normalizePurchaseDocument(expense.purchaseDocument, {
    date: normalizedDate,
    supplierNif:
      typeof supplier.nif === "string" ? supplier.nif.trim() : undefined,
  });
  const nonExpenseReason =
    explicitlyNotExpense
      ? cleanText(documentRaw.reason) ||
        "Este documento no parece una factura o ticket de gasto."
      : [
          documentKind,
          cleanText(documentRaw.reason),
          description,
          typeof expense.notes === "string" ? expense.notes : "",
        ]
          .map((value) => detectNonExpenseDocumentReason(value ?? ""))
          .find(Boolean) ?? null;

  return {
    document: {
      kind:
        documentKind ??
        (nonExpenseReason
          ? "quote_or_order"
          : businessKind === "quick_ticket"
            ? "ticket"
            : "expense_invoice"),
      isExpenseDocument: !nonExpenseReason,
      reason: nonExpenseReason,
    },
    supplier: {
      name,
      nif:
        typeof supplier.nif === "string" ? supplier.nif.trim() || null : null,
      suggestedCategory:
        typeof supplier.suggestedCategory === "string"
          ? supplier.suggestedCategory
          : category,
    },
    expense: {
      date: normalizedDate,
      businessKind,
      description,
      amount: Math.round(amount * 100) / 100,
      ivaPercent: Number.isFinite(ivaPercent) ? ivaPercent : 21,
      category,
      paymentMethod,
      notes:
        typeof expense.notes === "string" ? expense.notes.trim() || null : null,
      purchaseDocument,
      purchaseLines: purchaseLines.length > 0 ? purchaseLines : undefined,
    },
    confidence: Number.isFinite(confidence) ? confidence : 0.5,
    warnings,
  };
}

export const EXPENSE_SCAN_JSON_SCHEMA = {
  document: {
    kind: "expense_invoice | ticket | quote_or_order | proforma | other",
    isExpenseDocument:
      "boolean — true solo si es factura/ticket/gasto ya realizado; false si es oferta, presupuesto, pedido, proforma u otro documento no contabilizable como gasto",
    reason:
      "string opcional — motivo si isExpenseDocument es false o hay dudas",
  },
  supplier: {
    name: "string — nombre comercial o razón social del emisor",
    nif: "string opcional — CIF/NIF del proveedor",
    suggestedCategory: "string opcional",
  },
  expense: {
    date: "YYYY-MM-DD — fecha de la factura o ticket",
    businessKind:
      "purchase_invoice | purchase | quick_ticket | fixed — clasificación práctica",
    description: "string — resumen breve del gasto",
    amount: "number — base imponible SIN IVA en euros",
    ivaPercent: "number — tipo de IVA (21, 10, 4 o 0)",
    category: `una de: ${EXPENSE_CATEGORIES.join(", ")}`,
    paymentMethod: `una de: ${PAYMENT_METHODS.join(", ")}`,
    notes: "string opcional — nº factura u observaciones",
    purchaseDocument: {
      invoiceNumber: "string opcional — número de factura del proveedor",
      issueDate: "YYYY-MM-DD opcional — fecha de emisión",
      dueDate: "YYYY-MM-DD opcional — vencimiento si aparece",
      supplierNif: "string opcional — NIF/CIF del proveedor si aparece",
      supplierAddress: "string opcional — dirección del proveedor",
      supplierPostalCode: "string opcional — código postal del proveedor",
      supplierCity: "string opcional — ciudad del proveedor",
      paymentTerms: "string opcional — condiciones o forma de pago",
    },
    purchaseLines: [
      {
        description: "string — producto, material o servicio si aparece",
        quantity: "number — cantidad; 1 si no aparece",
        unit: "string opcional — ud, m, h, kg...",
        unitPrice: "number — precio unitario SIN IVA antes de descuento",
        discountPercent: "number opcional — descuento de línea en %",
        ivaPercent: "number opcional — IVA de la línea si aparece",
        total: "number opcional — base de línea SIN IVA tras descuento",
      },
    ],
  },
  confidence: "number 0-1",
  warnings: "array de strings con dudas o campos ilegibles",
} as const;
