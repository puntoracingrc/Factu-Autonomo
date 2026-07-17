import {
  assertBoundedDocumentInput,
  assertNotAborted,
  type BoundedDocumentInput,
} from "../input-contract";
import type {
  RealCorpusEvidenceV2,
  RealCorpusFieldV2,
} from "./real-corpus-extractor.v2";
import type { RealCorpusAmountScenarioV3 } from "./real-corpus-extractor.v3";
import {
  extractAeatRealCorpusDocumentV5,
  REAL_CORPUS_EXPLANATIONS_V5,
  type RealCorpusDeniedDebtV5,
  type RealCorpusExistingExecutiveDebtV5,
  type RealCorpusExplanationV5,
  type RealCorpusInstallmentV5,
} from "./real-corpus-extractor.v5";

export const REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V6 = 6 as const;
export const REAL_CORPUS_EXTRACTOR_VERSION_V6 =
  "aeat-real-corpus-extractor.2026-07-17.v6" as const;

export const REAL_CORPUS_FAMILY_IDS_V6 = Object.freeze([
  "collection.enforcement_order",
  "collection.deferral_grant",
  "collection.deferral_denial",
  "collection.interest_assessment",
  "sanction.resolution",
  "sanction.loss_of_reduction",
  "seizure.movable_asset",
  "seizure.real_estate",
] as const);
export type RealCorpusFamilyIdV6 = (typeof REAL_CORPUS_FAMILY_IDS_V6)[number];

export type RealCorpusSubtypeV6 =
  | "ENFORCEMENT_WITH_PAYMENT_FORM"
  | "ENFORCEMENT_WITH_FAILED_DELIVERY_COVER"
  | "DEFERRAL_GRANT_WITH_INSTALLMENT_SCHEDULE"
  | "DEFERRAL_GRANT_WITH_FAILED_DELIVERY_COVER"
  | "DEFERRAL_DENIAL_WITH_SEPARATE_INTEREST_BRANCH"
  | "INDEPENDENT_INTEREST_ASSESSMENT"
  | "SANCTION_RESOLUTION_WITH_HISTORICAL_REDUCTION"
  | "LOSS_OF_SANCTION_REDUCTION_WITH_OWN_DEBT_KEY"
  | "MOVABLE_ASSET_SEIZURE_WITH_DEBT_AND_ASSET_ANNEX"
  | "REAL_ESTATE_SEIZURE_WITH_DEBT_AND_ASSET_ANNEX";

export type RealCorpusSegmentTypeV6 =
  | "DELIVERY_COVER"
  | "PRIMARY_ACT"
  | "DEBT_ANNEX"
  | "ASSET_ANNEX"
  | "SCHEDULE"
  | "ANNEX_INTEREST_CALCULATION"
  | "PAYMENT_FORM"
  | "PAYMENT_INSTRUCTIONS"
  | "INFORMATION"
  | "BLANK";

export interface RealCorpusSegmentV6 {
  readonly segmentId: string;
  readonly type: RealCorpusSegmentTypeV6;
  readonly pageNumbers: readonly number[];
  readonly relationToPrimary:
    | "DELIVERY_ATTEMPT_FOR"
    | "PRIMARY"
    | "ANNEX_ONLY"
    | "PAYMENT_FORM_FOR"
    | "INSTRUCTIONS_ONLY"
    | "INFORMATION_ONLY"
    | "BLANK";
  readonly provesPayment: false;
  readonly createsIndependentDebt: false;
}

export interface RealCorpusSanctionResolutionV6 {
  readonly sanctionReference: string;
  readonly sanctionDebtKey: string;
  readonly initialSanctionCents: number;
  readonly printedHistoricalReductionPercent: number;
  readonly reductionCents: number;
  readonly reducedSanctionCents: number;
}

export interface RealCorpusLossOfReductionV6 {
  readonly originSanctionDebtKey: string;
  readonly clawbackDebtKey: string;
  readonly printedHistoricalReductionPercent: number;
  readonly clawbackCents: number;
}

export interface RealCorpusInterestAssessmentV6 {
  readonly interestLiquidationKey: string;
  readonly agreementId: string;
  readonly sourceDebtKey: string;
  readonly sourcePrincipalCents: number;
  readonly interestCents: number;
  readonly calculationStartDate: string;
  readonly calculationEndDate: string;
}

export interface RealCorpusSeizureDebtRowV6 {
  readonly debtKey: string;
  readonly amountCents: number;
  readonly observedOnPage: number;
}

export interface RealCorpusSeizureSnapshotV6 {
  readonly seizureOrderId: string;
  readonly actionDate: string | null;
  readonly assetKind: "MOVABLE_ASSET" | "REAL_ESTATE";
  readonly debtRows: readonly RealCorpusSeizureDebtRowV6[];
  readonly debtSubtotalCents: number;
  readonly printedInterestCents: number;
  readonly printedCostsCents: number;
  readonly seizeLimitCents: number;
  readonly paymentFormPrintedTotalCents: number | null;
  readonly paymentFormAmountCents: number;
  readonly hasPrintedAmountDiscrepancy: boolean;
}

export interface RealCorpusExtractorOutcomeV6 {
  readonly schemaVersion: typeof REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V6;
  readonly extractorVersion: typeof REAL_CORPUS_EXTRACTOR_VERSION_V6;
  readonly sourceDocumentId: string;
  readonly status: "REVIEW_REQUIRED" | "UNKNOWN";
  readonly familyId: RealCorpusFamilyIdV6 | null;
  readonly subtype: RealCorpusSubtypeV6 | null;
  readonly canonicalTitle: string | null;
  readonly physicalPageCount: number;
  readonly contentPageCount: number;
  readonly fields: readonly RealCorpusFieldV2[];
  readonly installments: readonly RealCorpusInstallmentV5[];
  readonly deniedDebt: RealCorpusDeniedDebtV5 | null;
  readonly existingExecutiveDebtsCitedAsReason:
    readonly RealCorpusExistingExecutiveDebtV5[];
  readonly sanctionResolution: RealCorpusSanctionResolutionV6 | null;
  readonly lossOfReduction: RealCorpusLossOfReductionV6 | null;
  readonly interestAssessment: RealCorpusInterestAssessmentV6 | null;
  readonly seizureSnapshot: RealCorpusSeizureSnapshotV6 | null;
  readonly paymentFormReferences: readonly string[];
  readonly paymentFormOperationCount: 0 | 1;
  readonly amountScenarios: readonly RealCorpusAmountScenarioV3[];
  readonly segments: readonly RealCorpusSegmentV6[];
  readonly explanation: RealCorpusExplanationV5 | null;
  readonly sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST";
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED";
  readonly confirmsDebt: false;
  readonly confirmsPayment: false;
  readonly confirmsRemittance: false;
  readonly confirmsDeadline: false;
  readonly confirmsDebtExtinction: false;
}

interface IndexedLineV6 {
  readonly pageNumber: number;
  readonly raw: string;
  readonly normalized: string;
}

interface DocumentIndexV6 {
  readonly lines: readonly IndexedLineV6[];
  readonly normalizedText: string;
  readonly blankPageNumbers: ReadonlySet<number>;
}

const SPANISH_DATE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/u;
const REFERENCE = /^[A-Z0-9][A-Z0-9./:_+-]{1,199}$/u;
const PRIVATE_REFERENCE =
  /^(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]|ES\d{22}|[6789]\d{8})$/u;

export const REAL_CORPUS_EXPLANATIONS_V6: Readonly<
  Record<RealCorpusFamilyIdV6, RealCorpusExplanationV5>
> = Object.freeze({
  "collection.enforcement_order": REAL_CORPUS_EXPLANATIONS_V5["collection.enforcement_order"],
  "collection.deferral_grant": REAL_CORPUS_EXPLANATIONS_V5["collection.deferral_grant"],
  "collection.deferral_denial": Object.freeze({
    whatIs:
      "La AEAT ha rechazado aplazar la deuda principal indicada. Los intereses derivados de la solicitud pueden aparecer después en una liquidación distinta.",
    action:
      "Comprueba por separado la deuda denegada, cualquier liquidación de intereses y las providencias posteriores. No sumes esas ramas como si fueran el mismo concepto.",
    deadline:
      "El nuevo plazo de ingreso depende de la recepción efectiva de la denegación. Sin esa fecha no puede calcularse el vencimiento.",
    consequence:
      "El principal puede pasar a apremio y los intereses pueden tener su propio acto y su propia providencia; cada documento conserva su importe.",
  }),
  "collection.interest_assessment": Object.freeze({
    whatIs:
      "Es una liquidación separada de intereses generados durante una solicitud de aplazamiento o fraccionamiento.",
    action:
      "Revisa la solicitud de origen, la deuda principal, las fechas del cálculo y el importe de intereses. No lo confundas con el principal denegado.",
    deadline:
      "El documento debe revisarse con su fecha de recepción. La fecha del cálculo no sustituye la notificación efectiva.",
    consequence:
      "Si esta liquidación no se paga, puede recibir su propia providencia de apremio y su propio recargo ejecutivo.",
  }),
  "sanction.resolution": Object.freeze({
    whatIs:
      "Es la resolución que decide el expediente sancionador y fija la sanción, la reducción histórica aplicada y el importe reducido.",
    action:
      "Comprueba la referencia del expediente y separa la sanción reducida de una posible exigencia posterior de la reducción perdida.",
    deadline:
      "Los plazos dependen de la recepción y de lo indicado en la resolución. La fecha del documento no basta para calcularlos.",
    consequence:
      "La sanción reducida puede pasar a apremio. Si se pierden las condiciones de la reducción, la AEAT puede reclamar solo esa reducción mediante otro acto.",
  }),
  "sanction.loss_of_reduction": Object.freeze({
    whatIs:
      "Este acto reclama la reducción que se había descontado de una sanción porque la AEAT considera que se incumplieron sus condiciones.",
    action:
      "Comprueba la sanción de origen, el porcentaje histórico impreso, el importe de la reducción y la nueva clave de deuda.",
    deadline:
      "El plazo se determina con la recepción efectiva de este acto. No se reutiliza automáticamente el plazo de la sanción anterior.",
    consequence:
      "No es una segunda sanción completa: solo reclama la reducción perdida y puede tener una providencia de apremio propia.",
  }),
  "seizure.movable_asset": Object.freeze({
    whatIs:
      "La AEAT ha dictado una diligencia para continuar el cobro sobre un bien mueble por el conjunto de deudas indicado.",
    action:
      "Revisa el número de diligencia, cada fila de deuda y las cifras del anexo y la carta. El identificador concreto del bien no se conserva.",
    deadline:
      "Cualquier oposición se cuenta desde la recepción efectiva. La fecha del acto no sustituye esa recepción.",
    consequence:
      "El límite del embargo no demuestra que se haya cobrado esa cantidad ni duplica las deudas incluidas.",
  }),
  "seizure.real_estate": Object.freeze({
    whatIs:
      "La AEAT ha dictado una diligencia para continuar el cobro sobre un inmueble por el conjunto de deudas indicado.",
    action:
      "Revisa el número de diligencia, las filas de deuda y cada cifra impresa. Si anexo y carta difieren, se muestran ambas sin elegir una silenciosamente.",
    deadline:
      "Cualquier oposición se cuenta desde la recepción efectiva. La fecha del acto no sustituye esa recepción.",
    consequence:
      "Es una actuación distinta de otros embargos sobre las mismas deudas; sus límites no se suman como deuda ni acreditan cobro.",
  }),
});

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

function buildIndex(document: BoundedDocumentInput): DocumentIndexV6 {
  const lines: IndexedLineV6[] = [];
  const blankPageNumbers = new Set<number>();
  for (const page of document.pages) {
    const pageLines = page.text
      .split(/\r?\n/gu)
      .map((raw) => ({ raw: raw.trim(), normalized: normalize(raw) }))
      .filter((line) => line.normalized.length > 0);
    if (page.isBlank || pageLines.length === 0) blankPageNumbers.add(page.pageNumber);
    for (const line of pageLines) {
      lines.push(Object.freeze({ pageNumber: page.pageNumber, ...line }));
    }
  }
  return Object.freeze({
    lines: Object.freeze(lines),
    normalizedText: lines.map((line) => line.normalized).join("\n"),
    blankPageNumbers,
  });
}

function indexForPages(
  index: DocumentIndexV6,
  pageNumbers: readonly number[],
): DocumentIndexV6 {
  const selected = new Set(pageNumbers);
  const lines = index.lines.filter((line) => selected.has(line.pageNumber));
  return Object.freeze({
    lines: Object.freeze(lines),
    normalizedText: lines.map((line) => line.normalized).join("\n"),
    blankPageNumbers: new Set<number>(),
  });
}

function contains(index: DocumentIndexV6, value: string): boolean {
  return index.normalizedText.includes(normalize(value));
}

function lineValues(index: DocumentIndexV6, labels: readonly string[]): readonly IndexedLineV6[] {
  const normalizedLabels = labels.map(normalize);
  const values: IndexedLineV6[] = [];
  for (let position = 0; position < index.lines.length; position += 1) {
    const line = index.lines[position]!;
    for (const label of normalizedLabels) {
      if (line.normalized === label) {
        const next = index.lines[position + 1];
        if (next) values.push(next);
      } else if (line.normalized.startsWith(`${label}:`)) {
        const raw = line.raw.slice(line.raw.indexOf(":") + 1).trim();
        if (raw) values.push(Object.freeze({ ...line, raw, normalized: normalize(raw) }));
      }
    }
  }
  return Object.freeze(values);
}

function firstValue(index: DocumentIndexV6, labels: readonly string[]): IndexedLineV6 | null {
  return lineValues(index, labels)[0] ?? null;
}

function firstMoneyValue(
  index: DocumentIndexV6,
  labels: readonly string[],
): IndexedLineV6 | null {
  return lineValues(index, labels).find((line) => parseMoney(line.raw) !== null) ?? null;
}

function parseDate(raw: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(raw.trim());
  const match = iso ?? SPANISH_DATE.exec(raw.trim());
  if (!match) return null;
  const year = Number(iso ? match[1] : match[3]);
  const month = Number(match[2]);
  const day = Number(iso ? match[3] : match[1]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    : null;
}

function parseMoney(raw: string): number | null {
  const compact = raw
    .replace(/\s|€|EUR/giu, "")
    .replace(/\.(?=\d{3}(?:\D|$))/gu, "")
    .replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/u.test(compact)) return null;
  const cents = Math.round(Number(compact) * 100);
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}

function parseInteger(raw: string): number | null {
  const compact = raw.replace(/\s|%/gu, "");
  if (!/^\d+$/u.test(compact)) return null;
  const value = Number(compact);
  return Number.isSafeInteger(value) && value >= 0 && value <= 100 ? value : null;
}

function safeReference(raw: string): string | null {
  const value = raw.trim().toLocaleUpperCase("es-ES");
  return REFERENCE.test(value) && /\d/u.test(value) && !PRIVATE_REFERENCE.test(value)
    ? value
    : null;
}

function evidence(pageNumber: number): RealCorpusEvidenceV2 {
  return Object.freeze({
    pageNumbers: Object.freeze([pageNumber]),
    assertionType: "EXPLICIT_IN_DOCUMENT",
  });
}

function referenceField(
  fieldCode: string,
  label: string,
  source: IndexedLineV6 | null,
): RealCorpusFieldV2 | null {
  const value = source ? safeReference(source.raw) : null;
  return value && source
    ? Object.freeze({ fieldCode, label, kind: "REFERENCE" as const, value, evidence: evidence(source.pageNumber) })
    : null;
}

function dateField(
  fieldCode: string,
  label: string,
  source: IndexedLineV6 | null,
): RealCorpusFieldV2 | null {
  const value = source ? parseDate(source.raw) : null;
  return value && source
    ? Object.freeze({ fieldCode, label, kind: "DATE" as const, value, evidence: evidence(source.pageNumber) })
    : null;
}

function moneyField(
  fieldCode: string,
  label: string,
  source: IndexedLineV6 | null,
): RealCorpusFieldV2 | null {
  const amountCents = source ? parseMoney(source.raw) : null;
  return amountCents !== null && source
    ? Object.freeze({ fieldCode, label, kind: "MONEY" as const, amountCents, currency: "EUR" as const, evidence: evidence(source.pageNumber) })
    : null;
}

function integerField(
  fieldCode: string,
  label: string,
  source: IndexedLineV6 | null,
): RealCorpusFieldV2 | null {
  const value = source ? parseInteger(source.raw) : null;
  return value !== null && source
    ? Object.freeze({ fieldCode, label, kind: "INTEGER" as const, value, evidence: evidence(source.pageNumber) })
    : null;
}

function textField(
  fieldCode: string,
  label: string,
  value: string,
  pageNumber = 1,
): RealCorpusFieldV2 {
  return Object.freeze({ fieldCode, label, kind: "TEXT" as const, value, evidence: evidence(pageNumber) });
}

function compactFields(
  values: readonly (RealCorpusFieldV2 | null)[],
): readonly RealCorpusFieldV2[] {
  const result = new Map<string, RealCorpusFieldV2>();
  for (const value of values) {
    if (!value) continue;
    const identity = `${value.fieldCode}:${value.kind}:${
      value.kind === "MONEY" ? value.amountCents : "value" in value ? String(value.value) : ""
    }`;
    if (!result.has(identity)) result.set(identity, value);
  }
  return Object.freeze([...result.values()]);
}

function requiredReference(index: DocumentIndexV6, labels: readonly string[]): string | null {
  return safeReference(firstValue(index, labels)?.raw ?? "");
}

function requiredMoney(index: DocumentIndexV6, labels: readonly string[]): number | null {
  return parseMoney(firstValue(index, labels)?.raw ?? "");
}

function requiredDate(index: DocumentIndexV6, labels: readonly string[]): string | null {
  return parseDate(firstValue(index, labels)?.raw ?? "");
}

function parseSanctionResolution(index: DocumentIndexV6): RealCorpusSanctionResolutionV6 | null {
  const sanctionReference = requiredReference(index, ["Referencia del expediente sancionador"]);
  const sanctionDebtKey = requiredReference(index, ["Clave de la sanción", "Clave de deuda de la sanción"]);
  const initialSanctionCents = requiredMoney(index, ["Sanción inicial"]);
  const reductionCents = requiredMoney(index, ["Reducción aplicada"]);
  const reducedSanctionCents = requiredMoney(index, ["Sanción reducida"]);
  const printedHistoricalReductionPercent = parseInteger(
    firstValue(index, ["Porcentaje histórico de reducción", "Reducción histórica impresa"])?.raw ?? "",
  );
  if (
    !sanctionReference ||
    !sanctionDebtKey ||
    initialSanctionCents === null ||
    reductionCents === null ||
    reducedSanctionCents === null ||
    printedHistoricalReductionPercent === null ||
    initialSanctionCents - reductionCents !== reducedSanctionCents
  ) return null;
  return Object.freeze({
    sanctionReference,
    sanctionDebtKey,
    initialSanctionCents,
    printedHistoricalReductionPercent,
    reductionCents,
    reducedSanctionCents,
  });
}

function parseLossOfReduction(index: DocumentIndexV6): RealCorpusLossOfReductionV6 | null {
  const originSanctionDebtKey = requiredReference(index, ["Clave de la sanción de origen"]);
  const clawbackDebtKey = requiredReference(index, ["Clave de la reducción exigida"]);
  const clawbackCents = requiredMoney(index, ["Importe de la reducción exigida"]);
  const printedHistoricalReductionPercent = parseInteger(
    firstValue(index, ["Porcentaje histórico de reducción", "Reducción histórica impresa"])?.raw ?? "",
  );
  return originSanctionDebtKey &&
    clawbackDebtKey &&
    clawbackCents !== null &&
    printedHistoricalReductionPercent !== null
    ? Object.freeze({
        originSanctionDebtKey,
        clawbackDebtKey,
        printedHistoricalReductionPercent,
        clawbackCents,
      })
    : null;
}

function parseInterestAssessment(index: DocumentIndexV6): RealCorpusInterestAssessmentV6 | null {
  const interestLiquidationKey = requiredReference(index, ["Clave de la liquidación de intereses"]);
  const agreementId = requiredReference(index, ["Referencia de la solicitud", "Referencia del acuerdo"]);
  const sourceDebtKey = requiredReference(index, ["Clave de la deuda principal"]);
  const sourcePrincipalCents = requiredMoney(index, ["Principal de la deuda de origen"]);
  const interestCents = requiredMoney(index, ["Intereses liquidados"]);
  const calculationStartDate = requiredDate(index, ["Inicio del cálculo de intereses"]);
  const calculationEndDate = requiredDate(index, ["Fin del cálculo de intereses"]);
  return interestLiquidationKey &&
    agreementId &&
    sourceDebtKey &&
    sourcePrincipalCents !== null &&
    interestCents !== null &&
    calculationStartDate &&
    calculationEndDate &&
    calculationStartDate <= calculationEndDate
    ? Object.freeze({
        interestLiquidationKey,
        agreementId,
        sourceDebtKey,
        sourcePrincipalCents,
        interestCents,
        calculationStartDate,
        calculationEndDate,
      })
    : null;
}

function parseDebtRows(index: DocumentIndexV6): readonly RealCorpusSeizureDebtRowV6[] {
  const rows: RealCorpusSeizureDebtRowV6[] = [];
  const seen = new Set<string>();
  for (const line of index.lines) {
    const match = /^DEUDA EMBARGADA\s*[|;]\s*([A-Z0-9./:_+-]+)\s*[|;]\s*([\d.,]+)(?:\s*(?:EUR|€))?$/u.exec(line.normalized);
    if (!match) continue;
    const debtKey = safeReference(match[1]!);
    const amountCents = parseMoney(match[2]!);
    if (!debtKey || amountCents === null || seen.has(debtKey) || rows.length >= 100) continue;
    seen.add(debtKey);
    rows.push(Object.freeze({ debtKey, amountCents, observedOnPage: line.pageNumber }));
  }
  return Object.freeze(rows);
}

function parseSeizure(
  index: DocumentIndexV6,
  assetKind: "MOVABLE_ASSET" | "REAL_ESTATE",
): RealCorpusSeizureSnapshotV6 | null {
  const seizureOrderId = requiredReference(index, ["Número de diligencia", "Referencia de la diligencia"]);
  const debtRows = parseDebtRows(index);
  const debtSubtotalCents = requiredMoney(index, ["Subtotal de deudas"]);
  const printedInterestCents = requiredMoney(index, ["Intereses impresos"]);
  const printedCostsCents = requiredMoney(index, ["Costas impresas"]);
  const seizeLimitCents = requiredMoney(index, ["Límite del embargo"]);
  const paymentFormPrintedTotalCents = requiredMoney(index, ["Total impreso en la carta"]);
  const paymentFormAmountCents = requiredMoney(index, ["Importe de la carta de pago"]);
  const actionDate = requiredDate(index, ["Fecha del acto", "Fecha de la diligencia"]);
  if (
    !seizureOrderId ||
    debtRows.length === 0 ||
    debtSubtotalCents === null ||
    printedInterestCents === null ||
    printedCostsCents === null ||
    seizeLimitCents === null ||
    paymentFormAmountCents === null ||
    debtRows.reduce((sum, row) => sum + row.amountCents, 0) !== debtSubtotalCents
  ) return null;
  return Object.freeze({
    seizureOrderId,
    actionDate,
    assetKind,
    debtRows,
    debtSubtotalCents,
    printedInterestCents,
    printedCostsCents,
    seizeLimitCents,
    paymentFormPrintedTotalCents,
    paymentFormAmountCents,
    hasPrintedAmountDiscrepancy:
      paymentFormPrintedTotalCents !== null &&
      paymentFormPrintedTotalCents !== paymentFormAmountCents,
  });
}

function recognizeNewFamily(index: DocumentIndexV6): RealCorpusFamilyIdV6 | null {
  if (contains(index, "RESOLUCIÓN DEL PROCEDIMIENTO SANCIONADOR"))
    return "sanction.resolution";
  if (contains(index, "EXIGENCIA DE REDUCCIÓN DE SANCIÓN") || contains(index, "PÉRDIDA DE REDUCCIÓN DE SANCIÓN"))
    return "sanction.loss_of_reduction";
  if (contains(index, "LIQUIDACIÓN INDEPENDIENTE DE INTERESES") || contains(index, "ACUERDO DE LIQUIDACIÓN DE INTERESES"))
    return "collection.interest_assessment";
  if (contains(index, "DILIGENCIA DE EMBARGO DE BIEN MUEBLE"))
    return "seizure.movable_asset";
  if (contains(index, "DILIGENCIA DE EMBARGO DE BIEN INMUEBLE"))
    return "seizure.real_estate";
  return null;
}

function canonicalTitle(familyId: RealCorpusFamilyIdV6): string {
  const titles: Record<RealCorpusFamilyIdV6, string> = {
    "collection.enforcement_order": "Providencia de apremio",
    "collection.deferral_grant": "Concesión de aplazamiento o fraccionamiento",
    "collection.deferral_denial": "Denegación de aplazamiento o fraccionamiento",
    "collection.interest_assessment": "Liquidación de intereses de demora",
    "sanction.resolution": "Resolución sancionadora",
    "sanction.loss_of_reduction": "Exigencia de reducción de sanción perdida",
    "seizure.movable_asset": "Diligencia de embargo de bien mueble",
    "seizure.real_estate": "Diligencia de embargo de inmueble",
  };
  return titles[familyId];
}

function subtypeFor(
  familyId: RealCorpusFamilyIdV6,
  index: DocumentIndexV6,
): RealCorpusSubtypeV6 {
  const wrapper = contains(index, "ENTREGA ANTERIOR FALLIDA") || contains(index, "NUEVO INTENTO DE NOTIFICACIÓN");
  if (familyId === "collection.enforcement_order")
    return wrapper ? "ENFORCEMENT_WITH_FAILED_DELIVERY_COVER" : "ENFORCEMENT_WITH_PAYMENT_FORM";
  if (familyId === "collection.deferral_grant")
    return wrapper ? "DEFERRAL_GRANT_WITH_FAILED_DELIVERY_COVER" : "DEFERRAL_GRANT_WITH_INSTALLMENT_SCHEDULE";
  if (familyId === "collection.deferral_denial") return "DEFERRAL_DENIAL_WITH_SEPARATE_INTEREST_BRANCH";
  if (familyId === "collection.interest_assessment") return "INDEPENDENT_INTEREST_ASSESSMENT";
  if (familyId === "sanction.resolution") return "SANCTION_RESOLUTION_WITH_HISTORICAL_REDUCTION";
  if (familyId === "sanction.loss_of_reduction") return "LOSS_OF_SANCTION_REDUCTION_WITH_OWN_DEBT_KEY";
  if (familyId === "seizure.movable_asset") return "MOVABLE_ASSET_SEIZURE_WITH_DEBT_AND_ASSET_ANNEX";
  return "REAL_ESTATE_SEIZURE_WITH_DEBT_AND_ASSET_ANNEX";
}

function segmentType(page: BoundedDocumentInput["pages"][number]): RealCorpusSegmentTypeV6 {
  const text = normalize(page.text);
  if (page.isBlank || !text) return "BLANK";
  if (/ENTREGA ANTERIOR FALLIDA|NUEVO INTENTO DE NOTIFICACION|COMUNICACION DE REENVIO/u.test(text)) return "DELIVERY_COVER";
  if (/PROVIDENCIA DE APREMIO|CONCESION DEL APLAZAMIENTO\/FRACCIONAMIENTO|DENEGACION DEL APLAZAMIENTO\/FRACCIONAMIENTO|LIQUIDACION INDEPENDIENTE DE INTERESES|RESOLUCION DEL PROCEDIMIENTO SANCIONADOR|EXIGENCIA DE REDUCCION DE SANCION|PERDIDA DE REDUCCION DE SANCION|DILIGENCIA DE EMBARGO DE BIEN MUEBLE|DILIGENCIA DE EMBARGO DE BIEN INMUEBLE/u.test(text)) return "PRIMARY_ACT";
  if (
    /ACUERDO DE LIQUIDACION DE INTERESES/u.test(text) &&
    /IDENTIFICACION DEL DOCUMENTO/u.test(text) &&
    /CLAVE DE LA LIQUIDACION DE INTERESES/u.test(text) &&
    /PLAZOS? DE PAGO/u.test(text) &&
    /RECURSOS?/u.test(text)
  ) return "PRIMARY_ACT";
  if (/CARTA DE PAGO|DOCUMENTO DE INGRESO|EJEMPLAR DEL INTERESADO|COPIA PARA LA ENTIDAD/u.test(text)) return "PAYMENT_FORM";
  if (/CANALES DE PAGO|INSTRUCCIONES DE PAGO|INFORMACION PARA PAGAR/u.test(text)) return "PAYMENT_INSTRUCTIONS";
  if (/CALENDARIO DE CUOTAS|ANEXO I: DEUDAS Y PLAZOS/u.test(text)) return "SCHEDULE";
  if (/ANEXO II|CALCULO DE INTERESES|ANEXO DE INTERESES|LIQUIDACION DE INTERESES DE DEMORA/u.test(text)) return "ANNEX_INTEREST_CALCULATION";
  if (/ANEXO DEL BIEN|DATOS DEL BIEN|BIEN EMBARGADO/u.test(text)) return "ASSET_ANNEX";
  if (/DEUDA EMBARGADA|ANEXO DE DEUDAS|DEUDAS DEL EXPEDIENTE EJECUTIVO/u.test(text)) return "DEBT_ANNEX";
  return "INFORMATION";
}

function segmentDocument(document: BoundedDocumentInput): readonly RealCorpusSegmentV6[] {
  const segments: RealCorpusSegmentV6[] = [];
  for (const page of document.pages) {
    const type = segmentType(page);
    const last = segments.at(-1);
    if (last?.type === type) {
      segments[segments.length - 1] = Object.freeze({
        ...last,
        pageNumbers: Object.freeze([...last.pageNumbers, page.pageNumber]),
      });
      continue;
    }
    const relationToPrimary =
      type === "DELIVERY_COVER" ? "DELIVERY_ATTEMPT_FOR"
        : type === "PRIMARY_ACT" ? "PRIMARY"
          : type === "PAYMENT_FORM" ? "PAYMENT_FORM_FOR"
            : type === "PAYMENT_INSTRUCTIONS" ? "INSTRUCTIONS_ONLY"
              : type === "INFORMATION" ? "INFORMATION_ONLY"
                : type === "BLANK" ? "BLANK" : "ANNEX_ONLY";
    segments.push(Object.freeze({
      segmentId: `part:${document.documentId}:${segments.length + 1}`,
      type,
      pageNumbers: Object.freeze([page.pageNumber]),
      relationToPrimary,
      provesPayment: false as const,
      createsIndependentDebt: false as const,
    }));
  }
  return Object.freeze(segments);
}

function specializedFields(
  index: DocumentIndexV6,
  primaryIndex: DocumentIndexV6,
  paymentFormIndex: DocumentIndexV6,
  familyId: RealCorpusFamilyIdV6,
  baseFields: readonly RealCorpusFieldV2[],
  sanction: RealCorpusSanctionResolutionV6 | null,
  loss: RealCorpusLossOfReductionV6 | null,
  interest: RealCorpusInterestAssessmentV6 | null,
  seizure: RealCorpusSeizureSnapshotV6 | null,
): readonly RealCorpusFieldV2[] {
  const fields: (RealCorpusFieldV2 | null)[] = [
    ...baseFields.filter((item) =>
      item.fieldCode !== "ISSUE_DATE" &&
      item.fieldCode !== "DOCUMENT_DATE" &&
      item.fieldCode !== "TAX_MODEL" &&
      item.fieldCode !== "PAYMENT_FORM_REFERENCE"
    ),
    dateField("ISSUE_DATE", "Fecha del documento", firstValue(primaryIndex, ["Fecha del documento", "Fecha de emisión"])),
    dateField("ACTION_DATE", "Fecha del acto", firstValue(primaryIndex, ["Fecha del acto", "Fecha del acuerdo", "Fecha de la resolución"])),
    referenceField("TAX_MODEL", "Modelo tributario", firstValue(primaryIndex, ["Modelo tributario"])),
    dateField("PAYMENT_FORM_DATE", "Fecha de la carta de pago", firstValue(paymentFormIndex, ["Fecha de la carta de pago", "Fecha del documento", "Fecha"])),
    referenceField("PAYMENT_FORM_MODEL", "Modelo de ingreso", firstValue(paymentFormIndex, ["Modelo de ingreso", "Modelo"])),
    referenceField("PAYMENT_FORM_REFERENCE", "Referencia de la carta de pago", firstValue(paymentFormIndex, ["Referencia de pago", "Referencia de la carta de pago", "Referencia"])),
  ];
  if (familyId === "collection.enforcement_order") {
    fields.push(
      moneyField(
        "ORDINARY_SURCHARGE_20",
        "Recargo ordinario del 20 %",
        firstMoneyValue(index, ["Recargo ordinario del 20 %", "Recargo de apremio ordinario"]),
      ),
    );
  }
  if (sanction) fields.push(
    referenceField("SANCTION_REFERENCE", "Referencia del expediente sancionador", firstValue(index, ["Referencia del expediente sancionador"])),
    referenceField("SANCTION_DEBT_KEY", "Clave de la sanción", firstValue(index, ["Clave de la sanción", "Clave de deuda de la sanción"])),
    moneyField("INITIAL_SANCTION", "Sanción inicial", firstValue(index, ["Sanción inicial"])),
    integerField("HISTORICAL_REDUCTION_PERCENT", "Porcentaje histórico de reducción", firstValue(index, ["Porcentaje histórico de reducción", "Reducción histórica impresa"])),
    moneyField("SANCTION_REDUCTION", "Reducción aplicada", firstValue(index, ["Reducción aplicada"])),
    moneyField("REDUCED_SANCTION", "Sanción reducida", firstValue(index, ["Sanción reducida"])),
    textField("HISTORICAL_PERCENT_POLICY", "Tratamiento del porcentaje", "HISTORICAL_PRINTED_VALUE"),
  );
  if (loss) fields.push(
    referenceField("ORIGIN_SANCTION_DEBT_KEY", "Clave de la sanción de origen", firstValue(index, ["Clave de la sanción de origen"])),
    referenceField("CLAWBACK_DEBT_KEY", "Clave de la reducción exigida", firstValue(index, ["Clave de la reducción exigida"])),
    integerField("HISTORICAL_REDUCTION_PERCENT", "Porcentaje histórico de reducción", firstValue(index, ["Porcentaje histórico de reducción", "Reducción histórica impresa"])),
    moneyField("CLAWBACK_AMOUNT", "Reducción perdida exigida", firstValue(index, ["Importe de la reducción exigida"])),
    textField("CLAIM_SCOPE", "Alcance de la exigencia", "REDUCTION_ONLY_NOT_FULL_SANCTION"),
  );
  if (interest) fields.push(
    referenceField("INTEREST_LIQUIDATION_KEY", "Clave de la liquidación de intereses", firstValue(index, ["Clave de la liquidación de intereses"])),
    referenceField("AGREEMENT_ID", "Referencia de la solicitud", firstValue(index, ["Referencia de la solicitud", "Referencia del acuerdo"])),
    referenceField("SOURCE_DEBT_KEY", "Clave de la deuda principal", firstValue(index, ["Clave de la deuda principal"])),
    moneyField("SOURCE_PRINCIPAL", "Principal de la deuda de origen", firstValue(index, ["Principal de la deuda de origen"])),
    moneyField("ASSESSED_INTEREST", "Intereses liquidados", firstValue(index, ["Intereses liquidados"])),
    dateField("INTEREST_CALCULATION_START", "Inicio del cálculo de intereses", firstValue(index, ["Inicio del cálculo de intereses"])),
    dateField("INTEREST_CALCULATION_END", "Fin del cálculo de intereses", firstValue(index, ["Fin del cálculo de intereses"])),
    textField("INTEREST_SCOPE", "Alcance de los intereses", "SEPARATE_FROM_PRINCIPAL"),
  );
  if (seizure) {
    fields.push(
      referenceField("SEIZURE_ORDER_ID", "Número de diligencia", firstValue(index, ["Número de diligencia", "Referencia de la diligencia"])),
      textField("ASSET_KIND", "Tipo de bien", seizure.assetKind),
      moneyField("DEBT_SUBTOTAL", "Subtotal de deudas", firstValue(index, ["Subtotal de deudas"])),
      moneyField("PRINTED_INTEREST", "Intereses indicados", firstValue(index, ["Intereses impresos"])),
      moneyField("PRINTED_COSTS", "Costas indicadas", firstValue(index, ["Costas impresas"])),
      moneyField("SEIZE_LIMIT", "Límite del embargo", firstValue(index, ["Límite del embargo"])),
      moneyField("PAYMENT_FORM_PRINTED_TOTAL", "Total indicado en la carta", firstValue(paymentFormIndex, ["Total impreso en la carta"])),
      moneyField("PAYMENT_FORM_AMOUNT", "Importe de la carta de pago", firstValue(paymentFormIndex, ["Importe de la carta de pago"])),
      textField(
        "PRINTED_AMOUNT_COMPARISON",
        "Comparación de importes",
        seizure.hasPrintedAmountDiscrepancy ? "DISCREPANCY_PRESERVED_WITH_EVIDENCE" : "PRINTED_AMOUNTS_MATCH",
      ),
      ...seizure.debtRows.flatMap((row, position) => [
        Object.freeze({
          fieldCode: `SEIZURE_DEBT_KEY_${position + 1}`,
          label: `Deuda incluida ${position + 1}`,
          kind: "REFERENCE" as const,
          value: row.debtKey,
          evidence: evidence(row.observedOnPage),
        }),
        Object.freeze({
          fieldCode: `SEIZURE_DEBT_AMOUNT_${position + 1}`,
          label: `Importe de deuda incluida ${position + 1}`,
          kind: "MONEY" as const,
          amountCents: row.amountCents,
          currency: "EUR" as const,
          evidence: evidence(row.observedOnPage),
        }),
      ]),
    );
  }
  if (familyId === "collection.deferral_denial") {
    fields.push(textField("DENIAL_DEADLINE_RULE", "Regla del plazo tras denegación", "DEPENDS_ON_EFFECTIVE_RECEIPT"));
  }
  return compactFields(fields);
}

function unknown(
  document: BoundedDocumentInput,
  index: DocumentIndexV6,
): RealCorpusExtractorOutcomeV6 {
  return Object.freeze({
    schemaVersion: REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V6,
    extractorVersion: REAL_CORPUS_EXTRACTOR_VERSION_V6,
    sourceDocumentId: document.documentId,
    status: "UNKNOWN",
    familyId: null,
    subtype: null,
    canonicalTitle: null,
    physicalPageCount: document.pages.length,
    contentPageCount: document.pages.length - index.blankPageNumbers.size,
    fields: Object.freeze([]),
    installments: Object.freeze([]),
    deniedDebt: null,
    existingExecutiveDebtsCitedAsReason: Object.freeze([]),
    sanctionResolution: null,
    lossOfReduction: null,
    interestAssessment: null,
    seizureSnapshot: null,
    paymentFormReferences: Object.freeze([]),
    paymentFormOperationCount: 0,
    amountScenarios: Object.freeze([]),
    segments: Object.freeze([]),
    explanation: null,
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED",
    confirmsDebt: false,
    confirmsPayment: false,
    confirmsRemittance: false,
    confirmsDeadline: false,
    confirmsDebtExtinction: false,
  });
}

/** Deterministic V6 layer. It never persists source text or direct identity. */
export async function extractAeatRealCorpusDocumentV6(
  document: BoundedDocumentInput,
): Promise<RealCorpusExtractorOutcomeV6> {
  assertBoundedDocumentInput(document);
  assertNotAborted(document.signal);
  const index = buildIndex(document);
  if (!contains(index, "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA") && !contains(index, "AEAT"))
    return unknown(document, index);

  const base = await extractAeatRealCorpusDocumentV5(document);
  const baseFamily =
    base.status === "REVIEW_REQUIRED" &&
    base.familyId &&
    (REAL_CORPUS_FAMILY_IDS_V6 as readonly string[]).includes(base.familyId)
      ? base.familyId as RealCorpusFamilyIdV6
      : null;
  const newFamily = recognizeNewFamily(index);
  const familyId = baseFamily ?? newFamily;
  if (!familyId) return unknown(document, index);

  const sanction = familyId === "sanction.resolution" ? parseSanctionResolution(index) : null;
  const loss = familyId === "sanction.loss_of_reduction" ? parseLossOfReduction(index) : null;
  const interest = familyId === "collection.interest_assessment" ? parseInterestAssessment(index) : null;
  const seizure = familyId === "seizure.movable_asset"
    ? parseSeizure(index, "MOVABLE_ASSET")
    : familyId === "seizure.real_estate"
      ? parseSeizure(index, "REAL_ESTATE")
      : null;
  if (
    (familyId === "sanction.resolution" && !sanction) ||
    (familyId === "sanction.loss_of_reduction" && !loss) ||
    (familyId === "collection.interest_assessment" && !interest) ||
    ((familyId === "seizure.movable_asset" || familyId === "seizure.real_estate") && !seizure)
  ) return unknown(document, index);

  const segments = segmentDocument(document);
  const paymentFormSegments = segments.filter((segment) => segment.type === "PAYMENT_FORM");
  const primaryPageNumbers = segments
    .filter((segment) => segment.type === "PRIMARY_ACT")
    .flatMap((segment) => segment.pageNumbers);
  const paymentFormPageNumbers = paymentFormSegments.flatMap((segment) => segment.pageNumbers);
  const primaryIndex = indexForPages(index, primaryPageNumbers);
  const paymentFormIndex = indexForPages(index, paymentFormPageNumbers);
  const result: RealCorpusExtractorOutcomeV6 = Object.freeze({
    schemaVersion: REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V6,
    extractorVersion: REAL_CORPUS_EXTRACTOR_VERSION_V6,
    sourceDocumentId: document.documentId,
    status: "REVIEW_REQUIRED",
    familyId,
    subtype: subtypeFor(familyId, index),
    canonicalTitle: canonicalTitle(familyId),
    physicalPageCount: document.pages.length,
    contentPageCount: document.pages.length - index.blankPageNumbers.size,
    fields: specializedFields(
      index,
      primaryIndex,
      paymentFormIndex,
      familyId,
      base.status === "REVIEW_REQUIRED" && base.familyId === familyId ? base.fields : Object.freeze([]),
      sanction,
      loss,
      interest,
      seizure,
    ),
    installments:
      familyId === "collection.deferral_grant" && base.status === "REVIEW_REQUIRED"
        ? Object.freeze([...base.installments])
        : Object.freeze([]),
    deniedDebt:
      familyId === "collection.deferral_denial" && base.status === "REVIEW_REQUIRED"
        ? base.deniedDebt
        : null,
    existingExecutiveDebtsCitedAsReason:
      familyId === "collection.deferral_denial" && base.status === "REVIEW_REQUIRED"
        ? Object.freeze([...base.existingExecutiveDebtsCitedAsReason])
        : Object.freeze([]),
    sanctionResolution: sanction,
    lossOfReduction: loss,
    interestAssessment: interest,
    seizureSnapshot: seizure,
    paymentFormReferences:
      base.status === "REVIEW_REQUIRED" && base.familyId === familyId
        ? Object.freeze([...base.paymentFormReferences])
        : Object.freeze([]),
    paymentFormOperationCount: paymentFormSegments.length > 0 ? 1 : 0,
    amountScenarios:
      familyId === "collection.enforcement_order" && base.status === "REVIEW_REQUIRED"
        ? Object.freeze([...base.amountScenarios])
        : Object.freeze([]),
    segments,
    explanation: REAL_CORPUS_EXPLANATIONS_V6[familyId],
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED",
    confirmsDebt: false,
    confirmsPayment: false,
    confirmsRemittance: false,
    confirmsDeadline: false,
    confirmsDebtExtinction: false,
  });
  assertNotAborted(document.signal);
  return result;
}
