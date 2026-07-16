import {
  assertBoundedDocumentInput,
  assertNotAborted,
  type BoundedDocumentInput,
} from "../input-contract";

export const REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V2 = 2 as const;
export const REAL_CORPUS_EXTRACTOR_VERSION_V2 =
  "aeat-real-corpus-extractor.2026-07-16.v2" as const;

export const REAL_CORPUS_FAMILY_IDS_V2 = Object.freeze([
  "assessment.allegations_and_proposal",
  "information.tax_data_report",
  "irpf.spouse_refund_suspension",
  "refund.payment_communication",
  "notification.publication_or_appearance",
  "compliance.informal_missing_return_notice",
] as const);
export type RealCorpusFamilyIdV2 = (typeof REAL_CORPUS_FAMILY_IDS_V2)[number];

export type RealCorpusLayoutVariantV2 =
  | "ES_2008_VERIFICATION_DATA_WITH_CALCULATION_ANNEX_AND_ALLEGATION_FORM"
  | "ES_SINGLE_TAXPAYER_2008_2009"
  | "CA_SINGLE_TAXPAYER_2010"
  | "ES_SINGLE_TAXPAYER_2011_2012"
  | "ES_JOINT_TWO_PARTICIPANTS_2013_2014"
  | "ES_ONE_PAGE"
  | "CA_ONE_PAGE"
  | "FULL_OFFSET_NO_NET"
  | "PARTIAL_OFFSET_NET_TRANSFER"
  | "EX_OFFICIO_FULL_OFFSET"
  | "PUBLICATION_DILIGENCE_NO_EFFECTIVE_DATE"
  | "PUBLICATION_CERTIFICATE_EFFECTIVE_DATE"
  | "APPEARANCE_CITATION_PREPUBLICATION"
  | "CARTA_AVISO_MISSING_MODELS";

export type RealCorpusSegmentTypeV2 =
  | "PRIMARY_ACT"
  | "CALCULATION_ANNEX"
  | "ALLEGATIONS_FORM"
  | "BLANK_PAGES"
  | "CAMPAIGN_INFORMATION"
  | "TAX_DATA_TABLES"
  | "PARTICIPANT_BOUNDARIES";

export interface RealCorpusSegmentV2 {
  readonly type: RealCorpusSegmentTypeV2;
  readonly pageNumbers: readonly number[];
}

export interface RealCorpusEvidenceV2 {
  readonly pageNumbers: readonly number[];
  readonly assertionType:
    "EXPLICIT_IN_DOCUMENT" | "CALCULATED_FROM_PRINTED_VALUES";
}

interface RealCorpusFieldBaseV2 {
  readonly fieldCode: string;
  readonly label: string;
  readonly evidence: RealCorpusEvidenceV2;
}

export type RealCorpusFieldV2 =
  | Readonly<
      RealCorpusFieldBaseV2 & {
        readonly kind: "REFERENCE" | "TEXT" | "DATE";
        readonly value: string;
      }
    >
  | Readonly<
      RealCorpusFieldBaseV2 & {
        readonly kind: "MONEY";
        /** Signed amounts are required for declared/proposed tax results. */
        readonly amountCents: number;
        readonly currency: "EUR";
      }
    >
  | Readonly<
      RealCorpusFieldBaseV2 & {
        readonly kind: "INTEGER";
        readonly value: number;
      }
    >
  | Readonly<
      RealCorpusFieldBaseV2 & {
        readonly kind: "BOOLEAN";
        readonly value: boolean;
      }
    >;

export interface RealCorpusSectionRowV2 {
  readonly sectionKind: string;
  readonly rowOrdinal: number;
  readonly participantRole: "ACCOUNT_HOLDER" | "SPOUSE";
  readonly model: string | null;
  readonly taxPeriod: string | null;
  readonly amountCents: number | null;
  readonly withholdingCents: number | null;
  readonly attributes: Readonly<Record<string, string | number | boolean>>;
  readonly pageNumber: number;
}

export interface RealCorpusMissingReturnV2 {
  readonly model: string;
  readonly fiscalYear: string;
  readonly taxPeriod: string;
  readonly pageNumber: number;
}

export interface RealCorpusExtractorOutcomeV2 {
  readonly schemaVersion: typeof REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V2;
  readonly extractorVersion: typeof REAL_CORPUS_EXTRACTOR_VERSION_V2;
  readonly status: "REVIEW_REQUIRED" | "UNKNOWN";
  readonly familyId: RealCorpusFamilyIdV2 | null;
  readonly subtype: string | null;
  readonly canonicalTitle: string | null;
  readonly layoutVariant: RealCorpusLayoutVariantV2 | null;
  readonly physicalPageCount: number;
  readonly contentPageCount: number;
  readonly fields: readonly RealCorpusFieldV2[];
  readonly sectionRows: readonly RealCorpusSectionRowV2[];
  readonly missingReturns: readonly RealCorpusMissingReturnV2[];
  readonly segments: readonly RealCorpusSegmentV2[];
  readonly explanation: string | null;
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED";
  readonly confirmsDebt: false;
  readonly confirmsPayment: false;
  readonly confirmsDeadline: false;
}

interface IndexedLineV2 {
  readonly pageNumber: number;
  readonly raw: string;
  readonly normalized: string;
}

interface DocumentIndexV2 {
  readonly lines: readonly IndexedLineV2[];
  readonly normalizedText: string;
  readonly headerLines: readonly IndexedLineV2[];
  readonly blankPageNumbers: readonly number[];
}

const CONTROL = /[\u0000-\u001f\u007f-\u009f]/u;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;
const SPANISH_DATE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/u;
const SAFE_REFERENCE = /^[A-Z0-9][A-Z0-9./:_-]{2,199}$/u;
const PRIVATE_REFERENCE =
  /^(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]|ES\d{22}|[6789]\d{8})$/u;
const TAX_SECTION_KINDS_V2 = new Set([
  "EMPLOYMENT_INCOME",
  "ECONOMIC_ACTIVITY_INCOME",
  "BANK_INTEREST",
  "ECONOMIC_ACTIVITY_CENSUS",
  "ATTRIBUTED_ECONOMIC_ACTIVITY_INCOME",
  "ATTRIBUTED_WITHHOLDINGS",
  "DONATIONS",
  "MORTGAGE_LOAN",
  "INSTALLMENT_PAYMENTS",
  "SOCIAL_SECURITY_CONTRIBUTIONS",
  "CADASTRAL_PROPERTY",
  "ENTITY_PARTICIPATION",
  "MATERNITY_DEDUCTION_CONTRIBUTIONS",
  "MATERNITY_DEDUCTION",
]);

function normalize(value: string): string {
  try {
    return value
      .normalize("NFKD")
      .replace(/\p{M}+/gu, "")
      .replace(/[’‘]/gu, "'")
      .replace(/\s+/gu, " ")
      .trim()
      .toLocaleUpperCase("es-ES");
  } catch {
    return "";
  }
}

function buildIndex(document: BoundedDocumentInput): DocumentIndexV2 {
  const lines: IndexedLineV2[] = [];
  const headerLines: IndexedLineV2[] = [];
  const blankPageNumbers: number[] = [];
  for (const page of document.pages) {
    const pageLines = page.text.split(/\r?\n/gu);
    if (page.isBlank || page.text.trim().length === 0) {
      blankPageNumbers.push(page.pageNumber);
      continue;
    }
    for (let index = 0; index < pageLines.length; index += 1) {
      const raw = pageLines[index]!.trim();
      if (!raw || raw.length > 2_000 || CONTROL.test(raw)) continue;
      const line = Object.freeze({
        pageNumber: page.pageNumber,
        raw,
        normalized: normalize(raw),
      });
      lines.push(line);
      if (index < 40) headerLines.push(line);
    }
  }
  return Object.freeze({
    lines: Object.freeze(lines),
    normalizedText: lines.map((line) => line.normalized).join("\n"),
    headerLines: Object.freeze(headerLines),
    blankPageNumbers: Object.freeze(blankPageNumbers),
  });
}

function contains(index: DocumentIndexV2, value: string): boolean {
  return index.normalizedText.includes(normalize(value));
}

function hasHeaderPrefix(index: DocumentIndexV2, value: string): boolean {
  const expected = normalize(value);
  return index.headerLines.some(
    (line) =>
      line.normalized === expected ||
      line.normalized.startsWith(`${expected} `),
  );
}

function lineValue(
  index: DocumentIndexV2,
  labels: readonly string[],
): Readonly<{ value: string; pageNumber: number }> | null {
  const normalizedLabels = labels.map(normalize);
  for (let lineIndex = 0; lineIndex < index.lines.length; lineIndex += 1) {
    const line = index.lines[lineIndex]!;
    for (const label of normalizedLabels) {
      if (
        line.normalized !== label &&
        !line.normalized.startsWith(`${label}:`) &&
        !line.normalized.startsWith(`${label} `)
      ) {
        continue;
      }
      const separator = line.raw.indexOf(":");
      const inline = separator >= 0 ? line.raw.slice(separator + 1).trim() : "";
      if (inline)
        return Object.freeze({ value: inline, pageNumber: line.pageNumber });
      const next = index.lines[lineIndex + 1];
      if (next?.pageNumber === line.pageNumber) {
        return Object.freeze({ value: next.raw, pageNumber: next.pageNumber });
      }
    }
  }
  return null;
}

function allLineValues(
  index: DocumentIndexV2,
  labels: readonly string[],
): readonly Readonly<{ value: string; pageNumber: number }>[] {
  const normalizedLabels = labels.map(normalize);
  const values: Readonly<{ value: string; pageNumber: number }>[] = [];
  for (const line of index.lines) {
    const label = normalizedLabels.find(
      (candidate) =>
        line.normalized.startsWith(`${candidate}:`) ||
        line.normalized.startsWith(`${candidate} `),
    );
    if (!label) continue;
    const separator = line.raw.indexOf(":");
    if (separator < 0) continue;
    const value = line.raw.slice(separator + 1).trim();
    if (value)
      values.push(Object.freeze({ value, pageNumber: line.pageNumber }));
  }
  return Object.freeze(values);
}

function validDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    year >= 1900 &&
    year <= 2200
    ? `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    : null;
}

function parseDate(raw: string): string | null {
  const value = raw.trim().replace(/[.;,]+$/u, "");
  const iso = ISO_DATE.exec(value);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const spanish = SPANISH_DATE.exec(value);
  return spanish
    ? validDate(Number(spanish[3]), Number(spanish[2]), Number(spanish[1]))
    : null;
}

function parseMoney(raw: string): number | null {
  const match =
    /(-)?\s*((?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?)\s*(?:EUR|€)?/iu.exec(
      raw,
    );
  if (!match) return null;
  const normalized = match[2].replace(/\./gu, "").replace(",", ".");
  const value = Math.round(Number(normalized) * 100) * (match[1] ? -1 : 1);
  return Number.isSafeInteger(value) ? value : null;
}

function safeReference(raw: string): string | null {
  const normalized = raw.trim().toUpperCase().replace(/\s+/gu, "");
  return SAFE_REFERENCE.test(normalized) &&
    /\d/u.test(normalized) &&
    !PRIVATE_REFERENCE.test(normalized)
    ? normalized
    : null;
}

function safeClosedText(fieldCode: string, raw: string): string | null {
  const value = normalize(raw).replace(/\s+/gu, "_");
  const closed: Readonly<Record<string, ReadonlySet<string>>> = Object.freeze({
    TAX_CONCEPT: new Set(["IVA", "IRPF", "IMPUESTO_SOBRE_SOCIEDADES"]),
    ALLEGATIONS_UNIT: new Set(["BUSINESS_DAYS"]),
    ALLEGATIONS_TRIGGER: new Set(["RECEIPT_DATE"]),
    OFFSET_TYPE: new Set(["REQUESTED", "EX_OFFICIO"]),
    UNDERLYING_ACT_TYPE: new Set([
      "EXECUTIVE_LIQUIDATION",
      "BANK_ACCOUNT_SEIZURE",
      "DEFERRAL_OR_INSTALLMENT_RESOLUTION",
      "SANCTION_REDUCTION_CLAWBACK",
    ]),
  });
  if (fieldCode === "DRAFT_UNAVAILABLE_REASON") {
    return value.includes("ACTIVIDAD") || value.includes("ACTIVITAT")
      ? "ECONOMIC_ACTIVITY_DATA"
      : "OTHER_PRINTED_REASON";
  }
  return closed[fieldCode]?.has(value) ? value : null;
}

function evidence(
  pageNumber: number,
  calculated = false,
): RealCorpusEvidenceV2 {
  return Object.freeze({
    pageNumbers: Object.freeze([pageNumber]),
    assertionType: calculated
      ? "CALCULATED_FROM_PRINTED_VALUES"
      : "EXPLICIT_IN_DOCUMENT",
  });
}

function field(
  fieldCode: string,
  label: string,
  source: Readonly<{ value: string; pageNumber: number }> | null,
  kind: "REFERENCE" | "TEXT" | "DATE",
): RealCorpusFieldV2 | null {
  if (!source) return null;
  const value =
    kind === "REFERENCE"
      ? safeReference(source.value)
      : kind === "DATE"
        ? parseDate(source.value)
        : safeClosedText(fieldCode, source.value);
  return value
    ? Object.freeze({
        fieldCode,
        label,
        kind,
        value,
        evidence: evidence(source.pageNumber),
      })
    : null;
}

function moneyField(
  fieldCode: string,
  label: string,
  source: Readonly<{ value: string; pageNumber: number }> | null,
): RealCorpusFieldV2 | null {
  if (!source) return null;
  const amountCents = parseMoney(source.value);
  return amountCents === null
    ? null
    : Object.freeze({
        fieldCode,
        label,
        kind: "MONEY" as const,
        amountCents,
        currency: "EUR" as const,
        evidence: evidence(source.pageNumber),
      });
}

function integerField(
  fieldCode: string,
  label: string,
  value: number,
  pageNumber: number,
): RealCorpusFieldV2 {
  return Object.freeze({
    fieldCode,
    label,
    kind: "INTEGER" as const,
    value,
    evidence: evidence(pageNumber),
  });
}

function booleanField(
  fieldCode: string,
  label: string,
  value: boolean,
  pageNumber: number,
): RealCorpusFieldV2 {
  return Object.freeze({
    fieldCode,
    label,
    kind: "BOOLEAN" as const,
    value,
    evidence: evidence(pageNumber),
  });
}

function compactFields(
  fields: readonly (RealCorpusFieldV2 | null)[],
): readonly RealCorpusFieldV2[] {
  return Object.freeze(
    fields.filter((item): item is RealCorpusFieldV2 => item !== null),
  );
}

function unknown(
  document: BoundedDocumentInput,
  index: DocumentIndexV2,
): RealCorpusExtractorOutcomeV2 {
  return Object.freeze({
    schemaVersion: REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V2,
    extractorVersion: REAL_CORPUS_EXTRACTOR_VERSION_V2,
    status: "UNKNOWN" as const,
    familyId: null,
    subtype: null,
    canonicalTitle: null,
    layoutVariant: null,
    physicalPageCount: document.pages.length,
    contentPageCount: document.pages.length - index.blankPageNumbers.length,
    fields: Object.freeze([]),
    sectionRows: Object.freeze([]),
    missingReturns: Object.freeze([]),
    segments: Object.freeze([]),
    explanation: null,
    retainedSourceContent: "NONE" as const,
    requiresHumanReview: true as const,
    materializationPolicy: "PROHIBITED" as const,
    confirmsDebt: false as const,
    confirmsPayment: false as const,
    confirmsDeadline: false as const,
  });
}

function reviewed(
  document: BoundedDocumentInput,
  index: DocumentIndexV2,
  input: Omit<
    RealCorpusExtractorOutcomeV2,
    | "schemaVersion"
    | "extractorVersion"
    | "status"
    | "physicalPageCount"
    | "contentPageCount"
    | "retainedSourceContent"
    | "requiresHumanReview"
    | "materializationPolicy"
    | "confirmsDebt"
    | "confirmsPayment"
    | "confirmsDeadline"
  >,
): RealCorpusExtractorOutcomeV2 {
  return Object.freeze({
    schemaVersion: REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V2,
    extractorVersion: REAL_CORPUS_EXTRACTOR_VERSION_V2,
    status: "REVIEW_REQUIRED" as const,
    ...input,
    physicalPageCount: document.pages.length,
    contentPageCount: document.pages.length - index.blankPageNumbers.length,
    retainedSourceContent: "NONE" as const,
    requiresHumanReview: true as const,
    materializationPolicy: "PROHIBITED" as const,
    confirmsDebt: false as const,
    confirmsPayment: false as const,
    confirmsDeadline: false as const,
  });
}

function euro(amountCents: number): string {
  const absolute = Math.abs(amountCents);
  const integer = String(Math.floor(absolute / 100)).replace(
    /\B(?=(\d{3})+(?!\d))/gu,
    ".",
  );
  return `${integer},${String(absolute % 100).padStart(2, "0")}\u00a0€`;
}

function pageNumbersContaining(
  index: DocumentIndexV2,
  phrase: string,
): readonly number[] {
  const expected = normalize(phrase);
  return Object.freeze([
    ...new Set(
      index.lines
        .filter((line) => line.normalized.includes(expected))
        .map((line) => line.pageNumber),
    ),
  ]);
}

function proposal(
  document: BoundedDocumentInput,
  index: DocumentIndexV2,
): RealCorpusExtractorOutcomeV2 | null {
  const exactTitle = [
    "NOTIFICACIÓN DEL TRÁMITE DE ALEGACIONES Y PROPUESTA DE LIQUIDACIÓN PROVISIONAL",
    "TRÁMITE DE ALEGACIONES Y PROPUESTA DE LIQUIDACIÓN",
    "PROPUESTA DE LIQUIDACIÓN PROVISIONAL",
  ].find((title) => hasHeaderPrefix(index, title));
  if (
    !exactTitle ||
    !contains(index, "TRÁMITE DE ALEGACIONES") ||
    !contains(index, "PROPUESTA DE LIQUIDACIÓN PROVISIONAL") ||
    !contains(index, "RESULTADO DE LA PROPUESTA DE LIQUIDACIÓN") ||
    !contains(index, "LUGAR Y PLAZO") ||
    (!contains(index, "VERIFICACIÓN DE DATOS") &&
      !contains(index, "PUESTA DE MANIFIESTO DEL EXPEDIENTE"))
  ) {
    return null;
  }
  const declared = moneyField(
    "DECLARED_RESULT",
    "Resultado declarado",
    lineValue(index, ["Resultado declarado"]),
  );
  const proposed = moneyField(
    "PROPOSED_RESULT",
    "Resultado propuesto",
    lineValue(index, ["Resultado propuesto"]),
  );
  const variation = moneyField(
    "RESULT_VARIATION",
    "Variación del resultado",
    lineValue(index, ["Variación del resultado"]),
  );
  const durationSource = lineValue(index, ["Plazo de alegaciones"]);
  const duration = durationSource
    ? Number(/\d+/u.exec(durationSource.value)?.[0])
    : NaN;
  const declaredCents =
    declared?.kind === "MONEY" ? declared.amountCents : null;
  const proposedCents =
    proposed?.kind === "MONEY" ? proposed.amountCents : null;
  const explanation =
    declaredCents !== null && proposedCents !== null && duration === 10
      ? `La AEAT propone cambiar un saldo de ${euro(declaredCents)} a compensar por ${euro(proposedCents)} a ingresar; todavía no es liquidación final y abre 10 días hábiles desde la recepción.`
      : "La AEAT formula una propuesta de liquidación y abre un trámite de alegaciones; todavía no es una liquidación final ni una orden de pago.";
  const calculationPages = pageNumbersContaining(
    index,
    "RESULTADO DE LA PROPUESTA DE LIQUIDACIÓN",
  );
  const allegationPages = pageNumbersContaining(
    index,
    "MODELO PARA EFECTUAR ALEGACIONES",
  );
  const primaryPages = document.pages
    .map((page) => page.pageNumber)
    .filter(
      (page) =>
        !index.blankPageNumbers.includes(page) &&
        !calculationPages.includes(page) &&
        !allegationPages.includes(page),
    );
  const motivationCount = allLineValues(index, ["Motivo"]).length;
  return reviewed(document, index, {
    familyId: "assessment.allegations_and_proposal",
    subtype: "VAT_VERIFICATION_DATA_PROPOSAL",
    canonicalTitle: "Trámite de alegaciones y propuesta de liquidación",
    layoutVariant:
      "ES_2008_VERIFICATION_DATA_WITH_CALCULATION_ANNEX_AND_ALLEGATION_FORM",
    fields: compactFields([
      field(
        "DOCUMENT_REFERENCE",
        "Referencia",
        lineValue(index, ["Referencia"]),
        "REFERENCE",
      ),
      field(
        "TAX_CONCEPT",
        "Concepto tributario",
        lineValue(index, ["Concepto tributario"]),
        "TEXT",
      ),
      field(
        "FISCAL_YEAR",
        "Ejercicio",
        lineValue(index, ["Ejercicio"]),
        "REFERENCE",
      ),
      field(
        "ISSUE_DATE",
        "Fecha de emisión",
        lineValue(index, ["Fecha de emisión"]),
        "DATE",
      ),
      declared,
      proposed,
      variation,
      moneyField(
        "PROPOSED_QUOTA",
        "Cuota propuesta",
        lineValue(index, ["Cuota propuesta"]),
      ),
      moneyField(
        "DECLARED_BALANCE_TO_OFFSET",
        "Saldo declarado a compensar",
        lineValue(index, ["Saldo declarado a compensar"]),
      ),
      Number.isSafeInteger(duration) && duration > 0 && durationSource
        ? integerField(
            "ALLEGATIONS_DURATION",
            "Plazo de alegaciones",
            duration,
            durationSource.pageNumber,
          )
        : null,
      durationSource
        ? field(
            "ALLEGATIONS_UNIT",
            "Unidad del plazo",
            { value: "BUSINESS_DAYS", pageNumber: durationSource.pageNumber },
            "TEXT",
          )
        : null,
      durationSource
        ? field(
            "ALLEGATIONS_TRIGGER",
            "Inicio del plazo",
            { value: "RECEIPT_DATE", pageNumber: durationSource.pageNumber },
            "TEXT",
          )
        : null,
      motivationCount > 0
        ? integerField("MOTIVATION_ITEMS", "Motivos", motivationCount, 1)
        : null,
      booleanField(
        "SEPARATE_SANCTION_NOTICE",
        "La sanción se tramitaría por separado",
        contains(index, "PROCEDIMIENTO SANCIONADOR SEPARADO"),
        1,
      ),
    ]),
    sectionRows: Object.freeze([]),
    missingReturns: Object.freeze([]),
    segments: Object.freeze([
      Object.freeze({
        type: "PRIMARY_ACT" as const,
        pageNumbers: Object.freeze(primaryPages),
      }),
      Object.freeze({
        type: "CALCULATION_ANNEX" as const,
        pageNumbers: calculationPages,
      }),
      Object.freeze({
        type: "ALLEGATIONS_FORM" as const,
        pageNumbers: allegationPages,
      }),
      Object.freeze({
        type: "BLANK_PAGES" as const,
        pageNumbers: index.blankPageNumbers,
      }),
    ]),
    explanation,
  });
}

function parseSectionRows(
  index: DocumentIndexV2,
): readonly RealCorpusSectionRowV2[] {
  const rows: RealCorpusSectionRowV2[] = [];
  let participantRole: "ACCOUNT_HOLDER" | "SPOUSE" = "ACCOUNT_HOLDER";
  const sectionOrdinals = new Map<string, number>();
  for (const line of index.lines) {
    if (line.normalized.startsWith("CONTRIBUYENTE: CONYUGE")) {
      participantRole = "SPOUSE";
      continue;
    }
    if (line.normalized.startsWith("CONTRIBUYENTE: TITULAR")) {
      participantRole = "ACCOUNT_HOLDER";
      continue;
    }
    if (!line.normalized.startsWith("SECCION:")) continue;
    const parts = line.raw.split(";").map((part) => part.trim());
    const attributes = new Map<string, string>();
    for (const part of parts) {
      const separator = part.indexOf(":");
      if (separator < 0) continue;
      attributes.set(
        normalize(part.slice(0, separator)),
        part.slice(separator + 1).trim(),
      );
    }
    const sectionKind = normalize(attributes.get("SECCION") ?? "").replace(
      /\s+/gu,
      "_",
    );
    const rowCount = Number(attributes.get("FILAS") ?? "1");
    if (
      !TAX_SECTION_KINDS_V2.has(sectionKind) ||
      !Number.isSafeInteger(rowCount) ||
      rowCount < 1 ||
      rowCount > 128
    )
      continue;
    const models = (attributes.get("MODELOS") ?? attributes.get("MODELO") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => /^\d{3}$/u.test(value));
    const periods = (
      attributes.get("PERIODOS") ??
      attributes.get("PERIODO") ??
      ""
    )
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter((value) => /^(?:0A|[1-4]T|0[1-9]|1[0-2])$/u.test(value));
    const amountCents = attributes.has("IMPORTE")
      ? parseMoney(attributes.get("IMPORTE")!)
      : null;
    const withholdingCents = attributes.has("RETENCIONES")
      ? parseMoney(attributes.get("RETENCIONES")!)
      : null;
    const safeAttributes: Record<string, string | number | boolean> = {};
    const numericAttributeKeys = new Set([
      "PARTICIPATION_PERCENT",
      "DONATION_AMOUNT_CENTS",
      "CAPITAL_AMORTIZED_CENTS",
      "INTEREST_CENTS",
      "FINANCIAL_EXPENSES_CENTS",
      "CADASTRAL_VALUE_CENTS",
      "DAYS",
      "NET_INCOME_CENTS",
      "MONTHLY_PRINTED_CENTS",
    ]);
    for (const [key, value] of attributes) {
      if (
        [
          "SECCION",
          "FILAS",
          "MODELOS",
          "MODELO",
          "PERIODOS",
          "PERIODO",
          "IMPORTE",
          "RETENCIONES",
        ].includes(key)
      )
        continue;
      const numeric = /^-?\d+(?:[.,]\d+)?$/u.test(value)
        ? Number(value.replace(",", "."))
        : null;
      if (
        numericAttributeKeys.has(key) &&
        numeric !== null &&
        Number.isFinite(numeric)
      ) {
        safeAttributes[key.toLowerCase()] = numeric;
      } else if (key === "ACTIVITY_CODE" && /^[A-Z]\d{2}$/u.test(value)) {
        safeAttributes.activity_code = value;
      } else if (key === "IAE" && /^\d{3}(?:\.\d)?$/u.test(value)) {
        safeAttributes.iae = value;
      }
    }
    for (
      let indexInSection = 0;
      indexInSection < rowCount;
      indexInSection += 1
    ) {
      const ordinal = (sectionOrdinals.get(sectionKind) ?? 0) + 1;
      sectionOrdinals.set(sectionKind, ordinal);
      rows.push(
        Object.freeze({
          sectionKind,
          rowOrdinal: ordinal,
          participantRole,
          model: models[indexInSection] ?? models.at(-1) ?? null,
          taxPeriod: periods[indexInSection] ?? periods.at(-1) ?? null,
          amountCents,
          withholdingCents,
          attributes: Object.freeze(safeAttributes),
          pageNumber: line.pageNumber,
        }),
      );
    }
  }
  return Object.freeze(rows);
}

function taxData(
  document: BoundedDocumentInput,
  index: DocumentIndexV2,
): RealCorpusExtractorOutcomeV2 | null {
  const title = hasHeaderPrefix(index, "DATOS FISCALES")
    ? "DATOS FISCALES"
    : hasHeaderPrefix(index, "DADES FISCALS")
      ? "DADES FISCALS"
      : null;
  if (
    !title ||
    !(
      contains(index, "CONCEPTO TRIBUTARIO") ||
      contains(index, "CONCEPTE TRIBUTARI")
    ) ||
    !contains(index, "IRPF") ||
    !(contains(index, "EJERCICIO") || contains(index, "EXERCICI")) ||
    !(
      contains(index, "NO VINCULAN A LA AGENCIA TRIBUTARIA") ||
      contains(index, "NO VINCULEN L'AGENCIA TRIBUTARIA") ||
      contains(index, "DATOS FISCALES DEL IMPUESTO SOBRE LA RENTA") ||
      contains(index, "DADES FISCALS DE L'IMPOST SOBRE LA RENDA")
    )
  ) {
    return null;
  }
  const yearSource = lineValue(index, ["Ejercicio", "Exercici"]);
  const year = yearSource?.value.match(/(?:19|20)\d{2}/u)?.[0] ?? null;
  const participantPages = pageNumbersContaining(index, "CONTRIBUYENTE");
  const participantCount = contains(index, "CONTRIBUYENTE: CÓNYUGE") ? 2 : 1;
  const rows = parseSectionRows(index);
  const onlineStart = lineValue(index, ["Inicio por internet"]);
  const otherStart = lineValue(index, ["Inicio otros medios"]);
  const campaignEnd = lineValue(index, ["Fin de campaña"]);
  const directDebitEnd = lineValue(index, ["Fin domiciliación"]);
  const layoutVariant: RealCorpusLayoutVariantV2 =
    title === "DADES FISCALS"
      ? "CA_SINGLE_TAXPAYER_2010"
      : participantCount === 2
        ? "ES_JOINT_TWO_PARTICIPANTS_2013_2014"
        : year === "2008" || year === "2009"
          ? "ES_SINGLE_TAXPAYER_2008_2009"
          : "ES_SINGLE_TAXPAYER_2011_2012";
  return reviewed(document, index, {
    familyId: "information.tax_data_report",
    subtype: "IRPF_TAX_DATA_REPORT",
    canonicalTitle: "Datos fiscales",
    layoutVariant,
    fields: compactFields([
      field(
        "REPORT_REFERENCE",
        "Referencia del informe",
        lineValue(index, ["Referencia"]),
        "REFERENCE",
      ),
      yearSource && year
        ? field(
            "FISCAL_YEAR",
            "Ejercicio",
            { value: year, pageNumber: yearSource.pageNumber },
            "REFERENCE",
          )
        : null,
      field(
        "SNAPSHOT_DATE",
        "Datos a fecha de",
        lineValue(index, ["Datos a fecha de", "Dades a data de"]),
        "DATE",
      ),
      field(
        "ISSUE_DATE",
        "Fecha de emisión",
        lineValue(index, ["Fecha de emisión", "Data d'emissió"]),
        "DATE",
      ),
      booleanField("DRAFT_AVAILABLE", "Borrador disponible", false, 1),
      field(
        "DRAFT_UNAVAILABLE_REASON",
        "Motivo de ausencia de borrador",
        lineValue(index, [
          "Motivo de ausencia de borrador",
          "No se pudo elaborar el borrador",
        ]),
        "TEXT",
      ),
      integerField("PARTICIPANT_COUNT", "Participantes", participantCount, 1),
      onlineStart
        ? field(
            "CAMPAIGN_ONLINE_START",
            "Inicio por internet",
            onlineStart,
            "DATE",
          )
        : null,
      otherStart
        ? field(
            "CAMPAIGN_OTHER_START",
            "Inicio por otros medios",
            otherStart,
            "DATE",
          )
        : null,
      campaignEnd
        ? field("CAMPAIGN_END", "Fin de campaña", campaignEnd, "DATE")
        : null,
      directDebitEnd
        ? field(
            "DIRECT_DEBIT_END",
            "Fin de domiciliación",
            directDebitEnd,
            "DATE",
          )
        : null,
      integerField(
        "SECTION_ROW_COUNT",
        "Filas conservadas",
        rows.length,
        rows[0]?.pageNumber ?? 1,
      ),
    ]),
    sectionRows: rows,
    missingReturns: Object.freeze([]),
    segments: Object.freeze([
      Object.freeze({
        type: "CAMPAIGN_INFORMATION" as const,
        pageNumbers: Object.freeze([1]),
      }),
      Object.freeze({
        type: "TAX_DATA_TABLES" as const,
        pageNumbers: Object.freeze(
          document.pages
            .map((page) => page.pageNumber)
            .filter(
              (page) => page > 1 && !index.blankPageNumbers.includes(page),
            ),
        ),
      }),
      Object.freeze({
        type: "PARTICIPANT_BOUNDARIES" as const,
        pageNumbers: participantPages,
      }),
    ]),
    explanation: year
      ? `Informe informativo de datos fiscales del IRPF ${year}; no es declaración, deuda ni liquidación. Debe mostrar la causa por la que no se pudo elaborar el borrador y los plazos de campaña como información.`
      : "Informe informativo de datos fiscales del IRPF; no es declaración, deuda ni liquidación.",
  });
}

function spouseSuspension(
  document: BoundedDocumentInput,
  index: DocumentIndexV2,
): RealCorpusExtractorOutcomeV2 | null {
  const catalan = hasHeaderPrefix(
    index,
    "NOTIFICACIÓ DE L’ACORD DE SUSPENSIÓ DE L’INGRÉS (COMPENSACIÓ ENTRE CÒNJUGES)",
  );
  const spanish = hasHeaderPrefix(
    index,
    "NOTIFICACIÓN DEL ACUERDO DE SUSPENSIÓN DEL INGRESO (COMPENSACIÓN ENTRE CÓNYUGES)",
  );
  if (
    (!catalan && !spanish) ||
    !(
      contains(index, "SE HA PROCEDIDO A REALIZAR LA COMPENSACIÓN") ||
      contains(index, "S'HA REALITZAT LA COMPENSACIÓ")
    )
  ) {
    return null;
  }
  const page = index.headerLines[0]?.pageNumber ?? 1;
  return reviewed(document, index, {
    familyId: "irpf.spouse_refund_suspension",
    subtype: "IRPF_SPOUSE_REFUND_OFFSET_APPLIED",
    canonicalTitle: "Suspensión de deuda IRPF mediante devolución del cónyuge",
    layoutVariant: catalan ? "CA_ONE_PAGE" : "ES_ONE_PAGE",
    fields: compactFields([
      field(
        "DOCUMENT_REFERENCE",
        "Referencia",
        lineValue(index, ["Referencia", "Referència"]),
        "REFERENCE",
      ),
      field(
        "FISCAL_YEAR",
        "Ejercicio",
        lineValue(index, ["Ejercicio", "Exercici"]),
        "REFERENCE",
      ),
      field(
        "ISSUE_DATE",
        "Fecha de emisión",
        lineValue(index, ["Fecha de emisión", "Data d'emissió"]),
        "DATE",
      ),
      booleanField(
        "OFFSET_APPLIED_BETWEEN_SPOUSES",
        "Compensación aplicada entre cónyuges",
        true,
        page,
      ),
      booleanField(
        "AMOUNT_PRINTED",
        "Importe indicado",
        lineValue(index, ["Importe aplicado"]) !== null,
        page,
      ),
      booleanField(
        "REMAINING_BALANCE_PRINTED",
        "Saldo restante indicado",
        lineValue(index, ["Saldo restante"]) !== null,
        page,
      ),
    ]),
    sectionRows: Object.freeze([]),
    missingReturns: Object.freeze([]),
    segments: Object.freeze([]),
    explanation:
      "La AEAT confirma que aplicó la devolución del cónyuge al ingreso suspendido, pero sin importe no puede afirmar cobertura total ni saldo cero.",
  });
}

function refundPayment(
  document: BoundedDocumentInput,
  index: DocumentIndexV2,
): RealCorpusExtractorOutcomeV2 | null {
  if (
    !hasHeaderPrefix(index, "COMUNICACIÓN DE PAGO DE DEVOLUCIÓN") ||
    !contains(index, "ORDENACIÓN DEL PAGO") ||
    !contains(index, "IMPORTE LÍQUIDO DE LA DEVOLUCIÓN") ||
    !contains(index, "DETALLE DE DEDUCCIONES") ||
    (!contains(index, "COMPENSACIÓN A INSTANCIA OBLIGADO") &&
      !contains(index, "COMPENSACIÓN DE OFICIO"))
  ) {
    return null;
  }
  const requested = moneyField(
    "REFUND_REQUESTED",
    "Devolución solicitada",
    lineValue(index, ["Devolución solicitada"]),
  );
  const agreed = moneyField(
    "REFUND_AGREED",
    "Devolución acordada",
    lineValue(index, ["Devolución acordada"]),
  );
  const ordered = moneyField(
    "REFUND_ORDERED",
    "Pago ordenado",
    lineValue(index, ["Pago ordenado", "Importe ordenado"]),
  );
  const deductions = moneyField(
    "DEDUCTIONS",
    "Deducciones",
    lineValue(index, ["Deducciones", "Total deducciones"]),
  );
  const net = moneyField(
    "NET_REFUND_PAYMENT",
    "Importe líquido de la devolución",
    lineValue(index, ["Importe líquido de la devolución"]),
  );
  const netCents = net?.kind === "MONEY" ? net.amountCents : null;
  const exOfficio = contains(index, "COMPENSACIÓN DE OFICIO");
  return reviewed(document, index, {
    familyId: "refund.payment_communication",
    subtype: "REFUND_PAYMENT_AFTER_OFFSET",
    canonicalTitle: "Comunicación de pago de devolución",
    layoutVariant:
      netCents === 0
        ? exOfficio
          ? "EX_OFFICIO_FULL_OFFSET"
          : "FULL_OFFSET_NO_NET"
        : "PARTIAL_OFFSET_NET_TRANSFER",
    fields: compactFields([
      field(
        "REFUND_REFERENCE",
        "Referencia de devolución",
        lineValue(index, ["Referencia de devolución"]),
        "REFERENCE",
      ),
      field(
        "REFUND_DECISION_REFERENCE",
        "Referencia del acuerdo de devolución",
        lineValue(index, ["Referencia del acuerdo de devolución"]),
        "REFERENCE",
      ),
      field(
        "AGREEMENT_ID",
        "Referencia del acuerdo de compensación",
        lineValue(index, ["Referencia del acuerdo de compensación"]),
        "REFERENCE",
      ),
      field(
        "TAX_YEAR",
        "Ejercicio",
        lineValue(index, ["Ejercicio"]),
        "REFERENCE",
      ),
      requested,
      agreed,
      ordered,
      deductions,
      net,
      field(
        "OFFSET_TYPE",
        "Tipo de compensación",
        { value: exOfficio ? "EX_OFFICIO" : "REQUESTED", pageNumber: 1 },
        "TEXT",
      ),
      booleanField(
        "BANK_RECEIPT_CONFIRMED",
        "Abono bancario confirmado",
        false,
        1,
      ),
    ]),
    sectionRows: Object.freeze([]),
    missingReturns: Object.freeze([]),
    segments: Object.freeze([]),
    explanation:
      netCents === 0
        ? "La devolución se aplicó íntegramente a deudas y no queda importe líquido para transferir."
        : "La devolución se aplicó parcialmente a deudas y queda un importe líquido cuya transferencia fue ordenada.",
  });
}

function publication(
  document: BoundedDocumentInput,
  index: DocumentIndexV2,
): RealCorpusExtractorOutcomeV2 | null {
  const diligence = hasHeaderPrefix(
    index,
    "DILIGENCIA DE PUBLICACIÓN DEL ANUNCIO DE CITACIÓN PARA NOTIFICACIÓN POR COMPARECENCIA",
  );
  const certificate = hasHeaderPrefix(
    index,
    "CERTIFICADO DE PUBLICACIÓN EN EL BOLETÍN OFICIAL DEL ESTADO DEL ANUNCIO DE CITACIÓN PARA NOTIFICACIÓN POR COMPARECENCIA",
  );
  const prepublication = hasHeaderPrefix(
    index,
    "COMUNICACIÓN NOTIFICACIÓN POR COMPARECENCIA",
  );
  if (
    (!diligence && !certificate && !prepublication) ||
    !contains(index, "NOTIFICACIÓN POR COMPARECENCIA") ||
    !(
      contains(index, "CERTIFICADO DE PUBLICACIÓN") ||
      contains(index, "DILIGENCIA DE PUBLICACIÓN") ||
      contains(index, "SE VA A PROCEDER A SU CITACIÓN")
    )
  ) {
    return null;
  }
  const effective = certificate
    ? field(
        "EFFECTIVE_NOTIFICATION_DATE",
        "Fecha efectiva de notificación",
        lineValue(index, ["Fecha efectiva de notificación"]),
        "DATE",
      )
    : null;
  const effectivePrinted = effective?.kind === "DATE";
  const explanation = prepublication
    ? "La comunicación anuncia una futura publicación; todavía no acredita publicación ni notificación efectiva."
    : certificate && effectivePrinted
      ? "El certificado acredita la fecha efectiva de notificación del acto citado, pero no es el acto subyacente."
      : "La diligencia acredita la publicación, pero no permite afirmar la fecha efectiva de notificación.";
  return reviewed(document, index, {
    familyId: "notification.publication_or_appearance",
    subtype: prepublication
      ? "APPEARANCE_CITATION_PREPUBLICATION"
      : certificate
        ? "PUBLICATION_CERTIFICATE"
        : "PUBLICATION_DILIGENCE",
    canonicalTitle: "Publicación o comparecencia para notificación",
    layoutVariant: prepublication
      ? "APPEARANCE_CITATION_PREPUBLICATION"
      : certificate
        ? "PUBLICATION_CERTIFICATE_EFFECTIVE_DATE"
        : "PUBLICATION_DILIGENCE_NO_EFFECTIVE_DATE",
    fields: compactFields([
      field(
        "CERTIFICATE_OR_COMMUNICATION_ID",
        "Identificador de la evidencia",
        lineValue(index, ["Identificador", "Referencia"]),
        "REFERENCE",
      ),
      field(
        "UNDERLYING_ACT_REFERENCE",
        "Referencia del acto citado",
        lineValue(index, ["Referencia del acto citado"]),
        "REFERENCE",
      ),
      field(
        "UNDERLYING_ACT_TYPE",
        "Tipo del acto citado",
        lineValue(index, ["Tipo del acto citado"]),
        "TEXT",
      ),
      field(
        "PUBLICATION_DATE",
        "Fecha de publicación",
        lineValue(index, ["Fecha de publicación"]),
        "DATE",
      ),
      field(
        "PUBLICATION_NUMBER",
        "Número de publicación",
        lineValue(index, ["Número de publicación"]),
        "REFERENCE",
      ),
      integerField("APPEARANCE_DURATION", "Plazo de comparecencia", 15, 1),
      field(
        "APPEARANCE_UNIT",
        "Unidad del plazo",
        { value: "CALENDAR_DAYS", pageNumber: 1 },
        "TEXT",
      ),
      effective,
      field(
        "ISSUE_DATE",
        "Fecha de emisión",
        lineValue(index, ["Fecha de emisión"]),
        "DATE",
      ),
      booleanField(
        "PROVES_UNDERLYING_ACT_CONTENT",
        "Explica el contenido del acto citado",
        false,
        1,
      ),
    ]),
    sectionRows: Object.freeze([]),
    missingReturns: Object.freeze([]),
    segments: Object.freeze([]),
    explanation,
  });
}

function informalWarning(
  document: BoundedDocumentInput,
  index: DocumentIndexV2,
): RealCorpusExtractorOutcomeV2 | null {
  if (
    !hasHeaderPrefix(index, "CARTA DE AVISO") ||
    !contains(index, "NO CONSTA LA PRESENTACIÓN") ||
    !contains(index, "REGULARIZAR SU SITUACIÓN TRIBUTARIA") ||
    !(
      contains(index, "MODELO 036") ||
      contains(index, "MODELO 037") ||
      contains(index, "DECLARACIÓN CENSAL")
    ) ||
    contains(index, "PLAZO PARA CONTESTAR") ||
    contains(index, "INICIO DE EXPEDIENTE SANCIONADOR")
  ) {
    return null;
  }
  const missingReturns = allLineValues(index, [
    "Declaración no registrada",
  ]).flatMap((source) => {
    const model = /MODELO\s+(\d{3})/iu.exec(source.value)?.[1];
    const year = /(?:EJERCICIO\s+)?((?:19|20)\d{2})/iu.exec(source.value)?.[1];
    const period = /\b(0A|[1-4]T|0[1-9]|1[0-2])\b/iu
      .exec(source.value)?.[1]
      ?.toUpperCase();
    return model && year && period
      ? [
          Object.freeze({
            model,
            fiscalYear: year,
            taxPeriod: period,
            pageNumber: source.pageNumber,
          }),
        ]
      : [];
  });
  const percentages = allLineValues(index, ["Recargo histórico"])
    .flatMap((source) => source.value.match(/\d+(?:[.,]\d+)?/gu) ?? [])
    .map((value) => Number(value.replace(",", ".")))
    .filter((value) => Number.isFinite(value));
  return reviewed(document, index, {
    familyId: "compliance.informal_missing_return_notice",
    subtype: "INFORMAL_MISSING_RETURN_WARNING",
    canonicalTitle: "Carta de aviso por declaraciones no registradas",
    layoutVariant: "CARTA_AVISO_MISSING_MODELS",
    fields: compactFields([
      field(
        "DOCUMENT_REFERENCE",
        "Referencia",
        lineValue(index, ["Referencia"]),
        "REFERENCE",
      ),
      field(
        "ISSUE_DATE",
        "Fecha de emisión",
        lineValue(index, ["Fecha de emisión"]),
        "DATE",
      ),
      integerField(
        "MISSING_RETURN_COUNT",
        "Declaraciones no registradas",
        missingReturns.length,
        1,
      ),
      booleanField("FORMAL_REQUIREMENT", "Requerimiento formal", false, 1),
      booleanField(
        "RESPONSE_DEADLINE_PRINTED",
        "Plazo de respuesta indicado",
        false,
        1,
      ),
      ...percentages.map((value, position) =>
        Object.freeze({
          fieldCode: `HISTORICAL_SURCHARGE_PERCENTAGE_${position + 1}`,
          label: "Porcentaje histórico citado",
          kind: "TEXT" as const,
          value: `${value}%`,
          evidence: evidence(1),
        }),
      ),
    ]),
    sectionRows: Object.freeze([]),
    missingReturns: Object.freeze(missingReturns),
    segments: Object.freeze([]),
    explanation: `Es una carta de aviso sobre ${missingReturns.length === 2 ? "dos" : missingReturns.length} modelos no registrados; no es requerimiento formal, deuda ni sanción y no tiene plazo impreso.`,
  });
}

/**
 * Closed, deterministic extractor for the six families resolved by the V2
 * synthetic corpus. It never retains raw text or personal identifiers and it
 * never turns a printed fact into an operative payment, debt or deadline.
 */
export async function extractAeatRealCorpusDocumentV2(
  document: BoundedDocumentInput,
): Promise<RealCorpusExtractorOutcomeV2> {
  assertBoundedDocumentInput(document);
  assertNotAborted(document.signal);
  const index = buildIndex(document);
  const result =
    proposal(document, index) ??
    taxData(document, index) ??
    spouseSuspension(document, index) ??
    refundPayment(document, index) ??
    publication(document, index) ??
    informalWarning(document, index);
  assertNotAborted(document.signal);
  return result ?? unknown(document, index);
}
