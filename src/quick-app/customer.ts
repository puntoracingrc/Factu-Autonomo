import type { Client } from "@/lib/types";
import { formatAddressBlock } from "@/lib/customer-address";
import { escapeHtml } from "./html";

export interface QuickCustomer { id: string; client: Client }
export function quickCustomer(row: Record<string,unknown>): QuickCustomer {
  const client: Client = { name: String(row.name ?? "") };
  for (const key of ["nif","address","postalCode","city","email","phone","streetType","addressExtra"] as const) client[key] = String(row[key] ?? "");
  return { id: String(row.id ?? ""), client };
}
export function quickCustomerCard(customer: QuickCustomer) {
  const client = customer.client;
  const details = [client.nif,formatAddressBlock(client),client.phone,client.email].filter(Boolean);
  return `<article class="customer-card"><h2>${escapeHtml(client.name || "Sin nombre")}</h2>${details.map(detail => `<p>${escapeHtml(detail)}</p>`).join("")}</article>
    <div class="customer-actions"><button class="customer-action" data-action="customer-invoice"><span aria-hidden="true">↗</span>Crear factura</button><button class="customer-action" data-action="customer-quote"><span aria-hidden="true">≡</span>Crear presupuesto</button></div>
    <button class="secondary customer-change" data-action="customer-change">Elegir otro cliente</button>`;
}
