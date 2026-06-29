import { normalizeIvaSettings } from "./iva";
import type { BusinessProfile, Document, IssuerSnapshot } from "./types";

type AutofillField =
  | "name"
  | "nif"
  | "address"
  | "city"
  | "postalCode"
  | "phone"
  | "email"
  | "iban";

export type BusinessProfileAutofillCandidate = Partial<
  Pick<BusinessProfile, AutofillField>
>;

const AUTOFILL_FIELDS: AutofillField[] = [
  "name",
  "nif",
  "address",
  "city",
  "postalCode",
  "phone",
  "email",
  "iban",
];

const AUTOFILL_FIELD_LABELS: Record<AutofillField, string> = {
  name: "Nombre fiscal",
  nif: "NIF/CIF",
  address: "Dirección",
  city: "Ciudad",
  postalCode: "Código postal",
  phone: "Teléfono",
  email: "Email",
  iban: "IBAN",
};

export interface BusinessProfileAutofillFieldSuggestion {
  field: AutofillField;
  label: string;
  currentValue: string;
  detectedValue: string;
  willFillEmptyField: boolean;
  hasDifferentCurrentValue: boolean;
}

export interface BusinessProfileAutofillSuggestion {
  fields: BusinessProfileAutofillFieldSuggestion[];
  emptyFieldCount: number;
  differentCurrentValueCount: number;
  currentIvaRates: number[];
  detectedIvaRates: number[];
  missingIvaRates: number[];
}

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

function snapshotTimestamp(snapshot: IssuerSnapshot | undefined, doc: Document) {
  return snapshot?.capturedAt ?? doc.issuedAt ?? doc.updatedAt ?? doc.date;
}

export function fillMissingBusinessProfileFields(
  profile: BusinessProfile,
  candidate: BusinessProfileAutofillCandidate,
): BusinessProfile {
  const next: BusinessProfile = { ...profile };

  for (const field of AUTOFILL_FIELDS) {
    const current = clean(next[field]);
    const incoming = clean(candidate[field]);
    if (!current && incoming) {
      next[field] = field === "nif" ? incoming.toUpperCase() : incoming;
    }
  }

  return next;
}

export function completeBusinessProfileFromIssuerSnapshots(
  profile: BusinessProfile,
  documents: Document[],
): BusinessProfile {
  const issuedSnapshots = documents
    .filter((doc) => doc.issuer)
    .sort((a, b) =>
      snapshotTimestamp(b.issuer, b).localeCompare(snapshotTimestamp(a.issuer, a)),
    );

  return issuedSnapshots.reduce(
    (current, doc) =>
      doc.issuer
        ? fillMissingBusinessProfileFields(current, doc.issuer)
        : current,
    profile,
  );
}

export function completeBusinessProfileIvaFromDocuments(
  profile: BusinessProfile,
  documents: Document[],
  options: { preferMostUsedDefault?: boolean } = {},
): BusinessProfile {
  const rates = new Set(profile.iva.rates);
  const usage = new Map<number, number>();

  for (const doc of documents) {
    for (const item of doc.items) {
      if (!Number.isFinite(item.ivaPercent)) continue;
      const rate = Math.round(item.ivaPercent * 100) / 100;
      rates.add(rate);
      usage.set(rate, (usage.get(rate) ?? 0) + 1);
    }
  }

  if (usage.size === 0) return profile;

  const mostUsedRate = [...usage.entries()].sort((a, b) => {
    const countDiff = b[1] - a[1];
    if (countDiff !== 0) return countDiff;
    return b[0] - a[0];
  })[0]?.[0];

  return {
    ...profile,
    iva: normalizeIvaSettings({
      rates: [...rates],
      defaultRate:
        options.preferMostUsedDefault && mostUsedRate !== undefined
          ? mostUsedRate
          : profile.iva.defaultRate,
    }),
  };
}

export function buildBusinessProfileAutofillSuggestion(
  current: BusinessProfile,
  detected: BusinessProfile,
): BusinessProfileAutofillSuggestion {
  const fields = AUTOFILL_FIELDS.flatMap((field) => {
    const currentValue = clean(current[field]);
    const detectedValue = clean(detected[field]);
    if (!detectedValue) return [];

    const normalizedCurrent =
      field === "nif" ? currentValue.toUpperCase() : currentValue;
    const normalizedDetected =
      field === "nif" ? detectedValue.toUpperCase() : detectedValue;

    if (normalizedCurrent === normalizedDetected) return [];

    return [
      {
        field,
        label: AUTOFILL_FIELD_LABELS[field],
        currentValue,
        detectedValue: normalizedDetected,
        willFillEmptyField: !currentValue,
        hasDifferentCurrentValue: Boolean(currentValue),
      },
    ];
  });

  const currentIvaRates = [...current.iva.rates].sort((a, b) => a - b);
  const detectedIvaRates = [...detected.iva.rates].sort((a, b) => a - b);
  const missingIvaRates = detectedIvaRates.filter(
    (rate) => !currentIvaRates.includes(rate),
  );

  return {
    fields,
    emptyFieldCount: fields.filter((field) => field.willFillEmptyField).length,
    differentCurrentValueCount: fields.filter(
      (field) => field.hasDifferentCurrentValue,
    ).length,
    currentIvaRates,
    detectedIvaRates,
    missingIvaRates,
  };
}

export function hasBusinessProfileAutofillSuggestion(
  suggestion: BusinessProfileAutofillSuggestion | null | undefined,
): boolean {
  return Boolean(
    suggestion &&
      (suggestion.fields.length > 0 || suggestion.missingIvaRates.length > 0),
  );
}

export function applyBusinessProfileAutofillSuggestion(
  profile: BusinessProfile,
  suggestion: BusinessProfileAutofillSuggestion,
): BusinessProfile {
  const candidate = Object.fromEntries(
    suggestion.fields
      .filter((field) => field.willFillEmptyField)
      .map((field) => [field.field, field.detectedValue]),
  ) as BusinessProfileAutofillCandidate;
  const withFields = fillMissingBusinessProfileFields(profile, candidate);

  if (suggestion.missingIvaRates.length === 0) return withFields;

  return {
    ...withFields,
    iva: normalizeIvaSettings({
      rates: [...withFields.iva.rates, ...suggestion.missingIvaRates],
      defaultRate: withFields.iva.defaultRate,
    }),
  };
}
