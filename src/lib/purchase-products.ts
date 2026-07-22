import { roundMoney } from "./calculations";
import { normalizeDocumentUnitId } from "./document-units";
import {
  expensePurchaseLineCanFeedProductCatalog,
  expensePurchaseLineBaseTotal,
  sanitizeExpensePurchaseLines,
} from "./expenses";
import type {
  Expense,
  ExpensePurchaseLine,
  Product,
  ProductAttribute,
  ProductCalculationKind,
} from "./types";

export interface PurchaseProductSupplierSummary {
  supplierId?: string;
  supplierName: string;
  count: number;
  totalBase: number;
  lastPurchaseDate: string;
}

export interface PurchaseProductSummary {
  productId?: string;
  key: string;
  aliases: string[];
  name: string;
  family: string;
  subfamily?: string;
  source: Product["source"];
  sku?: string;
  externalId?: string;
  unit?: string;
  saleUnit?: string;
  saleDescription?: string;
  saleUnitPrice?: number;
  saleIvaPercent?: number;
  purchaseUnit?: string;
  purchaseDescription?: string;
  purchaseListPrice?: number;
  purchaseDiscountPercent?: number;
  purchaseNetUnitCost?: number;
  purchaseSupplierReference?: string;
  purchaseToSaleFactor?: number;
  calculation?: Product["calculation"];
  attributes?: ProductAttribute[];
  notes?: string;
  purchaseCount: number;
  totalQuantity: number;
  totalBase: number;
  averageUnitPrice: number;
  lastUnitPrice: number;
  minUnitPrice: number;
  maxUnitPrice: number;
  averagePvp: number;
  lastPvp: number;
  averageDiscountPercent: number;
  lastDiscountPercent: number;
  ivaPercent?: number;
  lastPurchaseDate: string;
  usualSupplier?: PurchaseProductSupplierSummary;
  suppliers: PurchaseProductSupplierSummary[];
}

interface ProductAccumulator {
  productId?: string;
  key: string;
  aliases: string[];
  name: string;
  family: string;
  subfamily?: string;
  source: Product["source"];
  sku?: string;
  externalId?: string;
  unit?: string;
  saleUnit?: string;
  saleDescription?: string;
  saleUnitPrice?: number;
  saleIvaPercent?: number;
  purchaseUnit?: string;
  purchaseDescription?: string;
  purchaseListPrice?: number;
  purchaseDiscountPercent?: number;
  purchaseNetUnitCost?: number;
  purchaseSupplierReference?: string;
  purchaseToSaleFactor?: number;
  calculation?: Product["calculation"];
  attributes?: ProductAttribute[];
  notes?: string;
  purchaseCount: number;
  totalQuantity: number;
  totalBase: number;
  unitPriceSum: number;
  pvpSum: number;
  discountSum: number;
  lastUnitPrice: number;
  minUnitPrice: number;
  maxUnitPrice: number;
  lastPvp: number;
  lastDiscountPercent: number;
  ivaPercent?: number;
  lastPurchaseDate: string;
  suppliers: Map<string, PurchaseProductSupplierSummary>;
}

type PurchaseCatalogPriceLine = Pick<
  ExpensePurchaseLine,
  "quantity" | "unitPrice" | "discountPercent" | "netUnitPrice" | "total"
> &
  Pick<Partial<ExpensePurchaseLine>, "catalogProduct">;

function cleanOptionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function cleanOptionalUnit(value: unknown): string | undefined {
  const text = cleanOptionalText(value);
  return normalizeDocumentUnitId(text) ?? text;
}

function normalizeAttributeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function normalizeProductAttributes(
  value: unknown,
): ProductAttribute[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const attributes: ProductAttribute[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const source = raw as Partial<ProductAttribute>;
    const label =
      cleanOptionalText(source.label) ?? cleanOptionalText(source.key);
    const attributeValue =
      typeof source.value === "string" ? source.value.trim() : "";
    if (!label) continue;
    const key = cleanOptionalText(source.key) ?? normalizeAttributeKey(label);
    attributes.push({
      key: normalizeAttributeKey(key) || normalizeAttributeKey(label),
      label,
      value: attributeValue,
      unit: cleanOptionalUnit(source.unit),
    });
  }

  const seen = new Set<string>();
  return attributes.filter((item) => {
    if (seen.has(item.key)) return false;
    seen.add(item.key);
    return true;
  });
}

function normalizeOptionalAmount(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return roundMoney(value);
}

function normalizeOptionalPercent(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return roundMoney(Math.min(Math.max(value, 0), 100));
}

function normalizeOptionalPositive(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return roundMoney(value);
}

export function normalizeProductCatalogItem(product: Product): Product {
  const productName = (product.name ?? "").trim();
  const productFamily = (product.family ?? "").trim();
  const productSubfamily = cleanOptionalText(product.subfamily);
  const key = purchaseProductKey(product.key || productName);
  const now = new Date().toISOString();
  const legacyUnit = cleanOptionalUnit(product.unit);
  const legacyPvp = normalizeOptionalAmount(product.pvp);
  const legacyCost = normalizeOptionalAmount(product.cost);
  const legacyIva = normalizeOptionalPercent(product.ivaPercent);
  const legacyDiscount =
    legacyPvp && legacyCost && legacyPvp > 0
      ? roundMoney(((legacyPvp - legacyCost) / legacyPvp) * 100)
      : undefined;
  const salesUnit = cleanOptionalUnit(product.sales?.unit) ?? legacyUnit;
  const saleUnitPrice = normalizeOptionalAmount(product.sales?.unitPrice);
  const saleDescription = cleanOptionalText(product.sales?.description);
  const saleIvaPercent =
    normalizeOptionalPercent(product.sales?.ivaPercent) ?? legacyIva;
  const purchaseUnit = cleanOptionalUnit(product.purchase?.unit) ?? legacyUnit;
  const purchaseListPrice =
    normalizeOptionalAmount(product.purchase?.listPrice) ?? legacyPvp;
  const purchaseDiscountPercent =
    normalizeOptionalPercent(product.purchase?.discountPercent) ??
    legacyDiscount;
  const purchaseNetUnitCost =
    normalizeOptionalAmount(product.purchase?.netUnitCost) ??
    legacyCost ??
    (purchaseListPrice !== undefined && purchaseDiscountPercent !== undefined
      ? roundMoney(purchaseListPrice * (1 - purchaseDiscountPercent / 100))
      : undefined);
  const purchaseIvaPercent =
    normalizeOptionalPercent(product.purchase?.ivaPercent) ?? legacyIva;
  const supplierName =
    cleanOptionalText(product.purchase?.supplierName) ??
    cleanOptionalText(product.supplierName);
  const supplierId =
    cleanOptionalText(product.purchase?.supplierId) ??
    cleanOptionalText(product.supplierId);
  const salesEnabled =
    product.sales?.enabled ??
    Boolean(saleDescription || saleUnitPrice || salesUnit);
  const purchaseEnabled =
    product.purchase?.enabled ??
    Boolean(
      product.purchase ||
      purchaseListPrice ||
      purchaseNetUnitCost ||
      purchaseDiscountPercent ||
      supplierName,
    );
  const calculationKind: ProductCalculationKind =
    product.calculation?.kind === "linear" ||
    product.calculation?.kind === "area" ||
    product.calculation?.kind === "volume"
      ? product.calculation.kind
      : "none";
  const calculation =
    calculationKind !== "none"
      ? {
          kind: calculationKind,
          unit:
            cleanOptionalUnit(product.calculation?.unit) ??
            (calculationKind === "linear"
              ? "m"
              : calculationKind === "area"
                ? "m2"
                : "m3"),
          roundingDecimals:
            typeof product.calculation?.roundingDecimals === "number" &&
            Number.isFinite(product.calculation.roundingDecimals)
              ? Math.min(
                  Math.max(Math.trunc(product.calculation.roundingDecimals), 0),
                  4,
                )
              : 2,
        }
      : undefined;

  return {
    ...product,
    key: key || product.id,
    aliases: [
      ...new Set(
        (product.aliases ?? []).map(purchaseProductKey).filter(Boolean),
      ),
    ],
    name: productName || product.key || "Producto",
    family: productFamily || inferPurchaseProductFamily(productName),
    subfamily: productSubfamily,
    sku: cleanOptionalText(product.sku),
    externalId: cleanOptionalText(product.externalId),
    unit: salesUnit ?? purchaseUnit,
    supplierId,
    supplierName,
    pvp: purchaseListPrice,
    cost: purchaseNetUnitCost,
    ivaPercent: saleIvaPercent ?? purchaseIvaPercent,
    sales: salesEnabled
      ? {
          enabled: true,
          description: saleDescription,
          unit: salesUnit,
          unitPrice: saleUnitPrice,
          ivaPercent: saleIvaPercent,
        }
      : undefined,
    purchase: purchaseEnabled
      ? {
          enabled: true,
          description: cleanOptionalText(product.purchase?.description),
          unit: purchaseUnit,
          listPrice: purchaseListPrice,
          discountPercent: purchaseDiscountPercent,
          netUnitCost: purchaseNetUnitCost,
          ivaPercent: purchaseIvaPercent,
          supplierId,
          supplierName,
          supplierReference: cleanOptionalText(
            product.purchase?.supplierReference,
          ),
          purchaseToSaleFactor: normalizeOptionalPositive(
            product.purchase?.purchaseToSaleFactor,
          ),
        }
      : undefined,
    calculation,
    attributes: normalizeProductAttributes(product.attributes),
    notes: cleanOptionalText(product.notes),
    source: product.source === "manual" ? "manual" : "detected",
    createdAt: product.createdAt || now,
    updatedAt: product.updatedAt || product.createdAt || now,
  };
}

export function purchaseProductKey(description: string): string {
  return description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/["'`´]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 1)
    .slice(0, 8)
    .join(" ");
}

export function inferPurchaseProductFamily(description: string): string {
  const key = purchaseProductKey(description);
  const checks: Array<[string, string[]]> = [
    [
      "Persianas y accesorios",
      [
        "persiana",
        "cinta",
        "guia",
        "tirante",
        "tri",
        "panel",
        "alu",
        "aluminio",
      ],
    ],
    [
      "Motores y electrónica",
      ["motor", "radio", "mando", "sensor", "automatismo"],
    ],
    ["PVC y perfiles", ["pvc", "perfil", "lama"]],
    [
      "Herramientas y ferretería",
      ["tornillo", "broca", "herramienta", "soporte", "kit"],
    ],
    ["Servicios", ["servicio", "mano", "porte", "instalacion", "reparacion"]],
  ];

  return (
    checks.find(([, words]) => words.some((word) => key.includes(word)))?.[0] ??
    "Sin familia"
  );
}

function supplierKey(expense: Expense): string {
  return (
    expense.supplierId ||
    expense.supplierName.trim().toLowerCase() ||
    "sin-proveedor"
  );
}

function normalizedDiscountPercent(line: PurchaseCatalogPriceLine): number {
  const discount = line.discountPercent ?? 0;
  return Number.isFinite(discount) ? Math.min(Math.max(discount, 0), 100) : 0;
}

function purchaseLineNetUnitCost(line: PurchaseCatalogPriceLine): number {
  const discount = normalizedDiscountPercent(line);
  if (Number.isFinite(line.unitPrice) && line.unitPrice > 0) {
    return roundMoney(line.unitPrice * (1 - discount / 100));
  }

  const quantity = line.quantity || 1;
  if (
    line.total !== undefined &&
    Number.isFinite(line.total) &&
    line.total > 0 &&
    quantity > 0
  ) {
    return roundMoney(line.total / quantity);
  }

  return 0;
}

function isAreaUnit(unit: string | undefined): boolean {
  const normalized = (unit ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
  return ["m2", "m²", "m^2", "mq"].includes(normalized);
}

function purchaseLineSummaryQuantity(
  line: NonNullable<Expense["purchaseLines"]>[number],
  base: number,
  netUnitCost: number,
): number {
  const quantity = line.quantity || 0;
  if (!isAreaUnit(line.unit) || base <= 0 || netUnitCost <= 0) return quantity;

  const inferredQuantity = roundMoney(base / netUnitCost);
  return inferredQuantity > 0 ? inferredQuantity : quantity;
}

function catalogLookup(products: Product[]): Map<string, Product> {
  const lookup = new Map<string, Product>();
  for (const product of products.map(normalizeProductCatalogItem)) {
    if (product.hidden) continue;
    lookup.set(product.key, product);
    for (const alias of product.aliases ?? []) {
      lookup.set(alias, product);
    }
  }
  return lookup;
}

function emptyAccumulatorFromProduct(product: Product): ProductAccumulator {
  const cost = product.purchase?.netUnitCost ?? product.cost ?? 0;
  const pvp = product.purchase?.listPrice ?? product.pvp ?? 0;
  return {
    productId: product.id,
    key: product.key,
    aliases: product.aliases ?? [],
    name: product.name,
    family: product.family,
    subfamily: product.subfamily,
    source: product.source,
    sku: product.sku,
    externalId: product.externalId,
    unit: product.sales?.unit ?? product.unit ?? product.purchase?.unit,
    saleUnit: product.sales?.unit,
    saleDescription: product.sales?.description,
    saleUnitPrice: product.sales?.unitPrice,
    saleIvaPercent: product.sales?.ivaPercent,
    purchaseUnit: product.purchase?.unit,
    purchaseDescription: product.purchase?.description,
    purchaseListPrice: product.purchase?.listPrice ?? product.pvp,
    purchaseDiscountPercent: product.purchase?.discountPercent,
    purchaseNetUnitCost: product.purchase?.netUnitCost ?? product.cost,
    purchaseSupplierReference: product.purchase?.supplierReference,
    purchaseToSaleFactor: product.purchase?.purchaseToSaleFactor,
    calculation: product.calculation,
    attributes: product.attributes,
    notes: product.notes,
    purchaseCount: 0,
    totalQuantity: 0,
    totalBase: 0,
    unitPriceSum: 0,
    pvpSum: 0,
    discountSum: 0,
    lastUnitPrice: cost,
    minUnitPrice: cost,
    maxUnitPrice: cost,
    lastPvp: pvp,
    lastDiscountPercent:
      pvp > 0 && cost > 0 ? roundMoney(((pvp - cost) / pvp) * 100) : 0,
    ivaPercent: product.ivaPercent,
    lastPurchaseDate: product.updatedAt.slice(0, 10),
    suppliers: product.supplierName
      ? new Map([
          [
            product.supplierId || product.supplierName.toLowerCase(),
            {
              supplierId: product.supplierId,
              supplierName: product.supplierName,
              count: 0,
              totalBase: 0,
              lastPurchaseDate: product.updatedAt.slice(0, 10),
            },
          ],
        ])
      : new Map(),
  };
}

export function buildPurchaseProductSummaries(
  expenses: Expense[],
  products: Product[] = [],
): PurchaseProductSummary[] {
  const accumulators = new Map<string, ProductAccumulator>();
  const catalog = products.map(normalizeProductCatalogItem);
  const hiddenKeys = new Set(
    catalog
      .filter((product) => product.hidden)
      .flatMap((product) => [product.key, ...(product.aliases ?? [])]),
  );
  const lookup = catalogLookup(catalog);

  for (const product of catalog) {
    if (product.hidden) continue;
    accumulators.set(product.key, emptyAccumulatorFromProduct(product));
  }

  for (const expense of expenses) {
    const lines = sanitizeExpensePurchaseLines(expense.purchaseLines).filter(
      (line) => expensePurchaseLineCanFeedProductCatalog(expense, line),
    );
    for (const line of lines) {
      const detectedKey = purchaseProductKey(line.description);
      if (hiddenKeys.has(detectedKey)) continue;
      const catalogProduct = lookup.get(detectedKey);
      const key = catalogProduct?.key ?? detectedKey;
      if (!key) continue;

      const base = expensePurchaseLineBaseTotal(line);
      const discount = normalizedDiscountPercent(line);
      const netUnitCost = purchaseLineNetUnitCost(line);
      const summaryQuantity = purchaseLineSummaryQuantity(
        line,
        base,
        netUnitCost,
      );
      const existing = accumulators.get(key);
      const accumulator: ProductAccumulator = existing ?? {
        productId: catalogProduct?.id,
        key,
        aliases: catalogProduct?.aliases ?? [],
        name: catalogProduct?.name || line.description,
        family:
          catalogProduct?.family ||
          inferPurchaseProductFamily(line.description),
        subfamily: catalogProduct?.subfamily,
        source: catalogProduct?.source ?? "detected",
        sku: catalogProduct?.sku,
        externalId: catalogProduct?.externalId,
        unit: catalogProduct?.sales?.unit ?? catalogProduct?.unit ?? line.unit,
        saleUnit: catalogProduct?.sales?.unit,
        saleDescription: catalogProduct?.sales?.description,
        saleUnitPrice: catalogProduct?.sales?.unitPrice,
        saleIvaPercent: catalogProduct?.sales?.ivaPercent,
        purchaseUnit: catalogProduct?.purchase?.unit ?? line.unit,
        purchaseDescription: catalogProduct?.purchase?.description,
        purchaseListPrice: catalogProduct?.purchase?.listPrice,
        purchaseDiscountPercent: catalogProduct?.purchase?.discountPercent,
        purchaseNetUnitCost: catalogProduct?.purchase?.netUnitCost,
        purchaseSupplierReference:
          catalogProduct?.purchase?.supplierReference ?? line.supplierReference,
        purchaseToSaleFactor: catalogProduct?.purchase?.purchaseToSaleFactor,
        calculation: catalogProduct?.calculation,
        attributes: catalogProduct?.attributes,
        notes: catalogProduct?.notes,
        purchaseCount: 0,
        totalQuantity: 0,
        totalBase: 0,
        unitPriceSum: 0,
        pvpSum: 0,
        discountSum: 0,
        lastUnitPrice: netUnitCost,
        minUnitPrice: netUnitCost,
        maxUnitPrice: netUnitCost,
        lastPvp: line.unitPrice,
        lastDiscountPercent: discount,
        ivaPercent: line.ivaPercent,
        lastPurchaseDate: expense.date,
        suppliers: new Map(),
      };

      accumulator.purchaseCount += 1;
      accumulator.totalQuantity += summaryQuantity;
      accumulator.totalBase += base;
      accumulator.unitPriceSum += netUnitCost;
      accumulator.pvpSum += line.unitPrice;
      accumulator.discountSum += discount;
      accumulator.minUnitPrice = Math.min(
        accumulator.minUnitPrice,
        netUnitCost,
      );
      accumulator.maxUnitPrice = Math.max(
        accumulator.maxUnitPrice,
        netUnitCost,
      );
      accumulator.ivaPercent = line.ivaPercent ?? accumulator.ivaPercent;

      if (expense.date >= accumulator.lastPurchaseDate) {
        accumulator.name = catalogProduct?.name || line.description;
        accumulator.unit =
          catalogProduct?.sales?.unit ??
          catalogProduct?.unit ??
          line.unit ??
          accumulator.unit;
        accumulator.purchaseUnit =
          catalogProduct?.purchase?.unit ??
          line.unit ??
          accumulator.purchaseUnit;
        accumulator.purchaseSupplierReference =
          catalogProduct?.purchase?.supplierReference ??
          line.supplierReference ??
          accumulator.purchaseSupplierReference;
        accumulator.lastPurchaseDate = expense.date;
        accumulator.lastUnitPrice = netUnitCost;
        accumulator.lastPvp = line.unitPrice;
        accumulator.lastDiscountPercent = discount;
      }

      const keySupplier = supplierKey(expense);
      const supplier = accumulator.suppliers.get(keySupplier) ?? {
        supplierId: expense.supplierId,
        supplierName: expense.supplierName || "Sin proveedor",
        count: 0,
        totalBase: 0,
        lastPurchaseDate: expense.date,
      };
      supplier.count += 1;
      supplier.totalBase = roundMoney(supplier.totalBase + base);
      if (expense.date >= supplier.lastPurchaseDate) {
        supplier.lastPurchaseDate = expense.date;
        supplier.supplierName = expense.supplierName || supplier.supplierName;
      }
      accumulator.suppliers.set(keySupplier, supplier);
      accumulators.set(key, accumulator);
    }
  }

  return [...accumulators.values()]
    .map((item) => {
      const suppliers = [...item.suppliers.values()].sort(
        (a, b) => b.count - a.count || b.totalBase - a.totalBase,
      );

      return {
        key: item.key,
        productId: item.productId,
        aliases: item.aliases,
        name: item.name,
        family: item.family,
        subfamily: item.subfamily,
        source: item.source,
        sku: item.sku,
        externalId: item.externalId,
        unit: item.unit,
        saleUnit: item.saleUnit,
        saleDescription: item.saleDescription,
        saleUnitPrice: item.saleUnitPrice,
        saleIvaPercent: item.saleIvaPercent,
        purchaseUnit: item.purchaseUnit,
        purchaseDescription: item.purchaseDescription,
        purchaseListPrice: item.purchaseListPrice,
        purchaseDiscountPercent: item.purchaseDiscountPercent,
        purchaseNetUnitCost: item.purchaseNetUnitCost,
        purchaseSupplierReference: item.purchaseSupplierReference,
        purchaseToSaleFactor: item.purchaseToSaleFactor,
        calculation: item.calculation,
        attributes: item.attributes,
        notes: item.notes,
        purchaseCount: item.purchaseCount,
        totalQuantity: roundMoney(item.totalQuantity),
        totalBase: roundMoney(item.totalBase),
        averageUnitPrice:
          item.purchaseCount > 0
            ? roundMoney(item.unitPriceSum / item.purchaseCount)
            : roundMoney(item.lastUnitPrice),
        lastUnitPrice: roundMoney(item.lastUnitPrice),
        minUnitPrice: roundMoney(item.minUnitPrice),
        maxUnitPrice: roundMoney(item.maxUnitPrice),
        averagePvp:
          item.purchaseCount > 0
            ? roundMoney(item.pvpSum / item.purchaseCount)
            : roundMoney(item.lastPvp),
        lastPvp: roundMoney(item.lastPvp),
        averageDiscountPercent:
          item.purchaseCount > 0
            ? roundMoney(item.discountSum / item.purchaseCount)
            : roundMoney(item.lastDiscountPercent),
        lastDiscountPercent: roundMoney(item.lastDiscountPercent),
        ivaPercent: item.ivaPercent,
        lastPurchaseDate: item.lastPurchaseDate,
        usualSupplier: suppliers[0],
        suppliers,
      };
    })
    .sort((a, b) => b.lastPurchaseDate.localeCompare(a.lastPurchaseDate));
}

function addPurchaseProductKeys(
  keys: Set<string>,
  candidates: Array<string | undefined>,
) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const key = purchaseProductKey(candidate);
    if (key) keys.add(key);
  }
}

export function purchaseProductCatalogKeys(
  products: Product[] = [],
  expenses: Expense[] = [],
): Set<string> {
  const keys = new Set<string>();

  for (const product of products.map(normalizeProductCatalogItem)) {
    if (product.hidden) continue;
    addPurchaseProductKeys(keys, [
      product.key,
      product.name,
      ...(product.aliases ?? []),
      product.sku,
      product.externalId,
      product.purchase?.description,
      product.purchase?.supplierReference,
      product.sales?.description,
    ]);
  }

  for (const summary of buildPurchaseProductSummaries(expenses, products)) {
    addPurchaseProductKeys(keys, [
      summary.key,
      summary.name,
      ...summary.aliases,
      summary.sku,
      summary.externalId,
      summary.purchaseDescription,
      summary.purchaseSupplierReference,
      summary.saleDescription,
    ]);
  }

  return keys;
}

export function purchaseLineHasCatalogProduct(
  line: Pick<ExpensePurchaseLine, "description" | "supplierReference">,
  productKeys: Set<string>,
): boolean {
  return [line.description, line.supplierReference].some((candidate) => {
    if (!candidate) return false;
    return productKeys.has(purchaseProductKey(candidate));
  });
}
