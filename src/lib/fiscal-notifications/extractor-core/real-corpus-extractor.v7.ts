import {
  assertBoundedDocumentInput,
  assertNotAborted,
  type BoundedDocumentInput,
} from "../input-contract";
import type {
  RealCorpusEvidenceV2,
  RealCorpusFieldV2,
} from "./real-corpus-extractor.v2";
import {
  extractAeatRealCorpusDocumentV6,
  type RealCorpusSegmentV6,
} from "./real-corpus-extractor.v6";

export const REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V7 = 7 as const;
export const REAL_CORPUS_EXTRACTOR_VERSION_V7 =
  "aeat-real-corpus-extractor.2026-07-17.v7" as const;

export const REAL_CORPUS_FAMILY_IDS_V7 = Object.freeze([
  "sanction.initiation_and_hearing",
  "compliance.formal_filing_requirement",
  "seizure.bank_account",
  "collection.enforcement_order",
  "collection.offset_ex_officio",
  "registry.tax_registration_resolution",
  "collection.deferral_grant",
  "collection.offset_requested",
  "collection.deferral_modification",
  "collection.external_debt",
  "compliance.document_request",
  "assessment.final_provisional_assessment",
] as const);
export type RealCorpusFamilyIdV7 = (typeof REAL_CORPUS_FAMILY_IDS_V7)[number];

export type RealCorpusSubtypeV7 =
  | "SANCTION_PROPOSAL_WITH_HEARING"
  | "FORMAL_FILING_REQUIREMENT"
  | "BANK_ACCOUNT_SEIZURE"
  | "ENFORCEMENT_SINGLE_INSTALLMENT"
  | "ENFORCEMENT_REMAINING_PLAN_PRINCIPAL"
  | "OFFSET_EX_OFFICIO_ROW_BY_ROW"
  | "ROI_REGISTRATION_GRANTED_HISTORICAL"
  | "DEFERRAL_PAYMENT_PLAN"
  | "OFFSET_REQUESTED"
  | "MODIFIED_PAYMENT_PLAN"
  | "EXTERNAL_PUBLIC_DEBT_COLLECTED_BY_AEAT"
  | "DOCUMENT_REQUEST_WITHOUT_ASSESSMENT_START"
  | "FINAL_PROVISIONAL_ASSESSMENT_WITH_PAYMENT_FORM_COPIES";

export interface RealCorpusInstallmentV7 {
  readonly sequence: number;
  readonly dueDate: string;
  readonly baseCents: number;
  readonly deferralInterestCents: number;
  readonly totalCents: number;
  readonly pageNumber: number;
}

export interface RealCorpusOffsetRowV7 {
  readonly debtKey: string;
  readonly beforeCents: number;
  readonly appliedCents: number;
  readonly remainingCents: number;
  readonly pageNumber: number;
}

export interface RealCorpusBankSeizureV7 {
  readonly seizureOrderId: string;
  readonly debtKey: string;
  readonly debtTotalCents: number;
  readonly seizeLimitCents: number;
  readonly seizedAmountCents: number;
  readonly opaqueAssetOrdinal: number;
  readonly remittedAmountCents: null;
}

export interface RealCorpusPlanV7 {
  readonly agreementId: string;
  readonly debtKey: string;
  readonly principalCents: number;
  readonly interestCents: number;
  readonly modified: boolean;
  readonly replacesAgreementId: string | null;
}

export interface RealCorpusExplanationV7 {
  readonly whatIs: string;
  readonly action: string;
  readonly deadline: string;
  readonly consequence: string;
}

export interface RealCorpusExtractorOutcomeV7 {
  readonly schemaVersion: typeof REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V7;
  readonly extractorVersion: typeof REAL_CORPUS_EXTRACTOR_VERSION_V7;
  readonly sourceDocumentId: string;
  readonly status: "REVIEW_REQUIRED" | "UNKNOWN";
  readonly familyId: RealCorpusFamilyIdV7 | null;
  readonly subtype: RealCorpusSubtypeV7 | null;
  readonly canonicalTitle: string | null;
  readonly physicalPageCount: number;
  readonly contentPageCount: number;
  readonly fields: readonly RealCorpusFieldV2[];
  readonly installments: readonly RealCorpusInstallmentV7[];
  readonly offsetRows: readonly RealCorpusOffsetRowV7[];
  readonly bankSeizure: RealCorpusBankSeizureV7 | null;
  readonly paymentPlan: RealCorpusPlanV7 | null;
  readonly segments: readonly RealCorpusSegmentV6[];
  readonly paymentFormOperationCount: 0 | 1;
  readonly explanation: RealCorpusExplanationV7 | null;
  readonly sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST";
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED";
  readonly confirmsDebt: false;
  readonly confirmsPayment: false;
  readonly confirmsRemittance: false;
  readonly confirmsDeadline: false;
  readonly confirmsDebtExtinction: false;
  readonly confirmsCurrentRegistryStatus: false;
}

interface IndexedLineV7 {
  readonly pageNumber: number;
  readonly raw: string;
  readonly normalized: string;
}

interface DocumentIndexV7 {
  readonly lines: readonly IndexedLineV7[];
  readonly normalizedText: string;
  readonly blankPageNumbers: ReadonlySet<number>;
}

const REFERENCE = /^[A-Z0-9][A-Z0-9./:_+-]{1,199}$/u;
const PRIVATE_REFERENCE =
  /^(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]|ES\d{22}|[6789]\d{8})$/u;

export const REAL_CORPUS_EXPLANATIONS_V7: Readonly<
  Record<RealCorpusFamilyIdV7, RealCorpusExplanationV7>
> = Object.freeze({
  "sanction.initiation_and_hearing": Object.freeze({
    whatIs: "La AEAT comunica el inicio de un expediente sancionador y una propuesta; todavía no es una sanción final.",
    action: "Revisa los hechos, los modelos y el período, y utiliza el trámite de audiencia para alegar o aportar documentos si procede.",
    deadline: "El plazo de alegaciones empieza con la notificación efectiva, no con la firma, la descarga ni el escaneo.",
    consequence: "Tras la audiencia, la AEAT puede archivar el expediente o dictar una resolución sancionadora distinta.",
  }),
  "compliance.formal_filing_requirement": Object.freeze({
    whatIs: "La AEAT pide presentar declaraciones que constan como no presentadas. Este requerimiento no es por sí mismo una deuda ni una sanción.",
    action: "Comprueba los modelos y el período y responde por el canal indicado, incluso si consideras que ya cumpliste.",
    deadline: "Cuenta el plazo desde la notificación efectiva y respeta si el documento habla de días hábiles.",
    consequence: "No atenderlo puede abrir actuaciones posteriores, pero este documento no demuestra que exista ya una sanción.",
  }),
  "seizure.bank_account": Object.freeze({
    whatIs: "La AEAT ordena retener en una cuenta bancaria hasta el límite indicado para cobrar una deuda en vía ejecutiva.",
    action: "Comprueba la diligencia, la deuda y el importe retenido. Varias cuentas pueden recibir diligencias distintas para la misma deuda.",
    deadline: "La oposición depende de la recepción efectiva y de los motivos tasados que indique el acto.",
    consequence: "Un importe embargado o retenido no demuestra que el banco ya lo haya ingresado al Tesoro ni permite calcular el saldo final.",
  }),
  "collection.enforcement_order": Object.freeze({
    whatIs: "Es una providencia de apremio: la AEAT reclama en vía ejecutiva una cuota concreta o el principal restante de un plan.",
    action: "Contrasta la clave, el vencimiento y el principal con el calendario; una cuota aislada no debe confundirse con todas las fracciones restantes.",
    deadline: "El vencimiento de pago depende de la notificación efectiva. La fecha del documento no lo sustituye.",
    consequence: "Puede aplicar recargos y continuar con embargos; la carta de pago no acredita que el pago ya se haya realizado.",
  }),
  "collection.offset_ex_officio": Object.freeze({
    whatIs: "La AEAT aplica un crédito a una o varias deudas. Cada fila puede quedar totalmente extinguida o conservar un saldo pendiente.",
    action: "Revisa por separado el importe anterior, lo compensado y el saldo de cada deuda.",
    deadline: "Si el acto permite recurso, cuenta el plazo desde su notificación efectiva.",
    consequence: "Un saldo residual puede continuar en vía ejecutiva o embargo; no se considera extinguida toda la deuda por haber una compensación.",
  }),
  "registry.tax_registration_resolution": Object.freeze({
    whatIs: "La AEAT resolvió una solicitud censal y registró históricamente al interesado en el ROI con la fecha de efectos indicada.",
    action: "Conserva la referencia, el modelo 036 y las fechas; comprueba el estado actual por los canales oficiales si lo necesitas hoy.",
    deadline: "Este acto describe su propia fecha de efectos y no crea por sí solo un nuevo plazo de pago.",
    consequence: "El alta histórica no demuestra que el registro siga vigente actualmente ni autoriza a derivar o guardar un NIF-IVA.",
  }),
  "collection.deferral_grant": Object.freeze({
    whatIs: "La AEAT concede pagar una deuda mediante el calendario de cuotas e intereses que figura en el acuerdo.",
    action: "Revisa cada base, interés y total, y conserva el vencimiento ajustado de cada cuota.",
    deadline: "Cada cuota tiene su fecha propia; una modificación posterior puede sustituir todo este calendario.",
    consequence: "La concesión no acredita pagos. Un apremio posterior solo se enlaza por coincidencias exactas.",
  }),
  "collection.offset_requested": Object.freeze({
    whatIs: "Es una resolución sobre una compensación solicitada por el interesado entre un crédito y una deuda.",
    action: "Comprueba crédito, deuda, filas aplicadas y cualquier saldo que el documento mantenga pendiente.",
    deadline: "Los recursos y efectos se cuentan desde la notificación efectiva del acto.",
    consequence: "La compensación solo extingue los importes que el documento aplica expresamente.",
  }),
  "collection.deferral_modification": Object.freeze({
    whatIs: "La AEAT modifica un aplazamiento anterior y sustituye su calendario por uno nuevo para la misma deuda.",
    action: "Usa únicamente el calendario modificado como activo y conserva el anterior como histórico.",
    deadline: "Los nuevos vencimientos son los impresos en el acuerdo posterior.",
    consequence: "No se deben sumar las cuotas ni los intereses de ambos calendarios.",
  }),
  "collection.external_debt": Object.freeze({
    whatIs: "La AEAT gestiona el cobro, pero la deuda se originó en otro organismo.",
    action: "Distingue el organismo que originó la deuda de la AEAT, que actúa como recaudadora.",
    deadline: "El plazo depende de la notificación efectiva del acto de recaudación.",
    consequence: "No debe reclasificarse como un impuesto propio de la AEAT ni atribuirse a esta el acto de origen.",
  }),
  "compliance.document_request": Object.freeze({
    whatIs: "La AEAT pide documentación concreta y el propio escrito indica que esta petición no inicia una comprobación.",
    action: "Reúne las categorías y ejercicios solicitados y responde dentro del plazo por el canal indicado.",
    deadline: "Cuenta los días desde la notificación efectiva y verifica si son hábiles.",
    consequence: "No atenderlo puede tener consecuencias posteriores, pero el documento no impone ya una sanción ni inicia por sí mismo una comprobación.",
  }),
  "assessment.final_provisional_assessment": Object.freeze({
    whatIs: "Es la resolución final de una liquidación provisional dentro de este procedimiento; no debe confundirse con la propuesta previa.",
    action: "Revisa cuota, intereses, total, motivos y saldo declarado rechazado. Las copias de la carta representan una sola operación.",
    deadline: "El plazo de pago o recurso depende de la notificación efectiva y de lo indicado en la resolución.",
    consequence: "La carta permite pagar, pero no confirma el pago; citar otro ejercicio no enlaza su propuesta sin referencia exacta al acto final.",
  }),
});

function normalize(value: string): string {
  try {
    return value.normalize("NFKD").replace(/\p{M}+/gu, "").replace(/\s+/gu, " ").trim().toLocaleUpperCase("es-ES");
  } catch {
    return "";
  }
}

function buildIndex(document: BoundedDocumentInput): DocumentIndexV7 {
  const lines: IndexedLineV7[] = [];
  const blankPageNumbers = new Set<number>();
  for (const page of document.pages) {
    const pageLines = page.text.split(/\r?\n/gu).map((raw) => ({ raw: raw.trim(), normalized: normalize(raw) })).filter((line) => line.normalized.length > 0);
    if (page.isBlank || pageLines.length === 0) blankPageNumbers.add(page.pageNumber);
    for (const line of pageLines) lines.push(Object.freeze({ pageNumber: page.pageNumber, ...line }));
  }
  return Object.freeze({
    lines: Object.freeze(lines),
    normalizedText: lines.map((line) => line.normalized).join("\n"),
    blankPageNumbers,
  });
}

function contains(index: DocumentIndexV7, value: string): boolean {
  return index.normalizedText.includes(normalize(value));
}

function values(index: DocumentIndexV7, labels: readonly string[]): readonly IndexedLineV7[] {
  const normalizedLabels = labels.map(normalize);
  const result: IndexedLineV7[] = [];
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

function first(index: DocumentIndexV7, labels: readonly string[]): IndexedLineV7 | null {
  return values(index, labels)[0] ?? null;
}

function parseMoney(raw: string): number | null {
  const compact = raw.replace(/\s|€|EUR/giu, "").replace(/\.(?=\d{3}(?:\D|$))/gu, "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/u.test(compact)) return null;
  const cents = Math.round(Number(compact) * 100);
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}

function parseInteger(raw: string, max = 10_000): number | null {
  const compact = raw.replace(/\s|%/gu, "");
  if (!/^\d+$/u.test(compact)) return null;
  const result = Number(compact);
  return Number.isSafeInteger(result) && result >= 0 && result <= max ? result : null;
}

function parseDate(raw: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(raw.trim());
  const spanish = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/u.exec(raw.trim());
  const match = iso ?? spanish;
  if (!match) return null;
  const year = Number(iso ? match[1] : match[3]);
  const month = Number(match[2]);
  const day = Number(iso ? match[3] : match[1]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    : null;
}

function safeReference(raw: string): string | null {
  const value = raw.trim().toLocaleUpperCase("es-ES");
  return REFERENCE.test(value) && (/\d/u.test(value) || /^SYN-[A-Z0-9-]+$/u.test(value)) && !PRIVATE_REFERENCE.test(value) ? value : null;
}

function evidence(pageNumber: number): RealCorpusEvidenceV2 {
  return Object.freeze({ pageNumbers: Object.freeze([pageNumber]), assertionType: "EXPLICIT_IN_DOCUMENT" });
}

function referenceField(fieldCode: string, label: string, source: IndexedLineV7 | null): RealCorpusFieldV2 | null {
  const value = source ? safeReference(source.raw) : null;
  return value && source ? Object.freeze({ fieldCode, label, kind: "REFERENCE" as const, value, evidence: evidence(source.pageNumber) }) : null;
}

function moneyField(fieldCode: string, label: string, source: IndexedLineV7 | null): RealCorpusFieldV2 | null {
  const amountCents = source ? parseMoney(source.raw) : null;
  return amountCents !== null && source ? Object.freeze({ fieldCode, label, kind: "MONEY" as const, amountCents, currency: "EUR" as const, evidence: evidence(source.pageNumber) }) : null;
}

function dateField(fieldCode: string, label: string, source: IndexedLineV7 | null): RealCorpusFieldV2 | null {
  const value = source ? parseDate(source.raw) : null;
  return value && source ? Object.freeze({ fieldCode, label, kind: "DATE" as const, value, evidence: evidence(source.pageNumber) }) : null;
}

function integerField(fieldCode: string, label: string, source: IndexedLineV7 | null): RealCorpusFieldV2 | null {
  const value = source ? parseInteger(source.raw) : null;
  return value !== null && source ? Object.freeze({ fieldCode, label, kind: "INTEGER" as const, value, evidence: evidence(source.pageNumber) }) : null;
}

function textField(fieldCode: string, label: string, value: string, pageNumber = 1): RealCorpusFieldV2 {
  return Object.freeze({ fieldCode, label, kind: "TEXT" as const, value, evidence: evidence(pageNumber) });
}

function compactFields(fields: readonly (RealCorpusFieldV2 | null)[]): readonly RealCorpusFieldV2[] {
  const result = new Map<string, RealCorpusFieldV2>();
  for (const item of fields) {
    if (!item) continue;
    const value = item.kind === "MONEY" ? item.amountCents : item.value;
    const key = `${item.fieldCode}:${item.kind}:${String(value)}`;
    if (!result.has(key)) result.set(key, item);
  }
  return Object.freeze([...result.values()]);
}

function recognize(index: DocumentIndexV7): RealCorpusFamilyIdV7 | null {
  if (contains(index, "INICIO DEL PROCEDIMIENTO SANCIONADOR") && contains(index, "TRÁMITE DE AUDIENCIA")) return "sanction.initiation_and_hearing";
  if (contains(index, "REQUERIMIENTO FORMAL DE PRESENTACIÓN")) return "compliance.formal_filing_requirement";
  if (contains(index, "DILIGENCIA DE EMBARGO DE CUENTA BANCARIA")) return "seizure.bank_account";
  if (contains(index, "PROVIDENCIA DE APREMIO")) return "collection.enforcement_order";
  if (contains(index, "ACUERDO DE COMPENSACIÓN DE OFICIO")) return "collection.offset_ex_officio";
  if (contains(index, "RESOLUCIÓN DE ALTA EN EL REGISTRO DE OPERADORES INTRACOMUNITARIOS")) return "registry.tax_registration_resolution";
  if (contains(index, "MODIFICACIÓN DEL APLAZAMIENTO") || contains(index, "CALENDARIO MODIFICADO")) return "collection.deferral_modification";
  if (contains(index, "CONCESIÓN DEL APLAZAMIENTO/FRACCIONAMIENTO")) return "collection.deferral_grant";
  if (contains(index, "ACUERDO DE COMPENSACIÓN A INSTANCIA") || contains(index, "COMPENSACIÓN SOLICITADA")) return "collection.offset_requested";
  if (contains(index, "DEUDA DE OTRO ORGANISMO EN RECAUDACIÓN AEAT")) return "collection.external_debt";
  if (contains(index, "REQUERIMIENTO DE DOCUMENTACIÓN") && contains(index, "NO INICIA PROCEDIMIENTO DE COMPROBACIÓN")) return "compliance.document_request";
  if (contains(index, "RESOLUCIÓN DE LIQUIDACIÓN PROVISIONAL") && contains(index, "RESOLUCIÓN FINAL DEL PROCEDIMIENTO")) return "assessment.final_provisional_assessment";
  return null;
}

function title(familyId: RealCorpusFamilyIdV7): string {
  return ({
    "sanction.initiation_and_hearing": "Inicio de expediente sancionador y trámite de audiencia",
    "compliance.formal_filing_requirement": "Requerimiento formal de presentación",
    "seizure.bank_account": "Diligencia de embargo de cuenta bancaria",
    "collection.enforcement_order": "Providencia de apremio",
    "collection.offset_ex_officio": "Acuerdo de compensación de oficio",
    "registry.tax_registration_resolution": "Resolución de alta en el ROI",
    "collection.deferral_grant": "Concesión de aplazamiento o fraccionamiento",
    "collection.offset_requested": "Acuerdo de compensación solicitada",
    "collection.deferral_modification": "Modificación de aplazamiento o fraccionamiento",
    "collection.external_debt": "Recaudación de deuda de otro organismo",
    "compliance.document_request": "Requerimiento de documentación",
    "assessment.final_provisional_assessment": "Liquidación provisional final",
  } as const)[familyId];
}

function parseInstallments(index: DocumentIndexV7): readonly RealCorpusInstallmentV7[] {
  const result: RealCorpusInstallmentV7[] = [];
  const seen = new Set<number>();
  for (const line of index.lines) {
    const match = /^CUOTA\s+(\d+)\s*[|;]\s*([^|;]+)\s*[|;]\s*([^|;]+)\s*[|;]\s*([^|;]+)\s*[|;]\s*([^|;]+)$/u.exec(line.raw.trim());
    if (!match) continue;
    const sequence = parseInteger(match[1]!, 100);
    const dueDate = parseDate(match[2]!);
    const baseCents = parseMoney(match[3]!);
    const deferralInterestCents = parseMoney(match[4]!);
    const totalCents = parseMoney(match[5]!);
    if (sequence === null || sequence < 1 || !dueDate || baseCents === null || deferralInterestCents === null || totalCents === null || baseCents + deferralInterestCents !== totalCents || seen.has(sequence) || result.length >= 100) continue;
    seen.add(sequence);
    result.push(Object.freeze({ sequence, dueDate, baseCents, deferralInterestCents, totalCents, pageNumber: line.pageNumber }));
  }
  return Object.freeze(result);
}

function parseOffsetRows(index: DocumentIndexV7): readonly RealCorpusOffsetRowV7[] {
  const result: RealCorpusOffsetRowV7[] = [];
  const seen = new Set<string>();
  for (const line of index.lines) {
    const match = /^FILA COMPENSACION\s*[|;]\s*([A-Z0-9./:_+-]+)\s*[|;]\s*([^|;]+)\s*[|;]\s*([^|;]+)\s*[|;]\s*([^|;]+)$/u.exec(line.normalized);
    if (!match) continue;
    const debtKey = safeReference(match[1]!);
    const beforeCents = parseMoney(match[2]!);
    const appliedCents = parseMoney(match[3]!);
    const remainingCents = parseMoney(match[4]!);
    if (!debtKey || beforeCents === null || appliedCents === null || remainingCents === null || appliedCents > beforeCents || beforeCents - appliedCents !== remainingCents || seen.has(debtKey) || result.length >= 100) continue;
    seen.add(debtKey);
    result.push(Object.freeze({ debtKey, beforeCents, appliedCents, remainingCents, pageNumber: line.pageNumber }));
  }
  return Object.freeze(result);
}

function parseBankSeizure(index: DocumentIndexV7): RealCorpusBankSeizureV7 | null {
  const seizureOrderId = safeReference(first(index, ["Número de diligencia"])?.raw ?? "");
  const debtKey = safeReference(first(index, ["Clave de deuda"])?.raw ?? "");
  const debtTotalCents = parseMoney(first(index, ["Total de la deuda"])?.raw ?? "");
  const seizeLimitCents = parseMoney(first(index, ["Límite del embargo"])?.raw ?? "");
  const seizedAmountCents = parseMoney(first(index, ["Importe embargado"])?.raw ?? "");
  const opaqueAssetOrdinal = parseInteger(first(index, ["Ordinal opaco del activo"])?.raw ?? "", 100);
  return seizureOrderId && debtKey && debtTotalCents !== null && seizeLimitCents !== null && seizedAmountCents !== null && opaqueAssetOrdinal !== null && opaqueAssetOrdinal >= 1
    ? Object.freeze({ seizureOrderId, debtKey, debtTotalCents, seizeLimitCents, seizedAmountCents, opaqueAssetOrdinal, remittedAmountCents: null })
    : null;
}

function parsePlan(index: DocumentIndexV7, modified: boolean): RealCorpusPlanV7 | null {
  const agreementId = safeReference(first(index, ["Referencia del acuerdo"])?.raw ?? "");
  const debtKey = safeReference(first(index, ["Clave de deuda"])?.raw ?? "");
  const principalCents = parseMoney(first(index, ["Principal original", "Principal del plan"])?.raw ?? "");
  const interestCents = parseMoney(first(index, ["Intereses del aplazamiento", "Intereses del plan"])?.raw ?? "");
  const replacesAgreementId = modified ? safeReference(first(index, ["Acuerdo sustituido"])?.raw ?? "") : null;
  return agreementId && debtKey && principalCents !== null && interestCents !== null && (!modified || replacesAgreementId)
    ? Object.freeze({ agreementId, debtKey, principalCents, interestCents, modified, replacesAgreementId })
    : null;
}

function subtype(familyId: RealCorpusFamilyIdV7, index: DocumentIndexV7): RealCorpusSubtypeV7 {
  if (familyId === "sanction.initiation_and_hearing") return "SANCTION_PROPOSAL_WITH_HEARING";
  if (familyId === "compliance.formal_filing_requirement") return "FORMAL_FILING_REQUIREMENT";
  if (familyId === "seizure.bank_account") return "BANK_ACCOUNT_SEIZURE";
  if (familyId === "collection.enforcement_order") return contains(index, "PRINCIPAL RESTANTE DEL PLAN") ? "ENFORCEMENT_REMAINING_PLAN_PRINCIPAL" : "ENFORCEMENT_SINGLE_INSTALLMENT";
  if (familyId === "collection.offset_ex_officio") return "OFFSET_EX_OFFICIO_ROW_BY_ROW";
  if (familyId === "registry.tax_registration_resolution") return "ROI_REGISTRATION_GRANTED_HISTORICAL";
  if (familyId === "collection.deferral_grant") return "DEFERRAL_PAYMENT_PLAN";
  if (familyId === "collection.offset_requested") return "OFFSET_REQUESTED";
  if (familyId === "collection.deferral_modification") return "MODIFIED_PAYMENT_PLAN";
  if (familyId === "collection.external_debt") return "EXTERNAL_PUBLIC_DEBT_COLLECTED_BY_AEAT";
  if (familyId === "compliance.document_request") return "DOCUMENT_REQUEST_WITHOUT_ASSESSMENT_START";
  return "FINAL_PROVISIONAL_ASSESSMENT_WITH_PAYMENT_FORM_COPIES";
}

function fieldsFor(index: DocumentIndexV7, familyId: RealCorpusFamilyIdV7, baseFields: readonly RealCorpusFieldV2[], offsetRows: readonly RealCorpusOffsetRowV7[], bankSeizure: RealCorpusBankSeizureV7 | null, plan: RealCorpusPlanV7 | null): readonly RealCorpusFieldV2[] {
  const fields: (RealCorpusFieldV2 | null)[] = [
    ...baseFields,
    dateField("ISSUE_DATE", "Fecha del documento", first(index, ["Fecha del documento", "Fecha de emisión"])),
    dateField("PUBLICATION_DATE", "Fecha de publicación", first(index, ["Fecha de publicación"])),
    dateField("EFFECTIVE_NOTIFICATION_DATE", "Fecha efectiva de notificación", first(index, ["Fecha efectiva de notificación"])),
    dateField("SIGNATURE_DATE", "Fecha de firma", first(index, ["Fecha de firma"])),
  ];
  if (familyId === "sanction.initiation_and_hearing") fields.push(
    referenceField("SANCTION_REFERENCE", "Referencia del expediente sancionador", first(index, ["Referencia del expediente sancionador"])),
    moneyField("INITIAL_FINE_PROPOSAL", "Sanción propuesta", first(index, ["Sanción propuesta"])),
    moneyField("PROPOSED_REDUCTION", "Reducción propuesta", first(index, ["Reducción propuesta"])),
    moneyField("PROPOSED_REDUCED_FINE", "Sanción reducida propuesta", first(index, ["Sanción reducida propuesta"])),
    integerField("ALLEGATION_BUSINESS_DAYS", "Días hábiles para alegaciones", first(index, ["Días hábiles para alegaciones"])),
    textField("SANCTION_STAGE", "Estado del procedimiento sancionador", "PROPOSAL_NOT_FINAL"),
    textField("RESPONSE_FORM_STATUS", "Estado del formulario de respuesta", "BLANK_FORM_NOT_SUBMITTED"),
  );
  if (familyId === "compliance.formal_filing_requirement") fields.push(
    integerField("RESPONSE_BUSINESS_DAYS", "Días hábiles para responder", first(index, ["Días hábiles para responder"])),
    textField("LEGAL_EFFECT", "Efecto del requerimiento", "NOT_DEBT_NOT_SANCTION"),
  );
  if (familyId === "seizure.bank_account" && bankSeizure) fields.push(
    referenceField("SEIZURE_ORDER_ID", "Número de diligencia", first(index, ["Número de diligencia"])),
    referenceField("DEBT_KEY", "Clave de deuda", first(index, ["Clave de deuda"])),
    moneyField("DEBT_TOTAL", "Total de la deuda", first(index, ["Total de la deuda"])),
    moneyField("SEIZE_LIMIT", "Límite del embargo", first(index, ["Límite del embargo"])),
    moneyField("SEIZED_AMOUNT", "Importe embargado", first(index, ["Importe embargado"])),
    integerField("OPAQUE_ASSET_ORDINAL", "Cuenta o depósito", first(index, ["Ordinal opaco del activo"])),
    textField("REMITTANCE_STATE", "Estado del ingreso al Tesoro", "NOT_EVIDENCED"),
  );
  if (familyId === "collection.enforcement_order") fields.push(
    referenceField("DEBT_KEY", "Clave de deuda", first(index, ["Clave de deuda"])),
    dateField("VOLUNTARY_END_DATE", "Fin del período voluntario", first(index, ["Fin del período voluntario", "Vencimiento ajustado"])),
    moneyField("PRINCIPAL", "Principal pendiente", first(index, ["Principal pendiente"])),
    textField("ENFORCEMENT_SCOPE", "Alcance", contains(index, "PRINCIPAL RESTANTE DEL PLAN") ? "REMAINING_PLAN_PRINCIPAL" : "SINGLE_INSTALLMENT_OR_DEBT"),
  );
  if ((familyId === "collection.offset_ex_officio" || familyId === "collection.offset_requested") && offsetRows.length > 0) {
    fields.push(moneyField("OFFSET_CREDIT_APPLIED", "Crédito aplicado", first(index, ["Crédito aplicado"])));
    offsetRows.forEach((row, position) => fields.push(
      Object.freeze({ fieldCode: `OFFSET_DEBT_KEY_${position + 1}`, label: `Deuda afectada ${position + 1}`, kind: "REFERENCE" as const, value: row.debtKey, evidence: evidence(row.pageNumber) }),
      Object.freeze({ fieldCode: `OFFSET_BEFORE_${position + 1}`, label: `Importe anterior ${position + 1}`, kind: "MONEY" as const, amountCents: row.beforeCents, currency: "EUR" as const, evidence: evidence(row.pageNumber) }),
      Object.freeze({ fieldCode: `OFFSET_APPLIED_${position + 1}`, label: `Compensación aplicada ${position + 1}`, kind: "MONEY" as const, amountCents: row.appliedCents, currency: "EUR" as const, evidence: evidence(row.pageNumber) }),
      Object.freeze({ fieldCode: `OFFSET_REMAINING_${position + 1}`, label: `Saldo pendiente ${position + 1}`, kind: "MONEY" as const, amountCents: row.remainingCents, currency: "EUR" as const, evidence: evidence(row.pageNumber) }),
    ));
  }
  if (familyId === "collection.offset_requested") fields.push(
    referenceField("OFFSET_REFERENCE", "Referencia del documento", first(index, ["Referencia del documento", "Referencia de la compensación"])),
  );
  if (familyId === "registry.tax_registration_resolution") fields.push(
    referenceField("RESOLUTION_REFERENCE", "Referencia del documento", first(index, ["Referencia de la resolución"])),
    referenceField("REQUEST_MODEL", "Modelo tributario", first(index, ["Modelo de solicitud"])),
    dateField("REQUEST_DATE", "Fecha de solicitud", first(index, ["Fecha de solicitud"])),
    dateField("EFFECTIVE_DATE", "Fecha de efectos", first(index, ["Fecha de efectos"])),
    textField("ROI_STATUS", "Estado del alta", "REGISTERED"),
    textField("CURRENT_STATUS", "Estado actual", "NOT_INFERRED"),
  );
  if ((familyId === "collection.deferral_grant" || familyId === "collection.deferral_modification") && plan) fields.push(
    referenceField("AGREEMENT_ID", "Referencia del acuerdo", first(index, ["Referencia del acuerdo"])),
    referenceField("DEBT_KEY", "Clave de deuda", first(index, ["Clave de deuda"])),
    moneyField("PLAN_PRINCIPAL", "Principal del plan", first(index, ["Principal original", "Principal del plan"])),
    moneyField("PLAN_INTEREST", "Intereses del plan", first(index, ["Intereses del aplazamiento", "Intereses del plan"])),
    ...(plan.modified ? [
      referenceField("REPLACES_AGREEMENT_ID", "Acuerdo sustituido", first(index, ["Acuerdo sustituido"])),
      textField("SCHEDULE_STATE", "Estado del calendario", "MODIFIED_SCHEDULE_REPLACES_ORIGINAL"),
    ] : []),
  );
  if (familyId === "collection.external_debt") fields.push(
    referenceField("EXTERNAL_DEBT_REFERENCE", "Clave de deuda", first(index, ["Referencia de la deuda externa"])),
    textField("ORIGINATING_AUTHORITY", "Organismo de origen", "EXTERNAL_PUBLIC_BODY"),
    textField("COLLECTION_AUTHORITY", "Organismo recaudador", "AEAT"),
    moneyField("EXTERNAL_PRINCIPAL", "Principal pendiente", first(index, ["Principal pendiente"])),
    moneyField("EXTERNAL_ORDINARY_TOTAL", "Total con recargo ordinario", first(index, ["Total con recargo ordinario"])),
  );
  if (familyId === "compliance.document_request") fields.push(
    integerField("RESPONSE_BUSINESS_DAYS", "Días hábiles para responder", first(index, ["Días hábiles para responder"])),
    textField("ASSESSMENT_START", "Inicio de comprobación", "EXPLICITLY_NOT_STARTED"),
    textField("POSSIBLE_CONSEQUENCE", "Consecuencia indicada", "POSSIBLE_LATER_SANCTION_ONLY"),
  );
  if (familyId === "compliance.document_request") {
    const allowedCategories = new Set(["INVOICES", "RECORD_BOOKS", "BANK_RECORDS", "SUPPORTING_DOCUMENTS"]);
    values(index, ["Categoría documental"]).forEach((line, position) => {
      const value = normalize(line.raw).replace(/\s+/gu, "_");
      if (allowedCategories.has(value)) fields.push(textField(`DOCUMENT_CATEGORY_${position + 1}`, `Documentación ${position + 1}`, value, line.pageNumber));
    });
  }
  if (familyId === "assessment.final_provisional_assessment") fields.push(
    referenceField("FINAL_ASSESSMENT_REFERENCE", "Referencia del acto", first(index, ["Referencia de la liquidación final"])),
    moneyField("ASSESSMENT_QUOTA", "Cuota final", first(index, ["Cuota liquidada"])),
    moneyField("ASSESSMENT_INTEREST", "Intereses de demora", first(index, ["Intereses de demora"])),
    moneyField("ASSESSMENT_TOTAL", "Total del documento", first(index, ["Total a ingresar"])),
    moneyField("REJECTED_CARRYFORWARD", "Saldo declarado rechazado", first(index, ["Saldo declarado rechazado"])),
    normalize(first(index, ["Motivo de regularización"])?.raw ?? "") === "REJECTED_CARRYFORWARD"
      ? textField("ASSESSMENT_REASON", "Hecho o fundamento 1", "REJECTED_CARRYFORWARD", first(index, ["Motivo de regularización"])?.pageNumber ?? 1)
      : null,
    textField("PROCEDURE_STAGE", "Estado del procedimiento", "FINAL_FOR_CURRENT_PROCEDURE"),
    textField("PAYMENT_FORM_STATUS", "Carta de pago adjunta", "ONE_OPERATION_NOT_PAYMENT_EVIDENCE"),
  );
  for (const line of values(index, ["Modelo y período"])) {
    const value = safeReference(line.raw.replace(/\s+/gu, ""));
    if (value) fields.push(Object.freeze({ fieldCode: "MODEL_PERIOD", label: "Modelo y período", kind: "REFERENCE" as const, value, evidence: evidence(line.pageNumber) }));
  }
  for (const line of values(index, ["Ejercicio solicitado"])) {
    const value = parseInteger(line.raw, 2100);
    if (value !== null && value >= 1900) fields.push(Object.freeze({ fieldCode: "REQUESTED_YEAR", label: "Ejercicio solicitado", kind: "INTEGER" as const, value, evidence: evidence(line.pageNumber) }));
  }
  return compactFields(fields);
}

function hasField(fields: readonly RealCorpusFieldV2[], code: string): boolean {
  return fields.some((field) => field.fieldCode === code);
}

function hasRequiredFacts(
  familyId: RealCorpusFamilyIdV7,
  subtypeValue: RealCorpusSubtypeV7,
  fields: readonly RealCorpusFieldV2[],
  installments: readonly RealCorpusInstallmentV7[],
  offsetRows: readonly RealCorpusOffsetRowV7[],
  bankSeizure: RealCorpusBankSeizureV7 | null,
  paymentPlan: RealCorpusPlanV7 | null,
): boolean {
  if (familyId === "sanction.initiation_and_hearing") {
    const amounts = ["INITIAL_FINE_PROPOSAL", "PROPOSED_REDUCTION", "PROPOSED_REDUCED_FINE"].map((code) => fields.find((field) => field.fieldCode === code));
    const [initial, reduction, reduced] = amounts.map((field) => field?.kind === "MONEY" ? field.amountCents : null);
    return hasField(fields, "SANCTION_REFERENCE") && hasField(fields, "MODEL_PERIOD") && hasField(fields, "ALLEGATION_BUSINESS_DAYS") && initial !== null && reduction !== null && reduced !== null && initial - reduction === reduced;
  }
  if (familyId === "compliance.formal_filing_requirement") return hasField(fields, "MODEL_PERIOD") && hasField(fields, "RESPONSE_BUSINESS_DAYS");
  if (familyId === "seizure.bank_account") return bankSeizure !== null && bankSeizure.seizedAmountCents <= bankSeizure.seizeLimitCents;
  if (familyId === "collection.enforcement_order") return hasField(fields, "DEBT_KEY") && hasField(fields, "PRINCIPAL") && (subtypeValue !== "ENFORCEMENT_SINGLE_INSTALLMENT" || hasField(fields, "VOLUNTARY_END_DATE"));
  if (familyId === "collection.offset_ex_officio") {
    const credit = fields.find((field) => field.fieldCode === "OFFSET_CREDIT_APPLIED");
    return offsetRows.length > 0 && credit?.kind === "MONEY" && offsetRows.reduce((sum, row) => sum + row.appliedCents, 0) === credit.amountCents;
  }
  if (familyId === "registry.tax_registration_resolution") {
    const model = fields.find((field) => field.fieldCode === "REQUEST_MODEL");
    return model?.kind === "REFERENCE" && model.value === "036" && hasField(fields, "RESOLUTION_REFERENCE") && hasField(fields, "REQUEST_DATE") && hasField(fields, "EFFECTIVE_DATE");
  }
  if (familyId === "collection.deferral_grant" || familyId === "collection.deferral_modification") {
    return paymentPlan !== null && installments.length > 0 && installments.reduce((sum, item) => sum + item.baseCents, 0) === paymentPlan.principalCents && installments.reduce((sum, item) => sum + item.deferralInterestCents, 0) === paymentPlan.interestCents;
  }
  if (familyId === "collection.offset_requested") return hasField(fields, "OFFSET_REFERENCE");
  if (familyId === "collection.external_debt") return hasField(fields, "EXTERNAL_DEBT_REFERENCE") && hasField(fields, "EXTERNAL_PRINCIPAL") && hasField(fields, "EXTERNAL_ORDINARY_TOTAL");
  if (familyId === "compliance.document_request") return hasField(fields, "REQUESTED_YEAR") && hasField(fields, "RESPONSE_BUSINESS_DAYS") && hasField(fields, "DOCUMENT_CATEGORY_1");
  const quota = fields.find((field) => field.fieldCode === "ASSESSMENT_QUOTA");
  const interest = fields.find((field) => field.fieldCode === "ASSESSMENT_INTEREST");
  const total = fields.find((field) => field.fieldCode === "ASSESSMENT_TOTAL");
  return hasField(fields, "FINAL_ASSESSMENT_REFERENCE") && hasField(fields, "ASSESSMENT_REASON") && quota?.kind === "MONEY" && interest?.kind === "MONEY" && total?.kind === "MONEY" && quota.amountCents + interest.amountCents === total.amountCents;
}

function unknown(document: BoundedDocumentInput, index: DocumentIndexV7): RealCorpusExtractorOutcomeV7 {
  return Object.freeze({
    schemaVersion: REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V7,
    extractorVersion: REAL_CORPUS_EXTRACTOR_VERSION_V7,
    sourceDocumentId: document.documentId,
    status: "UNKNOWN",
    familyId: null,
    subtype: null,
    canonicalTitle: null,
    physicalPageCount: document.pages.length,
    contentPageCount: document.pages.length - index.blankPageNumbers.size,
    fields: Object.freeze([]),
    installments: Object.freeze([]),
    offsetRows: Object.freeze([]),
    bankSeizure: null,
    paymentPlan: null,
    segments: Object.freeze([]),
    paymentFormOperationCount: 0,
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
    confirmsCurrentRegistryStatus: false,
  });
}

/** Deterministic V7 layer. Source text and direct identity never leave the call. */
export async function extractAeatRealCorpusDocumentV7(document: BoundedDocumentInput): Promise<RealCorpusExtractorOutcomeV7> {
  assertBoundedDocumentInput(document);
  assertNotAborted(document.signal);
  const index = buildIndex(document);
  if (!contains(index, "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA") && !contains(index, "AEAT")) return unknown(document, index);
  const familyId = recognize(index);
  if (!familyId) return unknown(document, index);
  const base = await extractAeatRealCorpusDocumentV6(document);
  const installments = parseInstallments(index);
  const offsetRows = parseOffsetRows(index);
  const bankSeizure = familyId === "seizure.bank_account" ? parseBankSeizure(index) : null;
  const paymentPlan = familyId === "collection.deferral_grant" ? parsePlan(index, false)
    : familyId === "collection.deferral_modification" ? parsePlan(index, true) : null;
  if ((familyId === "seizure.bank_account" && !bankSeizure) || ((familyId === "collection.deferral_grant" || familyId === "collection.deferral_modification") && (!paymentPlan || installments.length === 0)) || (familyId === "collection.offset_ex_officio" && offsetRows.length === 0)) return unknown(document, index);
  const segments = base.status === "REVIEW_REQUIRED" ? base.segments : Object.freeze(document.pages.map((page, position) => Object.freeze({
    segmentId: `part:${document.documentId}:${position + 1}`,
    type: page.isBlank ? "BLANK" as const : position === 0 ? "PRIMARY_ACT" as const : "INFORMATION" as const,
    pageNumbers: Object.freeze([page.pageNumber]),
    relationToPrimary: page.isBlank ? "BLANK" as const : position === 0 ? "PRIMARY" as const : "INFORMATION_ONLY" as const,
    provesPayment: false as const,
    createsIndependentDebt: false as const,
  })));
  const paymentFormCount = contains(index, "CARTA DE PAGO") || contains(index, "DOCUMENTO DE INGRESO") ? 1 : 0;
  const subtypeValue = subtype(familyId, index);
  const extractedFields = fieldsFor(index, familyId, base.status === "REVIEW_REQUIRED" && base.familyId === familyId ? base.fields : Object.freeze([]), offsetRows, bankSeizure, paymentPlan);
  if (!hasRequiredFacts(familyId, subtypeValue, extractedFields, installments, offsetRows, bankSeizure, paymentPlan)) return unknown(document, index);
  const result: RealCorpusExtractorOutcomeV7 = Object.freeze({
    schemaVersion: REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V7,
    extractorVersion: REAL_CORPUS_EXTRACTOR_VERSION_V7,
    sourceDocumentId: document.documentId,
    status: "REVIEW_REQUIRED",
    familyId,
    subtype: subtypeValue,
    canonicalTitle: title(familyId),
    physicalPageCount: document.pages.length,
    contentPageCount: document.pages.length - index.blankPageNumbers.size,
    fields: extractedFields,
    installments,
    offsetRows,
    bankSeizure,
    paymentPlan,
    segments,
    paymentFormOperationCount: paymentFormCount,
    explanation: REAL_CORPUS_EXPLANATIONS_V7[familyId],
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    retainedSourceContent: "NONE",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED",
    confirmsDebt: false,
    confirmsPayment: false,
    confirmsRemittance: false,
    confirmsDeadline: false,
    confirmsDebtExtinction: false,
    confirmsCurrentRegistryStatus: false,
  });
  assertNotAborted(document.signal);
  return result;
}
