import type { CatalogSummary } from "@/lib/product-catalog-lite/model";
import { salePriceWithVat } from "@/lib/product-price-sources";

const esc = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
const money = (value: number | null | undefined) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
      }).format(value);

/** The compact view uses the same estimate as the detail, including pack conversion. */
export function summaryPricesView(product: CatalogSummary): string {
  const cost = product.saleUnitCost ?? product.cost,
    benefit = product.estimatedBenefit;
  const costUnit =
    product.saleUnitCost == null ? product.purchaseUnit : product.unit;
  const units =
    costUnit === product.unit
      ? `Por ${product.unit}`
      : `Coste por ${costUnit} · PVP por ${product.unit}`;
  const discount = product.discountPercent;
  const discountLabel =
    discount != null &&
    Number.isFinite(discount) &&
    discount >= 0 &&
    discount <= 100
      ? `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 6 }).format(discount)} %`
      : "Sin indicar";
  return `<div class="prices price-summary"><div><span>Coste</span><strong>${money(cost)}</strong></div><div class="benefit-price${benefit != null && benefit < 0 ? " benefit-loss" : ""}"><span>Beneficio</span><strong>${money(benefit)}</strong></div><div class="sale-price"><span>PVP</span><strong>${money(salePriceWithVat(product.salePrice, product.vat))}</strong></div></div><p class="price-summary-note">${esc(units)} · Coste y beneficio sin IVA · PVP con IVA</p><p class="card-discount"><span>Descuento proveedor</span><strong>${discountLabel}</strong></p>`;
}
