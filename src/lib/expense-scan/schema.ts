import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "../types";
import {
  inferScannedExpenseBusinessKind,
  normalizeExpenseBusinessKind,
} from "../expense-classification";
import type { ExpenseBusinessKind } from "../types";

export interface ExpenseScanPayload {
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

  const warnings = Array.isArray(data.warnings)
    ? data.warnings.filter((w): w is string => typeof w === "string")
    : [];

  const confidence = Number(data.confidence);
  if (Number.isFinite(confidence) && confidence < 0.7) {
    warnings.push("Confianza baja: revisa todos los campos antes de guardar.");
  }

  return {
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
      date: parseDate(expense.date),
      businessKind,
      description,
      amount: Math.round(amount * 100) / 100,
      ivaPercent: Number.isFinite(ivaPercent) ? ivaPercent : 21,
      category,
      paymentMethod,
      notes:
        typeof expense.notes === "string" ? expense.notes.trim() || null : null,
    },
    confidence: Number.isFinite(confidence) ? confidence : 0.5,
    warnings,
  };
}

export const EXPENSE_SCAN_JSON_SCHEMA = {
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
  },
  confidence: "number 0-1",
  warnings: "array de strings con dudas o campos ilegibles",
} as const;
