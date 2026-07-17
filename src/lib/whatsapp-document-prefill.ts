import type { ClientFormValues } from "@/components/clients/ClientPicker";
import type { LineItem } from "@/lib/types";

export const WHATSAPP_COPILOT_SOURCE = "whatsapp-copilot";

export interface WhatsappDocumentPrefill {
  clientForm: Partial<ClientFormValues>;
  line: Partial<Pick<LineItem, "description" | "quantity" | "unitPrice">>;
  notes?: string;
  salesTerms?: string;
  paymentTerms?: string;
}

type SearchParamReader = Pick<URLSearchParams, "get">;

function cleanParam(value: string | null): string {
  return (value ?? "").trim();
}

function firstPresentParam(
  params: SearchParamReader,
  keys: string[],
): string {
  for (const key of keys) {
    const value = cleanParam(params.get(key));
    if (value) return value;
  }
  return "";
}

function splitCustomerName(customerName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = customerName.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: customerName, lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function parsePositiveNumber(value: string): number | undefined {
  const normalized = value
    .replace(/\s+/g, "")
    .replace(/[€$]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function buildNotes(params: SearchParamReader): string | undefined {
  const notes = cleanParam(params.get("notes"));
  const caseId = cleanParam(params.get("caseId"));
  const workType = cleanParam(params.get("workType"));
  const priceRange = cleanParam(params.get("priceRange"));
  const chunks = [
    "Origen: WhatsApp Copilot.",
    caseId ? `Caso: ${caseId}.` : "",
    workType ? `Tipo de trabajo: ${workType}.` : "",
    priceRange ? `Rango orientativo: ${priceRange}.` : "",
    notes,
  ].filter(Boolean);
  return chunks.length ? chunks.join("\n") : undefined;
}

export function whatsappDocumentPrefillFromSearchParams(
  params: SearchParamReader,
): WhatsappDocumentPrefill | null {
  if (cleanParam(params.get("source")) !== WHATSAPP_COPILOT_SOURCE) {
    return null;
  }

  const customerName = firstPresentParam(params, [
    "customerName",
    "clientName",
    "name",
  ]);
  const customerType = cleanParam(params.get("customerType"));
  const isCompany =
    customerType === "company" ||
    customerType === "business" ||
    customerType === "empresa";
  const { firstName, lastName } = splitCustomerName(customerName);
  const concept = firstPresentParam(params, ["concept", "description"]);
  const workType = cleanParam(params.get("workType"));
  const quantity = parsePositiveNumber(cleanParam(params.get("quantity"))) ?? 1;
  const unitPrice = parsePositiveNumber(
    firstPresentParam(params, ["unitPrice", "priceWithoutVat", "amount"]),
  );

  return {
    clientForm: {
      customerType: isCompany ? "company" : "person",
      firstName,
      lastName,
      phone: cleanParam(params.get("phone")),
      email: cleanParam(params.get("email")),
      city: cleanParam(params.get("city")),
      postalCode: cleanParam(params.get("postalCode")),
      address: cleanParam(params.get("address")),
      notes: cleanParam(params.get("customerNotes")),
    },
    line: {
      description: concept || workType,
      quantity,
      ...(unitPrice ? { unitPrice } : {}),
    },
    notes: buildNotes(params),
    salesTerms:
      firstPresentParam(params, ["salesTerms", "terms", "conditions"]) ||
      undefined,
    paymentTerms: cleanParam(params.get("paymentTerms")) || undefined,
  };
}
