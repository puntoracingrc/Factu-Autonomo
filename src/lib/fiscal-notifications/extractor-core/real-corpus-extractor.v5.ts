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
  extractAeatRealCorpusDocumentV4,
  type RealCorpusInstallmentV4,
} from "./real-corpus-extractor.v4";

export const REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V5 = 5 as const;
export const REAL_CORPUS_EXTRACTOR_VERSION_V5 =
  "aeat-real-corpus-extractor.2026-07-17.v5" as const;

export const REAL_CORPUS_FAMILY_IDS_V5 = Object.freeze([
  "collection.enforcement_order",
  "collection.deferral_grant",
  "collection.deferral_denial",
  "seizure.commercial_credits",
] as const);
export type RealCorpusFamilyIdV5 = (typeof REAL_CORPUS_FAMILY_IDS_V5)[number];

export type RealCorpusSubtypeV5 =
  | "ENFORCEMENT_WITH_ONE_OR_TWO_PAYMENT_FORM_COPIES"
  | "ENFORCEMENT_WITH_FAILED_DELIVERY_COVER"
  | "DEFERRAL_GRANT_WITH_INSTALLMENT_SCHEDULE"
  | "DEFERRAL_GRANT_WITH_FAILED_DELIVERY_COVER"
  | "DEFERRAL_DENIAL_WITH_EXECUTIVE_DEBT_ANNEX"
  | "DEBTOR_COPY_COMMERCIAL_CREDIT_SEIZURE";

export type RealCorpusSegmentTypeV5 =
  | "DELIVERY_COVER"
  | "PRIMARY_ACT"
  | "DEBT_ANNEX"
  | "SCHEDULE"
  | "INTEREST_ASSESSMENT"
  | "PAYMENT_FORM"
  | "PAYMENT_INSTRUCTIONS"
  | "BLANK";

export interface RealCorpusSegmentV5 {
  readonly segmentId: string;
  readonly type: RealCorpusSegmentTypeV5;
  readonly pageNumbers: readonly number[];
  readonly relationToPrimary:
    | "DELIVERY_ATTEMPT_FOR"
    | "PRIMARY"
    | "ANNEX_ONLY"
    | "PAYMENT_FORM_FOR"
    | "INSTRUCTIONS_ONLY"
    | "BLANK";
  readonly provesPayment: false;
  readonly createsIndependentDebt: false;
}

export interface RealCorpusInstallmentV5 {
  readonly sequence: number;
  readonly dueDate: string;
  readonly baseCents: number;
  readonly deferralInterestCents: number;
  readonly totalCents: number;
  readonly paymentFormReference: string | null;
  readonly pageNumber: number;
}

export interface RealCorpusDeniedDebtV5 {
  readonly debtKey: string;
  readonly principalCents: number;
  readonly paymentFormReference: string | null;
  readonly observedOnPage: number;
}

export interface RealCorpusExistingExecutiveDebtV5 {
  readonly debtKey: string;
  readonly snapshotAmountCents: number;
  readonly observedOnPage: number;
}

export interface RealCorpusExplanationV5 {
  readonly whatIs: string;
  readonly action: string;
  readonly deadline: string;
  readonly consequence: string;
}

export interface RealCorpusExtractorOutcomeV5 {
  readonly schemaVersion: typeof REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V5;
  readonly extractorVersion: typeof REAL_CORPUS_EXTRACTOR_VERSION_V5;
  readonly sourceDocumentId: string;
  readonly status: "REVIEW_REQUIRED" | "UNKNOWN";
  readonly familyId: RealCorpusFamilyIdV5 | null;
  readonly subtype: RealCorpusSubtypeV5 | null;
  readonly canonicalTitle: string | null;
  readonly physicalPageCount: number;
  readonly contentPageCount: number;
  readonly fields: readonly RealCorpusFieldV2[];
  readonly installments: readonly RealCorpusInstallmentV5[];
  readonly deniedDebt: RealCorpusDeniedDebtV5 | null;
  readonly existingExecutiveDebtsCitedAsReason: readonly RealCorpusExistingExecutiveDebtV5[];
  readonly paymentFormReferences: readonly string[];
  readonly paymentFormOperationCount: 0 | 1;
  readonly amountScenarios: readonly RealCorpusAmountScenarioV3[];
  readonly segments: readonly RealCorpusSegmentV5[];
  readonly explanation: RealCorpusExplanationV5 | null;
  readonly recipientRole: "NONE" | "PRIMARY_DEBTOR";
  readonly thirdPartyRole: "NONE" | "GARNISHED_THIRD_PARTY_WITHOUT_IDENTITY";
  readonly seizedAmountCents: number | null;
  readonly retainedAmountCents: null;
  readonly remittedAmountCents: null;
  readonly sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST";
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED";
  readonly confirmsDebt: false;
  readonly confirmsPayment: false;
  readonly confirmsRemittance: false;
  readonly confirmsDeadline: false;
}

interface IndexedLineV5 {
  readonly pageNumber: number;
  readonly raw: string;
  readonly normalized: string;
}

interface DocumentIndexV5 {
  readonly lines: readonly IndexedLineV5[];
  readonly normalizedText: string;
  readonly blankPageNumbers: ReadonlySet<number>;
}

const SPANISH_DATE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/u;
const REFERENCE = /^[A-Z0-9][A-Z0-9./:_+-]{1,199}$/u;
const PRIVATE_REFERENCE =
  /^(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]|ES\d{22}|[6789]\d{8})$/u;

export const REAL_CORPUS_EXPLANATIONS_V5: Readonly<
  Record<RealCorpusFamilyIdV5, RealCorpusExplanationV5>
> = Object.freeze({
  "collection.enforcement_order": Object.freeze({
    whatIs:
      "Es una providencia de apremio: la AEAT indica que una deuda o una cuota no se pagó al terminar su período voluntario y pasa a vía ejecutiva.",
    action:
      "Comprueba la clave, el vencimiento y el principal. Si procede de un fraccionamiento, contrástalo con la fila exacta del calendario.",
    deadline:
      "El último día para pagar depende de la recepción efectiva. La fecha de emisión, la carátula o el escaneo no sustituyen esa fecha.",
    consequence:
      "Los recargos del 5 %, 10 % y 20 % son alternativas. Una carta de pago permite pagar, pero no demuestra que el pago se haya realizado.",
  }),
  "collection.deferral_grant": Object.freeze({
    whatIs:
      "La AEAT concede pagar una deuda mediante el calendario de cuotas e intereses que figura en el acuerdo.",
    action:
      "Revisa por separado la base, el interés y el total de cada cuota y conserva su vencimiento exacto.",
    deadline:
      "Cada cuota tiene su propia fecha. La carátula de reenvío y la fecha de escaneo no cambian el calendario.",
    consequence:
      "La concesión no acredita que ninguna cuota esté pagada; un apremio posterior solo se enlaza si coinciden clave, fecha y total vencido.",
  }),
  "collection.deferral_denial": Object.freeze({
    whatIs:
      "La AEAT deniega aplazar una deuda concreta. El anexo puede citar otras deudas que ya estaban en vía ejecutiva únicamente como motivo de la denegación.",
    action:
      "Distingue la deuda denegada de las deudas citadas. La carta adjunta corresponde a la deuda denegada y no acredita pago.",
    deadline:
      "El plazo de la deuda denegada depende de la recepción efectiva. Las deudas citadas no reciben por este documento un nuevo plazo.",
    consequence:
      "La denegación no crea las deudas ejecutivas citadas ni permite sumarlas al importe cuya solicitud se deniega.",
  }),
  "seizure.commercial_credits": Object.freeze({
    whatIs:
      "La AEAT ha ordenado a un tercero que retenga los pagos que deba al deudor hasta el límite indicado.",
    action:
      "Si recibes la copia como deudor, revisa la deuda y el límite; el anexo de contestación corresponde al tercero pagador.",
    deadline:
      "La obligación de contestar del tercero depende de su recepción. La copia dirigida al deudor no le traslada esa obligación.",
    consequence:
      "El límite embargado no prueba que el tercero haya retenido o ingresado dinero; esos hechos necesitan evidencia posterior.",
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

function buildIndex(document: BoundedDocumentInput): DocumentIndexV5 {
  const lines: IndexedLineV5[] = [];
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

function contains(index: DocumentIndexV5, value: string): boolean {
  return index.normalizedText.includes(normalize(value));
}

function lineValues(index: DocumentIndexV5, labels: readonly string[]): readonly IndexedLineV5[] {
  const normalizedLabels = labels.map(normalize);
  const values: IndexedLineV5[] = [];
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

function firstValue(index: DocumentIndexV5, labels: readonly string[]): IndexedLineV5 | null {
  return lineValues(index, labels)[0] ?? null;
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
  source: IndexedLineV5 | null,
): RealCorpusFieldV2 | null {
  const value = source ? safeReference(source.raw) : null;
  return value && source
    ? Object.freeze({
        fieldCode,
        label,
        kind: "REFERENCE" as const,
        value,
        evidence: evidence(source.pageNumber),
      })
    : null;
}

function dateField(
  fieldCode: string,
  label: string,
  source: IndexedLineV5 | null,
): RealCorpusFieldV2 | null {
  const value = source ? parseDate(source.raw) : null;
  return value && source
    ? Object.freeze({
        fieldCode,
        label,
        kind: "DATE" as const,
        value,
        evidence: evidence(source.pageNumber),
      })
    : null;
}

function moneyField(
  fieldCode: string,
  label: string,
  source: IndexedLineV5 | null,
): RealCorpusFieldV2 | null {
  const amountCents = source ? parseMoney(source.raw) : null;
  return amountCents !== null && source
    ? Object.freeze({
        fieldCode,
        label,
        kind: "MONEY" as const,
        amountCents,
        currency: "EUR" as const,
        evidence: evidence(source.pageNumber),
      })
    : null;
}

function textField(
  fieldCode: string,
  label: string,
  value: string,
  pageNumber = 1,
): RealCorpusFieldV2 {
  return Object.freeze({
    fieldCode,
    label,
    kind: "TEXT" as const,
    value,
    evidence: evidence(pageNumber),
  });
}

function compact(
  values: readonly (RealCorpusFieldV2 | null)[],
): readonly RealCorpusFieldV2[] {
  const byIdentity = new Map<string, RealCorpusFieldV2>();
  for (const value of values) {
    if (!value) continue;
    const identity = `${value.fieldCode}:${value.kind}:${
      value.kind === "MONEY" ? value.amountCents : "value" in value ? String(value.value) : ""
    }`;
    if (!byIdentity.has(identity)) byIdentity.set(identity, value);
  }
  return Object.freeze([...byIdentity.values()]);
}

function mapInstallment(item: RealCorpusInstallmentV4): RealCorpusInstallmentV5 {
  return Object.freeze({
    sequence: item.sequence,
    dueDate: item.dueDate,
    baseCents: item.principalCents,
    deferralInterestCents: item.interestCents,
    totalCents: item.totalCents,
    paymentFormReference: item.paymentFormReference,
    pageNumber: item.pageNumber,
  });
}

function deniedDebt(index: DocumentIndexV5): RealCorpusDeniedDebtV5 | null {
  for (const line of index.lines) {
    const match = /^DEUDA DENEGADA\s*[|;]\s*([A-Z0-9./:_+-]+)\s*[|;]\s*([\d.,]+)(?:\s*(?:EUR|€))?(?:\s*[|;]\s*([A-Z0-9./:_+-]+))?$/u.exec(
      line.normalized,
    );
    if (!match) continue;
    const debtKey = safeReference(match[1]!);
    const principalCents = parseMoney(match[2]!);
    const paymentFormReference = match[3] ? safeReference(match[3]) : null;
    if (debtKey && principalCents !== null) {
      return Object.freeze({
        debtKey,
        principalCents,
        paymentFormReference,
        observedOnPage: line.pageNumber,
      });
    }
  }
  const key = firstValue(index, ["Clave de la deuda denegada", "Clave de deuda"]);
  const amount = firstValue(index, ["Principal denegado", "Importe denegado"]);
  const debtKey = key ? safeReference(key.raw) : null;
  const principalCents = amount ? parseMoney(amount.raw) : null;
  return debtKey && principalCents !== null
    ? Object.freeze({
        debtKey,
        principalCents,
        paymentFormReference: safeReference(
          firstValue(index, ["Referencia de la carta de pago"])?.raw ?? "",
        ),
        observedOnPage: key!.pageNumber,
      })
    : null;
}

function citedExecutiveDebts(
  index: DocumentIndexV5,
): readonly RealCorpusExistingExecutiveDebtV5[] {
  const result: RealCorpusExistingExecutiveDebtV5[] = [];
  const seen = new Set<string>();
  for (const line of index.lines) {
    const match = /^DEUDA EJECUTIVA CITADA\s*[|;]\s*([A-Z0-9./:_+-]+)\s*[|;]\s*([\d.,]+)(?:\s*(?:EUR|€))?$/u.exec(
      line.normalized,
    );
    if (!match) continue;
    const debtKey = safeReference(match[1]!);
    const snapshotAmountCents = parseMoney(match[2]!);
    if (
      debtKey &&
      snapshotAmountCents !== null &&
      !seen.has(debtKey) &&
      result.length < 50
    ) {
      seen.add(debtKey);
      result.push(
        Object.freeze({
          debtKey,
          snapshotAmountCents,
          observedOnPage: line.pageNumber,
        }),
      );
    }
  }
  return Object.freeze(result);
}

function subtypeFor(
  familyId: RealCorpusFamilyIdV5,
  index: DocumentIndexV5,
): RealCorpusSubtypeV5 {
  if (familyId === "collection.enforcement_order") {
    return contains(index, "ENTREGA ANTERIOR FALLIDA") ||
      contains(index, "NUEVO INTENTO DE NOTIFICACIÓN")
      ? "ENFORCEMENT_WITH_FAILED_DELIVERY_COVER"
      : "ENFORCEMENT_WITH_ONE_OR_TWO_PAYMENT_FORM_COPIES";
  }
  if (familyId === "collection.deferral_grant") {
    return contains(index, "ENTREGA ANTERIOR FALLIDA") ||
      contains(index, "NUEVO INTENTO DE NOTIFICACIÓN")
      ? "DEFERRAL_GRANT_WITH_FAILED_DELIVERY_COVER"
      : "DEFERRAL_GRANT_WITH_INSTALLMENT_SCHEDULE";
  }
  return familyId === "collection.deferral_denial"
    ? "DEFERRAL_DENIAL_WITH_EXECUTIVE_DEBT_ANNEX"
    : "DEBTOR_COPY_COMMERCIAL_CREDIT_SEIZURE";
}

function canonicalTitle(familyId: RealCorpusFamilyIdV5): string {
  if (familyId === "collection.enforcement_order") return "Providencia de apremio";
  if (familyId === "collection.deferral_grant")
    return "Concesión de aplazamiento o fraccionamiento";
  if (familyId === "collection.deferral_denial")
    return "Denegación de aplazamiento o fraccionamiento";
  return "Embargo de créditos comerciales";
}

function segmentType(page: BoundedDocumentInput["pages"][number]): RealCorpusSegmentTypeV5 {
  const text = normalize(page.text);
  if (page.isBlank || !text) return "BLANK";
  if (/ENTREGA ANTERIOR FALLIDA|NUEVO INTENTO DE NOTIFICACION|COMUNICACION DE REENVIO/u.test(text))
    return "DELIVERY_COVER";
  if (
    /PROVIDENCIA DE APREMIO|CONCESION DEL APLAZAMIENTO\/FRACCIONAMIENTO|DENEGACION DEL APLAZAMIENTO\/FRACCIONAMIENTO|DILIGENCIA DE EMBARGO DE CREDITOS/u.test(
      text,
    )
  ) {
    return "PRIMARY_ACT";
  }
  if (/CARTA DE PAGO|DOCUMENTO DE INGRESO|EJEMPLAR DEL INTERESADO|COPIA PARA LA ENTIDAD/u.test(text))
    return "PAYMENT_FORM";
  if (/CANALES DE PAGO|INSTRUCCIONES DE PAGO|INFORMACION PARA PAGAR/u.test(text))
    return "PAYMENT_INSTRUCTIONS";
  if (/CALENDARIO DE CUOTAS|ANEXO I: DEUDAS Y PLAZOS/u.test(text)) return "SCHEDULE";
  if (/LIQUIDACION DE INTERESES DE DEMORA|CALCULO DE INTERESES/u.test(text))
    return "INTEREST_ASSESSMENT";
  if (/DEUDA DENEGADA|DEUDAS EJECUTIVAS CITADAS|ANEXO DE DEUDAS|DEUDAS DEL EXPEDIENTE EJECUTIVO/u.test(text))
    return "DEBT_ANNEX";
  return "PRIMARY_ACT";
}

function segmentDocument(document: BoundedDocumentInput): readonly RealCorpusSegmentV5[] {
  const segments: RealCorpusSegmentV5[] = [];
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
      type === "DELIVERY_COVER"
        ? "DELIVERY_ATTEMPT_FOR"
        : type === "PRIMARY_ACT"
          ? "PRIMARY"
          : type === "PAYMENT_FORM"
            ? "PAYMENT_FORM_FOR"
            : type === "PAYMENT_INSTRUCTIONS"
              ? "INSTRUCTIONS_ONLY"
              : type === "BLANK"
                ? "BLANK"
                : "ANNEX_ONLY";
    segments.push(
      Object.freeze({
        segmentId: `part:${document.documentId}:${segments.length + 1}`,
        type,
        pageNumbers: Object.freeze([page.pageNumber]),
        relationToPrimary,
        provesPayment: false as const,
        createsIndependentDebt: false as const,
      }),
    );
  }
  return Object.freeze(segments);
}

function v5Fields(
  index: DocumentIndexV5,
  familyId: RealCorpusFamilyIdV5,
  baseFields: readonly RealCorpusFieldV2[],
  denied: RealCorpusDeniedDebtV5 | null,
  cited: readonly RealCorpusExistingExecutiveDebtV5[],
): readonly RealCorpusFieldV2[] {
  const fields: (RealCorpusFieldV2 | null)[] = [
    ...baseFields,
    dateField("ISSUE_DATE", "Fecha del documento", firstValue(index, ["Fecha de emisión", "Fecha del documento"])),
    dateField("ACTION_DATE", "Fecha del acto", firstValue(index, ["Fecha del acto", "Fecha del acuerdo"])),
    dateField("VOLUNTARY_END_DATE", "Fin del período voluntario", firstValue(index, ["Fin del período voluntario", "Vencimiento voluntario"])),
    referenceField("DEBT_KEY", "Clave de deuda", firstValue(index, ["Clave de deuda", "Clave de liquidación"])),
    moneyField("OUTSTANDING_PRINCIPAL", "Principal pendiente", firstValue(index, ["Principal pendiente"])),
    moneyField("ORDINARY_SURCHARGE_20", "Recargo ordinario del 20 %", firstValue(index, ["Recargo ordinario del 20 %", "Recargo de apremio ordinario"])),
    moneyField("ORDINARY_TOTAL", "Total con recargo ordinario", firstValue(index, ["Total ordinario", "Total con recargo ordinario"])),
    moneyField("REDUCED_10_TOTAL", "Importe con recargo reducido", firstValue(index, ["Total con recargo reducido 10 %", "Importe con recargo reducido"])),
    moneyField("CONDITIONAL_EXECUTIVE_5_SURCHARGE", "Recargo del 5 % si el principal ya se pagó", firstValue(index, ["Recargo ejecutivo 5 %", "Recargo del 5 %"])),
    referenceField("PAYMENT_FORM_REFERENCE", "Referencia de la carta de pago", firstValue(index, ["Referencia de pago", "Referencia de la carta de pago"])),
    moneyField("SEIZED_AMOUNT", "Importe embargado", firstValue(index, ["Importe a embargar", "Límite del embargo"])),
  ];
  if (familyId === "collection.deferral_denial") {
    fields.push(
      denied
        ? Object.freeze({
            fieldCode: "DENIED_DEBT_KEY",
            label: "Clave de la deuda denegada",
            kind: "REFERENCE" as const,
            value: denied.debtKey,
            evidence: evidence(denied.observedOnPage),
          })
        : null,
      denied
        ? Object.freeze({
            fieldCode: "DENIED_PRINCIPAL",
            label: "Principal denegado",
            kind: "MONEY" as const,
            amountCents: denied.principalCents,
            currency: "EUR" as const,
            evidence: evidence(denied.observedOnPage),
          })
        : null,
      textField("DENIAL_DEADLINE_RULE", "Regla del plazo tras denegación", "DEPENDS_ON_EFFECTIVE_RECEIPT"),
      ...cited.flatMap((item, indexValue) => [
        Object.freeze({
          fieldCode: `CITED_EXECUTIVE_DEBT_KEY_${indexValue + 1}`,
          label: `Deuda ejecutiva citada ${indexValue + 1}`,
          kind: "REFERENCE" as const,
          value: item.debtKey,
          evidence: evidence(item.observedOnPage),
        }),
        Object.freeze({
          fieldCode: `CITED_EXECUTIVE_DEBT_AMOUNT_${indexValue + 1}`,
          label: `Importe de deuda ejecutiva citada ${indexValue + 1}`,
          kind: "MONEY" as const,
          amountCents: item.snapshotAmountCents,
          currency: "EUR" as const,
          evidence: evidence(item.observedOnPage),
        }),
      ]),
    );
  }
  if (familyId === "seizure.commercial_credits") {
    fields.push(
      textField("RECIPIENT_ROLE", "Destinatario operativo", "PRIMARY_DEBTOR"),
      textField("THIRD_PARTY_ROLE", "Papel del tercero", "GARNISHED_THIRD_PARTY_WITHOUT_IDENTITY"),
      textField("RESPONSE_OBLIGATION", "Obligación de contestar", "THIRD_PARTY_ONLY"),
      textField("RETENTION_STATE", "Estado de la retención", "NOT_CONFIRMED"),
      textField("REMITTANCE_STATE", "Estado del ingreso al Tesoro", "NOT_CONFIRMED"),
    );
  }
  return compact(fields);
}

function unknown(
  document: BoundedDocumentInput,
  index: DocumentIndexV5,
): RealCorpusExtractorOutcomeV5 {
  return Object.freeze({
    schemaVersion: REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V5,
    extractorVersion: REAL_CORPUS_EXTRACTOR_VERSION_V5,
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
    paymentFormReferences: Object.freeze([]),
    paymentFormOperationCount: 0,
    amountScenarios: Object.freeze([]),
    segments: Object.freeze([]),
    explanation: null,
    recipientRole: "NONE",
    thirdPartyRole: "NONE",
    seizedAmountCents: null,
    retainedAmountCents: null,
    remittedAmountCents: null,
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED",
    confirmsDebt: false,
    confirmsPayment: false,
    confirmsRemittance: false,
    confirmsDeadline: false,
  });
}

/**
 * Deterministic V5 extractor. It consumes only bounded in-memory text and
 * repository-safe contracts; it never persists the source or identifies a
 * person or third party.
 */
export async function extractAeatRealCorpusDocumentV5(
  document: BoundedDocumentInput,
): Promise<RealCorpusExtractorOutcomeV5> {
  assertBoundedDocumentInput(document);
  assertNotAborted(document.signal);
  const index = buildIndex(document);
  if (
    !contains(index, "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA") &&
    !contains(index, "AEAT")
  ) {
    return unknown(document, index);
  }
  const base = await extractAeatRealCorpusDocumentV4(document);
  const denial =
    contains(index, "DENEGACIÓN DEL APLAZAMIENTO/FRACCIONAMIENTO") &&
    contains(index, "DEUDA DENEGADA") &&
    contains(index, "DEUDAS EJECUTIVAS CITADAS");
  const familyId: RealCorpusFamilyIdV5 | null = denial
    ? "collection.deferral_denial"
    : base.status === "REVIEW_REQUIRED" &&
        base.familyId &&
        (REAL_CORPUS_FAMILY_IDS_V5 as readonly string[]).includes(base.familyId)
      ? (base.familyId as RealCorpusFamilyIdV5)
      : null;
  if (!familyId) return unknown(document, index);

  const denied = familyId === "collection.deferral_denial" ? deniedDebt(index) : null;
  const cited =
    familyId === "collection.deferral_denial"
      ? citedExecutiveDebts(index)
      : Object.freeze([]);
  const segments = segmentDocument(document);
  const paymentFormSegments = segments.filter((segment) => segment.type === "PAYMENT_FORM");
  const paymentFormReferences = Object.freeze([
    ...new Set(
      [
        ...(base.status === "REVIEW_REQUIRED" ? base.paymentFormReferences : []),
        denied?.paymentFormReference ?? null,
        safeReference(firstValue(index, ["Referencia de pago", "Referencia de la carta de pago"])?.raw ?? ""),
      ].filter((value): value is string => value !== null),
    ),
  ]);
  const seizedAmountCents = parseMoney(
    firstValue(index, ["Importe a embargar", "Límite del embargo"])?.raw ?? "",
  );
  const result = Object.freeze({
    schemaVersion: REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V5,
    extractorVersion: REAL_CORPUS_EXTRACTOR_VERSION_V5,
    sourceDocumentId: document.documentId,
    status: "REVIEW_REQUIRED" as const,
    familyId,
    subtype: subtypeFor(familyId, index),
    canonicalTitle: canonicalTitle(familyId),
    physicalPageCount: document.pages.length,
    contentPageCount: document.pages.length - index.blankPageNumbers.size,
    fields: v5Fields(
      index,
      familyId,
      base.status === "REVIEW_REQUIRED" ? base.fields : Object.freeze([]),
      denied,
      cited,
    ),
    installments:
      familyId === "collection.deferral_grant" && base.status === "REVIEW_REQUIRED"
        ? Object.freeze(base.installments.map(mapInstallment))
        : Object.freeze([]),
    deniedDebt: denied,
    existingExecutiveDebtsCitedAsReason: cited,
    paymentFormReferences,
    paymentFormOperationCount: paymentFormSegments.length > 0 ? (1 as const) : (0 as const),
    amountScenarios:
      familyId === "collection.enforcement_order" && base.status === "REVIEW_REQUIRED"
        ? base.amountScenarios
        : (Object.freeze([]) as readonly RealCorpusAmountScenarioV3[]),
    segments,
    explanation: REAL_CORPUS_EXPLANATIONS_V5[familyId],
    recipientRole:
      familyId === "seizure.commercial_credits" ? ("PRIMARY_DEBTOR" as const) : ("NONE" as const),
    thirdPartyRole:
      familyId === "seizure.commercial_credits"
        ? ("GARNISHED_THIRD_PARTY_WITHOUT_IDENTITY" as const)
        : ("NONE" as const),
    seizedAmountCents:
      familyId === "seizure.commercial_credits" ? seizedAmountCents : null,
    retainedAmountCents: null,
    remittedAmountCents: null,
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST" as const,
    retainedSourceContent: "NONE" as const,
    requiresHumanReview: true as const,
    materializationPolicy: "PROHIBITED" as const,
    confirmsDebt: false as const,
    confirmsPayment: false as const,
    confirmsRemittance: false as const,
    confirmsDeadline: false as const,
  });
  assertNotAborted(document.signal);
  return result;
}
