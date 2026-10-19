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
  referenceNamespaces: ReadonlySet<string>;
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
  const skuKey = normalizeProductSearch(product.sku ?? "");
  return {
    searchKey,
    words: [...new Set(searchKey.split(" ").filter(Boolean))],
    skuKey,
    referenceKeys: [...new Set(references.map(normalizeProductSearch).filter(Boolean))],
    referenceNamespaces: new Set(skuKey.includes(" ") ? [skuKey.split(" ")[0]] : []),
  };
}

/** Share only reference namespaces, never product data, outside the supplied catalog. */
export function buildProductSearchIndex<T extends ProductSearchSource>(products: readonly T[]) {
  const entries = products.map((product) => ({ product, ...buildProductSearchEntry(product) }));
  const referenceNamespaces = new Set(entries.flatMap((entry) => [...entry.referenceNamespaces]));
  return entries.map((entry) => ({ ...entry, referenceNamespaces }));
}

/** null means no match; every query term must match, not just a common prefix. */
export function productSearchScore(entry: ProductSearchEntry, query: string): number | null {
  const queryKey = normalizeProductSearch(query);
  if (!queryKey) return 0;
  // A known namespace followed by a numbered model is a reference request,
  // not an opportunity to match AL inside "lateral" or 1 inside a glass size.
  const namespace = queryKey.split(" ")[0];
  const referenceQuery = entry.referenceNamespaces.has(namespace) &&
    /[a-z]\s*\d/.test(queryKey.slice(namespace.length));
  const referenceQueryKey = referenceQuery ? queryKey.replace(/([a-z]) (?=\d)/g, "$1") : queryKey;
  const compactQuery = referenceQueryKey.replace(/ /g, "");
  const compactSku = entry.skuKey.replace(/ /g, "");
  if (compactSku && compactSku === compactQuery) return 2000;
  if (entry.referenceKeys.some((key) => key.replace(/ /g, "") === compactQuery)) return 1900;
  if (entry.skuKey && entry.skuKey.startsWith(`${referenceQueryKey} `)) return 1700;
  const matchingReference = entry.referenceKeys.find((key) =>
    key.includes(referenceQueryKey) || key.replace(/ /g, "").includes(compactQuery),
  );
  if (matchingReference) return 1400 - Math.min(matchingReference.length, 100);
  if (referenceQuery) return null;

  const parts = queryKey.split(" ");
  const matches = parts.every((part) => entry.words.some((word) =>
    part.length === 1 && !/\d/.test(part) ? word === part : word.includes(part),
  ));
  if (!matches) return null;
  return (entry.searchKey.includes(queryKey) ? 900 : 600) + Math.min(parts.length, 20);
}
