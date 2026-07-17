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

export const REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V4 = 4 as const;
export const REAL_CORPUS_EXTRACTOR_VERSION_V4 =
  "aeat-real-corpus-extractor.2026-07-17.v4" as const;

export const REAL_CORPUS_FAMILY_IDS_V4 = Object.freeze([
  "identity.clave_registration_receipt",
  "seizure.release",
  "assessment.final_provisional_assessment",
  "seizure.compliance_reiteration",
  "assessment.allegations_and_proposal",
  "seizure.commercial_credits",
  "seizure.bank_account",
  "collection.enforcement_order",
  "collection.deferral_grant",
  "seizure.movable_asset",
] as const);
export type RealCorpusFamilyIdV4 = (typeof REAL_CORPUS_FAMILY_IDS_V4)[number];

export type RealCorpusSubtypeV4 =
  | "HIGH_LEVEL_REGISTRATION_WITH_TERMS"
  | "MOVABLE_ASSET_RELEASE_WITH_ASSET_ANNEX"
  | "REAL_ESTATE_RELEASE_WITH_REGISTRY_ANNEX"
  | "COMMERCIAL_CREDIT_RELEASE_TO_THIRD_PARTY"
  | "MODEL_180_115_MISMATCH_WITH_INTEREST_AND_PAYMENT_FORM"
  | "THIRD_PARTY_CREDIT_RESPONSE_REITERATION"
  | "MODEL_180_115_MISMATCH_LIMITED_CHECK"
  | "THIRD_PARTY_PAYER_RESPONSE_AND_MULTIPLE_PAYMENT_FORMS"
  | "DEBTOR_NOTICE_WITH_BANK_ANNEX_AND_DELAYED_TRANSFER"
  | "DEFAULTED_DEFERRAL_INSTALLMENT_WITH_PAYMENT_FORM"
  | "THREE_INSTALLMENTS_WITH_INTEREST_SCHEDULE"
  | "DEBTOR_NOTICE_MULTI_DEBT_COMMERCIAL_CREDIT_SEIZURE"
  | "STANDARD_ENFORCEMENT_WITH_PAYMENT_FORM"
  | "FAILED_DELIVERY_COVER_ENFORCEMENT"
  | "FAILED_DELIVERY_COVER_MULTI_DEBT_VEHICLE_SEIZURE";

export type RealCorpusSegmentTypeV4 =
  | "DELIVERY_COVER"
  | "PRIMARY_ACT"
  | "ANNEX"
  | "PAYMENT_FORM"
  | "TERMS"
  | "BLANK";

export interface RealCorpusSegmentV4 {
  readonly type: RealCorpusSegmentTypeV4;
  readonly pageNumbers: readonly number[];
  readonly relationToPrimary:
    | "NOTIFICATION_EVIDENCE_FOR"
    | "PRIMARY"
    | "ANNEX_ONLY"
    | "PAYMENT_FORM_FOR"
    | "TERMS_ONLY"
    | "BLANK";
  readonly provesPayment: false;
  readonly createsIndependentDebt: false;
}

export interface RealCorpusDebtObservationV4 {
  readonly debtKey: string;
  readonly outstandingAmountCents: number | null;
  readonly observedOnPage: number;
}

export interface RealCorpusInstallmentV4 {
  readonly sequence: number;
  readonly dueDate: string;
  readonly principalCents: number;
  readonly interestCents: number;
  readonly totalCents: number;
  readonly paymentFormReference: string | null;
  readonly pageNumber: number;
}

export interface RealCorpusExplanationV4 {
  readonly whatIs: string;
  readonly action: string;
  readonly deadline: string;
  readonly consequence: string;
}

export interface RealCorpusExtractorOutcomeV4 {
  readonly schemaVersion: typeof REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V4;
  readonly extractorVersion: typeof REAL_CORPUS_EXTRACTOR_VERSION_V4;
  readonly sourceDocumentId: string;
  readonly status: "REVIEW_REQUIRED" | "UNKNOWN";
  readonly familyId: RealCorpusFamilyIdV4 | null;
  readonly subtype: RealCorpusSubtypeV4 | null;
  readonly canonicalTitle: string | null;
  readonly physicalPageCount: number;
  readonly contentPageCount: number;
  readonly fields: readonly RealCorpusFieldV2[];
  readonly debtObservations: readonly RealCorpusDebtObservationV4[];
  readonly installments: readonly RealCorpusInstallmentV4[];
  readonly paymentFormReferences: readonly string[];
  readonly amountScenarios: readonly RealCorpusAmountScenarioV3[];
  readonly segments: readonly RealCorpusSegmentV4[];
  readonly explanation: RealCorpusExplanationV4 | null;
  readonly paymentFormStatus: "NONE" | "PAYMENT_FORM_ONLY";
  readonly thirdPartyRole: "NONE" | "PAYER_WITHOUT_IDENTITY";
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED";
  readonly confirmsDebt: false;
  readonly confirmsPayment: false;
  readonly confirmsRemittance: false;
  readonly confirmsDeadline: false;
}

interface IndexedLineV4 {
  readonly pageNumber: number;
  readonly raw: string;
  readonly normalized: string;
}

interface DocumentIndexV4 {
  readonly lines: readonly IndexedLineV4[];
  readonly normalizedText: string;
  readonly blankPageNumbers: readonly number[];
}

interface FamilyMatchV4 {
  readonly familyId: RealCorpusFamilyIdV4;
  readonly subtype: RealCorpusSubtypeV4;
  readonly canonicalTitle: string;
}

const SPANISH_DATE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/u;
const REFERENCE = /^[A-Z0-9][A-Z0-9./:_+-]{1,199}$/u;
const PRIVATE_REFERENCE =
  /^(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]|ES\d{22}|[6789]\d{8})$/u;

export const REAL_CORPUS_EXPLANATIONS_V4: Readonly<
  Record<RealCorpusFamilyIdV4, RealCorpusExplanationV4>
> = Object.freeze({
  "identity.clave_registration_receipt": Object.freeze({
    whatIs:
      "Confirma que el titular fue dado de alta en Cl@ve con nivel de registro alto en la fecha indicada.",
    action:
      "Conserva el justificante si necesitas acreditar ese alta histórica; los códigos y datos de contacto no se guardan.",
    deadline: "No crea un plazo operativo.",
    consequence:
      "Permite identificarse en trámites compatibles, pero no acredita que el registro siga activo hoy.",
  }),
  "seizure.release": Object.freeze({
    whatIs:
      "La AEAT deja sin efecto el embargo que identifica el documento, en el alcance que figura en el acuerdo.",
    action:
      "Comprueba que la referencia coincide con la diligencia anterior y conserva el acuerdo para acreditar el levantamiento.",
    deadline: "No exige un pago ni abre por sí solo un plazo nuevo.",
    consequence:
      "Levanta ese embargo, pero no demuestra por sí solo que la deuda se haya pagado o extinguido.",
  }),
  "assessment.final_provisional_assessment": Object.freeze({
    whatIs:
      "Es la resolución final de una comprobación limitada y fija el resultado que la AEAT considera correcto.",
    action:
      "Revisa la motivación, la cuota y los intereses. La carta adjunta sirve para pagar, pero no acredita un pago.",
    deadline:
      "Los plazos de pago o recurso se cuentan desde la notificación efectiva, no desde la subida o el escaneo.",
    consequence:
      "Finaliza esa comprobación; si queda una cantidad a ingresar y no se atiende, puede pasar a recaudación ejecutiva.",
  }),
  "seizure.compliance_reiteration": Object.freeze({
    whatIs:
      "Es un segundo requerimiento al tercero porque la AEAT indica que no recibió la contestación de una diligencia de embargo.",
    action:
      "Comprueba la diligencia citada y presenta la contestación o el anexo exigido dentro del canal indicado.",
    deadline:
      "El documento indica diez días hábiles desde la recepción; sin fecha de recepción no se calcula el último día.",
    consequence:
      "Repite la obligación anterior; no crea un embargo distinto ni confirma que exista dinero retenido.",
  }),
  "assessment.allegations_and_proposal": Object.freeze({
    whatIs:
      "Es una propuesta, no la liquidación final: la AEAT explica el ajuste que pretende hacer y abre alegaciones.",
    action:
      "Revisa el motivo, reúne la documentación y presenta alegaciones si no estás de acuerdo.",
    deadline:
      "El plazo indicado se cuenta desde la notificación efectiva. La firma o el escaneo no sustituyen esa fecha.",
    consequence:
      "Después de estudiar las alegaciones, la AEAT puede archivar, modificar o confirmar la propuesta mediante resolución.",
  }),
  "seizure.commercial_credits": Object.freeze({
    whatIs:
      "Es una diligencia que ordena a un tercero informar y, si debe dinero al deudor, retener e ingresar hasta el límite indicado.",
    action:
      "El tercero debe contestar incluso si no existe crédito. Si existe, debe seguir la orden y sus fechas.",
    deadline:
      "El plazo de contestación se cuenta desde la recepción. El ingreso se realiza cuando el crédito resulte exigible según el documento.",
    consequence:
      "La orden no prueba que ya haya retención o ingreso; esos hechos necesitan su propia evidencia.",
  }),
  "seizure.bank_account": Object.freeze({
    whatIs:
      "La AEAT ha ordenado embargar saldos bancarios para cobrar una deuda en vía ejecutiva.",
    action:
      "Comprueba la deuda, el importe y la fecha de recepción. La cuenta se registra solo como existente, nunca con sus dígitos.",
    deadline:
      "Los recursos se cuentan desde la recepción. La espera bancaria impresa no demuestra que el dinero ya se haya transferido.",
    consequence:
      "El banco puede retener fondos hasta el límite, pero la diligencia no confirma que ya se hayan ingresado al Tesoro.",
  }),
  "collection.enforcement_order": Object.freeze({
    whatIs:
      "Es una providencia de apremio: una deuda o cuota no se pagó en período voluntario y pasa a vía ejecutiva.",
    action:
      "Identifica la cuota exacta y revisa qué escenario de recargo corresponde según la fecha real de recepción y pago.",
    deadline:
      "El plazo se calcula desde la notificación efectiva; la carta de pago y su copia no cambian el vencimiento.",
    consequence:
      "Si no se atiende, pueden añadirse intereses y costas y continuar el procedimiento con embargos.",
  }),
  "collection.deferral_grant": Object.freeze({
    whatIs:
      "La AEAT concede pagar una deuda en las cuotas y fechas del calendario adjunto.",
    action:
      "Revisa cada vencimiento por separado y mantén saldo para la domiciliación indicada.",
    deadline:
      "Cada cuota tiene su propia fecha; una cuota vencida no convierte las demás en el mismo documento ni en el mismo pago.",
    consequence:
      "El impago de una cuota puede generar apremio sobre esa cuota y afectar al resto del aplazamiento según el acuerdo.",
  }),
  "seizure.movable_asset": Object.freeze({
    whatIs:
      "La AEAT ha ordenado embargar el bien mueble descrito en el anexo para responder de varias deudas.",
    action:
      "Revisa por separado cada deuda del anexo y la referencia exacta del bien, que no se conserva en la ficha privada.",
    deadline:
      "Los plazos se cuentan desde la notificación efectiva, no desde la carátula de reenvío ni el escaneo.",
    consequence:
      "La diligencia afecta el bien, pero no demuestra venta, cobro, pago ni levantamiento posterior.",
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

function buildIndex(document: BoundedDocumentInput): DocumentIndexV4 {
  const lines: IndexedLineV4[] = [];
  const blankPageNumbers: number[] = [];
  for (const page of document.pages) {
    const pageLines = page.text
      .split(/\r?\n/gu)
      .map((raw) => ({ raw: raw.trim(), normalized: normalize(raw) }))
      .filter((line) => line.normalized.length > 0);
    if (page.isBlank || pageLines.length === 0) blankPageNumbers.push(page.pageNumber);
    for (const line of pageLines) {
      lines.push(Object.freeze({ pageNumber: page.pageNumber, ...line }));
    }
  }
  return Object.freeze({
    lines: Object.freeze(lines),
    normalizedText: lines.map((line) => line.normalized).join("\n"),
    blankPageNumbers: Object.freeze(blankPageNumbers),
  });
}

function contains(index: DocumentIndexV4, value: string): boolean {
  return index.normalizedText.includes(normalize(value));
}

function lineValues(index: DocumentIndexV4, labels: readonly string[]): readonly IndexedLineV4[] {
  const normalizedLabels = labels.map(normalize);
  const result: IndexedLineV4[] = [];
  for (let position = 0; position < index.lines.length; position += 1) {
    const line = index.lines[position]!;
    for (const label of normalizedLabels) {
      if (line.normalized === label) {
        const next = index.lines[position + 1];
        if (next) result.push(next);
      } else if (line.normalized.startsWith(`${label}:`)) {
        const raw = line.raw.slice(line.raw.indexOf(":") + 1).trim();
        if (raw) result.push(Object.freeze({ ...line, raw, normalized: normalize(raw) }));
      }
    }
  }
  return Object.freeze(result);
}

function firstValue(index: DocumentIndexV4, labels: readonly string[]): IndexedLineV4 | null {
  const normalizedLabels = labels.map(normalize);
  for (const line of index.lines) {
    for (const label of normalizedLabels) {
      if (line.normalized.startsWith(`${label}:`)) {
        const raw = line.raw.slice(line.raw.indexOf(":") + 1).trim();
        if (raw) return Object.freeze({ ...line, raw, normalized: normalize(raw) });
      }
    }
  }
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
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    : null;
}

function parseMoney(raw: string): number | null {
  const compact = raw.replace(/\s|€|EUR/giu, "").replace(/\.(?=\d{3}(?:\D|$))/gu, "").replace(",", ".");
  if (!/^-?\d+(?:\.\d{1,2})?$/u.test(compact)) return null;
  const cents = Math.round(Number(compact) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

function safeReference(raw: string): string | null {
  const value = raw.trim().toLocaleUpperCase("es-ES");
  return REFERENCE.test(value) && !PRIVATE_REFERENCE.test(value) ? value : null;
}

function evidence(pageNumber: number): RealCorpusEvidenceV2 {
  return Object.freeze({ pageNumbers: Object.freeze([pageNumber]), assertionType: "EXPLICIT_IN_DOCUMENT" });
}

function referenceField(code: string, label: string, source: IndexedLineV4 | null): RealCorpusFieldV2 | null {
  const value = source ? safeReference(source.raw) : null;
  return value && source ? Object.freeze({ fieldCode: code, label, kind: "REFERENCE" as const, value, evidence: evidence(source.pageNumber) }) : null;
}

function dateField(code: string, label: string, source: IndexedLineV4 | null): RealCorpusFieldV2 | null {
  const value = source ? parseDate(source.raw) : null;
  return value && source ? Object.freeze({ fieldCode: code, label, kind: "DATE" as const, value, evidence: evidence(source.pageNumber) }) : null;
}

function moneyField(code: string, label: string, source: IndexedLineV4 | null): RealCorpusFieldV2 | null {
  const amountCents = source ? parseMoney(source.raw) : null;
  return amountCents !== null && source ? Object.freeze({ fieldCode: code, label, kind: "MONEY" as const, amountCents, currency: "EUR" as const, evidence: evidence(source.pageNumber) }) : null;
}

function textField(code: string, label: string, value: string, pageNumber = 1): RealCorpusFieldV2 {
  return Object.freeze({ fieldCode: code, label, kind: "TEXT" as const, value, evidence: evidence(pageNumber) });
}

function booleanField(code: string, label: string, value: boolean, pageNumber = 1): RealCorpusFieldV2 {
  return Object.freeze({ fieldCode: code, label, kind: "BOOLEAN" as const, value, evidence: evidence(pageNumber) });
}

function integerField(code: string, label: string, value: number, pageNumber = 1): RealCorpusFieldV2 {
  return Object.freeze({ fieldCode: code, label, kind: "INTEGER" as const, value, evidence: evidence(pageNumber) });
}

function compact(values: readonly (RealCorpusFieldV2 | null)[]): readonly RealCorpusFieldV2[] {
  return Object.freeze(values.filter((value): value is RealCorpusFieldV2 => value !== null));
}

function hasAll(index: DocumentIndexV4, values: readonly string[]): boolean {
  return values.every((value) => contains(index, value));
}

function matchFamily(index: DocumentIndexV4): FamilyMatchV4 | null {
  if (hasAll(index, ["JUSTIFICANTE DE ALTA EN EL SISTEMA DE IDENTIFICACIÓN Y FIRMA CL@VE", "NIVEL DE REGISTRO ALTO", "HA SIDO DADO DE ALTA"])) {
    return { familyId: "identity.clave_registration_receipt", subtype: "HIGH_LEVEL_REGISTRATION_WITH_TERMS", canonicalTitle: "Justificante de alta en Cl@ve" };
  }
  if (hasAll(index, ["NOTIFICACIÓN DE RESOLUCIÓN CON LIQUIDACIÓN PROVISIONAL", "TOTAL A INGRESAR", "FINALIZA EL PROCEDIMIENTO", "PAGO DE LA DEUDA"])) {
    return { familyId: "assessment.final_provisional_assessment", subtype: "MODEL_180_115_MISMATCH_WITH_INTEREST_AND_PAYMENT_FORM", canonicalTitle: "Resolución con liquidación provisional" };
  }
  if (hasAll(index, ["NOTIFICACIÓN DEL TRÁMITE DE ALEGACIONES Y PROPUESTA DE LIQUIDACIÓN PROVISIONAL", "10 DÍAS HÁBILES", "RESULTADO DE LA PROPUESTA", "MODELO PARA EFECTUAR ALEGACIONES"])) {
    return { familyId: "assessment.allegations_and_proposal", subtype: "MODEL_180_115_MISMATCH_LIMITED_CHECK", canonicalTitle: "Propuesta de liquidación provisional y alegaciones" };
  }
  if (hasAll(index, ["DOCUMENTO DE REITERACIÓN DE CUMPLIMIENTO DE OBLIGACIONES", "SEGUNDO REQUERIMIENTO", "NO CONSTA LA RECEPCIÓN DEL ANEXO", "10 DÍAS HÁBILES"])) {
    return { familyId: "seizure.compliance_reiteration", subtype: "THIRD_PARTY_CREDIT_RESPONSE_REITERATION", canonicalTitle: "Reiteración de obligaciones de embargo" };
  }
  if (hasAll(index, ["LEVANTAMIENTO DE EMBARGO", "SE ACUERDA EL LEVANTAMIENTO", "Nº DE LA DILIGENCIA"])) {
    const subtype: RealCorpusSubtypeV4 = contains(index, "CRÉDITOS COMERCIALES")
      ? "COMMERCIAL_CREDIT_RELEASE_TO_THIRD_PARTY"
      : contains(index, "INMUEBLE") || contains(index, "REGISTRO DE LA PROPIEDAD")
        ? "REAL_ESTATE_RELEASE_WITH_REGISTRY_ANNEX"
        : "MOVABLE_ASSET_RELEASE_WITH_ASSET_ANNEX";
    return { familyId: "seizure.release", subtype, canonicalTitle: "Levantamiento de embargo" };
  }
  if (hasAll(index, ["NOTIFICACIÓN DE DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS", "SALDOS DE LAS CUENTAS", "IMPORTE A EMBARGAR"])) {
    return { familyId: "seizure.bank_account", subtype: "DEBTOR_NOTICE_WITH_BANK_ANNEX_AND_DELAYED_TRANSFER", canonicalTitle: "Embargo de cuentas bancarias" };
  }
  if (hasAll(index, ["NOTIFICACIÓN DE DILIGENCIA DE EMBARGO DE BIENES MUEBLES", "ANEXO 1", "ANEXO 2", "BIENES MUEBLES"])) {
    return { familyId: "seizure.movable_asset", subtype: "FAILED_DELIVERY_COVER_MULTI_DEBT_VEHICLE_SEIZURE", canonicalTitle: "Embargo de bien mueble" };
  }
  if (hasAll(index, ["DILIGENCIA DE EMBARGO DE CRÉDITOS", "OBLIGACIÓN DE CONTESTAR", "RETENER E INGRESAR"])) {
    return { familyId: "seizure.commercial_credits", subtype: "THIRD_PARTY_PAYER_RESPONSE_AND_MULTIPLE_PAYMENT_FORMS", canonicalTitle: "Embargo de créditos comerciales" };
  }
  if (hasAll(index, ["DILIGENCIA DE EMBARGO DE CRÉDITOS", "DEUDAS DEL EXPEDIENTE EJECUTIVO", "CRÉDITOS A SU FAVOR"])) {
    return { familyId: "seizure.commercial_credits", subtype: "DEBTOR_NOTICE_MULTI_DEBT_COMMERCIAL_CREDIT_SEIZURE", canonicalTitle: "Embargo de créditos comerciales" };
  }
  if (hasAll(index, ["CONCESIÓN DEL APLAZAMIENTO/FRACCIONAMIENTO DE PAGO SIN GARANTÍA", "ANEXO I: DEUDAS Y PLAZOS", "LIQUIDACIÓN DE INTERESES DE DEMORA"])) {
    return { familyId: "collection.deferral_grant", subtype: "THREE_INSTALLMENTS_WITH_INTEREST_SCHEDULE", canonicalTitle: "Concesión de aplazamiento o fraccionamiento" };
  }
  if (hasAll(index, ["PROVIDENCIA DE APREMIO", "PRINCIPAL PENDIENTE", "RECARGO DE APREMIO ORDINARIO", "PLAZOS DE PAGO"])) {
    return { familyId: "collection.enforcement_order", subtype: contains(index, "ENTREGA ANTERIOR FALLIDA") ? "FAILED_DELIVERY_COVER_ENFORCEMENT" : contains(index, "CUOTA DEL APLAZAMIENTO") ? "DEFAULTED_DEFERRAL_INSTALLMENT_WITH_PAYMENT_FORM" : "STANDARD_ENFORCEMENT_WITH_PAYMENT_FORM", canonicalTitle: "Providencia de apremio" };
  }
  return null;
}

function segmentDocument(document: BoundedDocumentInput): readonly RealCorpusSegmentV4[] {
  const grouped: RealCorpusSegmentV4[] = [];
  const add = (type: RealCorpusSegmentTypeV4, page: number) => {
    const relationToPrimary = type === "DELIVERY_COVER" ? "NOTIFICATION_EVIDENCE_FOR" : type === "PRIMARY_ACT" ? "PRIMARY" : type === "PAYMENT_FORM" ? "PAYMENT_FORM_FOR" : type === "TERMS" ? "TERMS_ONLY" : type === "BLANK" ? "BLANK" : "ANNEX_ONLY";
    const last = grouped.at(-1);
    if (last?.type === type) {
      grouped[grouped.length - 1] = Object.freeze({ ...last, pageNumbers: Object.freeze([...last.pageNumbers, page]) });
    } else {
      grouped.push(Object.freeze({ type, pageNumbers: Object.freeze([page]), relationToPrimary, provesPayment: false as const, createsIndependentDebt: false as const }));
    }
  };
  for (const page of document.pages) {
    const text = normalize(page.text);
    const type: RealCorpusSegmentTypeV4 = page.isBlank || !text
      ? "BLANK"
      : /ENTREGA ANTERIOR FALLIDA|NUEVO INTENTO DE NOTIFICACION|COMUNICACION DE REENVIO/u.test(text)
        ? "DELIVERY_COVER"
        : /CARTA DE PAGO|DOCUMENTO DE INGRESO/u.test(text)
          ? "PAYMENT_FORM"
          : /TERMINOS Y CONDICIONES/u.test(text)
            ? "TERMS"
            : /ANEXO|MODELO PARA EFECTUAR ALEGACIONES|DERECHOS Y OBLIGACIONES/u.test(text)
              ? "ANNEX"
              : "PRIMARY_ACT";
    add(type, page.pageNumber);
  }
  return Object.freeze(grouped);
}

function debtObservations(index: DocumentIndexV4): readonly RealCorpusDebtObservationV4[] {
  const keys = lineValues(index, ["Clave de deuda", "Clave de liquidación"]);
  const amounts = lineValues(index, ["Importe pendiente", "Total pendiente", "Principal pendiente"]);
  const result: RealCorpusDebtObservationV4[] = [];
  keys.slice(0, 20).forEach((source, position) => {
    const debtKey = safeReference(source.raw);
    if (!debtKey) return;
    result.push(Object.freeze({ debtKey, outstandingAmountCents: parseMoney(amounts[position]?.raw ?? ""), observedOnPage: source.pageNumber }));
  });
  return Object.freeze(result);
}

function paymentReferences(index: DocumentIndexV4): readonly string[] {
  const values = lineValues(index, ["Referencia de pago", "NRC", "Carta de pago"])
    .map((item) => safeReference(item.raw))
    .filter((item): item is string => item !== null);
  return Object.freeze([...new Set(values)].slice(0, 20));
}

function installments(index: DocumentIndexV4): readonly RealCorpusInstallmentV4[] {
  const result: RealCorpusInstallmentV4[] = [];
  for (const line of index.lines) {
    const match = /^CUOTA\s+(\d{1,3})\s*[|;]\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4})\s*[|;]\s*([\d.,]+)\s*[|;]\s*([\d.,]+)\s*[|;]\s*([\d.,]+)(?:\s*[|;]\s*([A-Z0-9./:_+-]+))?$/u.exec(line.normalized);
    if (!match) continue;
    const sequence = Number(match[1]);
    const dueDate = parseDate(match[2]!);
    const principalCents = parseMoney(match[3]!);
    const interestCents = parseMoney(match[4]!);
    const totalCents = parseMoney(match[5]!);
    const reference = match[6] ? safeReference(match[6]) : null;
    if (dueDate && principalCents !== null && interestCents !== null && totalCents !== null && principalCents + interestCents === totalCents) {
      result.push(Object.freeze({ sequence, dueDate, principalCents, interestCents, totalCents, paymentFormReference: reference, pageNumber: line.pageNumber }));
    }
  }
  return Object.freeze(result.slice(0, 50));
}

function fieldsFor(index: DocumentIndexV4, match: FamilyMatchV4): readonly RealCorpusFieldV2[] {
  const fields: (RealCorpusFieldV2 | null)[] = [
    referenceField("DOCUMENT_REFERENCE", "Referencia del documento", firstValue(index, ["Referencia del documento", "Referencia"])),
    referenceField("PROCEDURE_ID", "Referencia del procedimiento", firstValue(index, ["Referencia del procedimiento", "Procedimiento"])),
    referenceField("ACT_ID", "Referencia del acto", firstValue(index, ["Referencia del acto", "Acto"])),
    referenceField("AGREEMENT_ID", "Referencia del acuerdo", firstValue(index, ["Referencia del acuerdo"])),
    referenceField("NOTIFICATION_ID", "Referencia de notificación", firstValue(index, ["Referencia de notificación", "NCC actual"])),
    referenceField("PREVIOUS_NOTIFICATION_ID", "Notificación anterior", firstValue(index, ["Notificación anterior", "NCC anterior"])),
    referenceField("SEIZURE_ORDER_ID", "Número de diligencia", firstValue(index, ["Nº de la diligencia", "Número de diligencia"])),
    referenceField("DEBT_KEY", "Clave de deuda", firstValue(index, ["Clave de deuda", "Clave de liquidación"])),
    dateField("DOCUMENT_DATE", "Fecha del documento", firstValue(index, ["Fecha del documento", "Fecha de emisión", "Fecha"])),
    dateField("SIGNING_DATE", "Fecha de firma", firstValue(index, ["Fecha de firma"])),
    dateField("ACTION_DATE", "Fecha del acto", firstValue(index, ["Fecha del acto", "Fecha del acuerdo"])),
    dateField("RELEASE_DATE", "Fecha del levantamiento", firstValue(index, ["Fecha del levantamiento", "Fecha del acuerdo"])),
    dateField("CITED_SEIZURE_DATE", "Fecha de la diligencia citada", firstValue(index, ["Fecha de la diligencia", "Fecha del embargo citado"])),
    dateField("PROPOSAL_NOTIFICATION_DATE", "Fecha de notificación de la propuesta", firstValue(index, ["Fecha de notificación de la propuesta"])),
    dateField("VOLUNTARY_PAYMENT_DEADLINE", "Fin del período voluntario", firstValue(index, ["Fin del período voluntario", "Vencimiento voluntario"])),
    moneyField("OUTSTANDING_PRINCIPAL", "Principal pendiente", firstValue(index, ["Principal pendiente"])),
    moneyField("EXECUTIVE_SURCHARGE_20", "Recargo ordinario del 20 %", firstValue(index, ["Recargo de apremio ordinario", "Recargo ejecutivo 20 %"])),
    moneyField("TOTAL_WITH_20", "Total con recargo ordinario", firstValue(index, ["Total con recargo ordinario", "Total ordinario"])),
    moneyField("FINAL_QUOTA", "Cuota final", firstValue(index, ["Cuota final", "Cuota resultante"])),
    moneyField("PROPOSED_QUOTA", "Cuota propuesta", firstValue(index, ["Cuota propuesta"])),
    moneyField("LATE_PAYMENT_INTEREST", "Intereses de demora", firstValue(index, ["Intereses de demora", "Interés de demora"])),
    moneyField("DOCUMENT_TOTAL", "Total del documento", firstValue(index, ["Total a ingresar", "Total del plan", "Total documento"])),
    moneyField("SEIZED_AMOUNT", "Importe embargado", firstValue(index, ["Importe a embargar", "Importe embargado"])),
    moneyField("OUTSTANDING_TOTAL", "Total pendiente", firstValue(index, ["Total pendiente", "Deuda pendiente"])),
    moneyField("DECLARED_ANNUAL_WITHHOLDINGS", "Retenciones anuales declaradas", firstValue(index, ["Retenciones anuales declaradas", "Modelo 180 declarado"])),
    moneyField("PERIODIC_PAYMENTS", "Pagos periódicos declarados", firstValue(index, ["Pagos periódicos declarados", "Modelos 115 ingresados"])),
    moneyField("ORIGINAL_TAX_PRINCIPAL", "Principal original", firstValue(index, ["Principal original", "Deuda principal"])),
    moneyField("DEFERRAL_INTEREST", "Intereses del aplazamiento", firstValue(index, ["Intereses del aplazamiento", "Total intereses"])),
    referenceField("TAX_MODEL", "Modelo tributario", firstValue(index, ["Modelo tributario", "Modelo"])),
    referenceField("RELATED_MODEL", "Modelo relacionado", firstValue(index, ["Modelo relacionado"])),
    referenceField("FISCAL_YEAR", "Ejercicio fiscal", firstValue(index, ["Ejercicio fiscal", "Ejercicio"])),
  ];
  if (match.familyId === "identity.clave_registration_receipt") fields.push(
    textField("REGISTRATION_STATUS", "Estado del alta", "REGISTERED"),
    textField("REGISTRATION_LEVEL", "Nivel de registro", "HIGH"),
    textField("REGISTRATION_METHOD", "Método de registro", "CERTIFICATE_OR_IN_PERSON"),
    dateField("REGISTRATION_DATE", "Fecha de alta", firstValue(index, ["Fecha de alta", "Fecha de registro"])),
    booleanField("TERMS_ATTACHED", "Términos adjuntos", contains(index, "TÉRMINOS Y CONDICIONES")),
  );
  if (match.familyId === "seizure.release") fields.push(
    textField("ASSET_KIND", "Tipo de bien o derecho", match.subtype === "REAL_ESTATE_RELEASE_WITH_REGISTRY_ANNEX" ? "REAL_ESTATE" : match.subtype === "COMMERCIAL_CREDIT_RELEASE_TO_THIRD_PARTY" ? "COMMERCIAL_CREDITS" : "MOVABLE_VEHICLE"),
    textField("RELEASE_EXTENT", "Alcance del levantamiento", contains(index, "LEVANTAMIENTO TOTAL") ? "TOTAL_IF_PRINTED" : "AS_PRINTED"),
    booleanField("REGISTRY_CANCELLATION_ORDERED", "Cancelación registral ordenada", contains(index, "CANCELACIÓN REGISTRAL") || contains(index, "CANCELAR LA ANOTACIÓN")),
  );
  if (match.familyId === "assessment.final_provisional_assessment") fields.push(textField("DOCUMENT_STATUS", "Estado del documento", "FINAL_PROVISIONAL_ASSESSMENT"));
  if (match.familyId === "assessment.allegations_and_proposal" || match.familyId === "seizure.compliance_reiteration" || match.familyId === "seizure.commercial_credits") {
    fields.push(textField("RESPONSE_DEADLINE_RULE", "Regla del plazo", "10_BUSINESS_DAYS_FROM_RECEIPT"));
  }
  if (match.familyId === "assessment.allegations_and_proposal") fields.push(
    textField("DOCUMENTATION_REQUIRED", "Documentación necesaria", "DOCUMENTATION_REQUIRED_AS_PRINTED"),
    textField("SANCTION_WARNING", "Aviso sancionador", "SEPARATE_SANCTION_PROCEDURE_WARNING"),
  );
  if (match.familyId === "seizure.commercial_credits") fields.push(
    textField("THIRD_PARTY_ROLE", "Papel del tercero", "PAYER_WITHOUT_IDENTITY"),
    textField("OBLIGATION_RESPOND", "Obligación de contestar", "RESPOND"),
    textField("OBLIGATION_WITHHOLD_AND_REMIT", "Obligación si existe crédito", "WITHHOLD_AND_REMIT_IF_CREDIT_EXISTS"),
    textField("PAYMENT_TIME", "Momento del ingreso", "WHEN_CREDIT_BECOMES_DUE"),
    textField("CREDIT_SCOPE", "Alcance de los créditos", "COMMERCIAL_CREDITS_UP_TO_PRINTED_LIMIT"),
  );
  if (match.familyId === "seizure.compliance_reiteration") fields.push(
    textField("THIRD_PARTY_ROLE", "Papel del tercero", "PAYER_WITHOUT_IDENTITY"),
    textField("REJECTION_REASON", "Motivo de la reiteración", "ANNEX_NOT_RECEIVED"),
    textField("EXPLICIT_CONSEQUENCE", "Consecuencia indicada", "SECOND_REQUEST_PRINTED_CONSEQUENCE"),
  );
  if (match.familyId === "seizure.release" && match.subtype === "COMMERCIAL_CREDIT_RELEASE_TO_THIRD_PARTY") fields.push(textField("THIRD_PARTY_ROLE", "Papel del tercero", "PAYER_WITHOUT_IDENTITY"));
  if (match.familyId === "seizure.bank_account") fields.push(textField("ACCOUNT_OR_DEPOSIT", "Cuenta o depósito", "EXISTS_WITHOUT_DIGITS"), integerField("TRANSFER_WAIT_DAYS", "Espera antes del ingreso bancario", contains(index, "20 DÍAS NATURALES") ? 20 : 0));
  if (match.familyId === "collection.deferral_grant") fields.push(textField("PAYMENT_METHOD", "Forma de pago", "DIRECT_DEBIT"), textField("GUARANTEE_TYPE", "Garantía", "NO_GUARANTEE"));
  if (match.familyId === "collection.enforcement_order" && contains(index, "ENTREGA ANTERIOR FALLIDA")) fields.push(textField("NOTIFICATION_STATE", "Estado de la notificación anterior", "PREVIOUS_DELIVERY_FAILED"));
  if (match.familyId === "seizure.movable_asset") fields.push(textField("ASSET_KIND", "Tipo de bien o derecho", "MOVABLE_VEHICLE"));
  return compact(fields);
}

function amountScenarios(index: DocumentIndexV4, familyId: RealCorpusFamilyIdV4): readonly RealCorpusAmountScenarioV3[] {
  if (familyId !== "collection.enforcement_order") return Object.freeze([]);
  const principal = parseMoney(firstValue(index, ["Principal pendiente"])?.raw ?? "");
  if (principal === null || principal < 0) return Object.freeze([]);
  return Object.freeze([
    Object.freeze({ code: "PRINCIPAL_ONLY_WITH_5_PERCENT_IF_PREPAID" as const, amountCents: Math.round(principal * 1.05), condition: "PRINCIPAL_PAID_BEFORE_NOTICE" as const }),
    Object.freeze({ code: "REDUCED_SURCHARGE_10_PERCENT" as const, amountCents: Math.round(principal * 1.1), condition: "PAID_WITHIN_NOTICE_DEADLINE" as const }),
    Object.freeze({ code: "ORDINARY_SURCHARGE_20_PERCENT" as const, amountCents: Math.round(principal * 1.2), condition: "ORDINARY_ENFORCEMENT_OUTCOME" as const }),
  ]);
}

function unknown(document: BoundedDocumentInput, index: DocumentIndexV4): RealCorpusExtractorOutcomeV4 {
  return Object.freeze({ schemaVersion: 4, extractorVersion: REAL_CORPUS_EXTRACTOR_VERSION_V4, sourceDocumentId: document.documentId, status: "UNKNOWN", familyId: null, subtype: null, canonicalTitle: null, physicalPageCount: document.pages.length, contentPageCount: document.pages.length - index.blankPageNumbers.length, fields: Object.freeze([]), debtObservations: Object.freeze([]), installments: Object.freeze([]), paymentFormReferences: Object.freeze([]), amountScenarios: Object.freeze([]), segments: Object.freeze([]), explanation: null, paymentFormStatus: "NONE", thirdPartyRole: "NONE", retainedSourceContent: "NONE", requiresHumanReview: true, materializationPolicy: "PROHIBITED", confirmsDebt: false, confirmsPayment: false, confirmsRemittance: false, confirmsDeadline: false });
}

/** Deterministic V4 extractor built only from repository-safe synthetic contracts. */
export async function extractAeatRealCorpusDocumentV4(document: BoundedDocumentInput): Promise<RealCorpusExtractorOutcomeV4> {
  assertBoundedDocumentInput(document);
  assertNotAborted(document.signal);
  const index = buildIndex(document);
  if (!contains(index, "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA") && !contains(index, "AEAT")) return unknown(document, index);
  const match = matchFamily(index);
  if (!match) return unknown(document, index);
  const references = paymentReferences(index);
  const result = Object.freeze({
    schemaVersion: REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V4,
    extractorVersion: REAL_CORPUS_EXTRACTOR_VERSION_V4,
    sourceDocumentId: document.documentId,
    status: "REVIEW_REQUIRED" as const,
    ...match,
    physicalPageCount: document.pages.length,
    contentPageCount: document.pages.length - index.blankPageNumbers.length,
    fields: fieldsFor(index, match),
    debtObservations: debtObservations(index),
    installments: installments(index),
    paymentFormReferences: references,
    amountScenarios: amountScenarios(index, match.familyId),
    segments: segmentDocument(document),
    explanation: REAL_CORPUS_EXPLANATIONS_V4[match.familyId],
    paymentFormStatus: references.length > 0 || contains(index, "CARTA DE PAGO") || contains(index, "DOCUMENTO DE INGRESO") ? "PAYMENT_FORM_ONLY" as const : "NONE" as const,
    thirdPartyRole: match.familyId === "seizure.commercial_credits" || match.familyId === "seizure.compliance_reiteration" ? "PAYER_WITHOUT_IDENTITY" as const : "NONE" as const,
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
