import type { Client, LineItem } from "@/lib/types";
import { QUICK_METHODS, type QuickIntent } from "./model";

export const QUICK_AI_TEXT_LIMIT = 10_000;
export const QUICK_AI_IMAGE_BYTES = 1536 * 1024;
export const QUICK_AI_CONSENT_VERSION = "2026-10-21";
export const QUICK_AI_TARGETS = ["document", "client", "concepts"] as const;
export type QuickAiTarget = (typeof QUICK_AI_TARGETS)[number];
export const QUICK_AI_CLIENT_FIELDS = { name: 200, nif: 30, address: 250, postalCode: 20, city: 100, email: 254, phone: 40 } as const;
export interface QuickAiSuggestion {
  client: Partial<Pick<Client, keyof typeof QUICK_AI_CLIENT_FIELDS>>;
  items: Array<{ description: string; quantity: number | null; unitPrice: number | null; ivaPercent: number | null; unit: string | null; priceIncludesVat: boolean }>;
  notes: string | null;
  date: string | null;
  paymentMethod: QuickIntent["paymentMethod"] | null;
  warnings: string[];
}
export function quickAiHasTargetFields(suggestion: QuickAiSuggestion, target: QuickAiTarget): boolean {
  if (target === "client") return Object.keys(suggestion.client).length > 0;
  if (target === "concepts") return suggestion.items.length > 0 || !!suggestion.notes;
  return Object.keys(suggestion.client).length > 0 || suggestion.items.length > 0 || !!suggestion.notes || !!suggestion.date || !!suggestion.paymentMethod;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("La IA no devolvió campos válidos. Prueba con datos más claros.");
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)) throw new Error("La respuesta de IA contiene textos no válidos.");
  return value.trim() || null;
}
function numeric(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error("La respuesta de IA contiene importes no válidos.");
  return value;
}
/** A suggestion has no identity, issuer, number, payment status or master IDs. */
export function normalizeQuickAiSuggestion(value: unknown): QuickAiSuggestion {
  const raw = record(value), sourceClient = record(raw.client ?? {});
  const client: QuickAiSuggestion["client"] = {};
  for (const [key, max] of Object.entries(QUICK_AI_CLIENT_FIELDS)) {
    const v = text(sourceClient[key], max);
    if (v) client[key as keyof typeof client] = key === "nif" ? v.replace(/[\s.-]/g, "").toUpperCase() : v;
  }
  if (!Array.isArray(raw.items) || raw.items.length > 20) throw new Error("Esta pantalla admite hasta 20 conceptos. Divide el texto en documentos más pequeños.");
  const warnings = Array.isArray(raw.warnings) ? raw.warnings.slice(0, 10).map(v => text(v, 300)).filter((v): v is string => !!v) : [];
  const items = raw.items.map(value => {
    const item = record(value), description = text(item.description, 2000);
    if (!description) throw new Error("La IA devolvió un concepto sin descripción.");
    if (item.priceIncludesVat !== undefined && typeof item.priceIncludesVat !== "boolean") throw new Error("No se pudo interpretar el IVA del precio.");
    const unitPrice = numeric(item.unitPrice, 0, 1_000_000);
    if (unitPrice === null) warnings.push(`Falta el precio de «${description.slice(0, 60)}»: revísalo antes de emitir.`);
    return { description, quantity: numeric(item.quantity, 0.0001, 100_000), unitPrice,
      ivaPercent: numeric(item.ivaPercent, 0, 100), unit: text(item.unit, 20), priceIncludesVat: item.priceIncludesVat === true };
  });
  const date = text(raw.date, 10);
  if (date && (!/^20\d\d-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date)) throw new Error("La IA devolvió una fecha no válida.");
  const method = raw.paymentMethod;
  if (method !== null && method !== undefined && !QUICK_METHODS.includes(method as never)) throw new Error("La IA devolvió una forma de pago no válida.");
  const notes = text(raw.notes, 4000);
  if (!Object.keys(client).length && !items.length && !notes && !date && !method) throw new Error("No se han encontrado datos para rellenar. Prueba con un texto o una foto más claros.");
  return { client, items, notes, date, paymentMethod: method as QuickAiSuggestion["paymentMethod"] ?? null, warnings: [...new Set(warnings)].slice(0, 20) };
}
function identity(value: unknown) { return String(value ?? "").normalize("NFD").replace(/\p{Diacritic}|[^\p{L}\p{N}]/gu, "").toLowerCase(); }

export function quickAiReplacesData(intent: QuickIntent, suggestion: QuickAiSuggestion, target: QuickAiTarget): boolean {
  return (target !== "concepts" && Object.entries(suggestion.client).some(([key, value]) => {
    const current = intent.client[key as keyof Client];
    return !!current && current !== value;
  })) || (target !== "client" && (
    (suggestion.items.length > 0 && intent.items.some(item => item.description.trim() || item.unitPrice !== 0)) ||
    (!!suggestion.notes && !!intent.notes && suggestion.notes !== intent.notes) ||
    (target === "document" && !!suggestion.date && suggestion.date !== intent.date) ||
    (target === "document" && !!suggestion.paymentMethod && suggestion.paymentMethod !== intent.paymentMethod)
  ));
}
export function applyQuickAiSuggestion(intent: QuickIntent, suggestion: QuickAiSuggestion, target: QuickAiTarget, vat: { defaultVat: number; vatExempt: boolean }, newId: () => string): QuickIntent {
  const next = structuredClone(intent);
  if (target !== "concepts" && Object.keys(suggestion.client).length) {
    const changedIdentity = (["name", "nif"] as const).some(key => suggestion.client[key] && next.client[key] && identity(suggestion.client[key]) !== identity(next.client[key]));
    // A different recipient must not inherit the previous recipient's NIF or address.
    next.client = changedIdentity ? { name: "", ...suggestion.client } : { ...next.client, ...suggestion.client };
    if (suggestion.client.address) { delete next.client.streetType; delete next.client.addressExtra; }
    delete next.customerId;
  }
  if (target !== "client") {
    if (suggestion.items.length) next.items = suggestion.items.map(item => {
      const sourceVat = item.ivaPercent ?? vat.defaultVat;
      const ivaPercent = vat.vatExempt ? 0 : sourceVat;
      const price = item.unitPrice ?? 0;
      return { id: newId(), description: item.description, quantity: item.quantity ?? 1,
        unitPrice: item.priceIncludesVat ? Math.round(price / (1 + sourceVat / 100) * 1e6) / 1e6 : price,
        ivaPercent, unit: item.unit ?? "ud" } satisfies LineItem;
    });
    if (suggestion.notes) next.notes = suggestion.notes;
    if (target === "document") {
      if (suggestion.date) next.date = suggestion.date;
      if (suggestion.paymentMethod) next.paymentMethod = suggestion.paymentMethod;
    }
  }
  // paid is always the user's explicit checkbox; AI never confirms collection.
  return next;
}
