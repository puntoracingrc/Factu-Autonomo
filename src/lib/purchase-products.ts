import { roundMoney } from "./calculations";
import { expensePurchaseLineBaseTotal, sanitizeExpensePurchaseLines } from "./expenses";
import type { Expense } from "./types";

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
  key: string;
  name: string;
  family: string;
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

function purchaseLineNetUnitCost(line: NonNullable<Expense["purchaseLines"]>[number]): number {
  const quantity = line.quantity || 1;
  if (line.total !== undefined && Number.isFinite(line.total) && line.total > 0 && quantity > 0) {
    return roundMoney(line.total / quantity);
  }

  const discount = line.discountPercent ?? 0;
  return roundMoney(line.unitPrice * (1 - discount / 100));
}

export function buildPurchaseProductSummaries(expenses: Expense[]): PurchaseProductSummary[] {
  const accumulators = new Map<string, ProductAccumulator>();

  for (const expense of expenses) {
    const lines = sanitizeExpensePurchaseLines(expense.purchaseLines);
    for (const line of lines) {
      const key = purchaseProductKey(line.description);
      if (!key) continue;

      const base = expensePurchaseLineBaseTotal(line);
      const discount = line.discountPercent ?? 0;
      const netUnitCost = purchaseLineNetUnitCost(line);
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
      accumulator.totalQuantity += line.quantity;
      accumulator.totalBase += base;
      accumulator.unitPriceSum += netUnitCost;
      accumulator.pvpSum += line.unitPrice;
      accumulator.discountSum += discount;
      accumulator.minUnitPrice = Math.min(accumulator.minUnitPrice, netUnitCost);
      accumulator.maxUnitPrice = Math.max(accumulator.maxUnitPrice, netUnitCost);
      accumulator.ivaPercent = line.ivaPercent ?? accumulator.ivaPercent;

      if (expense.date >= accumulator.lastPurchaseDate) {
        accumulator.name = line.description;
        accumulator.unit = line.unit ?? accumulator.unit;
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
        averagePvp: roundMoney(item.pvpSum / item.purchaseCount),
        lastPvp: roundMoney(item.lastPvp),
        averageDiscountPercent: roundMoney(item.discountSum / item.purchaseCount),
        lastDiscountPercent: roundMoney(item.lastDiscountPercent),
        ivaPercent: item.ivaPercent,
        lastPurchaseDate: item.lastPurchaseDate,
        usualSupplier: suppliers[0],
        suppliers,
      };
    })
    .sort((a, b) => b.lastPurchaseDate.localeCompare(a.lastPurchaseDate));
}
