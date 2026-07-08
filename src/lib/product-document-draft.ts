import type { Document, DocumentType, LineItem } from "./types";
import type { LineMeasurementDraft } from "./area-calculation";
import { normalizeDocumentUnitId } from "./document-units";
import type { PurchaseProductSummary } from "./purchase-products";
import {
  documentProductSaleUnitPriceInfo,
  type DocumentProductSalePriceSource,
} from "./document-product-suggestions";

const PRODUCT_DOCUMENT_DRAFT_KEY = "factu:product-document-draft:v1";
const DOCUMENT_PRODUCT_RETURN_KEY = "factu:document-product-return:v1";
const DOCUMENT_PRODUCT_PICK_REQUEST_KEY = "factu:document-product-pick:v1";
const DOCUMENT_PRODUCT_PICKED_LINE_KEY =
  "factu:document-product-picked-line:v1";

export interface ProductDocumentDraftLine {
  productKey: string;
  productId?: string;
  productName: string;
  basePrice: number;
  priceSource: DocumentProductSalePriceSource;
  costUnitPrice?: number;
  costIvaPercent?: number;
  line: Omit<LineItem, "id">;
}

export interface ProductDocumentDraft {
  source: "productos";
  documentType: DocumentType;
  createdAt: string;
  lines: ProductDocumentDraftLine[];
}

export interface DocumentProductLinePricingDraft {
  basePrice: number;
  markupPercent: number;
  priceSource: DocumentProductSalePriceSource;
  productKey?: string;
  productId?: string;
  productName: string;
  costUnitPrice?: number;
  costIvaPercent?: number;
}

export type DocumentProductAreaDraft = LineMeasurementDraft;

export interface DocumentProductFormStateDraft {
  clientForm: Record<string, string>;
  selectedCustomerId: string | null;
  date: string;
  dueDate: string;
  notes: string;
  paymentTerms: string;
  status: Document["status"];
  documentIvaPercent: number;
  items: LineItem[];
  lineProductPricing: Record<string, DocumentProductLinePricingDraft>;
  lineAreaDrafts: Record<string, DocumentProductAreaDraft>;
}

export interface DocumentProductReturnDraft {
  source: "document";
  documentType: DocumentType;
  returnPath: string;
  targetLineId: string;
  createdAt: string;
  form: DocumentProductFormStateDraft;
}

export interface DocumentProductPickRequest {
  source: "document";
  documentType: DocumentType;
  returnPath: string;
  targetLineId: string;
  createdAt: string;
  mode?: "pick" | "edit";
  productKey?: string;
  productId?: string;
  prefill?: {
    name?: string;
    description?: string;
    unit?: string;
    unitPrice?: number;
    ivaPercent?: number;
  };
}

function firstPositiveNumber(
  ...values: Array<number | undefined>
): number | undefined {
  return values.find(
    (value): value is number => Number.isFinite(value) && (value ?? 0) > 0,
  );
}

export interface DocumentProductPickedLine {
  source: "productos";
  documentType: DocumentType;
  targetLineId: string;
  createdAt: string;
  draftLine: ProductDocumentDraftLine;
}

export function productSummaryToDocumentDraftLine(
  product: PurchaseProductSummary,
  defaultIva = 21,
): ProductDocumentDraftLine {
  const price = documentProductSaleUnitPriceInfo(product);
  return {
    productKey: product.key,
    productId: product.productId,
    productName: product.name,
    basePrice: price.unitPrice,
    priceSource: price.source,
    costUnitPrice: firstPositiveNumber(
      product.purchaseNetUnitCost,
      product.lastUnitPrice,
      product.averageUnitPrice,
    ),
    costIvaPercent: product.ivaPercent ?? product.saleIvaPercent ?? defaultIva,
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

export function saveDocumentProductReturnDraft(
  draft: DocumentProductReturnDraft,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(
      DOCUMENT_PRODUCT_RETURN_KEY,
      JSON.stringify(draft),
    );
    return true;
  } catch {
    return false;
  }
}

export function consumeDocumentProductReturnDraft(
  documentType: DocumentType,
): DocumentProductReturnDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DOCUMENT_PRODUCT_RETURN_KEY);
    window.sessionStorage.removeItem(DOCUMENT_PRODUCT_RETURN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DocumentProductReturnDraft;
    if (
      parsed?.source !== "document" ||
      parsed.documentType !== documentType ||
      !parsed.returnPath ||
      !parsed.targetLineId ||
      !parsed.form
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveDocumentProductPickRequest(
  request: DocumentProductPickRequest,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(
      DOCUMENT_PRODUCT_PICK_REQUEST_KEY,
      JSON.stringify(request),
    );
    return true;
  } catch {
    return false;
  }
}

export function getDocumentProductPickRequest(): DocumentProductPickRequest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(
      DOCUMENT_PRODUCT_PICK_REQUEST_KEY,
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DocumentProductPickRequest;
    if (
      parsed?.source !== "document" ||
      !parsed.returnPath ||
      !parsed.targetLineId
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDocumentProductPickRequest(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(DOCUMENT_PRODUCT_PICK_REQUEST_KEY);
  } catch {
    // Ignore private browsing storage errors.
  }
}

export function saveDocumentProductPickedLine(
  selection: DocumentProductPickedLine,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(
      DOCUMENT_PRODUCT_PICKED_LINE_KEY,
      JSON.stringify(selection),
    );
    return true;
  } catch {
    return false;
  }
}

export function consumeDocumentProductPickedLine(
  documentType: DocumentType,
): DocumentProductPickedLine | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DOCUMENT_PRODUCT_PICKED_LINE_KEY);
    window.sessionStorage.removeItem(DOCUMENT_PRODUCT_PICKED_LINE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DocumentProductPickedLine;
    if (
      parsed?.source !== "productos" ||
      parsed.documentType !== documentType ||
      !parsed.targetLineId ||
      !parsed.draftLine
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function productSummaryToPickedLine(
  product: PurchaseProductSummary,
  request: DocumentProductPickRequest,
  defaultIva = 21,
): DocumentProductPickedLine {
  return {
    source: "productos",
    documentType: request.documentType,
    targetLineId: request.targetLineId,
    createdAt: new Date().toISOString(),
    draftLine: productSummaryToDocumentDraftLine(product, defaultIva),
  };
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
