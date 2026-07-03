import type { DocumentType, LineItem } from "./types";
import { normalizeDocumentUnitId } from "./document-units";
import type { PurchaseProductSummary } from "./purchase-products";
import {
  documentProductSaleUnitPriceInfo,
  type DocumentProductSalePriceSource,
} from "./document-product-suggestions";

const PRODUCT_DOCUMENT_DRAFT_KEY = "factu:product-document-draft:v1";

export interface ProductDocumentDraftLine {
  productKey: string;
  productName: string;
  basePrice: number;
  priceSource: DocumentProductSalePriceSource;
  line: Omit<LineItem, "id">;
}

export interface ProductDocumentDraft {
  source: "productos";
  documentType: DocumentType;
  createdAt: string;
  lines: ProductDocumentDraftLine[];
}

export function productSummaryToDocumentDraftLine(
  product: PurchaseProductSummary,
  defaultIva = 21,
): ProductDocumentDraftLine {
  const price = documentProductSaleUnitPriceInfo(product);
  return {
    productKey: product.key,
    productName: product.name,
    basePrice: price.unitPrice,
    priceSource: price.source,
    line: {
      description: product.saleDescription || product.name,
      quantity: 1,
      unit:
        normalizeDocumentUnitId(product.saleUnit) ??
        normalizeDocumentUnitId(product.unit) ??
        product.saleUnit ??
        product.unit ??
        "ud",
      unitPrice: price.unitPrice,
      ivaPercent: product.saleIvaPercent ?? product.ivaPercent ?? defaultIva,
    },
  };
}

export function saveProductDocumentDraft(
  documentType: DocumentType,
  lines: ProductDocumentDraftLine[],
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const draft: ProductDocumentDraft = {
      source: "productos",
      documentType,
      createdAt: new Date().toISOString(),
      lines,
    };
    window.sessionStorage.setItem(
      PRODUCT_DOCUMENT_DRAFT_KEY,
      JSON.stringify(draft),
    );
    return true;
  } catch {
    return false;
  }
}

export function consumeProductDocumentDraft(): ProductDocumentDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PRODUCT_DOCUMENT_DRAFT_KEY);
    window.sessionStorage.removeItem(PRODUCT_DOCUMENT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProductDocumentDraft;
    if (
      parsed?.source !== "productos" ||
      !Array.isArray(parsed.lines) ||
      parsed.lines.length === 0
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
