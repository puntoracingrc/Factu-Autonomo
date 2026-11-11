import { roundMoneySymmetric } from "./calculations";
import { normalizeDocumentUnitId } from "./document-units";
import type { ExpensePurchaseLine } from "./types";

export type ExpenseCatalogPriceLine = Pick<
  ExpensePurchaseLine,
  "quantity" | "unitPrice" | "discountPercent" | "netUnitPrice" | "total"
> &
  Partial<Pick<
    ExpensePurchaseLine,
    "description" | "unit" | "productRole" | "calculationBasis" |
    "width" | "height" | "dimensionUnit"
  >>;

type SurfacePrice =
  | { status: "needs_dimensions" | "check_invoice" }
  | { status: "ready"; areaM2: number; list: number; net: number };

export function isMosquitoScreenLine(
  line: Pick<ExpenseCatalogPriceLine, "description" | "productRole">,
): boolean {
  if (
    line.productRole &&
    line.productRole !== "main_product" &&
    line.productRole !== "unknown"
  ) {
    return false;
  }
  const description = line.description?.trim() ?? "";
  return /^mosquiteras?\b/iu.test(description) &&
    !/^mosquiteras?\s+(?:de\s+)?(?:accesorios?|repuestos?|recambios?)\b/iu.test(
      description,
    );
}

/** Purchase catalogue projection only. Never change the billed line or its VAT. */
export function resolveExpenseCatalogSurface(
  line: ExpenseCatalogPriceLine,
): SurfacePrice | null {
  if (!isMosquitoScreenLine(line)) return null;
  const unit = normalizeDocumentUnitId(line.unit?.trim().replace(/\.$/, ""));
  if (unit === "m2" || line.unit?.trim().toLowerCase() === "mq") return null;
  if (
    (line.unit?.trim() && unit !== "ud") ||
    (line.calculationBasis &&
      line.calculationBasis !== "unit" &&
      line.calculationBasis !== "unknown")
  ) {
    return { status: "check_invoice" };
  }

  const { width, height, dimensionUnit, quantity, unitPrice, total } = line;
  const scale =
    dimensionUnit === "mm" ? 0.001 :
    dimensionUnit === "cm" ? 0.01 :
    dimensionUnit === "m" ? 1 : 0;
  if (
    !scale ||
    typeof width !== "number" || !Number.isFinite(width) || width <= 0 ||
    typeof height !== "number" || !Number.isFinite(height) || height <= 0
  ) {
    return { status: "needs_dimensions" };
  }

  const discount = line.discountPercent ?? 0;
  const discountedPrice = unitPrice * (1 - discount / 100);
  const netPerPiece = line.netUnitPrice ?? discountedPrice;
  if (
    !Number.isSafeInteger(quantity) || quantity <= 0 ||
    !Number.isFinite(unitPrice) || unitPrice <= 0 ||
    !Number.isFinite(discount) || discount < 0 || discount >= 100 ||
    !Number.isFinite(netPerPiece) || netPerPiece <= 0 ||
    roundMoneySymmetric(Math.abs(netPerPiece - discountedPrice)) > 0.02
  ) {
    return { status: "check_invoice" };
  }

  const expectedBase = roundMoneySymmetric(quantity * discountedPrice);
  const base = total ?? expectedBase;
  // Suppliers may extend the unrounded price or round the net per piece first.
  const baseFromNet = roundMoneySymmetric(quantity * roundMoneySymmetric(netPerPiece));
  if (
    !Number.isFinite(base) || base <= 0 ||
    roundMoneySymmetric(Math.min(
      Math.abs(base - expectedBase),
      Math.abs(base - baseFromNet),
    )) > 0.02
  ) {
    return { status: "check_invoice" };
  }

  const areaPerPiece = (width * scale) * (height * scale);
  const areaM2 = areaPerPiece * quantity;
  const list = roundMoneySymmetric(unitPrice / areaPerPiece);
  const net = roundMoneySymmetric(base / areaM2);
  if (
    !Number.isFinite(areaM2) || areaM2 <= 0 ||
    !Number.isFinite(list) || list <= 0 || list > 1e12 ||
    !Number.isFinite(net) || net <= 0 || net > 1e12
  ) {
    return { status: "check_invoice" };
  }
  return { status: "ready", areaM2, list, net };
}
