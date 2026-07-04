import { roundMoney } from "./calculations";
import { normalizeDocumentUnitId } from "./document-units";
import {
  purchaseProductKey,
  type PurchaseProductSummary,
} from "./purchase-products";
import type { LineItem } from "./types";

export interface DocumentProductSuggestionIndexItem {
  product: PurchaseProductSummary;
  searchKey: string;
  lastPurchaseTime: number;
}

export interface AppliedDocumentProductLine {
  line: Partial<LineItem>;
  basePrice: number;
  priceSource: DocumentProductSalePriceSource;
}

export const DOCUMENT_PRODUCT_MARKUPS = [0, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100];

export type DocumentProductSalePriceSource =
  | "sale"
  | "providerTariff"
  | "cost"
  | "none";

export interface DocumentProductSalePriceInfo {
  unitPrice: number;
  source: DocumentProductSalePriceSource;
}

export interface DocumentProductMentionQuery {
  query: string;
  start: number;
  end: number;
}

export function documentProductMentionQuery(
  description: string,
): DocumentProductMentionQuery | null {
  const match = /(^|\s)@([^\n]*)$/.exec(description);
  if (!match || match.index < 0) return null;

  const prefixLength = match[1]?.length ?? 0;
  const start = match.index + prefixLength;
  const query = match[2]?.trim() ?? "";

  return {
    query,
    start,
    end: description.length,
  };
}

export function replaceDocumentProductMention(
  description: string,
  replacement: string,
): string {
  const mention = documentProductMentionQuery(description);
  const cleanReplacement = replacement.trim();
  if (!mention || !cleanReplacement) return cleanReplacement || description;

  return `${description.slice(0, mention.start)}${cleanReplacement}${description.slice(
    mention.end,
  )}`.trim();
}

export function documentProductSaleUnitPriceInfo(
  product: PurchaseProductSummary,
): DocumentProductSalePriceInfo {
  if (Number.isFinite(product.saleUnitPrice) && (product.saleUnitPrice ?? 0) > 0) {
    return { unitPrice: roundMoney(product.saleUnitPrice ?? 0), source: "sale" };
  }

  const pvp = [product.lastPvp, product.averagePvp].find(
    (value) => Number.isFinite(value) && (value ?? 0) > 0,
  );
  if (pvp) return { unitPrice: roundMoney(pvp), source: "providerTariff" };

  const cost = [product.lastUnitPrice, product.averageUnitPrice].find(
    (value) => Number.isFinite(value) && (value ?? 0) > 0,
  );
  if (cost) return { unitPrice: roundMoney(cost), source: "cost" };

  return { unitPrice: 0, source: "none" };
}

export function documentProductSaleUnitPrice(
  product: PurchaseProductSummary,
): number {
  return documentProductSaleUnitPriceInfo(product).unitPrice;
}

export function buildDocumentProductSuggestionIndex(
  products: PurchaseProductSummary[],
): DocumentProductSuggestionIndexItem[] {
  return products.map((product) => ({
    product,
    searchKey: purchaseProductKey(
      [
        product.name,
        product.family,
        product.usualSupplier?.supplierName,
        ...product.suppliers.map((supplier) => supplier.supplierName),
        product.key,
        ...product.aliases,
      ]
        .filter(Boolean)
        .join(" "),
    ),
    lastPurchaseTime: Date.parse(product.lastPurchaseDate) || 0,
  }));
}

export function searchDocumentProductSuggestions(
  index: DocumentProductSuggestionIndexItem[],
  query: string,
  limit = 6,
): PurchaseProductSummary[] {
  const queryKey = purchaseProductKey(query);
  if (queryKey.length < 2) return [];

  const queryParts = queryKey.split(/\s+/).filter(Boolean);
  return index
    .map((entry) => {
      let score = 0;
      if (entry.product.key === queryKey) score += 120;
      if (entry.product.key.startsWith(queryKey)) score += 80;
      if (entry.product.name.toLowerCase().includes(query.toLowerCase())) score += 70;
      if (entry.searchKey.includes(queryKey)) score += 55;
      for (const part of queryParts) {
        if (entry.searchKey.includes(part)) score += 12;
      }
      if (score <= 0) return null;
      score += Math.min(entry.product.purchaseCount, 10);
      if (documentProductSaleUnitPrice(entry.product) > 0) score += 5;
      return { entry, score };
    })
    .filter((item): item is { entry: DocumentProductSuggestionIndexItem; score: number } =>
      Boolean(item),
    )
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.entry.lastPurchaseTime !== a.entry.lastPurchaseTime) {
        return b.entry.lastPurchaseTime - a.entry.lastPurchaseTime;
      }
      return a.entry.product.name.localeCompare(b.entry.product.name, "es");
    })
    .slice(0, limit)
    .map(({ entry }) => entry.product);
}

export function applyDocumentProductToLine(
  product: PurchaseProductSummary,
  line: LineItem,
  options: { defaultIva: number; vatExempt: boolean },
): AppliedDocumentProductLine {
  const price = documentProductSaleUnitPriceInfo(product);
  return {
    basePrice: price.unitPrice,
    priceSource: price.source,
    line: {
      description: product.saleDescription || product.name,
      quantity: line.quantity > 0 ? line.quantity : 1,
      unit:
        normalizeDocumentUnitId(product.saleUnit) ??
        normalizeDocumentUnitId(product.unit) ??
        normalizeDocumentUnitId(line.unit) ??
        product.saleUnit ??
        product.unit ??
        line.unit,
      unitPrice: price.unitPrice,
      ivaPercent: options.vatExempt
        ? 0
        : (product.saleIvaPercent ??
          product.ivaPercent ??
          line.ivaPercent ??
          options.defaultIva),
    },
  };
}

export function priceWithDocumentProductMarkup(
  basePrice: number,
  markupPercent: number,
): number {
  return roundMoney(basePrice * (1 + markupPercent / 100));
}
