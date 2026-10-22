import type { QuickCardPayment } from "./payments-model";

export interface QuickCollectionIntent { id: string; amount: number; description: string; customerName: string }
export interface QuickCollection extends QuickCollectionIntent {
  createdAt: string;
  invoiceOperationId?: string;
  invoiceLinked: boolean;
  invoiceNumber?: string;
  invoiceUrl?: string;
  payment?: QuickCardPayment;
}
export interface QuickCollectionInvoice { id: string; number: string; customerName: string; amount: number; version: number }
export function quickCollectionId(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error("Cobro no válido.");
  return value;
}
export function parseQuickCollection(value: unknown): QuickCollectionIntent {
  if (!value || typeof value !== "object") throw new Error("Revisa el importe y el concepto del cobro.");
  const raw = value as Record<string, unknown>;
  if (!Number.isSafeInteger(raw.amount) || (raw.amount as number) < 50 || (raw.amount as number) > 99_999_999) throw new Error("El importe debe estar entre 0,50 € y 999.999,99 €.");
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  const customerName = typeof raw.customerName === "string" ? raw.customerName.trim() : "";
  if (!description || description.length > 500 || customerName.length > 200 || /[\u0000-\u001f]/.test(description + customerName)) throw new Error("Revisa el concepto y el nombre del cliente.");
  return { id: quickCollectionId(raw.id), amount: raw.amount as number, description, customerName };
}
