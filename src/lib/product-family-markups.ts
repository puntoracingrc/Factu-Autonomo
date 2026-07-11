import { roundMoney } from "./calculations";
import {
  buildPurchaseProductSummaries,
  normalizeProductCatalogItem,
  type PurchaseProductSummary,
} from "./purchase-products";
import type {
  AppData,
  Product,
  ProductFamilyMarkupSettings,
} from "./types";

export const MAX_PRODUCT_FAMILY_MARKUP_PERCENT = 300;

function cleanFamily(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeProductFamilyMarkupPercent(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return roundMoney(
    Math.min(Math.max(value, 0), MAX_PRODUCT_FAMILY_MARKUP_PERCENT),
  );
}

export function normalizeProductFamilyMarkupSettings(
  settings?: Partial<ProductFamilyMarkupSettings>,
): ProductFamilyMarkupSettings {
  const seen = new Set<string>();
  const rules = (settings?.rules ?? [])
    .map((rule) => {
      const family = cleanFamily(rule.family);
      if (!family) return null;
      const key = family.toLocaleLowerCase("es");
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        id:
          typeof rule.id === "string" && rule.id.trim()
            ? rule.id.trim()
            : `markup-${key.replace(/[^a-z0-9]+/gi, "-")}`,
        family,
        markupPercent: normalizeProductFamilyMarkupPercent(rule.markupPercent),
      };
    })
    .filter((rule): rule is ProductFamilyMarkupSettings["rules"][number] =>
      Boolean(rule),
    );

  return { rules };
}

export function productFamilyMarkupPercent(
  family: string | undefined,
  settings?: ProductFamilyMarkupSettings,
): number {
  const normalizedFamily = cleanFamily(family).toLocaleLowerCase("es");
  if (!normalizedFamily) return 0;
  const normalized = normalizeProductFamilyMarkupSettings(settings);
  return (
    normalized.rules.find(
      (rule) => rule.family.toLocaleLowerCase("es") === normalizedFamily,
    )?.markupPercent ?? 0
  );
}

export type ProductFamilyRenameResult =
  | {
      ok: true;
      data: AppData;
      productCount: number;
      ruleMigrated: boolean;
    }
  | {
      ok: false;
      data: AppData;
      code: "invalid" | "not_found" | "collision";
      error: string;
    };

interface ProductFamilyRenameOptions {
  now?: string;
  createId?: () => string;
}

function familyKey(value: string): string {
  return cleanFamily(value).toLocaleLowerCase("es");
}

function catalogProductFromSummary(
  product: PurchaseProductSummary,
  family: string,
  id: string,
  now: string,
): Product {
  return normalizeProductCatalogItem({
    id,
    key: product.key,
    aliases: product.aliases,
    sku: product.sku,
    externalId: product.externalId,
    name: product.name,
    family,
    subfamily: product.subfamily,
    unit: product.saleUnit ?? product.unit,
    supplierId: product.usualSupplier?.supplierId,
    supplierName: product.usualSupplier?.supplierName,
    pvp: (product.purchaseListPrice ?? product.lastPvp) || undefined,
    cost: (product.purchaseNetUnitCost ?? product.lastUnitPrice) || undefined,
    ivaPercent: product.saleIvaPercent ?? product.ivaPercent,
    sales: {
      enabled: true,
      description: product.saleDescription,
      unit: product.saleUnit ?? product.unit,
      unitPrice: product.saleUnitPrice,
      ivaPercent: product.saleIvaPercent ?? product.ivaPercent,
    },
    purchase: {
      enabled: true,
      description: product.purchaseDescription,
      unit: product.purchaseUnit ?? product.unit,
      listPrice: (product.purchaseListPrice ?? product.lastPvp) || undefined,
      discountPercent:
        (product.purchaseDiscountPercent ?? product.lastDiscountPercent) ||
        undefined,
      netUnitCost:
        (product.purchaseNetUnitCost ?? product.lastUnitPrice) || undefined,
      ivaPercent: product.ivaPercent,
      supplierId: product.usualSupplier?.supplierId,
      supplierName: product.usualSupplier?.supplierName,
      supplierReference: product.purchaseSupplierReference,
      purchaseToSaleFactor: product.purchaseToSaleFactor,
    },
    calculation: product.calculation,
    attributes: product.attributes,
    notes: product.notes,
    source: "manual",
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Renames a product family and its pricing rule in one AppData transition.
 * A target collision is rejected before any object is changed so two margin
 * rules can never be silently collapsed.
 */
export function renameProductFamilyInAppData(
  data: AppData,
  sourceValue: string,
  targetValue: string,
  options: ProductFamilyRenameOptions = {},
): ProductFamilyRenameResult {
  const sourceFamily = cleanFamily(sourceValue);
  const targetFamily = cleanFamily(targetValue);
  if (!sourceFamily || !targetFamily) {
    return {
      ok: false,
      data,
      code: "invalid",
      error: "Elige una familia de origen y escribe el nuevo nombre.",
    };
  }
  if (sourceFamily === targetFamily) {
    return {
      ok: false,
      data,
      code: "invalid",
      error: "La familia ya tenía ese nombre.",
    };
  }

  const sourceKey = familyKey(sourceFamily);
  const targetKey = familyKey(targetFamily);
  const summaries = buildPurchaseProductSummaries(data.expenses, data.products);
  const rules = data.profile.productFamilyMarkups?.rules ?? [];
  const sourceExists =
    summaries.some((product) => familyKey(product.family) === sourceKey) ||
    data.products.some((product) => familyKey(product.family) === sourceKey) ||
    rules.some((rule) => familyKey(rule.family) === sourceKey);
  if (!sourceExists) {
    return {
      ok: false,
      data,
      code: "not_found",
      error: `La familia "${sourceFamily}" ya no existe. Actualiza la lista e inténtalo de nuevo.`,
    };
  }

  if (sourceKey !== targetKey) {
    const productCollision =
      summaries.some((product) => familyKey(product.family) === targetKey) ||
      data.products.some((product) => familyKey(product.family) === targetKey);
    const ruleCollision = rules.some(
      (rule) => familyKey(rule.family) === targetKey,
    );
    if (productCollision || ruleCollision) {
      return {
        ok: false,
        data,
        code: "collision",
        error: `Ya existe la familia "${targetFamily}" o una regla de margen con ese nombre. Elige otro nombre para no perder ninguna regla.`,
      };
    }
  }

  const now = options.now ?? new Date().toISOString();
  const createId = options.createId ?? (() => crypto.randomUUID());
  const affectedSummaries = summaries.filter(
    (product) => familyKey(product.family) === sourceKey,
  );
  const existingIds = new Set(data.products.map((product) => product.id));
  const existingKeys = new Set(data.products.map((product) => product.key));
  const renamedProducts = data.products.map((product) => {
    if (familyKey(product.family) !== sourceKey) return product;
    return normalizeProductCatalogItem({
      ...product,
      family: targetFamily,
      name:
        product.hidden && product.name.startsWith("Familia:")
          ? `Familia: ${targetFamily}`
          : product.name,
      updatedAt: now,
    });
  });
  const createdProducts = affectedSummaries
    .filter(
      (product) =>
        (!product.productId || !existingIds.has(product.productId)) &&
        !existingKeys.has(product.key),
    )
    .map((product) =>
      catalogProductFromSummary(product, targetFamily, createId(), now),
    );

  let ruleMigrated = false;
  const renamedRules = rules.map((rule) => {
    if (familyKey(rule.family) !== sourceKey) return rule;
    ruleMigrated = true;
    return { ...rule, family: targetFamily };
  });
  const profile = data.profile.productFamilyMarkups
    ? {
        ...data.profile,
        productFamilyMarkups: { rules: renamedRules },
      }
    : data.profile;

  return {
    ok: true,
    data: {
      ...data,
      profile,
      products: [...renamedProducts, ...createdProducts],
    },
    productCount: affectedSummaries.length,
    ruleMigrated,
  };
}
