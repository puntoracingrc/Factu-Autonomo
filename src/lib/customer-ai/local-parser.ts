import { clientAddressToFormFields } from "../customer-address";
import { normalizeCustomerNif } from "../customers";
import type { CustomerType } from "../types";
import {
  normalizeCustomerTextExtractPayload,
  type CustomerTextExtractPayload,
} from "./schema";

const POSTAL_CODE_REGEX = /\b(?:0[1-9]|[1-4]\d|5[0-2])\d{3}\b/u;
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu;
const TAX_ID_REGEX =
  /^(?:[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J]|[XYZ]\d{7}[A-Z]|\d{8}[A-Z])$/u;
const TAX_ID_CANDIDATE_REGEX = /\b[A-Z0-9][A-Z0-9 \t.-]{7,16}[A-Z0-9]\b/giu;
const PHONE_CANDIDATE_REGEX = /(?:\+34[\s.-]?)?(?:\d[\s.-]?){9,}/gu;
const ADDRESS_START_REGEX =
  /(?:^|\b)(?:c\/|c\.|cl\.|calle|carrer|rua|rúa|avenida|avda\.?|av\.?|avinguda|plaza|pl\.|plaça|paseo|pº|passeig|carretera|ctra\.?|camino|camí|ronda|traves[ií]a|pje\.?|pasaje|pol[.]?\s*ind[.]?|pol[ií]gono|urbanizaci[oó]n|urb\.?)(?=\s|$)/iu;
const COMPANY_MARKER_REGEX =
  /\b(?:s\.?\s*l\.?\s*u?\.?|s\.?\s*a\.?|s\.?\s*coop\.?|sociedad\s+limitada|sociedad\s+anonima|cooperativa|comunidad\s+de\s+bienes|c\.?\s*b\.?)\b/iu;
const FIELD_LABEL_REGEX =
  /^(?:cliente|nombre|empresa|raz[oó]n\s+social|nif|cif|nie|email|correo|tel[eé]fono|tel|movil|m[oó]vil|direcci[oó]n|domicilio|ciudad|localidad|poblaci[oó]n|cp|c[oó]digo\s+postal)\s*[:.-]\s*/iu;

const CITY_ALIASES = new Map<string, string>([
  ["barna", "Barcelona"],
  ["bcn", "Barcelona"],
  ["barcelona", "Barcelona"],
  ["mad", "Madrid"],
  ["madrid", "Madrid"],
  ["vlc", "Valencia"],
  ["valencia", "Valencia"],
  ["valència", "Valencia"],
  ["bilbo", "Bilbao"],
  ["bilbao", "Bilbao"],
  ["sevilla", "Sevilla"],
  ["seville", "Sevilla"],
]);

function clean(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/gu, " ") ?? "";
}

function normalizeComparable(value: string): string {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("es-ES")
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function normalizeCity(value: string | null | undefined): string | null {
  const cleaned = clean(value).replace(/^[,.;:\-\s]+|[,.;:\-\s]+$/gu, "");
  if (!cleaned) return null;
  return CITY_ALIASES.get(normalizeComparable(cleaned)) ?? cleaned;
}

function splitInput(text: string): string[] {
  return text
    .split(/\r?\n|;/u)
    .map(clean)
    .filter(Boolean);
}

function extractEmail(text: string): string | null {
  return text.match(EMAIL_REGEX)?.[0] ?? null;
}

function extractTaxId(text: string): { raw: string; normalized: string } | null {
  const labeled = text.match(
    /\b(?:nif|cif|nie)[ \t]*[:.-]?[ \t]*([A-Z0-9][A-Z0-9 \t.-]{7,16}[A-Z0-9])\b/iu,
  );
  const labeledRaw = labeled?.[1];
  const labeledCompact = labeledRaw?.replace(/[^A-Z0-9]/giu, "").toUpperCase();
  if (labeledRaw && labeledCompact && TAX_ID_REGEX.test(labeledCompact)) {
    return { raw: labeledRaw, normalized: normalizeCustomerNif(labeledCompact) };
  }

  for (const match of text.matchAll(TAX_ID_CANDIDATE_REGEX)) {
    const raw = match[0];
    const compact = raw.replace(/[^A-Z0-9]/giu, "").toUpperCase();
    if (!TAX_ID_REGEX.test(compact)) continue;
    return { raw, normalized: normalizeCustomerNif(compact) };
  }
  return null;
}

function extractPhone(text: string, taxIdRaw: string | null): string | null {
  const withoutTaxId = taxIdRaw ? text.replace(taxIdRaw, " ") : text;
  const withoutPostalCodes = withoutTaxId.replace(POSTAL_CODE_REGEX, " ");

  for (const match of withoutPostalCodes.matchAll(PHONE_CANDIDATE_REGEX)) {
    const raw = match[0];
    const digits = raw.replace(/\D/gu, "");
    const national = digits.startsWith("34") && digits.length === 11
      ? digits.slice(2)
      : digits;
    if (!/^[6789]\d{8}$/u.test(national)) continue;
    return raw.trim().startsWith("+") ? `+34${national}` : national;
  }

  return null;
}

function labeledValue(lines: string[], labels: RegExp): string | null {
  for (const line of lines) {
    const match = line.match(labels);
    const value = clean(match?.[1]);
    if (value) return value;
  }
  return null;
}

function extractPostalCode(text: string): string | null {
  return text.match(POSTAL_CODE_REGEX)?.[0] ?? null;
}

function cityFromPostalLine(lines: string[], postalCode: string | null): string | null {
  if (!postalCode) return null;

  for (const line of lines) {
    const index = line.indexOf(postalCode);
    if (index < 0) continue;
    const after = clean(line.slice(index + postalCode.length));
    const city = normalizeCity(after.replace(FIELD_LABEL_REGEX, ""));
    if (city) return city;
  }

  return null;
}

function extractCity(lines: string[], postalCode: string | null): string | null {
  const explicit = labeledValue(
    lines,
    /^(?:ciudad|localidad|poblaci[oó]n)\s*[:.-]\s*(.+)$/iu,
  );
  return normalizeCity(explicit) ?? cityFromPostalLine(lines, postalCode);
}

function stripKnownValues(
  value: string,
  known: {
    email: string | null;
    taxIdRaw: string | null;
    phone: string | null;
    postalCode: string | null;
  },
): string {
  let next = value;
  for (const removable of [
    known.email,
    known.taxIdRaw,
    known.phone,
    known.postalCode,
  ]) {
    if (removable) next = next.replace(removable, " ");
  }
  return clean(next);
}

function addressTextFromLine(line: string): string | null {
  const match = line.match(ADDRESS_START_REGEX);
  if (!match || match.index === undefined) return null;

  const address = clean(line.slice(match.index).replace(FIELD_LABEL_REGEX, ""));
  if (!address) return null;

  const postalMatch = address.match(POSTAL_CODE_REGEX);
  if (!postalMatch || postalMatch.index === undefined) return address;

  const beforePostal = clean(address.slice(0, postalMatch.index)).replace(
    /[,.;:\-\s]+$/u,
    "",
  );
  const postalSegment = clean(address.slice(postalMatch.index));
  return [beforePostal, postalSegment].filter(Boolean).join(", ");
}

function extractAddress(
  lines: string[],
  known: {
    email: string | null;
    taxIdRaw: string | null;
    phone: string | null;
    postalCode: string | null;
  },
): {
  streetType: string | null;
  address: string | null;
  addressExtra: string | null;
  residenceType: string;
  city: string | null;
  postalCode: string | null;
} {
  const explicit = labeledValue(
    lines,
    /^(?:direcci[oó]n|domicilio)\s*[:.-]\s*(.+)$/iu,
  );
  const candidates = explicit ? [explicit, ...lines] : lines;

  for (const line of candidates) {
    const stripped = stripKnownValues(line, known);
    const addressText = addressTextFromLine(stripped);
    if (!addressText) continue;

    const fields = clientAddressToFormFields({
      address: addressText,
      city: "",
      postalCode: "",
    });

    if (!fields.streetLine) continue;

    return {
      streetType: fields.streetType || null,
      address: fields.streetLine || null,
      addressExtra: fields.addressExtra || null,
      residenceType: fields.residenceType,
      city: normalizeCity(fields.city),
      postalCode: fields.postalCode || null,
    };
  }

  return {
    streetType: null,
    address: null,
    addressExtra: null,
    residenceType: "",
    city: null,
    postalCode: null,
  };
}

function lineLooksLikeOnlyKnownData(line: string): boolean {
  const comparable = normalizeComparable(line.replace(FIELD_LABEL_REGEX, ""));
  return (
    !comparable ||
    /^(nif|cif|nie|email|correo|telefono|tel|movil|direccion|domicilio|ciudad|localidad|poblacion|cp|codigo postal)\b/u.test(
      comparable,
    ) ||
    EMAIL_REGEX.test(line) ||
    POSTAL_CODE_REGEX.test(line) ||
    ADDRESS_START_REGEX.test(line)
  );
}

function cleanNameCandidate(
  line: string,
  known: {
    email: string | null;
    taxIdRaw: string | null;
    phone: string | null;
    postalCode: string | null;
  },
): string | null {
  if (POSTAL_CODE_REGEX.test(line) && !ADDRESS_START_REGEX.test(line)) {
    return null;
  }

  let candidate = stripKnownValues(line, known).replace(FIELD_LABEL_REGEX, "");
  const addressMatch = candidate.match(ADDRESS_START_REGEX);
  if (addressMatch?.index !== undefined) {
    candidate = candidate.slice(0, addressMatch.index);
  }
  candidate = clean(candidate.replace(/^[,.;:\-\s]+|[,.;:\-\s]+$/gu, ""));
  if (!candidate || candidate.length < 2 || candidate.length > 140) return null;
  if (lineLooksLikeOnlyKnownData(candidate)) return null;
  return candidate;
}

function extractName(
  lines: string[],
  known: {
    email: string | null;
    taxIdRaw: string | null;
    phone: string | null;
    postalCode: string | null;
  },
): string | null {
  const explicit = labeledValue(
    lines,
    /^(?:cliente|nombre|empresa|raz[oó]n\s+social|nombre\s+fiscal)\s*[:.-]\s*(.+)$/iu,
  );
  const explicitCandidate = explicit ? cleanNameCandidate(explicit, known) : null;
  if (explicitCandidate) return explicitCandidate;

  for (const line of lines) {
    const candidate = cleanNameCandidate(line, known);
    if (candidate) return candidate;
  }

  return null;
}

function classifyCustomer(name: string, taxId: string | null): CustomerType {
  if (COMPANY_MARKER_REGEX.test(name)) return "company";
  if (taxId && /^[ABCDEFGHJKLMNPQRSUVW]/u.test(taxId)) return "company";
  return "person";
}

function splitPersonName(name: string): { firstName: string; lastName: string } {
  const parts = clean(name).split(" ").filter(Boolean);
  if (parts.length <= 1) return { firstName: name, lastName: "" };
  return {
    firstName: parts[0] ?? name,
    lastName: parts.slice(1).join(" "),
  };
}

function confidenceFor(customer: {
  firstName: string;
  lastName: string;
  nif: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
}): number {
  let confidence = customer.firstName ? 0.25 : 0;
  if (customer.lastName) confidence += 0.1;
  if (customer.nif) confidence += 0.18;
  if (customer.email) confidence += 0.14;
  if (customer.phone) confidence += 0.12;
  if (customer.address) confidence += 0.13;
  if (customer.city) confidence += 0.04;
  if (customer.postalCode) confidence += 0.04;
  return Math.min(0.95, Math.round(confidence * 100) / 100);
}

export function parseCustomerTextLocally(
  text: string,
): CustomerTextExtractPayload | null {
  const lines = splitInput(text);
  if (lines.length === 0) return null;

  const email = extractEmail(text);
  const taxId = extractTaxId(text);
  const phone = extractPhone(text, taxId?.raw ?? null);
  const postalCode = extractPostalCode(text);
  const known = {
    email,
    taxIdRaw: taxId?.raw ?? null,
    phone,
    postalCode,
  };
  const address = extractAddress(lines, known);
  const city = extractCity(lines, postalCode) ?? address.city;
  const name = extractName(lines, known);
  if (!name) return null;

  const customerType = classifyCustomer(name, taxId?.normalized ?? null);
  const personName =
    customerType === "person"
      ? splitPersonName(name)
      : { firstName: name, lastName: "" };
  const rawPayload = {
    customer: {
      customerType,
      firstName: personName.firstName,
      lastName: personName.lastName,
      contactName: null,
      nif: taxId?.normalized ?? null,
      email,
      phone,
      streetType: address.streetType,
      residenceType: address.residenceType,
      address: address.address,
      addressExtra: address.addressExtra,
      city,
      postalCode: postalCode ?? address.postalCode,
      notes: null,
    },
    confidence: confidenceFor({
      firstName: personName.firstName,
      lastName: personName.lastName,
      nif: taxId?.normalized ?? null,
      email,
      phone,
      address: address.address,
      city,
      postalCode: postalCode ?? address.postalCode,
    }),
    warnings: [] as string[],
  };

  if (rawPayload.confidence < 0.7) {
    rawPayload.warnings.push(
      "Extraccion local con confianza baja: revisa los campos antes de guardar.",
    );
  }
  if (!taxId) rawPayload.warnings.push("No se ha detectado NIF/CIF.");
  if (!address.address) rawPayload.warnings.push("No se ha detectado direccion.");

  return normalizeCustomerTextExtractPayload(rawPayload);
}

export function isLocalCustomerParseSufficient(
  payload: CustomerTextExtractPayload | null,
): payload is CustomerTextExtractPayload {
  return Boolean(payload && payload.confidence >= 0.8);
}
