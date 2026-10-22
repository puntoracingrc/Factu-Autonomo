import type { BusinessProfile, Client, Document, LineItem } from "@/lib/types";
import { documentTotals } from "@/lib/calculations";

export const QUICK_METHODS = ["efectivo", "tarjeta", "transferencia", "bizum", "stripe"] as const;
export type QuickPaymentMethod = (typeof QUICK_METHODS)[number];
export interface QuickIntent {
  operationId: string;
  kind: "factura" | "presupuesto";
  date: string;
  customerId?: string;
  client: Client;
  items: LineItem[];
  notes: string;
  paymentMethod: QuickPaymentMethod;
  paid: boolean;
}
export interface QuickBootstrap {
  actorId: string;
  companyId: string;
  companyName: string;
  defaultVat: number;
  vatRates: number[];
  vatExempt: boolean;
  iban: string;
  cardPaymentsEnabled?: boolean;
  cardPaymentsTestMode?: boolean;
}
export interface QuickReceipt {
  operationId: string;
  document: Document;
  profile: BusinessProfile;
  customerPending: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Datos de documento no válidos.");
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number, required = false): string {
  if (typeof value !== "string" || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    if (value === undefined && !required) return "";
    throw new Error("Revisa los textos del documento.");
  }
  const result = value.trim();
  if (required && !result) throw new Error("Completa el cliente y al menos un concepto.");
  return result;
}
function number(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error("Revisa cantidades, precios e IVA.");
  return value;
}
export function parseQuickIntent(value: unknown): QuickIntent {
  const raw = record(value);
  if (typeof raw.operationId !== "string" || !UUID.test(raw.operationId)) throw new Error("La operación no tiene una identidad válida.");
  if (raw.kind !== "factura" && raw.kind !== "presupuesto") throw new Error("Tipo de documento no válido.");
  const date = text(raw.date, 10);
  const parsedDate = new Date(`${date}T12:00:00Z`);
  if (!/^20\d\d-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== date) throw new Error("Fecha no válida.");
  if (!QUICK_METHODS.includes(raw.paymentMethod as QuickPaymentMethod) || typeof raw.paid !== "boolean") throw new Error("Forma de pago no válida.");
  if (raw.kind === "presupuesto" && raw.paid) throw new Error("Un presupuesto no acredita un cobro.");
  if (raw.paymentMethod === "stripe" && (raw.paid || raw.kind !== "factura")) throw new Error("El cobro por enlace solo se confirma con Stripe y requiere una factura.");
  const client = record(raw.client);
  const parsedClient: Client = {
    name: text(client.name, 200, true),
    nif: text(client.nif, 30),
    address: text(client.address, 250),
    postalCode: text(client.postalCode, 20),
    city: text(client.city, 100),
    email: text(client.email, 254),
    phone: text(client.phone, 40),
    streetType: text(client.streetType, 50),
    addressExtra: text(client.addressExtra, 100),
  };
  if (!Array.isArray(raw.items) || raw.items.length < 1 || raw.items.length > 20) throw new Error("Añade entre 1 y 20 conceptos sencillos.");
  const ids = new Set<string>();
  const items = raw.items.map((value) => {
    const item = record(value);
    const id = text(item.id, 100, true);
    if (ids.has(id)) throw new Error("Hay líneas repetidas.");
    ids.add(id);
    return {
      id, description: text(item.description, 2000, true),
      quantity: number(item.quantity, 0.0001, 100000),
      unitPrice: number(item.unitPrice, 0, 1000000),
      ivaPercent: number(item.ivaPercent, 0, 100), unit: text(item.unit, 20) || "ud",
    };
  });
  const customerId = text(raw.customerId, 200) || undefined;
  // Only this allowlist crosses into the issuing service. The browser cannot
  // supply an issuer, company, number, seal, totals, images or fiscal metadata.
  return {
    operationId: raw.operationId, kind: raw.kind, date, customerId, client: parsedClient,
    items, notes: text(raw.notes, 4000), paymentMethod: raw.paymentMethod as QuickPaymentMethod, paid: raw.paid,
  };
}
export function quickPaymentTerms(method: QuickPaymentMethod, paid: boolean, iban: string): string {
  const labels = { efectivo: "en efectivo", tarjeta: "por tarjeta", transferencia: "por transferencia", bizum: "por Bizum", stripe: "por tarjeta mediante enlace o QR" };
  return `${paid ? "Pagado" : "Pago"} ${labels[method]}${method === "transferencia" && iban.trim() ? ` · IBAN: ${iban.trim()}` : ""}`;
}
export function quickTotals(items: LineItem[], vatExempt = false) {
  return documentTotals({ items }, vatExempt);
}
