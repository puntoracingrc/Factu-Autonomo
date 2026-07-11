import type { Expense, Supplier } from "./types";
import { expenseTotals } from "./expenses";
import {
  normalizeSupplierName,
  supplierCompareKey,
} from "./supplier-normalization";
import {
  formatStreetLine,
  getStreetType,
  normalizeStreetFields,
} from "./customer-address";
import {
  isValidContactEmail,
  normalizeContactEmail,
  normalizeContactPhone,
} from "./contact-validation";

export {
  normalizeSupplierName,
  stripAccents,
  supplierCompareKey,
} from "./supplier-normalization";

/** Por encima de este umbral se reutiliza el proveedor existente automáticamente. */
export const SUPPLIER_AUTO_LINK_SCORE = 0.82;

/** Por encima de este umbral se sugiere al usuario un proveedor parecido. */
export const SUPPLIER_SUGGEST_SCORE = 0.65;

export const SUPPLIER_EMAIL_FORMAT_ERROR = "Revisa el formato del email";

export interface SupplierContactValidation {
  ok: boolean;
  error?: string;
  email?: string;
  phone?: string;
}

export function validateSupplierContact(
  input: Pick<Supplier, "email" | "phone">,
): SupplierContactValidation {
  const email = normalizeContactEmail(input.email);
  if (email && !isValidContactEmail(email)) {
    return { ok: false, error: SUPPLIER_EMAIL_FORMAT_ERROR };
  }

  const phone = normalizeContactPhone(input.phone);
  return {
    ok: true,
    email: email || undefined,
    phone: phone || undefined,
  };
}

export interface SupplierMatch {
  supplier: Supplier;
  score: number;
  reason: "nif" | "exact" | "similar";
}

export function normalizeSupplierNif(nif?: string | null): string {
  if (!nif?.trim()) return "";
  return nif.replace(/[\s.-]/g, "").toUpperCase();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function nameSimilarityScore(a: string, b: string): number {
  const keyA = supplierCompareKey(a);
  const keyB = supplierCompareKey(b);
  if (!keyA || !keyB) return 0;
  if (keyA === keyB) return 1;

  const shorter = keyA.length <= keyB.length ? keyA : keyB;
  const longer = keyA.length <= keyB.length ? keyB : keyA;

  if (shorter.length >= 4 && longer.includes(shorter)) {
    return 0.9;
  }

  const distance = levenshtein(keyA, keyB);
  const maxLen = Math.max(keyA.length, keyB.length);
  const ratio = 1 - distance / maxLen;

  const tokensA = keyA.split(" ").filter(Boolean);
  const tokensB = keyB.split(" ").filter(Boolean);
  const shared = tokensA.filter((token) => tokensB.includes(token)).length;
  const tokenScore =
    shared > 0 ? shared / Math.max(tokensA.length, tokensB.length) : 0;

  return Math.max(ratio, tokenScore);
}

export function supplierSimilarityScore(
  nameA: string,
  nameB: string,
  nifA?: string | null,
  nifB?: string | null,
): number {
  const normalizedNifA = normalizeSupplierNif(nifA);
  const normalizedNifB = normalizeSupplierNif(nifB);
  if (normalizedNifA && normalizedNifB && normalizedNifA === normalizedNifB) {
    return 1;
  }

  return nameSimilarityScore(nameA, nameB);
}

export function findSupplierByNif(
  suppliers: Supplier[],
  nif?: string | null,
  excludeId?: string,
): Supplier | undefined {
  const key = normalizeSupplierNif(nif);
  if (!key) return undefined;
  return suppliers.find(
    (supplier) =>
      supplier.id !== excludeId && normalizeSupplierNif(supplier.nif) === key,
  );
}

export function findSupplierByExactName(
  suppliers: Supplier[],
  name: string,
  excludeId?: string,
): Supplier | undefined {
  const key = supplierCompareKey(name);
  if (!key) return undefined;
  return suppliers.find(
    (supplier) =>
      supplier.id !== excludeId && supplierCompareKey(supplier.name) === key,
  );
}

export function findBestSupplierMatch(
  suppliers: Supplier[],
  input: { name: string; nif?: string | null },
  excludeId?: string,
): SupplierMatch | null {
  const trimmedName = normalizeSupplierName(input.name);
  if (!trimmedName) return null;

  const byNif = findSupplierByNif(suppliers, input.nif, excludeId);
  if (byNif) {
    return { supplier: byNif, score: 1, reason: "nif" };
  }

  const byExact = findSupplierByExactName(suppliers, trimmedName, excludeId);
  if (byExact) {
    return { supplier: byExact, score: 1, reason: "exact" };
  }

  let best: SupplierMatch | null = null;
  for (const supplier of suppliers) {
    if (supplier.id === excludeId) continue;
    const score = supplierSimilarityScore(
      trimmedName,
      supplier.name,
      input.nif,
      supplier.nif,
    );
    if (!best || score > best.score) {
      best = { supplier, score, reason: "similar" };
    }
  }

  return best && best.score >= SUPPLIER_SUGGEST_SCORE ? best : null;
}

export function migrateSupplier(supplier: Supplier): Supplier {
  return normalizeStreetFields(supplier);
}

export function expenseMatchesSupplier(
  expense: Expense,
  supplier: Supplier,
): boolean {
  if (expense.supplierId === supplier.id) return true;
  if (
    !expense.supplierId &&
    supplierSimilarityScore(
      expense.supplierName,
      supplier.name,
      undefined,
      supplier.nif,
    ) >= SUPPLIER_AUTO_LINK_SCORE
  ) {
    return true;
  }
  return false;
}

export function supplierPurchasedTotal(
  expenses: Expense[],
  supplier: Supplier,
  vatExempt = false,
): number {
  return expenses
    .filter((expense) => expenseMatchesSupplier(expense, supplier))
    .reduce(
      (sum, expense) => sum + expenseTotals(expense, vatExempt).total,
      0,
    );
}

export type SupplierSortField = "nombre" | "compras";
export type SupplierSortDirection = "asc" | "desc";

export const SUPPLIER_SORT_FIELD_LABELS: Record<SupplierSortField, string> = {
  nombre: "Nombre",
  compras: "Saldo neto de compras",
};

export function supplierSortDirectionLabel(
  field: SupplierSortField,
  direction: SupplierSortDirection,
): string {
  if (field === "compras") {
    return direction === "asc" ? "Menor a mayor" : "Mayor a menor";
  }
  return direction === "asc" ? "A → Z" : "Z → A";
}

export function sortSuppliers(
  suppliers: Supplier[],
  expenses: Expense[],
  field: SupplierSortField,
  direction: SupplierSortDirection,
  vatExempt = false,
): Supplier[] {
  const factor = direction === "asc" ? 1 : -1;
  const compareText = (left: string, right: string) =>
    factor *
    left.localeCompare(right, "es", {
      sensitivity: "base",
    });

  return [...suppliers].map(migrateSupplier).sort((a, b) => {
    switch (field) {
      case "nombre":
        return compareText(a.name, b.name);
      case "compras":
        return (
          factor *
          (supplierPurchasedTotal(expenses, a, vatExempt) -
            supplierPurchasedTotal(expenses, b, vatExempt))
        );
      default:
        return compareText(a.name, b.name);
    }
  });
}

export function sortSuppliersByName(suppliers: Supplier[]): Supplier[] {
  return [...suppliers].sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
  );
}

export function filterSuppliers(suppliers: Supplier[], query: string): Supplier[] {
  const q = query.trim().toLowerCase();
  if (!q) return sortSuppliersByName(suppliers);

  return sortSuppliersByName(suppliers).filter((supplier) => {
    const migrated = migrateSupplier(supplier);
    const haystack = [
      migrated.name,
      migrated.nif,
      migrated.email,
      migrated.phone,
      migrated.website,
      getStreetType(migrated.streetType)?.label,
      formatStreetLine(migrated.streetType, migrated.address),
      migrated.address,
      migrated.city,
      migrated.postalCode,
      migrated.notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function pickCanonicalSupplier(
  group: Supplier[],
  expenses: Expense[],
): Supplier {
  return [...group].sort((a, b) => {
    const score = (supplier: Supplier) => {
      const hasNif = normalizeSupplierNif(supplier.nif) ? 10 : 0;
      const expenseCount = expenses.filter((e) => e.supplierId === supplier.id)
        .length;
      const nameLength = normalizeSupplierName(supplier.name).length;
      return hasNif * 100 + expenseCount * 10 + nameLength;
    };
    return score(b) - score(a);
  })[0];
}

export function findDuplicateSupplierGroups(
  suppliers: Supplier[],
  minScore = SUPPLIER_AUTO_LINK_SCORE,
): Supplier[][] {
  const groups: Supplier[][] = [];
  const used = new Set<string>();

  for (const supplier of sortSuppliersByName(suppliers)) {
    if (used.has(supplier.id)) continue;

    const group = [supplier];
    for (const other of suppliers) {
      if (other.id === supplier.id || used.has(other.id)) continue;
      const score = supplierSimilarityScore(
        supplier.name,
        other.name,
        supplier.nif,
        other.nif,
      );
      if (score >= minScore) {
        group.push(other);
      }
    }

    if (group.length > 1) {
      group.forEach((item) => used.add(item.id));
      groups.push(group);
    }
  }

  return groups;
}

export function ensureSupplierForExpense(
  suppliers: Supplier[],
  input: {
    name: string;
    nif?: string | null;
    category?: string;
    saveSupplier: boolean;
    selectedSupplierId?: string | null;
  },
): {
  supplierId?: string;
  supplierName: string;
  create?: Omit<Supplier, "id" | "createdAt">;
  matchedExisting?: Supplier;
  matchScore?: number;
} {
  const supplierName = normalizeSupplierName(input.name);
  if (!supplierName) {
    return { supplierName: "" };
  }

  if (input.selectedSupplierId) {
    const selected = suppliers.find((s) => s.id === input.selectedSupplierId);
    if (selected) {
      return {
        supplierId: selected.id,
        supplierName: selected.name,
        matchedExisting: selected,
        matchScore: 1,
      };
    }
  }

  const match = findBestSupplierMatch(suppliers, {
    name: supplierName,
    nif: input.nif,
  });

  if (match && match.score >= SUPPLIER_AUTO_LINK_SCORE) {
    return {
      supplierId: match.supplier.id,
      supplierName: match.supplier.name,
      matchedExisting: match.supplier,
      matchScore: match.score,
    };
  }

  if (!input.saveSupplier) {
    return { supplierName };
  }

  return {
    supplierName,
    create: {
      name: supplierName,
      nif: input.nif?.trim() || undefined,
      category: input.category,
    },
  };
}

export function buildSupplierMatchHint(match: SupplierMatch): string {
  if (match.reason === "nif") {
    return `Coincide el NIF con «${match.supplier.name}». Usaremos ese proveedor.`;
  }
  if (match.score >= SUPPLIER_AUTO_LINK_SCORE) {
    return `Parece el mismo proveedor que «${match.supplier.name}». Los gastos irán agrupados ahí.`;
  }
  return `¿Es el mismo que «${match.supplier.name}»? Revisa el nombre antes de guardar.`;
}
