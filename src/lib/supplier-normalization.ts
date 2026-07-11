const LEGAL_SUFFIX_PATTERN =
  /\b(s\.?\s*l\.?\s*u?\.?|s\.?\s*a\.?|s\.?\s*l\.?\s*n\.?\s*e\.?|sociedad\s+limitada|sociedad\s+anonima)\b/gi;

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
