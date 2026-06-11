const STORAGE_PREFIX = "factu-feature-used:";

export type FactuFeatureId =
  | "user_reminders"
  | "expense_scan"
  | "impuestos"
  | "recurring_expenses"
  | "presupuestos"
  | "payment_reminder"
  | "referrals";

export interface FactuFeatureUsage {
  userReminders: boolean;
  expenseScan: boolean;
  impuestos: boolean;
  recurringExpenses: boolean;
  presupuestos: boolean;
  paymentReminder: boolean;
  referrals: boolean;
}

const DEFAULT_USAGE: FactuFeatureUsage = {
  userReminders: false,
  expenseScan: false,
  impuestos: false,
  recurringExpenses: false,
  presupuestos: false,
  paymentReminder: false,
  referrals: false,
};

function hasLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readFlag(id: FactuFeatureId): boolean {
  if (!hasLocalStorage()) return false;
  return localStorage.getItem(`${STORAGE_PREFIX}${id}`) === "1";
}

/** Lee qué funciones de la app el usuario ya ha descubierto o usado. */
export function readFactuFeatureUsage(): FactuFeatureUsage {
  return {
    userReminders: readFlag("user_reminders"),
    expenseScan: readFlag("expense_scan"),
    impuestos: readFlag("impuestos"),
    recurringExpenses: readFlag("recurring_expenses"),
    presupuestos: readFlag("presupuestos"),
    paymentReminder: readFlag("payment_reminder"),
    referrals: readFlag("referrals"),
  };
}

/** Marca una función como ya conocida (desaparece de los consejos de Factu). */
export function markFactuFeatureUsed(id: FactuFeatureId): void {
  if (!hasLocalStorage()) return;
  localStorage.setItem(`${STORAGE_PREFIX}${id}`, "1");
  window.dispatchEvent(new CustomEvent("factu-feature-used", { detail: id }));
}

export function defaultFactuFeatureUsage(): FactuFeatureUsage {
  return { ...DEFAULT_USAGE };
}
