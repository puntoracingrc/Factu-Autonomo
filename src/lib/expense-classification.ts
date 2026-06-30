import type { Expense, ExpenseBusinessKind, Supplier } from "./types";

export const EXPENSE_BUSINESS_KIND_OPTIONS: Array<{
  value: ExpenseBusinessKind;
  label: string;
  shortLabel: string;
  hint: string;
}> = [
  {
    value: "purchase_invoice",
    label: "Factura de compra",
    shortLabel: "Factura",
    hint: "Factura recibida de proveedor, normalmente con NIF/CIF e IVA deducible.",
  },
  {
    value: "purchase",
    label: "Compra a proveedor",
    shortLabel: "Compra",
    hint: "Material, recambios, herramientas o servicios para un trabajo.",
  },
  {
    value: "quick_ticket",
    label: "Ticket / gasto rápido",
    shortLabel: "Ticket",
    hint: "Ticket, recibo simple o gasto rápido que quizá no trae todos los datos fiscales.",
  },
  {
    value: "fixed",
    label: "Gasto fijo",
    shortLabel: "Fijo",
    hint: "Cuotas recurrentes: autónomos, seguros, teléfono, gestoría, alquiler o software.",
  },
];

const VALID_EXPENSE_BUSINESS_KINDS = new Set<ExpenseBusinessKind>(
  EXPENSE_BUSINESS_KIND_OPTIONS.map((option) => option.value),
);

export function normalizeExpenseBusinessKind(
  value: unknown,
): ExpenseBusinessKind | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (VALID_EXPENSE_BUSINESS_KINDS.has(normalized as ExpenseBusinessKind)) {
    return normalized as ExpenseBusinessKind;
  }
  if (["invoice", "factura", "factura_compra"].includes(normalized)) {
    return "purchase_invoice";
  }
  if (["ticket", "receipt", "recibo", "gasto_rapido"].includes(normalized)) {
    return "quick_ticket";
  }
  if (["recurring", "recurrente", "fijo"].includes(normalized)) {
    return "fixed";
  }
  if (["compra", "purchase"].includes(normalized)) {
    return "purchase";
  }
  return undefined;
}

export function expenseBusinessKindLabel(kind: ExpenseBusinessKind): string {
  return (
    EXPENSE_BUSINESS_KIND_OPTIONS.find((option) => option.value === kind)
      ?.label ?? "Compra a proveedor"
  );
}

export function expenseBusinessKindShortLabel(
  kind: ExpenseBusinessKind,
): string {
  return (
    EXPENSE_BUSINESS_KIND_OPTIONS.find((option) => option.value === kind)
      ?.shortLabel ?? "Compra"
  );
}

export function expenseBusinessKindHint(kind: ExpenseBusinessKind): string {
  return (
    EXPENSE_BUSINESS_KIND_OPTIONS.find((option) => option.value === kind)
      ?.hint ?? ""
  );
}

export function isFixedExpense(
  expense: Pick<Expense, "businessKind" | "origin" | "recurringExpenseId">,
): boolean {
  return (
    expense.businessKind === "fixed" ||
    Boolean(expense.recurringExpenseId) ||
    expense.origin === "recurring"
  );
}

function textIncludesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

export function inferExpenseBusinessKind(
  expense: Expense,
  supplier?: Supplier,
): ExpenseBusinessKind {
  if (isFixedExpense(expense)) return "fixed";
  if (expense.businessKind) return expense.businessKind;

  const searchable = [
    expense.description,
    expense.category,
    expense.notes,
    expense.supplierName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    textIncludesAny(searchable, [
      "ticket",
      "tpv",
      "recibo simple",
      "gasto rapido",
      "gasto rápido",
    ])
  ) {
    return "quick_ticket";
  }

  if (
    textIncludesAny(searchable, [
      "autonomo",
      "autónomo",
      "seguro",
      "cuota",
      "alquiler",
      "gestoria",
      "gestoría",
      "software",
      "suscripcion",
      "suscripción",
      "telefono",
      "teléfono",
      "luz",
      "agua",
    ])
  ) {
    return "fixed";
  }

  if (
    expense.origin === "import" ||
    Boolean(supplier?.nif) ||
    textIncludesAny(searchable, ["nif proveedor", "cif proveedor", "factura"])
  ) {
    return "purchase_invoice";
  }

  if (expense.origin === "scan") return "quick_ticket";
  return "purchase";
}

export function inferScannedExpenseBusinessKind(input: {
  supplierNif?: string | null;
  description?: string | null;
  category?: string | null;
  notes?: string | null;
}): ExpenseBusinessKind {
  const searchable = [
    input.description,
    input.category,
    input.notes,
    input.supplierNif,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    textIncludesAny(searchable, [
      "autonomo",
      "autónomo",
      "seguro",
      "cuota",
      "alquiler",
      "gestoria",
      "gestoría",
      "software",
      "suscripcion",
      "suscripción",
      "telefono",
      "teléfono",
      "luz",
      "agua",
    ])
  ) {
    return "fixed";
  }

  if (
    textIncludesAny(searchable, ["ticket", "tpv", "recibo simple"]) ||
    !input.supplierNif
  ) {
    return "quick_ticket";
  }

  return "purchase_invoice";
}
