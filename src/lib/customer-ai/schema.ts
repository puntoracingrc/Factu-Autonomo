import { normalizeCustomerNif } from "../customers";
import { STREET_TYPES } from "../customer-address";
import type { CustomerType } from "../types";

export interface CustomerTextExtractPayload {
  customer: {
    customerType: CustomerType;
    firstName: string;
    lastName: string;
    contactName?: string | null;
    nif?: string | null;
    email?: string | null;
    phone?: string | null;
    streetType?: string | null;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    notes?: string | null;
  };
  confidence: number;
  warnings: string[];
}

const STREET_TYPE_IDS = new Set(STREET_TYPES.map((type) => type.id));

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function optionalString(value: unknown): string | null {
  const cleaned = cleanString(value);
  return cleaned || null;
}

function normalizePostalCode(value: unknown): string | null {
  const cleaned = cleanString(value);
  const match = cleaned.match(/\b\d{5}\b/);
  return match?.[0] ?? null;
}

function normalizePhone(value: unknown): string | null {
  const cleaned = cleanString(value);
  if (!cleaned) return null;
  return cleaned.replace(/[^\d+]/g, "");
}

function normalizeStreetType(value: unknown): string | null {
  const cleaned = cleanString(value).toLowerCase();
  if (!cleaned) return null;
  if (STREET_TYPE_IDS.has(cleaned as never)) return cleaned;
  const match = STREET_TYPES.find(
    (type) =>
      type.label.toLowerCase() === cleaned ||
      type.abbreviation.toLowerCase().replace(".", "") ===
        cleaned.replace(".", ""),
  );
  return match?.id ?? null;
}

function normalizeCustomerType(value: unknown): CustomerType {
  return value === "company" ? "company" : "person";
}

export function normalizeCustomerTextExtractPayload(
  raw: unknown,
): CustomerTextExtractPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const customerRaw = data.customer;
  if (!customerRaw || typeof customerRaw !== "object") return null;

  const customer = customerRaw as Record<string, unknown>;
  const customerType = normalizeCustomerType(customer.customerType);
  const firstName = cleanString(customer.firstName);
  const lastName =
    customerType === "company" ? "" : cleanString(customer.lastName);

  if (firstName.length < 2) {
    return null;
  }

  if (customerType === "person" && lastName && lastName.length < 2) {
    return null;
  }

  const confidence = Number(data.confidence);
  const warnings = Array.isArray(data.warnings)
    ? data.warnings.filter((warning): warning is string => typeof warning === "string")
    : [];

  if (customerType === "person" && !lastName) {
    warnings.push("No se han detectado apellidos.");
  }

  if (Number.isFinite(confidence) && confidence < 0.7) {
    warnings.push("Confianza baja: revisa todos los campos antes de guardar.");
  }

  const nif = optionalString(customer.nif);

  return {
    customer: {
      customerType,
      firstName,
      lastName,
      contactName:
        customerType === "company" ? optionalString(customer.contactName) : null,
      nif: nif ? normalizeCustomerNif(nif) : null,
      email: optionalString(customer.email),
      phone: normalizePhone(customer.phone),
      streetType: normalizeStreetType(customer.streetType),
      address: optionalString(customer.address),
      city: optionalString(customer.city),
      postalCode: normalizePostalCode(customer.postalCode),
      notes: optionalString(customer.notes),
    },
    confidence: Number.isFinite(confidence) ? confidence : 0.5,
    warnings,
  };
}

export const CUSTOMER_TEXT_EXTRACT_JSON_SCHEMA = {
  customer: {
    customerType:
      'string — "person" para particular o autónomo persona física; "company" para empresa/sociedad',
    firstName:
      "string — nombre del cliente. Si es empresa, razón social completa",
    lastName:
      "string opcional — apellidos solo para particulares. Si es empresa, déjalo vacío",
    contactName:
      "string opcional — persona de contacto dentro de la empresa, si aparece claramente",
    nif: "string opcional — NIF/CIF español",
    email: "string opcional",
    phone: "string opcional",
    streetType: `opcional, uno de: ${STREET_TYPES.map((type) => type.id).join(", ")}`,
    address: "string opcional — calle y número sin prefijo de tipo de vía",
    city: "string opcional",
    postalCode: "string opcional — código postal español de 5 dígitos",
    notes: "string opcional — dudas o datos relevantes que no encajan en otros campos",
  },
  confidence: "number 0-1",
  warnings: "array de strings con dudas, datos omitidos o campos no encontrados",
} as const;
