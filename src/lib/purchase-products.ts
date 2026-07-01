import { roundMoney } from "./calculations";
import { expensePurchaseLineBaseTotal, sanitizeExpensePurchaseLines } from "./expenses";
import type { Document, Expense } from "./types";

export interface PurchaseProductSupplierSummary {
  supplierId?: string;
  supplierName: string;
  count: number;
  totalBase: number;
  lastPurchaseDate: string;
}

export interface PurchaseProductSummary {
  key: string;
  name: string;
  family: string;
  unit?: string;
  purchaseCount: number;
  totalQuantity: number;
  totalBase: number;
  averageUnitPrice: number;
  lastUnitPrice: number;
  minUnitPrice: number;
  maxUnitPrice: number;
  averageDiscountPercent: number;
  lastDiscountPercent: number;
  ivaPercent?: number;
  lastPurchaseDate: string;
  usualSupplier?: PurchaseProductSupplierSummary;
  suppliers: PurchaseProductSupplierSummary[];
  pvpAverage?: number;
  pvpLast?: number;
  pvpCount: number;
}

interface ProductAccumulator {
  key: string;
  name: string;
  family: string;
  unit?: string;
  purchaseCount: number;
  totalQuantity: number;
  totalBase: number;
  unitPriceSum: number;
  discountSum: number;
  lastUnitPrice: number;
  minUnitPrice: number;
  maxUnitPrice: number;
  lastDiscountPercent: number;
  ivaPercent?: number;
  lastPurchaseDate: string;
  suppliers: Map<string, PurchaseProductSupplierSummary>;
  pvpSum: number;
  pvpLast?: number;
  pvpCount: number;
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

function salesLinesByProduct(documents: Document[]): Map<string, { sum: number; last?: number; count: number }> {
  const map = new Map<string, { sum: number; last?: number; count: number }>();
  const sorted = [...documents].sort((a, b) => a.date.localeCompare(b.date));

  for (const doc of sorted) {
    for (const line of doc.items) {
      const key = purchaseProductKey(line.description);
      if (!key || line.unitPrice <= 0) continue;
      const current = map.get(key) ?? { sum: 0, count: 0 };
      map.set(key, {
        sum: current.sum + line.unitPrice,
        last: line.unitPrice,
        count: current.count + 1,
      });
    }
  }

  return map;
}

export function buildPurchaseProductSummaries(
  expenses: Expense[],
  documents: Document[] = [],
): PurchaseProductSummary[] {
  const sales = salesLinesByProduct(documents);
  const accumulators = new Map<string, ProductAccumulator>();

  for (const expense of expenses) {
    const lines = sanitizeExpensePurchaseLines(expense.purchaseLines);
    for (const line of lines) {
      const key = purchaseProductKey(line.description);
      if (!key) continue;

      const base = expensePurchaseLineBaseTotal(line);
      const discount = line.discountPercent ?? 0;
      const existing = accumulators.get(key);
      const accumulator: ProductAccumulator =
        existing ??
        {
          key,
          name: line.description,
          family: inferPurchaseProductFamily(line.description),
          unit: line.unit,
          purchaseCount: 0,
          totalQuantity: 0,
          totalBase: 0,
          unitPriceSum: 0,
          discountSum: 0,
          lastUnitPrice: line.unitPrice,
          minUnitPrice: line.unitPrice,
          maxUnitPrice: line.unitPrice,
          lastDiscountPercent: discount,
          ivaPercent: line.ivaPercent,
          lastPurchaseDate: expense.date,
          suppliers: new Map(),
          pvpSum: 0,
          pvpCount: 0,
        };

      accumulator.purchaseCount += 1;
      accumulator.totalQuantity += line.quantity;
      accumulator.totalBase += base;
      accumulator.unitPriceSum += line.unitPrice;
      accumulator.discountSum += discount;
      accumulator.minUnitPrice = Math.min(accumulator.minUnitPrice, line.unitPrice);
      accumulator.maxUnitPrice = Math.max(accumulator.maxUnitPrice, line.unitPrice);
      accumulator.ivaPercent = line.ivaPercent ?? accumulator.ivaPercent;

      if (expense.date >= accumulator.lastPurchaseDate) {
        accumulator.name = line.description;
        accumulator.unit = line.unit ?? accumulator.unit;
        accumulator.lastPurchaseDate = expense.date;
        accumulator.lastUnitPrice = line.unitPrice;
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
      const sale = sales.get(item.key);
      const suppliers = [...item.suppliers.values()].sort(
        (a, b) => b.count - a.count || b.totalBase - a.totalBase,
      );

      return {
        key: item.key,
        name: item.name,
        family: item.family,
        unit: item.unit,
        purchaseCount: item.purchaseCount,
        totalQuantity: roundMoney(item.totalQuantity),
        totalBase: roundMoney(item.totalBase),
        averageUnitPrice: roundMoney(item.unitPriceSum / item.purchaseCount),
        lastUnitPrice: roundMoney(item.lastUnitPrice),
        minUnitPrice: roundMoney(item.minUnitPrice),
        maxUnitPrice: roundMoney(item.maxUnitPrice),
        averageDiscountPercent: roundMoney(item.discountSum / item.purchaseCount),
        lastDiscountPercent: roundMoney(item.lastDiscountPercent),
        ivaPercent: item.ivaPercent,
        lastPurchaseDate: item.lastPurchaseDate,
        usualSupplier: suppliers[0],
        suppliers,
        pvpAverage: sale ? roundMoney(sale.sum / sale.count) : undefined,
        pvpLast: sale?.last !== undefined ? roundMoney(sale.last) : undefined,
        pvpCount: sale?.count ?? 0,
      };
    })
    .sort((a, b) => b.lastPurchaseDate.localeCompare(a.lastPurchaseDate));
}
