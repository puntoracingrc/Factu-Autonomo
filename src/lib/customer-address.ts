import type { Client, Customer } from "./types";

export const STREET_TYPES = [
  { id: "calle", label: "Calle", abbreviation: "C/" },
  { id: "avenida", label: "Avenida", abbreviation: "Avda." },
  { id: "pasaje", label: "Pasaje", abbreviation: "Pje." },
  { id: "paseo", label: "Paseo", abbreviation: "Pº" },
  { id: "plaza", label: "Plaza", abbreviation: "Pl." },
  { id: "carretera", label: "Carretera", abbreviation: "Ctra." },
  { id: "camino", label: "Camino", abbreviation: "Cam." },
  { id: "travesia", label: "Travesía", abbreviation: "Tr." },
  { id: "ronda", label: "Ronda", abbreviation: "Ronda" },
  { id: "glorieta", label: "Glorieta", abbreviation: "Glorieta" },
  { id: "urbanizacion", label: "Urbanización", abbreviation: "Urb." },
  { id: "poligono", label: "Polígono industrial", abbreviation: "Pol. Ind." },
  { id: "alameda", label: "Alameda", abbreviation: "Alameda" },
  { id: "rambla", label: "Rambla", abbreviation: "Rambla" },
  { id: "gran_via", label: "Gran Vía", abbreviation: "Gran Vía" },
  { id: "bulevar", label: "Bulevar", abbreviation: "Bulevar" },
] as const;

export type StreetTypeId = (typeof STREET_TYPES)[number]["id"];

export function getStreetType(id?: string | null) {
  if (!id) return undefined;
  return STREET_TYPES.find((type) => type.id === id);
}

export function formatStreetLine(
  streetType?: string | null,
  address?: string | null,
): string {
  const trimmed = address?.trim() ?? "";
  if (!trimmed) return "";
  const type = getStreetType(streetType);
  if (!type) return trimmed;
  return `${type.abbreviation} ${trimmed}`;
}

export function formatClientAddressLine(client: Client): string {
  const formatted = formatStreetLine(client.streetType, client.address);
  if (formatted) return formatted;
  return client.address?.trim() ?? "";
}

export type StreetAddressFields = {
  streetType?: string;
  address?: string;
  postalCode?: string;
  city?: string;
};

export function streetAddressSortKey(
  entity: Pick<StreetAddressFields, "address" | "postalCode" | "city">,
): string {
  return [entity.address, entity.postalCode, entity.city]
    .filter(Boolean)
    .join(", ");
}

export function customerStreetSortKey(
  customer: Pick<Customer, "address" | "postalCode" | "city">,
): string {
  return streetAddressSortKey(customer);
}

export function formatAddressBlock(entity: StreetAddressFields): string {
  const streetLine = formatStreetLine(entity.streetType, entity.address);
  return [streetLine, [entity.postalCode, entity.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}

/** Separa prefijos legacy («Calle Mayor 1») en tipo + nombre de vía. */
export function splitLegacyStreetAddress(address?: string | null): {
  streetType?: StreetTypeId;
  streetLine: string;
} {
  const trimmed = address?.trim() ?? "";
  if (!trimmed) return { streetLine: "" };

  for (const type of STREET_TYPES) {
    const labelPattern = new RegExp(`^${type.label}\\s+`, "i");
    if (labelPattern.test(trimmed)) {
      return {
        streetType: type.id,
        streetLine: trimmed.replace(labelPattern, "").trim(),
      };
    }

    const abbr = type.abbreviation.replace(/\./g, "\\.");
    const abbrPattern = new RegExp(`^${abbr}\\s*`, "i");
    if (abbrPattern.test(trimmed)) {
      return {
        streetType: type.id,
        streetLine: trimmed.replace(abbrPattern, "").trim(),
      };
    }
  }

  return { streetLine: trimmed };
}

export function normalizeStreetFields<T extends StreetAddressFields>(entity: T): T {
  if (entity.streetType || !entity.address) {
    return entity;
  }

  const { streetType, streetLine } = splitLegacyStreetAddress(entity.address);
  if (!streetType) return entity;

  return {
    ...entity,
    streetType,
    address: streetLine || entity.address,
  };
}

export function normalizeCustomerStreetFields(customer: Customer): Customer {
  return normalizeStreetFields(customer);
}

export function clientAddressToFormFields(
  client: Pick<Client, "streetType" | "address">,
): { streetType: string; streetLine: string } {
  const firstSegment =
    client.address?.split(",")[0]?.trim() ?? client.address?.trim() ?? "";

  if (client.streetType) {
    const type = getStreetType(client.streetType);
    if (type && firstSegment) {
      const abbr = type.abbreviation.replace(/\./g, "\\.");
      const prefixPattern = new RegExp(`^(${abbr}|${type.label})\\s*`, "i");
      return {
        streetType: client.streetType,
        streetLine: firstSegment.replace(prefixPattern, "").trim() || firstSegment,
      };
    }
    return { streetType: client.streetType, streetLine: firstSegment };
  }

  const { streetType, streetLine } = splitLegacyStreetAddress(firstSegment);
  return { streetType: streetType ?? "", streetLine };
}
