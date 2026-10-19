/** Search-only normalization. Never use this to change persisted product keys. */
export function normalizeProductSearch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/["'`´]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

interface ProductSearchSource {
  name: string;
  sku?: string;
  key?: string;
  aliases?: readonly string[];
  externalId?: string;
  family?: string;
  subfamily?: string;
  saleDescription?: string;
  purchaseDescription?: string;
  purchaseSupplierReference?: string;
  usualSupplier?: { supplierName: string };
  suppliers?: readonly { supplierName: string }[];
}

export interface ProductSearchEntry {
  searchKey: string;
  words: string[];
  skuKey: string;
  referenceKeys: string[];
}

export function buildProductSearchEntry(product: ProductSearchSource): ProductSearchEntry {
  const references = [product.sku, product.purchaseSupplierReference, product.externalId,
    ...(product.aliases ?? [])].filter((value): value is string => Boolean(value));
  // Do not use purchaseProductKey here: that identity helper drops single-letter
  // suffixes (R/F/C) and everything after the eighth word, including many SKUs.
  const searchKey = normalizeProductSearch([
    product.name, product.saleDescription, product.purchaseDescription,
    product.family, product.subfamily, product.usualSupplier?.supplierName,
    ...(product.suppliers ?? []).map((supplier) => supplier.supplierName),
    product.key, ...references,
  ].filter(Boolean).join(" "));
  return {
    searchKey,
    words: [...new Set(searchKey.split(" ").filter(Boolean))],
    skuKey: normalizeProductSearch(product.sku ?? ""),
    referenceKeys: [...new Set(references.map(normalizeProductSearch).filter(Boolean))],
  };
}

/** null means no match; every query term must match, not just a common prefix. */
export function productSearchScore(entry: ProductSearchEntry, query: string): number | null {
  const queryKey = normalizeProductSearch(query);
  if (!queryKey) return 0;
  const compactQuery = queryKey.replace(/ /g, "");
  const compactSku = entry.skuKey.replace(/ /g, "");
  if (compactSku && compactSku === compactQuery) return 2000;
  if (entry.referenceKeys.some((key) => key.replace(/ /g, "") === compactQuery)) return 1900;
  if (entry.skuKey && entry.skuKey.startsWith(`${queryKey} `)) return 1700;
  const matchingReference = entry.referenceKeys.find((key) =>
    key.includes(queryKey) || key.replace(/ /g, "").includes(compactQuery),
  );
  if (matchingReference) return 1400 - Math.min(matchingReference.length, 100);

  const parts = queryKey.split(" ");
  const matches = parts.every((part) => entry.words.some((word) =>
    part.length === 1 && !/\d/.test(part) ? word === part : word.includes(part),
  ));
  if (!matches) return null;
  return (entry.searchKey.includes(queryKey) ? 900 : 600) + Math.min(parts.length, 20);
}
