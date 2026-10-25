import { normalizeDocumentUnitId } from "./document-units";
import { supplierCompareKey } from "./supplier-normalization";
import { discountedProductCost } from "./product-catalog-lite/decimal-prices";
import type { ExpensePurchaseLine, Product } from "./types";

export type PurchaseSupplier = { supplierId?: string; supplierName?: string };
export function purchasePriceKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/²/g, "2")
    .replace(/³/g, "3")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
export function samePurchaseSupplier(
  left: PurchaseSupplier,
  right: PurchaseSupplier,
): boolean {
  if (left.supplierId && right.supplierId)
    return left.supplierId === right.supplierId;
  const name = supplierCompareKey(left.supplierName ?? "");
  return !!name && name === supplierCompareKey(right.supplierName ?? "");
}
export function purchasePriceUnit(value?: string): string {
  const unit = value?.trim() || "ud";
  return normalizeDocumentUnitId(unit) ?? purchasePriceKey(unit);
}
export function samePurchaseLine(
  left: Pick<ExpensePurchaseLine, "description" | "supplierReference" | "unit">,
  right: Pick<
    ExpensePurchaseLine,
    "description" | "supplierReference" | "unit"
  >,
): boolean {
  if (purchasePriceUnit(left.unit) !== purchasePriceUnit(right.unit))
    return false;
  const a = purchasePriceKey(left.supplierReference ?? ""),
    b = purchasePriceKey(right.supplierReference ?? "");
  if (a && b) return a === b;
  const name = purchasePriceKey(left.description);
  return !!name && name === purchasePriceKey(right.description);
}
/** A price write never uses the fuzzy product search or drops model numbers. */
export function matchingPurchaseProducts(
  line: Pick<ExpensePurchaseLine, "description" | "supplierReference" | "unit">,
  supplier: PurchaseSupplier,
  products: Product[],
  options: { ignoreUnit?: boolean } = {},
): Product[] {
  const name = purchasePriceKey(line.description),
    ref = purchasePriceKey(line.supplierReference ?? "");
  const matches = products.filter((product) => {
    if (
      product.hidden ||
      !samePurchaseSupplier(supplier, {
        supplierId: product.purchase?.supplierId ?? product.supplierId,
        supplierName: product.purchase?.supplierName ?? product.supplierName,
      })
    )
      return false;
    if (
      !options.ignoreUnit &&
      purchasePriceUnit(line.unit) !==
        purchasePriceUnit(
          product.purchase?.unit ?? product.unit ?? product.sales?.unit,
        )
    )
      return false;
    const productRef = purchasePriceKey(
      product.purchase?.supplierReference ?? "",
    );
    if (ref && productRef) return ref === productRef;
    return (
      !!name &&
      [
        product.name,
        product.key,
        product.sales?.description,
        product.purchase?.description,
        ...(product.aliases ?? []),
      ].some((value) => !!value && purchasePriceKey(value) === name)
    );
  });
  const byRef = ref
    ? matches.filter(
        (p) => purchasePriceKey(p.purchase?.supplierReference ?? "") === ref,
      )
    : [];
  return byRef.length ? byRef : matches;
}
export function purchaseLinePrice(
  line: Pick<
    ExpensePurchaseLine,
    "unitPrice" | "discountPercent" | "netUnitPrice"
  >,
): { list: number; discount: number; net: number; consistent: boolean } | null {
  const list = line.unitPrice,
    discount = line.discountPercent ?? 0;
  if (
    !Number.isFinite(list) ||
    list < 0 ||
    list > 1e12 ||
    !Number.isFinite(discount) ||
    discount < 0 ||
    discount > 100
  )
    return null;
  const calculated = discountedProductCost(list, discount),
    explicit = line.netUnitPrice;
  if (
    explicit !== undefined &&
    (!Number.isFinite(explicit) || explicit < 0 || explicit > 1e12)
  )
    return null;
  const net =
    explicit === undefined ? calculated : discountedProductCost(explicit, 0);
  return {
    list,
    discount,
    net,
    consistent: explicit === undefined || Math.abs(net - calculated) <= 0.02,
  };
}
