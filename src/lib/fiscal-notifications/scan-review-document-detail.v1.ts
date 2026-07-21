import {
  containsInternalFiscalNotificationToken,
  shouldExposeFiscalNotificationField,
} from "./document-fact-observation.v1";
import {
  AEAT_DOCUMENT_PROFILE_IDS_V1,
  resolveAeatDocumentProfileV1,
} from "./knowledge/aeat-document-knowledge.v1";
import { isAeatOfficialCatalogProfileIdV9 } from "./knowledge/official-catalog-expansion.v9";
import { isAeatP0DeepProfileIdV10 } from "./knowledge/p0-deep-contracts.v10";
import { explainAeatOfficialCatalogDocumentV9 } from "./official-catalog-explanation.v9";
import { explainAeatP0DeepDocumentV10 } from "./p0-deep-explanation.v10";
import { projectProfileDrivenExplanationInputV2 } from "./profile-driven-explanation-input.v2";
import {
  FISCAL_NOTIFICATION_DETAIL_GROUP_TITLES_V1,
  FISCAL_NOTIFICATION_DETAIL_PREVIEW_LIMIT_V1,
  FISCAL_NOTIFICATION_DETAIL_TABLE_LIMIT_V1,
  classifyFiscalNotificationDetailFactV1,
  fiscalNotificationDetailCategoryLabelV1,
  fiscalNotificationDetailNatureLabelV1,
  maskFiscalNotificationDetailValueV1,
  type FiscalNotificationDetailAmountRowV1,
  type FiscalNotificationDetailEconomyV1,
  type FiscalNotificationDetailFactGroupIdV1,
  type FiscalNotificationDetailFactGroupV1,
  type FiscalNotificationDetailFieldV1,
  type FiscalNotificationDetailHeaderMetaV1,
  type FiscalNotificationDetailOfficialSourceV1,
  type FiscalNotificationDocumentDetailViewModelV1,
} from "./structured-review-document-detail.v1";
import {
  explainFiscalNotificationDocumentV2,
  type FiscalNotificationDocumentExplanationV2,
  type FiscalNotificationExplanationSectionIdV2,
} from "./structured-document-explanation.v2";
import type {
  FiscalNotificationVerticalSliceReviewDocumentV1,
  FiscalNotificationVerticalSliceReviewFieldV1,
} from "./vertical-slice-review.v1";

const PROFILE_IDS = new Set<string>(AEAT_DOCUMENT_PROFILE_IDS_V1);
const GENERIC_TITLES = new Set(["datos fiscales", "documento fiscal"]);
const GROUP_ORDER: readonly FiscalNotificationDetailFactGroupIdV1[] =
  Object.freeze([
    "DATES",
    "REFERENCES",
    "PARTIES",
    "FACTS",
    "OBLIGATIONS",
    "OUTCOME",
    "APPEALS",
    "FAMILY_SPECIFIC",
  ]);
const DATE_PRIORITY = Object.freeze([
  "ACTION_DATE",
  "SEIZURE_DATE",
  "PAYMENT_DATE",
  "ISSUE_DATE",
  "SIGNING_DATE",
  "EFFECTIVE_NOTIFICATION_DATE",
  "ACCESS_DATE",
  "AVAILABILITY_DATE",
  "PAYMENT_FORM_DATE",
  "RELEASE_DATE",
] as const);
const NOTIFICATION_DATE_PRIORITY = Object.freeze([
  "EFFECTIVE_NOTIFICATION_DATE",
  "ACCESS_DATE",
  "AVAILABILITY_DATE",
  "REJECTION_DATE",
  "EXPIRATION_DATE",
  "ISSUE_DATE",
] as const);
const HEADER_LABELS = Object.freeze({
  issuingUnit: /\b(?:organo|unidad|dependencia|administracion)\b/u,
  act: /\b(?:acto principal|tipo de acto|procedimiento)\b/u,
  model: /\bmodelo\b/u,
  period: /\bperiodo\b/u,
  exercise: /\bejercicio\b/u,
});
const HUMAN_DISPLAY_VALUES: Readonly<Record<string, string>> = Object.freeze({
  DIRECT_DEBIT: "Domiciliación bancaria",
  NO_GUARANTEE: "Sin garantía",
  PRIMARY_DEBTOR: "Obligado al pago",
  TAXPAYER: "Obligado tributario",
  PAYMENT_FORM_ONLY: "Carta de pago adjunta",
  PAYMENT_FORM_FOR: "Carta de pago del documento",
  ANNEX_ONLY: "Anexo del documento",
  DELIVERY_ATTEMPT_FOR: "Intento de entrega del documento",
});

export function projectFiscalNotificationScanReviewDocumentDetailV1(input: {
  readonly document: FiscalNotificationVerticalSliceReviewDocumentV1;
  readonly allDocuments: readonly FiscalNotificationVerticalSliceReviewDocumentV1[];
}): FiscalNotificationDocumentDetailViewModelV1 {
  const { document, allDocuments } = input;
  const explanation = resolveFamilyExplanation(document);
  const profile = resolveAeatDocumentProfileV1(document.familyId);
  const fields = deduplicateReviewFields(
    document.fields.filter(isVisibleReviewField),
  );
  const primaryDate = selectPrimaryDate(document.familyId, fields);
  const authority = findField(
    fields,
    (field) =>
      field.canonicalType === "ISSUING_AUTHORITY" ||
      /\b(?:organismo|organo) emisor\b/u.test(normalizeText(field.label)),
  );
  const issuingUnit = findField(fields, (field) =>
    HEADER_LABELS.issuingUnit.test(normalizeText(field.label)),
  );
  const act = findHeaderField(fields, "act", HEADER_LABELS.act);
  const model = findHeaderField(fields, "model", HEADER_LABELS.model, "MODEL");
  const period = findHeaderField(
    fields,
    "period",
    HEADER_LABELS.period,
    "TAX_PERIOD",
  );
  const exercise = findHeaderField(
    fields,
    "exercise",
    HEADER_LABELS.exercise,
    "FISCAL_YEAR",
  );
  const installmentFields = new Set(
    fields
      .filter((field) => projectInstallment(field) !== null)
      .map((field) => field.fieldId),
  );
  const headerFieldIds = new Set(
    [primaryDate, authority, issuingUnit, act, model, period, exercise].flatMap(
      (field) => (field ? [field.fieldId] : []),
    ),
  );

  const grouped = new Map<
    FiscalNotificationDetailFactGroupIdV1,
    FiscalNotificationDetailFieldV1[]
  >();
  for (const field of fields) {
    if (
      field.semantic === "MONEY" ||
      headerFieldIds.has(field.fieldId) ||
      installmentFields.has(field.fieldId)
    ) {
      continue;
    }
    const groupId = classifyFiscalNotificationDetailFactV1(field);
    const group = grouped.get(groupId) ?? [];
    group.push(projectField(field));
    grouped.set(groupId, group);
  }
  const factGroups = GROUP_ORDER.flatMap(
    (id): FiscalNotificationDetailFactGroupV1[] => {
      const groupFields = grouped.get(id) ?? [];
      return groupFields.length === 0
        ? []
        : [
            Object.freeze({
              id,
              title: FISCAL_NOTIFICATION_DETAIL_GROUP_TITLES_V1[id],
              fields: Object.freeze(groupFields),
              previewLimit: FISCAL_NOTIFICATION_DETAIL_PREVIEW_LIMIT_V1,
            }),
          ];
    },
  );

  const economy = projectEconomy(fields);
  const officialSources = projectOfficialSources(explanation);
  const familyLabel =
    profile?.nameEs ?? cleanText(document.title) ?? "Documento fiscal";
  const storedTitle = cleanText(document.title);
  const literalTitle =
    storedTitle &&
    !GENERIC_TITLES.has(normalizeText(storedTitle)) &&
    normalizeText(storedTitle) !== normalizeText(familyLabel)
      ? storedTitle
      : null;
  const metadata = [
    act ? meta("act", "Acto", displayValue(act)) : null,
    model ? meta("model", "Modelo", displayValue(model)) : null,
    period ? meta("period", "Periodo", displayValue(period)) : null,
    exercise ? meta("exercise", "Ejercicio", displayValue(exercise)) : null,
    meta(
      "pages",
      document.pageFrom === document.pageTo ? "Página" : "Páginas",
      document.pageFrom === document.pageTo
        ? String(document.pageFrom)
        : `${document.pageFrom}–${document.pageTo}`,
    ),
  ].filter(
    (item): item is FiscalNotificationDetailHeaderMetaV1 => item !== null,
  );
  const statusField = document.fields.find(
    (field) =>
      field.semantic === "STATUS" &&
      !containsInternalFiscalNotificationToken(field.displayValue),
  );

  return Object.freeze({
    documentId: document.reviewDocumentId,
    header: Object.freeze({
      categoryLabel: fiscalNotificationDetailCategoryLabelV1(profile?.category),
      familyLabel,
      typeLabel: profile
        ? fiscalNotificationDetailNatureLabelV1(profile.documentNature)
        : (cleanText(document.subtitle) ?? "Documento fiscal"),
      title: familyLabel,
      literalTitle,
      description:
        explanationText(explanation, "WHAT_DOCUMENT_SAYS") ??
        cleanText(document.subtitle) ??
        "Documento fiscal reconocido a partir de sus datos impresos.",
      authority: formatAuthority(authority ? displayValue(authority) : null),
      issuingUnit: issuingUnit ? displayValue(issuingUnit) : null,
      primaryDateLabel: primaryDate?.label ?? "Fecha del documento",
      primaryDateValue: primaryDate
        ? displayValue(primaryDate)
        : "Fecha pendiente",
      primaryDateProvenance: primaryDate
        ? projectField(primaryDate).provenance
        : null,
      reviewStatus: "PENDING" as const,
      reviewLabel: "Pendiente de revisar antes de guardar",
      originalLabel: "Original no guardado",
      metadata: Object.freeze(metadata),
    }),
    factGroups: Object.freeze(factGroups),
    economy,
    explanation: projectExplanation(explanation, statusField),
    connections:
      officialSources.length === 0
        ? null
        : Object.freeze({
            relations: Object.freeze([]),
            timeline: Object.freeze([]),
            sources: Object.freeze(officialSources),
          }),
    siblingActs: Object.freeze(
      allDocuments.map((candidate) =>
        Object.freeze({
          documentId: candidate.reviewDocumentId,
          title: cleanText(candidate.title) ?? "Acto del documento",
          current: candidate.reviewDocumentId === document.reviewDocumentId,
        }),
      ),
    ),
    actions: Object.freeze({
      canDelete: false,
      driveFileId: null,
    }),
  });
}

function projectExplanation(
  explanation: FiscalNotificationDocumentExplanationV2 | null,
  statusField: FiscalNotificationVerticalSliceReviewFieldV1 | undefined,
): FiscalNotificationDocumentDetailViewModelV1["explanation"] {
  const explicitResult = explanationText(explanation, "RESULT", [
    "EXPLICIT_IN_DOCUMENT",
    "CALCULATED_FROM_PRINTED_VALUES",
  ]);
  const whatItIs = explanationText(explanation, "WHAT_DOCUMENT_SAYS");
  const whyReceived = explanationText(explanation, "WHY_RECEIVED");
  const review = explanationText(explanation, "NEXT_STEP");
  const deadline = explanationText(explanation, "DEADLINE");
  const calculatedFacts =
    explanation?.sections
      .find((section) => section.id === "KEY_DATA")
      ?.assertions.flatMap((assertion, index) =>
        assertion.level === "CALCULATED_FROM_PRINTED_VALUES" &&
        cleanText(assertion.text)
          ? [
              Object.freeze({
                key: `calculated:${index}`,
                label: "Cálculo orientativo",
                value: assertion.text,
              }),
            ]
          : [],
      ) ?? [];

  return Object.freeze({
    documentSays:
      cleanText(statusField?.displayValue ?? "") ??
      explicitResult ??
      "Revisa los datos impresos que aparecen en esta ficha.",
    officialMeaning:
      [whatItIs, whyReceived]
        .filter((value): value is string => value !== null)
        .join(" ") ||
      "La explicación oficial de esta familia documental está pendiente de revisión.",
    reviewTitle: "Revisa qué te pide o comunica el documento",
    reviewDetail:
      review ??
      "Comprueba los datos impresos antes de decidir cualquier actuación.",
    deadlineTitle: explanation?.deadlineTriggerAvailable
      ? "Localiza la fecha que inicia el plazo"
      : "Comprueba si el documento fija algún plazo",
    deadlineDetail:
      deadline ??
      "No se ha identificado un vencimiento explícito en los datos extraídos.",
    deadlineBasis: explanation?.deadlineTriggerAvailable
      ? ("PRINTED" as const)
      : ("NOT_IDENTIFIED" as const),
    calculatedFacts: Object.freeze(calculatedFacts),
  });
}

function projectEconomy(
  fields: readonly FiscalNotificationVerticalSliceReviewFieldV1[],
): FiscalNotificationDetailEconomyV1 | null {
  const rows: FiscalNotificationDetailAmountRowV1[] = fields
    .filter((field) => field.semantic === "MONEY")
    .map((field) =>
      Object.freeze({
        key: field.fieldId,
        label: field.label,
        value: displayValue(field),
        currencyLabel: field.currency === "EUR" ? "EUR" : "No indicada",
        sourceReference: null,
        pageNumbers: Object.freeze([...field.sourcePageNumbers]),
      }),
    );
  const installments = fields.flatMap((field) => {
    const installment = projectInstallment(field);
    return installment ? [installment] : [];
  });
  if (rows.length === 0 && installments.length === 0) return null;
  const summary = [...rows]
    .sort(
      (left, right) => amountPriority(left.label) - amountPriority(right.label),
    )
    .slice(0, 4);
  return Object.freeze({
    summary: Object.freeze(summary),
    rows: Object.freeze(rows),
    installments: Object.freeze(installments),
    showSourceReference: false,
    previewLimit: FISCAL_NOTIFICATION_DETAIL_TABLE_LIMIT_V1,
  });
}

function projectInstallment(
  field: FiscalNotificationVerticalSliceReviewFieldV1,
): FiscalNotificationDetailEconomyV1["installments"][number] | null {
  if (!/^real-corpus-v[3-7]:installment:\d+$/u.test(field.fieldId)) return null;
  const sequence = /^Cuota ([1-9]\d*)$/u.exec(field.label)?.[1];
  const match =
    /^Vence ((?:0[1-9]|[12]\d|3[01])\/(?:0[1-9]|1[0-2])\/(?:19|20)\d{2}) · (?:principal|base) (\d{1,3}(?:\.\d{3})*,\d{2})\s€ · interés (\d{1,3}(?:\.\d{3})*,\d{2})\s€ · total (\d{1,3}(?:\.\d{3})*,\d{2})\s€$/u.exec(
      field.displayValue,
    );
  if (!sequence || !match) return null;
  return Object.freeze({
    key: field.fieldId,
    label: `Cuota ${sequence}`,
    dueDate: match[1]!,
    dueDatePageNumbers: Object.freeze([...field.sourcePageNumbers]),
    total: `${match[4]!} €`,
    totalPageNumbers: Object.freeze([...field.sourcePageNumbers]),
    components: Object.freeze([
      Object.freeze({
        label: "Principal",
        value: `${match[2]!} €`,
        pageNumbers: Object.freeze([...field.sourcePageNumbers]),
      }),
      Object.freeze({
        label: "Intereses",
        value: `${match[3]!} €`,
        pageNumbers: Object.freeze([...field.sourcePageNumbers]),
      }),
    ]),
    pageNumbers: Object.freeze([...field.sourcePageNumbers]),
  });
}

function projectField(
  field: FiscalNotificationVerticalSliceReviewFieldV1,
): FiscalNotificationDetailFieldV1 {
  const value = maskFiscalNotificationDetailValueV1(
    field.label,
    displayValue(field),
  );
  return Object.freeze({
    key: field.fieldId,
    label: field.label,
    value,
    provenance: Object.freeze({
      key: `provenance:${field.fieldId}`,
      fieldLabel: field.label,
      value,
      pageNumber: field.sourcePageNumbers[0]!,
      pageNumbers: Object.freeze([...field.sourcePageNumbers]),
      basis: "PRINTED" as const,
      sourceReference: null,
    }),
  });
}

function selectPrimaryDate(
  familyId: string,
  fields: readonly FiscalNotificationVerticalSliceReviewFieldV1[],
): FiscalNotificationVerticalSliceReviewFieldV1 | null {
  const dates = fields.filter(
    (field) =>
      field.semantic === "DATE" &&
      /^\d{4}-\d{2}-\d{2}$/u.test(field.normalizedValue ?? ""),
  );
  const priority = familyId.startsWith("notification.")
    ? NOTIFICATION_DATE_PRIORITY
    : DATE_PRIORITY;
  for (const canonicalType of priority) {
    const match = dates.find((field) => field.canonicalType === canonicalType);
    if (match) return match;
  }
  return dates[0] ?? null;
}

function findHeaderField(
  fields: readonly FiscalNotificationVerticalSliceReviewFieldV1[],
  _key: string,
  labelPattern: RegExp,
  canonicalType?: string,
): FiscalNotificationVerticalSliceReviewFieldV1 | null {
  return findField(
    fields,
    (field) =>
      (canonicalType !== undefined && field.canonicalType === canonicalType) ||
      labelPattern.test(normalizeText(field.label)),
  );
}

function findField(
  fields: readonly FiscalNotificationVerticalSliceReviewFieldV1[],
  predicate: (field: FiscalNotificationVerticalSliceReviewFieldV1) => boolean,
): FiscalNotificationVerticalSliceReviewFieldV1 | null {
  return fields.find(predicate) ?? null;
}

function deduplicateReviewFields(
  fields: readonly FiscalNotificationVerticalSliceReviewFieldV1[],
): readonly FiscalNotificationVerticalSliceReviewFieldV1[] {
  const identities = new Set<string>();
  return fields.filter((field) => {
    const identity = JSON.stringify([
      field.semantic,
      field.canonicalType,
      normalizeText(field.label),
      field.normalizedValue ?? field.displayValue,
      field.sourcePageNumbers,
    ]);
    if (identities.has(identity)) return false;
    identities.add(identity);
    return true;
  });
}

function isVisibleReviewField(
  field: FiscalNotificationVerticalSliceReviewFieldV1,
): boolean {
  return (
    field.sourcePageNumbers.length > 0 &&
    field.label.trim().length > 0 &&
    field.displayValue.trim().length > 0 &&
    shouldExposeFiscalNotificationField(field) &&
    !containsInternalFiscalNotificationToken(field.label) &&
    !containsInternalFiscalNotificationToken(field.displayValue) &&
    !containsInternalFiscalNotificationToken(field.normalizedValue)
  );
}

function displayValue(
  field: FiscalNotificationVerticalSliceReviewFieldV1,
): string {
  if (
    field.semantic === "DATE" &&
    field.normalizedValue &&
    /^\d{4}-\d{2}-\d{2}$/u.test(field.normalizedValue)
  ) {
    const [year, month, day] = field.normalizedValue.split("-");
    return `${day}/${month}/${year}`;
  }
  return HUMAN_DISPLAY_VALUES[field.displayValue] ?? field.displayValue;
}

function resolveFamilyExplanation(
  document: FiscalNotificationVerticalSliceReviewDocumentV1,
): FiscalNotificationDocumentExplanationV2 | null {
  if (PROFILE_IDS.has(document.familyId)) {
    const input = projectProfileDrivenExplanationInputV2(document);
    return input ? explainFiscalNotificationDocumentV2(input) : null;
  }
  if (isAeatP0DeepProfileIdV10(document.familyId)) {
    return explainAeatP0DeepDocumentV10(document.familyId);
  }
  return isAeatOfficialCatalogProfileIdV9(document.familyId)
    ? explainAeatOfficialCatalogDocumentV9(document.familyId)
    : null;
}

function explanationText(
  explanation: FiscalNotificationDocumentExplanationV2 | null,
  sectionId: FiscalNotificationExplanationSectionIdV2,
  levels?: readonly FiscalNotificationDocumentExplanationV2["sections"][number]["assertions"][number]["level"][],
): string | null {
  const text = explanation?.sections
    .find((section) => section.id === sectionId)
    ?.assertions.filter(
      (assertion) => !levels || levels.includes(assertion.level),
    )
    .map((assertion) => cleanText(assertion.text))
    .filter((value): value is string => value !== null)
    .join(" ");
  return text && text.length > 0 ? text : null;
}

function projectOfficialSources(
  explanation: FiscalNotificationDocumentExplanationV2 | null,
): readonly FiscalNotificationDetailOfficialSourceV1[] {
  return Object.freeze(
    explanation?.officialSources.flatMap((source) => {
      if (
        (source.authority !== "AEAT" && source.authority !== "BOE") ||
        !source.canonicalUrl ||
        !isOfficialHttpsUrl(source.canonicalUrl)
      ) {
        return [];
      }
      return [
        Object.freeze({
          key: source.id,
          authority: source.authority,
          title: source.title,
          href: source.canonicalUrl,
        }),
      ];
    }) ?? [],
  );
}

function isOfficialHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "www.boe.es" ||
        url.hostname === "boe.es" ||
        url.hostname === "sede.agenciatributaria.gob.es" ||
        url.hostname === "agenciatributaria.gob.es" ||
        url.hostname === "www.agenciatributaria.es" ||
        url.hostname === "agenciatributaria.es" ||
        url.hostname.endsWith(".gob.es"))
    );
  } catch {
    return false;
  }
}

function formatAuthority(value: string | null): string {
  if (!value) return "Organismo no identificado";
  return normalizeText(value) === "aeat"
    ? "Agencia Estatal de Administración Tributaria"
    : value;
}

function amountPriority(label: string): number {
  const normalized = normalizeText(label);
  if (/total|importe a ingresar|importe a devolver/u.test(normalized)) return 0;
  if (/pendiente|principal|cuota/u.test(normalized)) return 1;
  if (/recargo|interes|costas/u.test(normalized)) return 2;
  return 3;
}

function meta(
  key: string,
  label: string,
  value: string,
): FiscalNotificationDetailHeaderMetaV1 {
  return Object.freeze({ key, label, value });
}

function cleanText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 && !containsInternalFiscalNotificationToken(trimmed)
    ? trimmed
    : null;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("es-ES")
    .trim();
}
