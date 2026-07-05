import { normalizeProductCatalogItem } from "@/lib/purchase-products";
import type { Product } from "@/lib/types";
import type { ProfitabilityArticleSource } from "./types";

export function mapExistingArticleToProfitabilityItem(
  product: Product,
): ProfitabilityArticleSource {
  const normalized = normalizeProductCatalogItem(product);

  return {
    id: normalized.id,
    key: normalized.key,
    name: normalized.name,
    family: normalized.family,
    source: normalized.source,
    saleUnitPrice: normalized.sales?.unitPrice,
    purchaseNetUnitCost: normalized.purchase?.netUnitCost ?? normalized.cost,
    ivaPercent: normalized.ivaPercent,
    supplierName: normalized.supplierName,
    sourceLink: {
      sourceType: "product",
      sourceId: normalized.id,
      label: `Artículo ${normalized.name}`,
      href: "/productos",
    },
  };
}
