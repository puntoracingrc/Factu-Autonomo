import { roundMoney } from "./calculations";
import { expensePurchaseLineBaseTotal, sanitizeExpensePurchaseLines } from "./expenses";
import type { Expense, Product } from "./types";

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
  source: Product["source"];
  unit?: string;
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
  source: Product["source"];
  unit?: string;
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

export function normalizeProductCatalogItem(product: Product): Product {
  const productName = (product.name ?? "").trim();
  const productFamily = (product.family ?? "").trim();
  const key = purchaseProductKey(product.key || productName);
  const now = new Date().toISOString();
  return {
    ...product,
    key: key || product.id,
    aliases: [...new Set((product.aliases ?? []).map(purchaseProductKey).filter(Boolean))],
    name: productName || product.key || "Producto",
    family: productFamily || inferPurchaseProductFamily(productName),
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
    ["Persianas y accesorios", ["persiana", "cinta", "guia", "tirante", "tri", "panel", "alu", "aluminio"]],
    ["Motores y electrónica", ["motor", "radio", "mando", "sensor", "automatismo"]],
    ["PVC y perfiles", ["pvc", "perfil", "lama"]],
    ["Herramientas y ferretería", ["tornillo", "broca", "herramienta", "soporte", "kit"]],
    ["Servicios", ["servicio", "mano", "porte", "instalacion", "reparacion"]],
  ];

  return checks.find(([, words]) => words.some((word) => key.includes(word)))?.[0] ?? "Sin familia";
}

function supplierKey(expense: Expense): string {
  return expense.supplierId || expense.supplierName.trim().toLowerCase() || "sin-proveedor";
}

function normalizedDiscountPercent(
  line: NonNullable<Expense["purchaseLines"]>[number],
): number {
  const discount = line.discountPercent ?? 0;
  return Number.isFinite(discount) ? Math.min(Math.max(discount, 0), 100) : 0;
}

function purchaseLineNetUnitCost(line: NonNullable<Expense["purchaseLines"]>[number]): number {
  const discount = normalizedDiscountPercent(line);
  if (Number.isFinite(line.unitPrice) && line.unitPrice > 0) {
    return roundMoney(line.unitPrice * (1 - discount / 100));
  }

  const quantity = line.quantity || 1;
  if (line.total !== undefined && Number.isFinite(line.total) && line.total > 0 && quantity > 0) {
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
    lookup.set(product.key, product);
    for (const alias of product.aliases ?? []) {
      lookup.set(alias, product);
    }
  }
  return lookup;
}

function emptyAccumulatorFromProduct(product: Product): ProductAccumulator {
  const cost = product.cost ?? 0;
  const pvp = product.pvp ?? 0;
  return {
    productId: product.id,
    key: product.key,
    aliases: product.aliases ?? [],
    name: product.name,
    family: product.family,
    source: product.source,
    unit: product.unit,
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
  const lookup = catalogLookup(catalog);

  for (const product of catalog) {
    accumulators.set(product.key, emptyAccumulatorFromProduct(product));
  }

  for (const expense of expenses) {
    const lines = sanitizeExpensePurchaseLines(expense.purchaseLines);
    for (const line of lines) {
      const detectedKey = purchaseProductKey(line.description);
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
      const accumulator: ProductAccumulator =
        existing ??
        {
          productId: catalogProduct?.id,
          key,
          aliases: catalogProduct?.aliases ?? [],
          name: catalogProduct?.name || line.description,
          family:
            catalogProduct?.family || inferPurchaseProductFamily(line.description),
          source: catalogProduct?.source ?? "detected",
          unit: catalogProduct?.unit ?? line.unit,
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
      accumulator.minUnitPrice = Math.min(accumulator.minUnitPrice, netUnitCost);
      accumulator.maxUnitPrice = Math.max(accumulator.maxUnitPrice, netUnitCost);
      accumulator.ivaPercent = line.ivaPercent ?? accumulator.ivaPercent;

      if (expense.date >= accumulator.lastPurchaseDate) {
        accumulator.name = catalogProduct?.name || line.description;
        accumulator.unit = catalogProduct?.unit ?? line.unit ?? accumulator.unit;
        accumulator.lastPurchaseDate = expense.date;
        accumulator.lastUnitPrice = netUnitCost;
        accumulator.lastPvp = line.unitPrice;
        accumulator.lastDiscountPercent = discount;
      }

      const keySupplier = supplierKey(expense);
      const supplier =
        accumulator.suppliers.get(keySupplier) ??
        {
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
        source: item.source,
        unit: item.unit,
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
