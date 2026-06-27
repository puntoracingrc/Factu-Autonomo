import type { Document, Expense, LineItem } from "./types";

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
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

export function documentTotals(doc: Pick<Document, "items">) {
  const subtotal = doc.items.reduce((sum, item) => sum + lineSubtotal(item), 0);
  const iva = doc.items.reduce((sum, item) => sum + lineIva(item), 0);
  const total = subtotal + iva;
  return { subtotal, iva, total };
}

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
