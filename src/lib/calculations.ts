import type { Document, Expense, LineItem } from "./types";

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
  return expense.amount * (1 + expense.ivaPercent / 100);
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
