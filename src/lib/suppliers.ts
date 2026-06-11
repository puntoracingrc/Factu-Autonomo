import type { Expense, Supplier } from "./types";

const LEGAL_SUFFIX_PATTERN =
  /\b(s\.?\s*l\.?\s*u?\.?|s\.?\s*a\.?|s\.?\s*l\.?\s*n\.?\s*e\.?|sociedad\s+limitada|sociedad\s+anonima)\b/gi;

/** Por encima de este umbral se reutiliza el proveedor existente automáticamente. */
export const SUPPLIER_AUTO_LINK_SCORE = 0.82;

/** Por encima de este umbral se sugiere al usuario un proveedor parecido. */
export const SUPPLIER_SUGGEST_SCORE = 0.65;

export interface SupplierMatch {
  supplier: Supplier;
  score: number;
  reason: "nif" | "exact" | "similar";
}

export function normalizeSupplierNif(nif?: string | null): string {
  if (!nif?.trim()) return "";
  return nif.replace(/[\s.-]/g, "").toUpperCase();
}

export function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

export function normalizeSupplierName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(LEGAL_SUFFIX_PATTERN, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function supplierCompareKey(name: string): string {
  return stripAccents(normalizeSupplierName(name)).toLowerCase();
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

export function sortSuppliersByName(suppliers: Supplier[]): Supplier[] {
  return [...suppliers].sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
  );
}

export function filterSuppliers(suppliers: Supplier[], query: string): Supplier[] {
  const q = query.trim().toLowerCase();
  if (!q) return sortSuppliersByName(suppliers);

  return sortSuppliersByName(suppliers).filter((supplier) => {
    const haystack = [
      supplier.name,
      supplier.nif,
      supplier.email,
      supplier.phone,
      supplier.website,
      supplier.address,
      supplier.notes,
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
