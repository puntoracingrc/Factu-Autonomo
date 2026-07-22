import type { PurchaseProductSummary } from "./purchase-products";

export interface ProductFormDraft {
  sku: string;
  name: string;
  family: string;
  subfamily: string;
  saleDescription: string;
  saleUnit: string;
  salePrice: string;
  saleIvaPercent: string;
  supplierName: string;
  supplierReference: string;
  purchaseDescription: string;
  purchaseUnit: string;
  purchaseListPrice: string;
  purchaseDiscountPercent: string;
  purchaseNetUnitCost: string;
  calculationKind: "none" | "area";
  attributesText: string;
  notes: string;
}

export type ProductDuplicateReason =
  | "name"
  | "catalog_key"
  | "alias"
  | "sku"
  | "supplier_reference";

export interface ProductDuplicateCandidate {
  key: string;
  productId?: string;
  name: string;
  displayName: string;
  family: string;
  reasons: ProductDuplicateReason[];
}

export const EMPTY_PRODUCT_FORM_DRAFT: ProductFormDraft = {
  sku: "",
  name: "",
  family: "",
  subfamily: "",
  saleDescription: "",
  saleUnit: "ud",
  salePrice: "",
  saleIvaPercent: "21",
  supplierName: "",
  supplierReference: "",
  purchaseDescription: "",
  purchaseUnit: "ud",
  purchaseListPrice: "",
  purchaseDiscountPercent: "",
  purchaseNetUnitCost: "",
  calculationKind: "none",
  attributesText: "",
  notes: "",
};

function numberInput(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? "" : String(value);
}

function normalizedIdentity(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizedKey(value: string | undefined): string {
  return normalizedIdentity(value).replace(/\s+/g, "-");
}

export function productFormDraftFromSummary(
  product: PurchaseProductSummary,
  attributesText: string,
): ProductFormDraft {
  return {
    sku: product.sku ?? "",
    name: product.name,
    family: product.family,
    subfamily: product.subfamily ?? "",
    saleDescription: product.saleDescription ?? "",
    saleUnit: product.saleUnit ?? product.unit ?? "ud",
    salePrice: numberInput(product.saleUnitPrice),
    saleIvaPercent: numberInput(
      product.saleIvaPercent ?? product.ivaPercent,
    ),
    supplierName: product.usualSupplier?.supplierName ?? "",
    supplierReference: product.purchaseSupplierReference ?? "",
    purchaseDescription: product.purchaseDescription ?? "",
    purchaseUnit: product.purchaseUnit ?? product.unit ?? "ud",
    purchaseListPrice: numberInput(
      (product.purchaseListPrice ?? product.lastPvp) || undefined,
    ),
    purchaseDiscountPercent: numberInput(
      (product.purchaseDiscountPercent ?? product.lastDiscountPercent) ||
        undefined,
    ),
    purchaseNetUnitCost: numberInput(
      (product.purchaseNetUnitCost ?? product.lastUnitPrice) || undefined,
    ),
    calculationKind:
      product.calculation?.kind === "area" ? "area" : "none",
    attributesText,
    notes: product.notes ?? "",
  };
}

export function productFormHasChanges(
  initial: ProductFormDraft,
  current: ProductFormDraft,
): boolean {
  return (Object.keys(initial) as Array<keyof ProductFormDraft>).some(
    (field) => initial[field] !== current[field],
  );
}

export function findProductDuplicateCandidates(
  draft: ProductFormDraft,
  products: PurchaseProductSummary[],
  excludeKey?: string,
): ProductDuplicateCandidate[] {
  const inputName = normalizedIdentity(
    draft.name.trim() || draft.saleDescription.trim(),
  );
  const inputKey = normalizedKey(draft.name);
  const inputSku = normalizedIdentity(draft.sku);
  const inputSupplierReference = normalizedIdentity(draft.supplierReference);

  if (!inputName && !inputSku && !inputSupplierReference) return [];

  return products
    .filter((product) => product.key !== excludeKey)
    .map((product) => {
      const reasons: ProductDuplicateReason[] = [];
      const candidateName = normalizedIdentity(product.name);
      const candidateDisplayName = normalizedIdentity(
        product.saleDescription ?? product.name,
      );
      if (
        inputName &&
        (candidateName === inputName || candidateDisplayName === inputName)
      ) {
        reasons.push("name");
      }
      if (inputKey && normalizedKey(product.key) === inputKey) {
        reasons.push("catalog_key");
      }
      if (
        inputKey &&
        product.aliases.some((alias) => normalizedKey(alias) === inputKey)
      ) {
        reasons.push("alias");
      }
      if (inputSku && normalizedIdentity(product.sku) === inputSku) {
        reasons.push("sku");
      }
      if (
        inputSupplierReference &&
        normalizedIdentity(product.purchaseSupplierReference) ===
          inputSupplierReference
      ) {
        reasons.push("supplier_reference");
      }
      return { product, reasons };
    })
    .filter((entry) => entry.reasons.length > 0)
    .sort((a, b) => {
      const score = (reasons: ProductDuplicateReason[]) =>
        Number(reasons.includes("catalog_key")) * 100 +
        Number(reasons.includes("alias")) * 90 +
        Number(reasons.includes("sku")) * 70 +
        Number(reasons.includes("supplier_reference")) * 60 +
        Number(reasons.includes("name")) * 50;
      return score(b.reasons) - score(a.reasons);
    })
    .slice(0, 5)
    .map(({ product, reasons }) => ({
      key: product.key,
      productId: product.productId,
      name: product.name,
      displayName: product.saleDescription?.trim() || product.name,
      family: product.family,
      reasons,
    }));
}

export function productDuplicateReasonLabel(
  reason: ProductDuplicateReason,
): string {
  switch (reason) {
    case "catalog_key":
    case "name":
      return "mismo nombre";
    case "alias":
      return "coincide con un alias aprendido";
    case "sku":
      return "mismo código";
    case "supplier_reference":
      return "misma referencia de proveedor";
  }
}
