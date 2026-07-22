import {
  buildPurchaseProductSummaries,
  normalizeProductCatalogItem,
  type PurchaseProductSummary,
} from "./purchase-products";
import type { AppData, Product } from "./types";

export const UNCATEGORIZED_PRODUCT_FAMILY = "Sin familia";

const FAMILY_MARKER_KEY_PREFIX = "__family__-";
const SUBFAMILY_MARKER_KEY_PREFIX = "__subfamily__-";
const FAMILY_MARKER_NOTE =
  "Marcador interno para recordar una familia creada a mano.";
const SUBFAMILY_MARKER_NOTE =
  "Marcador interno para recordar una subfamilia creada a mano.";

export type ProductCatalogStructureOperation =
  | {
      type: "move_products";
      productKeys: string[];
      targetFamily: string;
      targetSubfamily?: string;
    }
  | {
      type: "rename_subfamily";
      family: string;
      sourceSubfamily: string;
      targetSubfamily: string;
    }
  | {
      type: "merge_families";
      sourceFamily: string;
      targetFamily: string;
    }
  | {
      type: "merge_subfamilies";
      family: string;
      sourceSubfamily: string;
      targetSubfamily: string;
    }
  | {
      type: "remove_family";
      family: string;
    }
  | {
      type: "remove_subfamily";
      family: string;
      subfamily: string;
    };

export type ProductCatalogStructureErrorCode =
  | "invalid"
  | "not_found"
  | "collision"
  | "margin_rule";

export type ProductCatalogStructureResult =
  | {
      ok: true;
      data: AppData;
      productCount: number;
      ruleMigrated: boolean;
    }
  | {
      ok: false;
      data: AppData;
      code: ProductCatalogStructureErrorCode;
      error: string;
    };

export type ProductFamilyRenameResult = ProductCatalogStructureResult;

interface ProductCatalogStructureOptions {
  now?: string;
  createId?: () => string;
}

interface ProductRewrite {
  summaryMatches: (product: PurchaseProductSummary) => boolean;
  productMatches: (product: Product) => boolean;
  updateSummary: (
    product: PurchaseProductSummary,
  ) => Pick<Product, "family" | "subfamily">;
  updateProduct: (product: Product) => Product | null;
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function catalogKey(value: string): string {
  return cleanText(value).toLocaleLowerCase("es");
}

export function isProductFamilyMarker(product: Product): boolean {
  return (
    product.hidden === true &&
    (product.key.startsWith(FAMILY_MARKER_KEY_PREFIX) ||
      product.notes === FAMILY_MARKER_NOTE)
  );
}

export function isProductSubfamilyMarker(product: Product): boolean {
  return (
    product.hidden === true &&
    (product.key.startsWith(SUBFAMILY_MARKER_KEY_PREFIX) ||
      product.notes === SUBFAMILY_MARKER_NOTE)
  );
}

function structureError(
  data: AppData,
  code: ProductCatalogStructureErrorCode,
  error: string,
): ProductCatalogStructureResult {
  return { ok: false, data, code, error };
}

function catalogProductFromSummary(
  product: PurchaseProductSummary,
  structure: Pick<Product, "family" | "subfamily">,
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
    family: structure.family,
    subfamily: structure.subfamily,
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

function rewriteProducts(
  data: AppData,
  rewrite: ProductRewrite,
  options: ProductCatalogStructureOptions,
): { data: AppData; productCount: number } {
  const now = options.now ?? new Date().toISOString();
  const createId = options.createId ?? (() => crypto.randomUUID());
  const summaries = buildPurchaseProductSummaries(data.expenses, data.products);
  const affectedSummaries = summaries.filter(rewrite.summaryMatches);
  const existingById = new Map(
    data.products.map((product) => [product.id, product] as const),
  );
  const existingByKey = new Map(
    data.products.map((product) => [product.key, product] as const),
  );
  const countedProducts = new Set<string>();

  for (const summary of affectedSummaries) {
    const existing = summary.productId
      ? existingById.get(summary.productId)
      : existingByKey.get(summary.key);
    countedProducts.add(existing ? `id:${existing.id}` : `key:${summary.key}`);
  }

  const rewrittenProducts: Product[] = [];
  for (const product of data.products) {
    if (!rewrite.productMatches(product)) {
      rewrittenProducts.push(product);
      continue;
    }
    if (
      !isProductFamilyMarker(product) &&
      !isProductSubfamilyMarker(product)
    ) {
      countedProducts.add(`id:${product.id}`);
    }
    const updated = rewrite.updateProduct(product);
    if (updated) {
      const normalized = normalizeProductCatalogItem({
        ...updated,
        updatedAt: now,
      });
      rewrittenProducts.push(
        isProductFamilyMarker(product) || isProductSubfamilyMarker(product)
          ? { ...normalized, key: product.key }
          : normalized,
      );
    }
  }

  const createdProducts = affectedSummaries
    .filter((summary) => {
      if (summary.productId && existingById.has(summary.productId)) return false;
      return !existingByKey.has(summary.key);
    })
    .map((summary) =>
      catalogProductFromSummary(
        summary,
        rewrite.updateSummary(summary),
        createId(),
        now,
      ),
    );

  return {
    data: {
      ...data,
      products: [...rewrittenProducts, ...createdProducts],
    },
    productCount: countedProducts.size,
  };
}

function familyExists(data: AppData, family: string): boolean {
  const key = catalogKey(family);
  if (!key) return false;
  return (
    buildPurchaseProductSummaries(data.expenses, data.products).some(
      (product) => catalogKey(product.family) === key,
    ) ||
    data.products.some((product) => catalogKey(product.family) === key) ||
    (data.profile.productFamilyMarkups?.rules ?? []).some(
      (rule) => catalogKey(rule.family) === key,
    )
  );
}

function subfamilyExists(
  data: AppData,
  family: string,
  subfamily: string,
): boolean {
  const familyIdentity = catalogKey(family);
  const subfamilyIdentity = catalogKey(subfamily);
  if (!familyIdentity || !subfamilyIdentity) return false;
  return (
    buildPurchaseProductSummaries(data.expenses, data.products).some(
      (product) =>
        catalogKey(product.family) === familyIdentity &&
        catalogKey(product.subfamily ?? "") === subfamilyIdentity,
    ) ||
    data.products.some(
      (product) =>
        catalogKey(product.family) === familyIdentity &&
        catalogKey(product.subfamily ?? "") === subfamilyIdentity,
    )
  );
}

function rewriteFamily(
  data: AppData,
  sourceFamily: string,
  targetFamily: string,
  options: ProductCatalogStructureOptions,
): { data: AppData; productCount: number } {
  const sourceIdentity = catalogKey(sourceFamily);
  return rewriteProducts(
    data,
    {
      summaryMatches: (product) =>
        catalogKey(product.family) === sourceIdentity,
      productMatches: (product) =>
        catalogKey(product.family) === sourceIdentity,
      updateSummary: (product) => ({
        family: targetFamily,
        subfamily: product.subfamily,
      }),
      updateProduct: (product) => ({
        ...product,
        family: targetFamily,
        name:
          isProductFamilyMarker(product) && product.name.startsWith("Familia:")
            ? `Familia: ${targetFamily}`
            : product.name,
      }),
    },
    options,
  );
}

export function renameProductFamilyInAppData(
  data: AppData,
  sourceValue: string,
  targetValue: string,
  options: ProductCatalogStructureOptions = {},
): ProductFamilyRenameResult {
  const sourceFamily = cleanText(sourceValue);
  const targetFamily = cleanText(targetValue);
  if (!sourceFamily || !targetFamily) {
    return structureError(
      data,
      "invalid",
      "Elige una familia de origen y escribe el nuevo nombre.",
    );
  }
  if (sourceFamily === targetFamily) {
    return structureError(data, "invalid", "La familia ya tenía ese nombre.");
  }

  const sourceIdentity = catalogKey(sourceFamily);
  const targetIdentity = catalogKey(targetFamily);
  if (!familyExists(data, sourceFamily)) {
    return structureError(
      data,
      "not_found",
      `La familia "${sourceFamily}" ya no existe. Actualiza la lista e inténtalo de nuevo.`,
    );
  }
  if (sourceIdentity !== targetIdentity && familyExists(data, targetFamily)) {
    return structureError(
      data,
      "collision",
      `Ya existe la familia "${targetFamily}" o una regla de margen con ese nombre. Usa Fusionar para unirlas sin perder ninguna regla.`,
    );
  }

  const rewritten = rewriteFamily(data, sourceFamily, targetFamily, options);
  let ruleMigrated = false;
  const rules = data.profile.productFamilyMarkups?.rules;
  const profile = rules
    ? {
        ...rewritten.data.profile,
        productFamilyMarkups: {
          rules: rules.map((rule) => {
            if (catalogKey(rule.family) !== sourceIdentity) return rule;
            ruleMigrated = true;
            return { ...rule, family: targetFamily };
          }),
        },
      }
    : rewritten.data.profile;

  return {
    ok: true,
    data: { ...rewritten.data, profile },
    productCount: rewritten.productCount,
    ruleMigrated,
  };
}

function mergeProductFamilies(
  data: AppData,
  sourceValue: string,
  targetValue: string,
  options: ProductCatalogStructureOptions,
): ProductCatalogStructureResult {
  const sourceFamily = cleanText(sourceValue);
  const targetFamily = cleanText(targetValue);
  if (
    !sourceFamily ||
    !targetFamily ||
    catalogKey(sourceFamily) === catalogKey(targetFamily)
  ) {
    return structureError(
      data,
      "invalid",
      "Elige dos familias distintas para fusionarlas.",
    );
  }
  if (!familyExists(data, sourceFamily) || !familyExists(data, targetFamily)) {
    return structureError(
      data,
      "not_found",
      "Una de las familias ya no existe. Actualiza la lista e inténtalo de nuevo.",
    );
  }

  const sourceIdentity = catalogKey(sourceFamily);
  const targetIdentity = catalogKey(targetFamily);
  const rules = data.profile.productFamilyMarkups?.rules ?? [];
  const sourceRule = rules.find(
    (rule) => catalogKey(rule.family) === sourceIdentity,
  );
  const targetRule = rules.find(
    (rule) => catalogKey(rule.family) === targetIdentity,
  );
  if (sourceRule && targetRule) {
    return structureError(
      data,
      "margin_rule",
      "Las dos familias tienen una regla de margen. Conserva una sola regla en Ajustes antes de fusionarlas.",
    );
  }

  const rewritten = rewriteFamily(data, sourceFamily, targetFamily, options);
  const ruleMigrated = Boolean(sourceRule);
  const profile = sourceRule
    ? {
        ...rewritten.data.profile,
        productFamilyMarkups: {
          rules: rules.map((rule) =>
            catalogKey(rule.family) === sourceIdentity
              ? { ...rule, family: targetFamily }
              : rule,
          ),
        },
      }
    : rewritten.data.profile;

  return {
    ok: true,
    data: { ...rewritten.data, profile },
    productCount: rewritten.productCount,
    ruleMigrated,
  };
}

function changeSubfamily(
  data: AppData,
  familyValue: string,
  sourceValue: string,
  targetValue: string,
  allowMerge: boolean,
  options: ProductCatalogStructureOptions,
): ProductCatalogStructureResult {
  const family = cleanText(familyValue);
  const sourceSubfamily = cleanText(sourceValue);
  const targetSubfamily = cleanText(targetValue);
  if (!family || !sourceSubfamily || !targetSubfamily) {
    return structureError(
      data,
      "invalid",
      "Elige una familia, una subfamilia de origen y un destino.",
    );
  }
  if (catalogKey(sourceSubfamily) === catalogKey(targetSubfamily)) {
    return structureError(
      data,
      "invalid",
      "La subfamilia de origen y destino deben ser distintas.",
    );
  }
  if (!subfamilyExists(data, family, sourceSubfamily)) {
    return structureError(
      data,
      "not_found",
      `La subfamilia "${sourceSubfamily}" ya no existe dentro de "${family}".`,
    );
  }
  const targetExists = subfamilyExists(data, family, targetSubfamily);
  if (!allowMerge && targetExists) {
    return structureError(
      data,
      "collision",
      `La subfamilia "${targetSubfamily}" ya existe. Usa Fusionar para unirlas explícitamente.`,
    );
  }
  if (allowMerge && !targetExists) {
    return structureError(
      data,
      "not_found",
      `La subfamilia de destino "${targetSubfamily}" ya no existe.`,
    );
  }

  const familyIdentity = catalogKey(family);
  const sourceIdentity = catalogKey(sourceSubfamily);
  const rewritten = rewriteProducts(
    data,
    {
      summaryMatches: (product) =>
        catalogKey(product.family) === familyIdentity &&
        catalogKey(product.subfamily ?? "") === sourceIdentity,
      productMatches: (product) =>
        catalogKey(product.family) === familyIdentity &&
        catalogKey(product.subfamily ?? "") === sourceIdentity,
      updateSummary: () => ({
        family,
        subfamily: targetSubfamily,
      }),
      updateProduct: (product) => ({
        ...product,
        family,
        subfamily: targetSubfamily,
        name:
          isProductSubfamilyMarker(product) &&
          product.name.startsWith("Subfamilia:")
            ? `Subfamilia: ${targetSubfamily}`
            : product.name,
        source: "manual",
      }),
    },
    options,
  );

  return {
    ok: true,
    data: rewritten.data,
    productCount: rewritten.productCount,
    ruleMigrated: false,
  };
}

function removeFamily(
  data: AppData,
  familyValue: string,
  options: ProductCatalogStructureOptions,
): ProductCatalogStructureResult {
  const family = cleanText(familyValue);
  if (!family || catalogKey(family) === catalogKey(UNCATEGORIZED_PRODUCT_FAMILY)) {
    return structureError(data, "invalid", "Esa familia no se puede retirar.");
  }
  if (!familyExists(data, family)) {
    return structureError(data, "not_found", `La familia "${family}" ya no existe.`);
  }
  if (
    (data.profile.productFamilyMarkups?.rules ?? []).some(
      (rule) => catalogKey(rule.family) === catalogKey(family),
    )
  ) {
    return structureError(
      data,
      "margin_rule",
      "Esta familia tiene una regla de margen. Retírala o muévela en Ajustes antes de quitar la familia.",
    );
  }

  const familyIdentity = catalogKey(family);
  const rewritten = rewriteProducts(
    data,
    {
      summaryMatches: (product) =>
        catalogKey(product.family) === familyIdentity,
      productMatches: (product) =>
        catalogKey(product.family) === familyIdentity,
      updateSummary: () => ({
        family: UNCATEGORIZED_PRODUCT_FAMILY,
        subfamily: undefined,
      }),
      updateProduct: (product) =>
        isProductFamilyMarker(product) || isProductSubfamilyMarker(product)
          ? null
          : {
              ...product,
              family: UNCATEGORIZED_PRODUCT_FAMILY,
              subfamily: undefined,
              source: "manual",
            },
    },
    options,
  );

  return {
    ok: true,
    data: rewritten.data,
    productCount: rewritten.productCount,
    ruleMigrated: false,
  };
}

function removeSubfamily(
  data: AppData,
  familyValue: string,
  subfamilyValue: string,
  options: ProductCatalogStructureOptions,
): ProductCatalogStructureResult {
  const family = cleanText(familyValue);
  const subfamily = cleanText(subfamilyValue);
  if (!family || !subfamily) {
    return structureError(
      data,
      "invalid",
      "Elige la subfamilia que quieres retirar.",
    );
  }
  if (!subfamilyExists(data, family, subfamily)) {
    return structureError(
      data,
      "not_found",
      `La subfamilia "${subfamily}" ya no existe dentro de "${family}".`,
    );
  }

  const familyIdentity = catalogKey(family);
  const subfamilyIdentity = catalogKey(subfamily);
  const rewritten = rewriteProducts(
    data,
    {
      summaryMatches: (product) =>
        catalogKey(product.family) === familyIdentity &&
        catalogKey(product.subfamily ?? "") === subfamilyIdentity,
      productMatches: (product) =>
        catalogKey(product.family) === familyIdentity &&
        catalogKey(product.subfamily ?? "") === subfamilyIdentity,
      updateSummary: () => ({ family, subfamily: undefined }),
      updateProduct: (product) =>
        isProductSubfamilyMarker(product)
          ? null
          : {
              ...product,
              family,
              subfamily: undefined,
              source: "manual",
            },
    },
    options,
  );

  return {
    ok: true,
    data: rewritten.data,
    productCount: rewritten.productCount,
    ruleMigrated: false,
  };
}

function moveProducts(
  data: AppData,
  productKeys: string[],
  familyValue: string,
  subfamilyValue: string | undefined,
  options: ProductCatalogStructureOptions,
): ProductCatalogStructureResult {
  const targetFamily = cleanText(familyValue);
  const targetSubfamily = cleanText(subfamilyValue) || undefined;
  const selectedKeys = new Set(productKeys.map(cleanText).filter(Boolean));
  if (!targetFamily || selectedKeys.size === 0) {
    return structureError(
      data,
      "invalid",
      "Selecciona productos y una familia de destino.",
    );
  }
  if (
    catalogKey(targetFamily) === catalogKey(UNCATEGORIZED_PRODUCT_FAMILY) &&
    targetSubfamily
  ) {
    return structureError(
      data,
      "invalid",
      "Los productos por clasificar no pueden tener subfamilia.",
    );
  }

  const summaries = buildPurchaseProductSummaries(data.expenses, data.products);
  const selectedSummaries = summaries.filter((product) =>
    selectedKeys.has(product.key),
  );
  if (selectedSummaries.length !== selectedKeys.size) {
    return structureError(
      data,
      "not_found",
      "La selección ha cambiado. Vuelve a seleccionar los productos.",
    );
  }
  const selectedIds = new Set(
    selectedSummaries
      .map((product) => product.productId)
      .filter((id): id is string => Boolean(id)),
  );
  const rewritten = rewriteProducts(
    data,
    {
      summaryMatches: (product) => selectedKeys.has(product.key),
      productMatches: (product) =>
        selectedIds.has(product.id) || selectedKeys.has(product.key),
      updateSummary: () => ({
        family: targetFamily,
        subfamily: targetSubfamily,
      }),
      updateProduct: (product) => ({
        ...product,
        family: targetFamily,
        subfamily: targetSubfamily,
        source: "manual",
        hidden: false,
      }),
    },
    options,
  );

  return {
    ok: true,
    data: rewritten.data,
    productCount: rewritten.productCount,
    ruleMigrated: false,
  };
}

export function applyProductCatalogStructureOperation(
  data: AppData,
  operation: ProductCatalogStructureOperation,
  options: ProductCatalogStructureOptions = {},
): ProductCatalogStructureResult {
  switch (operation.type) {
    case "move_products":
      return moveProducts(
        data,
        operation.productKeys,
        operation.targetFamily,
        operation.targetSubfamily,
        options,
      );
    case "rename_subfamily":
      return changeSubfamily(
        data,
        operation.family,
        operation.sourceSubfamily,
        operation.targetSubfamily,
        false,
        options,
      );
    case "merge_families":
      return mergeProductFamilies(
        data,
        operation.sourceFamily,
        operation.targetFamily,
        options,
      );
    case "merge_subfamilies":
      return changeSubfamily(
        data,
        operation.family,
        operation.sourceSubfamily,
        operation.targetSubfamily,
        true,
        options,
      );
    case "remove_family":
      return removeFamily(data, operation.family, options);
    case "remove_subfamily":
      return removeSubfamily(
        data,
        operation.family,
        operation.subfamily,
        options,
      );
  }
}
