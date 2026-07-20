import {
  clientAddressToFormFields,
  splitLegacyStreetAddress,
} from "../customer-address";
import { normalizeCustomerNif } from "../customers";
import type { CustomerType } from "../types";
import {
  customerTextFieldSegments,
  customerTextHardLines,
  customerFieldValues,
  firstCustomerFieldValue,
  parseCustomerFieldSegment,
  removeLeadingCustomerFieldLabel,
  truncateBeforeCustomerField,
} from "./local-parser-lexicon";
import {
  resolveSpanishMunicipality,
  type SpanishMunicipalityResolution,
} from "./spain-locations";
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
const COMPANY_MARKER_REGEX =
  /\b(?:s\.?\s*l\.?\s*u?\.?|s\.?\s*a\.?|s\.?\s*coop\.?|sociedad\s+limitada|sociedad\s+anonima|societat\s+limitada|societat\s+anonima|sociedade\s+limitada|sociedade\s+anonima|sozietate\s+mugatua|kooperatiba|cooperativa|comunidad\s+de\s+bienes|c\.?\s*b\.?)\b/iu;
const COMMON_DISCOURSE_ONLY_REGEX =
  /^(?:me\s+han\s+pasado|te\s+paso|te\s+dejo|apunta|anota|estos\s+son|estos\s+datos|datos\s+de|el\s+cliente|la\s+empresa|aqui\s+va|ahi\s+va)(?:\s+(?:los|las|el|la|este|esta|estos|estas|siguientes|datos|cliente|empresa))*[.!]?$/iu;
const NON_DATA_SENTENCE_REGEX =
  /\b(?:me\s+han\s+dicho\s+que|luego\s+me\s+pasan|datos\s+completos\s+del\s+cliente)\b/iu;
const TRAILING_FIELD_WORD_REGEX =
  /\s+(?:nif|cif|nie|ifz|email|e-mail|correo|correu|telefono|tel[eèé]fon|telefonoa|tlf|movil|m[oòó]bil|mugikorra?|direcci[oó]n|adre[cç]a|enderezo|helbidea?|ciudad|ciutat|cidade|hiria|localidad|localitat|localidade|udalerria|cp|c[oó]digo\s+postal|codi\s+postal|posta\s+kodea)\b.*$/iu;
const FIELD_ONLY_REGEX =
  /^(?:cliente|client|nombre|nom|nome|empresa|enpresa|nif|cif|nie|ifz|email|e-mail|correo|correu|telefono|tel[eèé]fon|telefonoa|tlf|movil|m[oòó]bil|mugikorra?|direcci[oó]n|adre[cç]a|enderezo|helbidea?|ciudad|ciutat|cidade|hiria|localidad|localitat|localidade|udalerria|cp|c[oó]digo\s+postal|codi\s+postal|posta\s+kodea)$/iu;

type KnownValues = {
  email: string | null;
  taxIdRaw: string | null;
  phoneRaw: string | null;
  postalCode: string | null;
};

type ExtractedCity = {
  value: string | null;
  resolution: SpanishMunicipalityResolution | null;
};

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

function extractEmails(text: string): string[] {
  return Array.from(
    new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu) ?? []),
  );
}

function extractTaxIds(text: string): Array<{ raw: string; normalized: string }> {
  const values = new Map<string, { raw: string; normalized: string }>();
  for (const labeled of text.matchAll(
    /\b(?:nif|cif|nie|ifz)[ \t]*(?::|=|es)?[ \t]*([A-Z0-9][A-Z0-9 \t.-]{7,16}[A-Z0-9])\b/giu,
  )) {
    const raw = labeled[1];
    const compact = raw?.replace(/[^A-Z0-9]/giu, "").toUpperCase();
    if (!raw || !compact || !TAX_ID_REGEX.test(compact)) continue;
    const normalized = normalizeCustomerNif(compact);
    values.set(normalized, { raw, normalized });
  }

  for (const match of text.matchAll(TAX_ID_CANDIDATE_REGEX)) {
    const raw = match[0];
    const compact = raw.replace(/[^A-Z0-9]/giu, "").toUpperCase();
    if (!TAX_ID_REGEX.test(compact)) continue;
    const normalized = normalizeCustomerNif(compact);
    values.set(normalized, { raw, normalized });
  }
  return Array.from(values.values());
}

function extractPhones(
  text: string,
  taxIdRaw: string | null,
): Array<{ raw: string; normalized: string }> {
  const withoutTaxId = taxIdRaw ? text.replace(taxIdRaw, " ") : text;
  const withoutPostalCodes = withoutTaxId.replace(POSTAL_CODE_REGEX, " ");
  const values = new Map<string, { raw: string; normalized: string }>();

  for (const match of withoutPostalCodes.matchAll(PHONE_CANDIDATE_REGEX)) {
    const raw = match[0];
    const digits = raw.replace(/\D/gu, "");
    const national =
      digits.startsWith("34") && digits.length === 11 ? digits.slice(2) : digits;
    if (!/^[6789]\d{8}$/u.test(national)) continue;
    const value = {
      raw,
      normalized: raw.trim().startsWith("+") ? `+34${national}` : national,
    };
    values.set(value.normalized, value);
  }

  return Array.from(values.values());
}

function extractPostalCode(text: string): string | null {
  return text.match(POSTAL_CODE_REGEX)?.[0] ?? null;
}

function stripKnownValues(value: string, known: KnownValues): string {
  let next = value;
  for (const removable of [
    known.email,
    known.taxIdRaw,
    known.phoneRaw,
    known.postalCode,
  ]) {
    if (removable) next = next.replace(removable, " ");
  }
  return clean(next);
}

function addressStart(
  value: string,
  requireLocator = true,
): { index: number; text: string } | null {
  const starts = [0];
  for (const match of value.matchAll(/\s+/gu)) {
    if (match.index !== undefined) starts.push(match.index + match[0].length);
  }

  for (const index of starts) {
    const candidate = clean(value.slice(index)).replace(/^carrèr\b/iu, "Carrer");
    if (!candidate) continue;
    if (/^paso\s+los\s+datos\b/iu.test(candidate)) continue;
    const firstSegment = candidate.split(/\r?\n|;/u)[0] ?? candidate;
    if (
      splitLegacyStreetAddress(firstSegment).streetType &&
      (!requireLocator || /(?:\d|\bs\/?n\b)/iu.test(firstSegment))
    ) {
      return { index, text: candidate };
    }
  }
  return null;
}

function addressTextFromLine(line: string, allowUntyped = false): string | null {
  const withoutLabel = removeLeadingCustomerFieldLabel(line);
  const withoutIntro = withoutLabel.replace(
    /^(?:(?:vive|viven|reside|residen|viu|viuen)\s+(?:en|a)|(?:facturar|enviar)\s+a)\s+/iu,
    "",
  );
  const truncated = truncateBeforeCustomerField(withoutIntro);
  const recognized = addressStart(truncated, !allowUntyped);
  const address = clean(recognized?.text ?? (allowUntyped ? truncated : ""));
  if (!address || (allowUntyped && !recognized && !/\d/u.test(address))) return null;

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
  hardLines: string[],
  fieldSegments: string[],
  known: KnownValues,
): {
  streetType: string | null;
  address: string | null;
  addressExtra: string | null;
  residenceType: string;
  city: string | null;
  postalCode: string | null;
} {
  const explicit = firstCustomerFieldValue(fieldSegments, "address")?.value ?? null;
  const candidates = explicit
    ? [
        { value: explicit, allowUntyped: true },
        ...hardLines.map((value) => ({ value, allowUntyped: false })),
      ]
    : hardLines.map((value) => ({ value, allowUntyped: false }));

  for (const candidate of candidates) {
    const stripped = stripKnownValues(candidate.value, known);
    const addressText = addressTextFromLine(stripped, candidate.allowUntyped);
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
      city: fields.city || null,
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

function trimCityCandidate(value: string): string {
  const truncated = truncateBeforeCustomerField(
    removeLeadingCustomerFieldLabel(value),
  );
  return clean(truncated.split(/[,;|]/u)[0] ?? truncated).replace(
    /^[,.;:\-\s]+|[,.;:\-\s]+$/gu,
    "",
  );
}

function cityCandidateFromPostalLine(
  hardLines: readonly string[],
  postalCode: string | null,
): string | null {
  if (!postalCode) return null;

  for (const line of hardLines) {
    const index = line.indexOf(postalCode);
    if (index < 0) continue;
    const after = trimCityCandidate(line.slice(index + postalCode.length));
    if (after) return after;

    const before = clean(line.slice(0, index));
    const candidateBefore = trimCityCandidate(before.split(",").at(-1) ?? before);
    if (!candidateBefore || addressStart(candidateBefore) || /\d/u.test(candidateBefore)) {
      continue;
    }
    return candidateBefore;
  }
  return null;
}

function resolveExtractedCity(
  value: string | null | undefined,
  postalCode: string | null,
): ExtractedCity {
  const candidate = trimCityCandidate(value ?? "");
  if (!candidate) return { value: null, resolution: null };
  const resolution = resolveSpanishMunicipality(candidate, postalCode);
  return {
    value: resolution?.value ?? candidate,
    resolution,
  };
}

function extractCity(
  hardLines: readonly string[],
  fieldSegments: readonly string[],
  postalCode: string | null,
  addressCity: string | null,
): ExtractedCity {
  const explicit = firstCustomerFieldValue(fieldSegments, "city")?.value;
  return resolveExtractedCity(
    explicit ?? cityCandidateFromPostalLine(hardLines, postalCode) ?? addressCity,
    postalCode,
  );
}

function lineLooksLikeOnlyKnownData(line: string): boolean {
  const comparable = normalizeComparable(line);
  return (
    !comparable ||
    Boolean(parseCustomerFieldSegment(line)) ||
    EMAIL_REGEX.test(line) ||
    POSTAL_CODE_REGEX.test(line) ||
    Boolean(addressStart(line)) ||
    FIELD_ONLY_REGEX.test(line) ||
    COMMON_DISCOURSE_ONLY_REGEX.test(line) ||
    NON_DATA_SENTENCE_REGEX.test(line)
  );
}

function cleanNameCandidate(line: string, known: KnownValues): string | null {
  if (POSTAL_CODE_REGEX.test(line) && !addressStart(line)) return null;

  let candidate = stripKnownValues(line, known);
  const parsed = parseCustomerFieldSegment(candidate);
  if (parsed?.field === "name") candidate = parsed.value;
  candidate = truncateBeforeCustomerField(candidate).replace(
    TRAILING_FIELD_WORD_REGEX,
    "",
  );
  const address = addressStart(candidate);
  if (address) candidate = candidate.slice(0, address.index);
  candidate = clean(candidate.replace(/^[,.;:\-\s]+|[,.;:\-\s]+$/gu, ""));

  if (!candidate || candidate.length < 2 || candidate.length > 140) return null;
  if (lineLooksLikeOnlyKnownData(candidate)) return null;
  if (COMMON_DISCOURSE_ONLY_REGEX.test(candidate)) return null;
  if (NON_DATA_SENTENCE_REGEX.test(candidate)) return null;
  return candidate;
}

function extractName(
  hardLines: readonly string[],
  fieldSegments: readonly string[],
  known: KnownValues,
): string | null {
  const explicitCandidates = Array.from(
    new Map(
      customerFieldValues(fieldSegments, "name")
        .map(({ value }) => cleanNameCandidate(value, known))
        .filter((value): value is string => Boolean(value))
        .map((value) => [normalizeComparable(value), value]),
    ).values(),
  );
  if (explicitCandidates.length > 1) return null;
  if (explicitCandidates[0]) return explicitCandidates[0];

  for (const line of hardLines) {
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
  const hardLines = customerTextHardLines(text);
  if (hardLines.length === 0) return null;
  const fieldSegments = customerTextFieldSegments(text);

  const emails = extractEmails(text);
  const taxIds = extractTaxIds(text);
  if (emails.length > 1 || taxIds.length > 1) return null;
  const email = emails[0] ?? null;
  const taxId = taxIds[0] ?? null;
  const phones = extractPhones(text, taxId?.raw ?? null);
  if (phones.length > 1) return null;
  const phone = phones[0] ?? null;
  const postalCode = extractPostalCode(text);
  const known: KnownValues = {
    email,
    taxIdRaw: taxId?.raw ?? null,
    phoneRaw: phone?.raw ?? null,
    postalCode,
  };
  const address = extractAddress(hardLines, fieldSegments, known);
  const city = extractCity(
    hardLines,
    fieldSegments,
    postalCode ?? address.postalCode,
    address.city,
  );
  const name = extractName(hardLines, fieldSegments, known);
  if (!name) return null;

  const customerType = classifyCustomer(name, taxId?.normalized ?? null);
  const personName =
    customerType === "person"
      ? splitPersonName(name)
      : { firstName: name, lastName: "" };
  const resolvedPostalCode = postalCode ?? address.postalCode;
  const rawPayload = {
    customer: {
      customerType,
      firstName: personName.firstName,
      lastName: personName.lastName,
      contactName: null,
      nif: taxId?.normalized ?? null,
      email,
      phone: phone?.normalized ?? null,
      streetType: address.streetType,
      residenceType: address.residenceType,
      address: address.address,
      addressExtra: address.addressExtra,
      city: city.value,
      postalCode: resolvedPostalCode,
      notes: null,
    },
    confidence: confidenceFor({
      firstName: personName.firstName,
      lastName: personName.lastName,
      nif: taxId?.normalized ?? null,
      email,
      phone: phone?.normalized ?? null,
      address: address.address,
      city: city.value,
      postalCode: resolvedPostalCode,
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
  if (
    fieldSegments.some(
      (segment) => parseCustomerFieldSegment(segment)?.approximateLabel,
    )
  ) {
    rawPayload.warnings.push(
      "Se han interpretado etiquetas con erratas; revisa los campos extraidos.",
    );
  }
  if (city.resolution?.status === "corrected") {
    rawPayload.warnings.push(
      "Se ha corregido la localidad mediante una coincidencia geografica unica.",
    );
  }
  if (city.resolution?.status === "conflict") {
    rawPayload.warnings.push(
      "La localidad y el codigo postal parecen corresponder a provincias distintas.",
    );
  }

  return normalizeCustomerTextExtractPayload(rawPayload);
}

export function isLocalCustomerParseSufficient(
  payload: CustomerTextExtractPayload | null,
): payload is CustomerTextExtractPayload {
  return Boolean(payload && payload.confidence >= 0.8);
}
