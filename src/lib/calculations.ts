import type { Document, Expense, LineItem } from "./types";

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Redondeo monetario simétrico para nuevas proyecciones fiscales.
 * `roundMoney` se conserva para verificar snapshots FNV históricos, creados
 * con el comportamiento asimétrico de `Math.round` para importes negativos.
 */
export function roundMoneySymmetric(amount: number): number {
  const rounded =
    Math.sign(amount) *
    (Math.round((Math.abs(amount) + Number.EPSILON) * 100) / 100);
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** Precio unitario con IVA a partir del precio sin IVA. */
export function unitPriceGross(unitPrice: number, ivaPercent: number): number {
  return roundMoney(unitPrice * (1 + ivaPercent / 100));
}

/** Precio unitario sin IVA a partir del precio con IVA. */
export function unitPriceFromGross(
  grossPrice: number,
  ivaPercent: number,
): number {
  if (ivaPercent === 0) return roundMoney(grossPrice);
  return roundMoney(grossPrice / (1 + ivaPercent / 100));
}

export function lineSubtotal(item: LineItem): number {
  return item.quantity * item.unitPrice;
}

export function lineIva(item: LineItem): number {
  return lineSubtotal(item) * (item.ivaPercent / 100);
}

export function lineTotal(item: LineItem): number {
  return lineSubtotal(item) + lineIva(item);
}

export function lineMoneyAmounts(
  item: LineItem,
  vatExempt = false,
): { subtotal: number; iva: number; total: number } {
  const subtotal = roundMoneySymmetric(lineSubtotal(item));
  const iva = vatExempt ? 0 : roundMoneySymmetric(lineIva(item));
  return {
    subtotal,
    iva,
    total: roundMoneySymmetric(subtotal + iva),
  };
}

export function documentTotals(
  doc: Pick<Document, "items">,
  vatExempt = false,
) {
  const amounts = doc.items.reduce(
    (sum, item) => {
      const line = lineMoneyAmounts(item, vatExempt);
      return {
        subtotal: sum.subtotal + line.subtotal,
        iva: sum.iva + line.iva,
        total: sum.total + line.total,
      };
    },
    { subtotal: 0, iva: 0, total: 0 },
  );
  return {
    subtotal: roundMoneySymmetric(amounts.subtotal),
    iva: roundMoneySymmetric(amounts.iva),
    total: roundMoneySymmetric(amounts.total),
  };
}

/**
 * @deprecated Solo conserva compatibilidad de cálculos básicos históricos.
 * Los consumidores de producto deben usar `expenseTotals` desde `expenses.ts`
 * para respetar IVA mixto, deducibilidad y recargo de equivalencia.
 */
export function expenseTotal(expense: Expense): number {
  const amount = Number.isFinite(expense.amount) ? expense.amount : 0;
  const ivaPercent = Number.isFinite(expense.ivaPercent)
    ? expense.ivaPercent
    : 0;
  return roundMoney(amount * (1 + ivaPercent / 100));
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}
