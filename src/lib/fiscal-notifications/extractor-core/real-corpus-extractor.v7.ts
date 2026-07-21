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
  "aeat-real-corpus-extractor.2026-07-19.v7.4" as const;

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
  readonly enforcementSurchargeCents: number;
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
  return index.normalizedText
    .replace(/\s+/gu, " ")
    .includes(normalize(value));
}

function firstContaining(
  index: DocumentIndexV7,
  markers: readonly string[],
): IndexedLineV7 | null {
  const normalizedMarkers = markers.map(normalize);
  return (
    index.lines.find((line) =>
      normalizedMarkers.some((marker) => line.normalized.includes(marker)),
    ) ?? null
  );
}

function values(index: DocumentIndexV7, labels: readonly string[]): readonly IndexedLineV7[] {
  const normalizedLabels = labels.map(normalize);
  const result: IndexedLineV7[] = [];
  for (let position = 0; position < index.lines.length; position += 1) {
    const line = index.lines[position]!;
    for (const label of normalizedLabels) {
      if (line.normalized === label || line.normalized === `${label}:`) {
        const next = index.lines[position + 1];
        if (next) result.push(next);
      } else if (line.normalized.startsWith(`${label}:`)) {
        const raw = line.raw.slice(line.raw.indexOf(":") + 1).trim();
        if (raw) {
          result.push(Object.freeze({ ...line, raw, normalized: normalize(raw) }));
        } else {
          const next = index.lines[position + 1];
          if (next) result.push(next);
        }
      }
    }
  }
  return Object.freeze(result);
}

function first(index: DocumentIndexV7, labels: readonly string[]): IndexedLineV7 | null {
  return values(index, labels)[0] ?? null;
}

function firstSafeReferenceSource(
  index: DocumentIndexV7,
  labels: readonly string[],
): IndexedLineV7 | null {
  return values(index, labels).find((line) => safeReference(line.raw)) ?? null;
}

function historicalProcedureReference(
  index: DocumentIndexV7,
): IndexedLineV7 | null {
  for (const line of index.lines) {
    if (line.pageNumber > 2) continue;
    const match =
      /(?:^|\s)((?:19|20)\d{2}\s*[A-Z]{3}\s*\d{8}\s*[A-Z])(?=\s|$)/u.exec(
        line.normalized,
      );
    if (!match?.[1]) continue;
    return Object.freeze({
      ...line,
      raw: match[1],
      normalized: normalize(match[1]),
    });
  }
  return null;
}

function paymentFormReferenceField(
  index: DocumentIndexV7,
): RealCorpusFieldV2 | null {
  const labeled = coalescedReferenceField(
    "PAYMENT_FORM_REFERENCE",
    "Referencia de la carta de pago",
    values(index, [
      "Referencia de carta de pago",
      "Referencia de pago",
      "Número de referencia",
      "Nº de referencia",
      "N.º de referencia",
      "N.° de referencia",
    ]),
  );
  if (labeled) return labeled;
  const sources: IndexedLineV7[] = [];
  const pageText = new Map<number, string>();
  for (const line of index.lines) {
    pageText.set(
      line.pageNumber,
      `${pageText.get(line.pageNumber) ?? ""} ${line.normalized}`.trim(),
    );
  }
  for (const line of index.lines) {
    const text = pageText.get(line.pageNumber) ?? "";
    if (
      !text.includes("CLAVE DE LIQUIDACION") ||
      !text.includes("IMPORTE") ||
      !text.includes("INGRESAR")
    ) {
      continue;
    }
    const match = /(?:^|\s)(\d{12}[A-Z])(?=\s|$)/u.exec(line.normalized);
    if (match?.[1]) {
      sources.push(
        Object.freeze({
          ...line,
          raw: match[1],
          normalized: match[1],
        }),
      );
    }
  }
  return coalescedReferenceField(
    "PAYMENT_FORM_REFERENCE",
    "Referencia de la carta de pago",
    sources,
  );
}

function coalescedReferenceField(
  fieldCode: string,
  label: string,
  sources: readonly IndexedLineV7[],
): RealCorpusFieldV2 | null {
  const observed = new Map<string, Set<number>>();
  for (const source of sources) {
    const value = safeReference(source.raw);
    if (!value) continue;
    const pages = observed.get(value) ?? new Set<number>();
    pages.add(source.pageNumber);
    observed.set(value, pages);
  }
  const selected = [...observed.entries()].sort(
    ([leftValue, leftPages], [rightValue, rightPages]) =>
      rightPages.size - leftPages.size || leftValue.localeCompare(rightValue),
  )[0];
  if (!selected) return null;
  return Object.freeze({
    fieldCode,
    label,
    kind: "REFERENCE" as const,
    value: selected[0],
    evidence: Object.freeze({
      pageNumbers: Object.freeze([...selected[1]].sort((left, right) => left - right)),
      assertionType: "EXPLICIT_IN_DOCUMENT" as const,
    }),
  });
}

function paymentFormLiquidationKeyField(
  index: DocumentIndexV7,
): RealCorpusFieldV2 | null {
  const pageText = new Map<number, string>();
  for (const line of index.lines) {
    pageText.set(
      line.pageNumber,
      `${pageText.get(line.pageNumber) ?? ""} ${line.normalized}`.trim(),
    );
  }
  const sources: IndexedLineV7[] = [];
  for (const line of index.lines) {
    const text = pageText.get(line.pageNumber) ?? "";
    if (
      !text.includes("CLAVE DE LIQUIDACION") ||
      !text.includes("IMPORTE") ||
      !text.includes("INGRESAR")
    ) {
      continue;
    }
    const match = /(?:^|\s)([A-Z]\s*\d{16})(?=\s|$)/u.exec(
      line.normalized,
    );
    if (match?.[1]) {
      sources.push(
        Object.freeze({
          ...line,
          raw: match[1],
          normalized: match[1],
        }),
      );
    }
  }
  return coalescedReferenceField(
    "LIQUIDATION_KEY",
    "Clave de liquidación",
    sources,
  );
}

function matchedSource(
  index: DocumentIndexV7,
  markers: readonly string[],
  pattern: RegExp,
): IndexedLineV7 | null {
  const normalizedMarkers = markers.map(normalize);
  for (const line of index.lines) {
    if (
      !normalizedMarkers.some((marker) => line.normalized.includes(marker))
    ) {
      continue;
    }
    const match = pattern.exec(line.normalized);
    if (!match?.[1]) continue;
    return Object.freeze({
      ...line,
      raw: match[1],
      normalized: normalize(match[1]),
    });
  }
  return null;
}

function firstMatching(
  index: DocumentIndexV7,
  markers: readonly string[],
  predicate: (line: IndexedLineV7) => boolean,
): IndexedLineV7 | null {
  const normalizedMarkers = markers.map(normalize);
  return (
    index.lines.find(
      (line) =>
        normalizedMarkers.every((marker) => line.normalized.includes(marker)) &&
        predicate(line),
    ) ?? null
  );
}

function businessDaysSource(index: DocumentIndexV7): IndexedLineV7 | null {
  return (
    first(index, [
      "Días hábiles para responder",
      "Días hábiles para alegaciones",
    ]) ??
    matchedSource(
      index,
      ["DÍAS HÁBILES"],
      /\b(\d{1,3}|UNO|DOS|TRES|CUATRO|CINCO|SEIS|SIETE|OCHO|NUEVE|DIEZ|ONCE|DOCE|TRECE|CATORCE|QUINCE)\s+DIAS HABILES\b/u,
    )
  );
}

function datedLine(
  index: DocumentIndexV7,
  markers: readonly string[],
): IndexedLineV7 | null {
  return firstMatching(index, markers, (line) => parseDate(line.raw) !== null);
}

function documentIssueDateSource(index: DocumentIndexV7): IndexedLineV7 | null {
  const explicit = first(index, [
    "Fecha del documento",
    "Fecha de emisión",
    "Fecha del acuerdo",
    "Fecha de la resolución",
    "Fecha de la providencia",
    "Fecha de la diligencia",
  ]);
  if (explicit && parseDate(explicit.raw) !== null) return explicit;
  return joinedDatedSource(
    index,
    isPrintedLocationDate,
  );
}

function isPrintedLocationDate(value: string): boolean {
  const date =
    "(?:\\d{1,2}[./-]\\d{1,2}[./-]\\d{4}|\\d{1,2}\\s+DE\\s+(?:ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|SETIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\\s+DE\\s+\\d{4})";
  if (new RegExp(`^[^,\\d]{2,180},\\s*(?:A\\s+)?${date}\\b`, "u").test(value)) {
    return true;
  }
  const withoutComma = new RegExp(
    `^([^,\\d]{2,80})\\s+(?:A\\s+)?${date}\\b`,
    "u",
  ).exec(value);
  if (!withoutComma?.[1]) return false;
  const prefix = withoutComma[1].trim();
  const prefixWords = prefix.split(/\s+/u);
  if (
    prefixWords.length > 8 ||
    (prefixWords.length > 4 && prefixWords.at(-1) !== "A")
  ) {
    return false;
  }
  return !/(?:ACUERDO|CUOTA|DILIGENCIA|EFECTOS|FECHA|FINALIZA|INTERES|NOTIFICACION|PAGO|PERIODO|PLAZO|PROVIDENCIA|PUBLICACION|RESOLUCION|SOLICITUD|VENCIMIENTO)/u.test(
    prefix,
  );
}

function documentSigningDateSource(index: DocumentIndexV7): IndexedLineV7 | null {
  const explicit = first(index, [
    "Fecha de firma",
    "Fecha y hora de firma",
    "Fecha y hora de la firma",
  ]);
  if (explicit && parseDate(explicit.raw) !== null) return explicit;
  return index.lines.find(
    (line) =>
      /(?:FIRMAD[AO]|\bFIRMA\b|FIRMA ELECTRONICA)/u.test(line.normalized) &&
      parseDate(line.raw) !== null,
  ) ?? null;
}

function joinedDatedSource(
  index: DocumentIndexV7,
  predicate: (normalized: string) => boolean,
): IndexedLineV7 | null {
  for (let position = 0; position < index.lines.length; position += 1) {
    const firstLine = index.lines[position]!;
    let raw = "";
    for (let length = 1; length <= 3; length += 1) {
      const line = index.lines[position + length - 1];
      if (!line || line.pageNumber !== firstLine.pageNumber) break;
      raw = raw ? `${raw} ${line.raw}` : line.raw;
      const normalized = normalize(raw);
      if (parseDate(raw) !== null && predicate(normalized)) {
        return Object.freeze({
          pageNumber: firstLine.pageNumber,
          raw,
          normalized,
        });
      }
    }
  }
  return null;
}

function parseMoney(raw: string): number | null {
  const selected = [
    ...raw.matchAll(
      /(?:^|\D)((?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?)\s*(?:EUR|€)?(?=\D|$)/giu,
    ),
  ].at(-1)?.[1] ?? raw;
  const compact = selected.replace(/\s|€|EUR/giu, "").replace(/\.(?=\d{3}(?:\D|$))/gu, "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/u.test(compact)) return null;
  const cents = Math.round(Number(compact) * 100);
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}

function parseInteger(raw: string, max = 10_000): number | null {
  const wordValues: Readonly<Record<string, number>> = Object.freeze({
    UNO: 1,
    DOS: 2,
    TRES: 3,
    CUATRO: 4,
    CINCO: 5,
    SEIS: 6,
    SIETE: 7,
    OCHO: 8,
    NUEVE: 9,
    DIEZ: 10,
    ONCE: 11,
    DOCE: 12,
    TRECE: 13,
    CATORCE: 14,
    QUINCE: 15,
  });
  const wordValue = wordValues[normalize(raw)];
  if (wordValue !== undefined) return wordValue <= max ? wordValue : null;
  const selected = /(?:^|\D)(\d+)(?:\D|$)/u.exec(raw)?.[1] ?? raw;
  const compact = selected.replace(/\s|%/gu, "");
  if (!/^\d+$/u.test(compact)) return null;
  const result = Number(compact);
  return Number.isSafeInteger(result) && result >= 0 && result <= max ? result : null;
}

function parseDate(raw: string): string | null {
  const iso = /(?:^|\D)(\d{4})-(\d{2})-(\d{2})(?:\D|$)/u.exec(raw.trim());
  const spanish = /(?:^|\D)(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\D|$)/u.exec(raw.trim());
  const written = /(?:^|\D)(\d{1,2})\s+DE\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|SETIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+DE\s+(\d{4})(?:\D|$)/u.exec(
    normalize(raw),
  );
  const match = iso ?? spanish ?? written;
  if (!match) return null;
  const monthNames = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ];
  const year = Number(iso ? match[1] : written ? match[3] : match[3]);
  const month = written
    ? monthNames.indexOf(match[2] === "SETIEMBRE" ? "SEPTIEMBRE" : match[2]!) + 1
    : Number(match[2]);
  const day = Number(iso ? match[3] : match[1]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    : null;
}

function safeReference(raw: string): string | null {
  const value = raw.trim().toLocaleUpperCase("es-ES").replace(/\s+/gu, "");
  return REFERENCE.test(value) && /\d/u.test(value) && !PRIVATE_REFERENCE.test(value) ? value : null;
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

function textField(
  fieldCode: string,
  label: string,
  value: string,
  source: IndexedLineV7 | null,
): RealCorpusFieldV2 | null {
  return source
    ? Object.freeze({
        fieldCode,
        label,
        kind: "TEXT" as const,
        value,
        evidence: evidence(source.pageNumber),
      })
    : null;
}

function observedTextField(
  fieldCode: string,
  label: string,
  source: IndexedLineV7 | null,
): RealCorpusFieldV2 | null {
  return source ? textField(fieldCode, label, source.raw, source) : null;
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
  if (isSanctionInitiationAndHearing(index)) return "sanction.initiation_and_hearing";
  if (
    contains(index, "REQUERIMIENTO") &&
    contains(index, "DOCUMENTACIÓN") &&
    (contains(index, "NO INICIA PROCEDIMIENTO DE COMPROBACIÓN") ||
      firstMatching(index, ["NO", "COMPROBACIÓN TRIBUTARIA"], () => true))
  ) return "compliance.document_request";
  if (
    !contains(index, "PROPUESTA DE LIQUIDACIÓN") &&
    !contains(index, "TRÁMITE DE ALEGACIONES") &&
    (contains(index, "REQUERIMIENTO FORMAL DE PRESENTACIÓN") ||
      (contains(index, "REQUERIMIENTO") &&
        contains(index, "PRESENTACIÓN") &&
        contains(index, "DECLARACIÓN") &&
        contains(index, "MODELO") &&
        contains(index, "DÍAS HÁBILES")))
  ) return "compliance.formal_filing_requirement";
  if (contains(index, "DILIGENCIA DE EMBARGO DE CUENTA BANCARIA")) return "seizure.bank_account";
  if (
    contains(index, "PROVIDENCIA DE APREMIO") &&
    (contains(index, "SEGURIDAD SOCIAL") ||
      firstMatching(index, ["ORGANISMO", "ADMINISTRACIÓN"], () => true) !==
        null)
  ) return "collection.external_debt";
  if (contains(index, "PROVIDENCIA DE APREMIO")) return "collection.enforcement_order";
  if (contains(index, "ACUERDO DE COMPENSACIÓN DE OFICIO")) return "collection.offset_ex_officio";
  if (
    contains(index, "RESOLUCIÓN DE ALTA EN EL REGISTRO DE OPERADORES INTRACOMUNITARIOS") ||
    (contains(index, "ACUERDO DE ALTA") && contains(index, "REGISTRO DE OPERADORES"))
  ) return "registry.tax_registration_resolution";
  if (isDeferralModificationAct(index)) return "collection.deferral_modification";
  if (
    contains(index, "CONCESIÓN") &&
    contains(index, "APLAZAMIENTO") &&
    contains(index, "FRACCIONAMIENTO")
  ) return "collection.deferral_grant";
  if (contains(index, "ACUERDO DE COMPENSACIÓN A INSTANCIA") || contains(index, "COMPENSACIÓN SOLICITADA")) return "collection.offset_requested";
  if (contains(index, "DEUDA DE OTRO ORGANISMO EN RECAUDACIÓN AEAT")) return "collection.external_debt";
  if (
    (contains(index, "RESOLUCIÓN DE LIQUIDACIÓN PROVISIONAL") &&
      contains(index, "RESOLUCIÓN FINAL DEL PROCEDIMIENTO")) ||
    (contains(index, "NOTIFICACIÓN DE RESOLUCIÓN") &&
      contains(index, "LIQUIDACIÓN PROVISIONAL"))
  ) return "assessment.final_provisional_assessment";
  return null;
}

function isSanctionInitiationAndHearing(index: DocumentIndexV7): boolean {
  const initiation =
    contains(index, "INICIO DEL PROCEDIMIENTO SANCIONADOR") ||
    (contains(index, "INICIACIÓN") &&
      contains(index, "EXPEDIENTE") &&
      contains(index, "SANCIÓN"));
  return (
    initiation &&
    contains(index, "PROPUESTA") &&
    contains(index, "SANCIÓN") &&
    contains(index, "ALEGACIONES")
  );
}

function isDeferralModificationAct(index: DocumentIndexV7): boolean {
  const firstContentPage = index.lines[0]?.pageNumber;
  if (firstContentPage === undefined) return false;
  return (
    firstMatching(
      index,
      ["MODIFICACIÓN", "APLAZAMIENTO"],
      (line) =>
        line.pageNumber === firstContentPage &&
        ["SOLICITUD", "CONCEDIDO", "SUSTITUYE", "CALENDARIO"].some(
          (marker) => line.normalized.includes(marker),
        ),
    ) !== null ||
    firstMatching(
      index,
      ["CALENDARIO MODIFICADO"],
      (line) => line.pageNumber === firstContentPage,
    ) !== null
  );
}

function hasPrintedMoney(line: IndexedLineV7): boolean {
  return /(?:\d{1,3}(?:\.\d{3})+|\d+),\d{1,2}\s*(?:EUR|EUROS?|€)?\b/iu.test(
    line.raw,
  );
}

function firstMoneyAfter(
  index: DocumentIndexV7,
  markers: readonly string[],
  distance = 5,
): IndexedLineV7 | null {
  const normalizedMarkers = markers.map(normalize);
  for (let position = 0; position < index.lines.length; position += 1) {
    const markerLine = index.lines[position]!;
    if (
      !normalizedMarkers.every((marker) =>
        markerLine.normalized.includes(marker),
      )
    ) {
      continue;
    }
    for (let offset = 0; offset <= distance; offset += 1) {
      const candidate = index.lines[position + offset];
      if (!candidate || candidate.pageNumber !== markerLine.pageNumber) break;
      if (hasPrintedMoney(candidate)) return candidate;
    }
  }
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

function printedMoneySources(
  line: IndexedLineV7,
): readonly IndexedLineV7[] {
  return Object.freeze(
    [
      ...line.raw.matchAll(
        /(?:^|\D)((?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})\s*(?:EUR|EUROS?|€)?(?=\D|$)/giu,
      ),
    ].flatMap((match) =>
      match[1]
        ? [
            Object.freeze({
              ...line,
              raw: match[1],
              normalized: normalize(match[1]),
            }),
          ]
        : [],
    ),
  );
}

function historicalDeferralRows(
  index: DocumentIndexV7,
): readonly Readonly<{
  dueDate: string;
  principal: IndexedLineV7;
  debtTotal: IndexedLineV7;
  interest: IndexedLineV7;
  surchargeCents: number;
  installmentTotal: IndexedLineV7;
}>[] {
  const headerPosition = index.lines.findIndex(
    (line) =>
      line.normalized.includes("IMPORTE PRINCIPAL") ||
      (line.normalized.includes("VENCIMIENTO") &&
        line.normalized.includes("PRINCIPAL") &&
        line.normalized.includes("TOTAL")),
  );
  if (headerPosition < 0) return Object.freeze([]);
  const headerPage = index.lines[headerPosition]!.pageNumber;
  const result: Array<Readonly<{
    dueDate: string;
    principal: IndexedLineV7;
    debtTotal: IndexedLineV7;
    interest: IndexedLineV7;
    surchargeCents: number;
    installmentTotal: IndexedLineV7;
  }>> = [];
  const seen = new Set<string>();
  let previousPrincipal: IndexedLineV7 | null = null;
  for (
    let position = headerPosition + 1;
    position < index.lines.length;
    position += 1
  ) {
    const line = index.lines[position]!;
    if (line.pageNumber > headerPage + 1) break;
    const dueDate = parseDate(line.raw);
    const amounts = printedMoneySources(line);
    if (!dueDate || amounts.length < 2) continue;
    const resolved = resolveHistoricalInstallmentAmounts(
      amounts,
      previousPrincipal,
    );
    if (!resolved) continue;
    const key = `${dueDate}:${resolved.debtTotalCents}:${resolved.interestCents}:${resolved.surchargeCents}:${resolved.totalCents}`;
    if (seen.has(key)) continue;
    seen.add(key);
    previousPrincipal = resolved.principal;
    result.push(
      Object.freeze({
        dueDate,
        principal: resolved.principal,
        debtTotal: resolved.debtTotal,
        interest: resolved.interest,
        surchargeCents: resolved.surchargeCents,
        installmentTotal: resolved.installmentTotal,
      }),
    );
  }
  return Object.freeze(result);
}

function resolveHistoricalInstallmentAmounts(
  amounts: readonly IndexedLineV7[],
  previousPrincipal: IndexedLineV7 | null,
): Readonly<{
  principal: IndexedLineV7;
  debtTotal: IndexedLineV7;
  debtTotalCents: number;
  interest: IndexedLineV7;
  interestCents: number;
  surchargeCents: number;
  installmentTotal: IndexedLineV7;
  totalCents: number;
}> | null {
  const cents = amounts.map((item) => parseMoney(item.raw));
  if (cents.some((item) => item === null)) return null;
  const values = cents as number[];
  if (values.length >= 5) {
    return Object.freeze({
      principal: amounts[0]!,
      debtTotal: amounts[2]!,
      debtTotalCents: values[2]!,
      interest: amounts[3]!,
      interestCents: values[3]!,
      surchargeCents: values[1]!,
      installmentTotal: amounts[4]!,
      totalCents: values[4]!,
    });
  }
  if (values.length >= 4) {
    return Object.freeze({
      principal: amounts[0]!,
      debtTotal: amounts[0]!,
      debtTotalCents: values[0]!,
      interest: amounts[1]!,
      interestCents: values[1]!,
      surchargeCents: values[2]!,
      installmentTotal: amounts[3]!,
      totalCents: values[3]!,
    });
  }
  if (values.length >= 3) {
    return Object.freeze({
      principal: amounts[0]!,
      debtTotal: amounts[0]!,
      debtTotalCents: values[0]!,
      interest: amounts[1]!,
      interestCents: values[1]!,
      surchargeCents: 0,
      installmentTotal: amounts[2]!,
      totalCents: values[2]!,
    });
  }
  const previousPrincipalCents = previousPrincipal
    ? parseMoney(previousPrincipal.raw)
    : null;
  if (
    previousPrincipal &&
    previousPrincipalCents !== null &&
    values.length >= 2
  ) {
    return Object.freeze({
      principal: previousPrincipal,
      debtTotal: previousPrincipal,
      debtTotalCents: previousPrincipalCents,
      interest: amounts[0]!,
      interestCents: values[0]!,
      surchargeCents: 0,
      installmentTotal: amounts[1]!,
      totalCents: values[1]!,
    });
  }
  return null;
}

function historicalDeferralTotals(
  index: DocumentIndexV7,
): Readonly<{
  principal: IndexedLineV7;
  interest: IndexedLineV7;
  total: IndexedLineV7;
}> | null {
  if (historicalDeferralRows(index).length === 0) return null;
  for (let position = 0; position < index.lines.length; position += 1) {
    const marker = index.lines[position]!;
    if (!/^TOTAL(?:ES)?(?:\s|$)/u.test(marker.normalized)) continue;
    for (let distance = 0; distance <= 2; distance += 1) {
      const line = index.lines[position + distance];
      if (!line || line.pageNumber !== marker.pageNumber) break;
      const amounts = printedMoneySources(line);
      const values = amounts.map((item) => parseMoney(item.raw));
      if (values.some((item) => item === null)) continue;
      if (amounts.length >= 5) {
        return Object.freeze({
          principal: amounts[2]!,
          interest: amounts[3]!,
          total: amounts[4]!,
        });
      }
      if (amounts.length >= 4) {
        return Object.freeze({
          principal: amounts[0]!,
          interest: amounts[1]!,
          total: amounts[3]!,
        });
      }
      if (amounts.length >= 3) {
        return Object.freeze({
          principal: amounts[0]!,
          interest: amounts[1]!,
          total: amounts[2]!,
        });
      }
    }
  }
  return null;
}

function interestAnnexTotalSource(index: DocumentIndexV7): IndexedLineV7 | null {
  const pageNumbers = [...new Set(index.lines.map((line) => line.pageNumber))];
  for (const pageNumber of pageNumbers) {
    const pageLines = index.lines.filter((line) => line.pageNumber === pageNumber);
    const pageText = pageLines.map((line) => line.normalized).join("\n");
    if (
      !pageText.includes("LIQUIDACION DE INTERESES") ||
      !pageText.includes("TOTAL") ||
      !pageText.includes("INTERESES")
    ) {
      continue;
    }
    const total = pageLines.find(
      (line) =>
        /^(?:TOTALES|TOTAL INTERESES)(?:\s|:)/u.test(line.normalized) &&
        hasPrintedMoney(line),
    );
    if (total) return total;
  }
  return null;
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
    if (sequence === null || sequence < 1 || !dueDate || baseCents === null || deferralInterestCents === null || totalCents === null || seen.has(sequence) || result.length >= 100) continue;
    seen.add(sequence);
    result.push(Object.freeze({ sequence, dueDate, baseCents, deferralInterestCents, enforcementSurchargeCents: 0, totalCents, pageNumber: line.pageNumber }));
  }
  for (const row of historicalDeferralRows(index)) {
    const baseCents = parseMoney(row.debtTotal.raw);
    const deferralInterestCents = parseMoney(row.interest.raw);
    const totalCents = parseMoney(row.installmentTotal.raw);
    const sequence = result.length + 1;
    if (
      baseCents === null ||
      deferralInterestCents === null ||
      totalCents === null ||
      seen.has(sequence) ||
      result.length >= 100
    ) {
      continue;
    }
    seen.add(sequence);
    result.push(
      Object.freeze({
        sequence,
        dueDate: row.dueDate,
        baseCents,
        deferralInterestCents,
        enforcementSurchargeCents: row.surchargeCents,
        totalCents,
        pageNumber: row.installmentTotal.pageNumber,
      }),
    );
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
    if (!debtKey || beforeCents === null || appliedCents === null || remainingCents === null || seen.has(debtKey) || result.length >= 100) continue;
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
  const agreementId = safeReference(
    first(index, [
      "Referencia del acuerdo",
      "Número de expediente",
      "Nº de expediente",
    ])?.raw ?? "",
  );
  const totals = historicalDeferralTotals(index);
  const debtKey = safeReference(
    first(index, ["Clave de deuda", "Número liquidación"])?.raw ?? "",
  );
  const principalCents = parseMoney(
    (first(index, ["Principal original", "Principal del plan"]) ??
      totals?.principal)?.raw ?? "",
  );
  const interestCents = parseMoney(
    (first(index, ["Intereses del aplazamiento", "Intereses del plan"]) ??
      totals?.interest ??
      interestAnnexTotalSource(index))?.raw ?? "",
  );
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

function fieldsFor(index: DocumentIndexV7, familyId: RealCorpusFamilyIdV7, baseFields: readonly RealCorpusFieldV2[], offsetRows: readonly RealCorpusOffsetRowV7[], bankSeizure: RealCorpusBankSeizureV7 | null): readonly RealCorpusFieldV2[] {
  const fields: (RealCorpusFieldV2 | null)[] = [
    ...baseFields,
    dateField("ISSUE_DATE", "Fecha del documento", documentIssueDateSource(index)),
    dateField("PUBLICATION_DATE", "Fecha de publicación", first(index, ["Fecha de publicación"])),
    dateField("EFFECTIVE_NOTIFICATION_DATE", "Fecha efectiva de notificación", first(index, ["Fecha efectiva de notificación"])),
    dateField("SIGNATURE_DATE", "Fecha de firma", documentSigningDateSource(index)),
    paymentFormReferenceField(index),
    paymentFormLiquidationKeyField(index),
  ];
  if (familyId === "sanction.initiation_and_hearing") fields.push(
    referenceField("SANCTION_REFERENCE", "Referencia del expediente sancionador", first(index, ["Referencia del expediente sancionador", "Número de expediente", "Referencia"])),
    moneyField("INITIAL_FINE_PROPOSAL", "Sanción propuesta", first(index, ["Sanción propuesta"]) ?? firstMoneyAfter(index, ["PROPUESTA", "SANCIÓN"])),
    moneyField("PROPOSED_REDUCTION", "Reducción propuesta", first(index, ["Reducción propuesta"]) ?? firstMatching(index, ["REDUCCIÓN"], hasPrintedMoney)),
    moneyField("PROPOSED_REDUCED_FINE", "Sanción reducida propuesta", first(index, ["Sanción reducida propuesta"]) ?? firstMatching(index, ["SANCIÓN", "REDUCIDA"], hasPrintedMoney)),
    integerField("ALLEGATION_BUSINESS_DAYS", "Días hábiles para alegaciones", businessDaysSource(index)),
  );
  if (familyId === "compliance.formal_filing_requirement") fields.push(
    referenceField(
      "PROCEDURE_ID",
      "Referencia del procedimiento",
      firstSafeReferenceSource(index, [
        "Referencia del procedimiento",
        "Referencia del documento",
        "Referencia",
      ]) ?? historicalProcedureReference(index),
    ),
    referenceField(
      "REQUEST_MODEL",
      "Modelo tributario",
      matchedSource(index, ["MODELO"], /\bMODELO\s+(\d{3})\b/u),
    ),
    integerField(
      "RESPONSE_BUSINESS_DAYS",
      "Días hábiles para responder",
      businessDaysSource(index),
    ),
    textField(
      "LEGAL_EFFECT",
      "Efecto indicado",
      "No constituye deuda ni sanción",
      firstContaining(index, ["NO CONSTITUYE DEUDA NI SANCIÓN", "NO CONSTITUYE DEUDA NI SANCION"]),
    ),
  );
  if (familyId === "seizure.bank_account" && bankSeizure) fields.push(
    referenceField("SEIZURE_ORDER_ID", "Número de diligencia", first(index, ["Número de diligencia"])),
    referenceField("DEBT_KEY", "Clave de deuda", first(index, ["Clave de deuda"])),
    moneyField("DEBT_TOTAL", "Total de la deuda", first(index, ["Total de la deuda"])),
    moneyField("SEIZE_LIMIT", "Límite del embargo", first(index, ["Límite del embargo"])),
    moneyField("SEIZED_AMOUNT", "Importe embargado", first(index, ["Importe embargado"])),
    integerField("OPAQUE_ASSET_ORDINAL", "Cuenta o depósito", first(index, ["Ordinal opaco del activo"])),
  );
  if (familyId === "collection.enforcement_order") fields.push(
    referenceField("DEBT_KEY", "Clave de deuda", first(index, ["Clave de deuda"])),
    dateField("VOLUNTARY_END_DATE", "Fin del período voluntario", first(index, ["Fin del período voluntario", "Vencimiento ajustado"])),
    moneyField("PRINCIPAL", "Principal pendiente", first(index, ["Principal pendiente"])),
    textField(
      "ENFORCEMENT_SCOPE",
      "Alcance",
      "Principal restante del plan",
      firstContaining(index, ["PRINCIPAL RESTANTE DEL PLAN"]),
    ),
  );
  if (familyId === "collection.offset_ex_officio" || familyId === "collection.offset_requested") {
    fields.push(
      referenceField(
        "AGREEMENT_ID",
        "Referencia del acuerdo",
        first(index, [
          "Número de acuerdo",
          "Número de acuerdo de compensación",
          "Referencia del acuerdo",
          "Referencia del documento",
          "Referencia",
        ]),
      ),
    );
  }
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
    referenceField(
      "ACT_ID",
      "Referencia del acto",
      first(index, [
        "Referencia de la resolución",
        "Referencia del documento",
        "Referencia",
      ]),
    ),
    referenceField(
      "REQUEST_MODEL",
      "Modelo tributario",
      first(index, ["Modelo de solicitud"]) ??
        matchedSource(index, ["MODELO"], /\bMODELO\s+(\d{3})\b/u),
    ),
    dateField(
      "REQUEST_DATE",
      "Fecha de solicitud",
      first(index, ["Fecha de solicitud"]) ??
        datedLine(index, ["DECLARACIÓN", "MODELO"]),
    ),
    dateField(
      "EFFECTIVE_DATE",
      "Fecha de efectos",
      first(index, ["Fecha de efectos"]) ?? datedLine(index, ["EFECTOS"]),
    ),
  );
  if (familyId === "collection.deferral_grant" || familyId === "collection.deferral_modification") fields.push(
    referenceField(
      "AGREEMENT_ID",
      "Referencia del acuerdo",
      first(index, [
        "Referencia del acuerdo",
        "Número de expediente",
        "Nº de expediente",
      ]),
    ),
    referenceField("DEBT_KEY", "Clave de deuda", first(index, ["Clave de deuda", "Número liquidación"])),
    moneyField("PLAN_PRINCIPAL", "Principal del plan", first(index, ["Principal original", "Principal del plan"]) ?? historicalDeferralTotals(index)?.principal ?? null),
    moneyField("PLAN_INTEREST", "Intereses del plan", first(index, ["Intereses del aplazamiento", "Intereses del plan"]) ?? historicalDeferralTotals(index)?.interest ?? interestAnnexTotalSource(index)),
    moneyField("PLAN_TOTAL", "Total del plan", first(index, ["Total del plan"]) ?? historicalDeferralTotals(index)?.total ?? null),
    ...(familyId === "collection.deferral_modification" ? [
      referenceField("REPLACES_AGREEMENT_ID", "Acuerdo sustituido", first(index, ["Acuerdo sustituido"])),
      observedTextField(
        "SCHEDULE_STATE",
        "Estado del calendario",
        first(index, ["Estado del calendario"]),
      ),
    ] : []),
  );
  if (familyId === "collection.external_debt") fields.push(
    referenceField("EXTERNAL_DEBT_REFERENCE", "Clave de deuda", first(index, ["Referencia de la deuda externa", "Clave de deuda", "Clave de liquidación"])),
    textField(
      "ORIGINATING_AUTHORITY",
      "Organismo de origen",
      "Otro organismo público",
      firstContaining(index, ["DEUDA DE OTRO ORGANISMO", "SEGURIDAD SOCIAL", "ORGANISMO"]),
    ),
    textField(
      "COLLECTION_AUTHORITY",
      "Organismo recaudador",
      "AEAT",
      firstContaining(index, ["RECAUDACIÓN AEAT", "RECAUDACION AEAT", "AGENCIA TRIBUTARIA"]),
    ),
    moneyField("EXTERNAL_PRINCIPAL", "Principal pendiente", first(index, ["Principal pendiente"])),
    moneyField("EXTERNAL_ORDINARY_TOTAL", "Total con recargo ordinario", first(index, ["Total con recargo ordinario", "Importe total"])),
  );
  if (familyId === "compliance.document_request") fields.push(
    referenceField(
      "PROCEDURE_ID",
      "Referencia del procedimiento",
      firstSafeReferenceSource(index, [
        "Referencia del procedimiento",
        "Referencia del documento",
        "Referencia",
      ]) ?? historicalProcedureReference(index),
    ),
    integerField(
      "RESPONSE_BUSINESS_DAYS",
      "Días hábiles para responder",
      businessDaysSource(index),
    ),
    textField(
      "ASSESSMENT_START",
      "Inicio de comprobación",
      "No inicia procedimiento de comprobación",
      firstMatching(
        index,
        ["REQUERIMIENTO", "NO", "COMPROBACIÓN TRIBUTARIA"],
        () => true,
      ) ??
        firstContaining(index, [
          "NO INICIA PROCEDIMIENTO DE COMPROBACIÓN",
          "NO INICIA PROCEDIMIENTO DE COMPROBACION",
        ]),
    ),
  );
  if (familyId === "compliance.document_request") {
    const allowedCategories = new Set(["INVOICES", "RECORD_BOOKS", "BANK_RECORDS", "SUPPORTING_DOCUMENTS"]);
    values(index, ["Categoría documental"]).forEach((line, position) => {
      const value = normalize(line.raw).replace(/\s+/gu, "_");
      const display = value === "INVOICES"
        ? "Facturas"
        : value === "RECORD_BOOKS"
          ? "Libros registro"
          : value === "BANK_RECORDS"
            ? "Documentación bancaria"
            : value === "SUPPORTING_DOCUMENTS"
              ? "Justificantes"
              : null;
      if (allowedCategories.has(value) && display) {
        fields.push(
          textField(
            `DOCUMENT_CATEGORY_${position + 1}`,
            `Documentación ${position + 1}`,
            display,
            line,
          ),
        );
      }
    });
  }
  if (familyId === "assessment.final_provisional_assessment") {
    const assessmentReason = first(index, ["Motivo de regularización"]);
    fields.push(
    referenceField("FINAL_ASSESSMENT_REFERENCE", "Referencia del acto", first(index, ["Referencia de la liquidación final", "Referencia del documento", "Referencia"])),
    moneyField("ASSESSMENT_QUOTA", "Cuota final", first(index, ["Cuota liquidada", "Cuota"])),
    moneyField("ASSESSMENT_INTEREST", "Intereses de demora", first(index, ["Intereses de demora"])),
    moneyField("ASSESSMENT_TOTAL", "Total del documento", first(index, ["Total a ingresar"])),
    moneyField("REJECTED_CARRYFORWARD", "Saldo declarado rechazado", first(index, ["Saldo declarado rechazado"])),
    assessmentReason &&
      /(?:SALDO|CANTIDAD).*(?:NO ADMITID[AO]|RECHAZAD[AO])/u.test(assessmentReason.normalized)
      ? textField(
          "ASSESSMENT_REASON",
          "Hecho o fundamento 1",
          "Saldo declarado de otro ejercicio no admitido",
          assessmentReason,
        )
      : null,
    );
  }
  for (const line of values(index, ["Modelo y período"])) {
    const value = safeReference(line.raw.replace(/\s+/gu, ""));
    if (value) fields.push(Object.freeze({ fieldCode: "MODEL_PERIOD", label: "Modelo y período", kind: "REFERENCE" as const, value, evidence: evidence(line.pageNumber) }));
  }
  for (const line of values(index, ["Ejercicio solicitado"])) {
    const value = parseInteger(line.raw, 2100);
    if (value !== null && value >= 1900) fields.push(Object.freeze({ fieldCode: "REQUESTED_YEAR", label: "Ejercicio solicitado", kind: "INTEGER" as const, value, evidence: evidence(line.pageNumber) }));
  }
  for (const line of index.lines) {
    if (!line.normalized.includes("EJERCICIO")) continue;
    for (const match of line.normalized.matchAll(/\b((?:19|20)\d{2})\b/gu)) {
      const value = Number(match[1]);
      fields.push(Object.freeze({
        fieldCode: "REQUESTED_YEAR",
        label: "Ejercicio solicitado",
        kind: "INTEGER" as const,
        value,
        evidence: evidence(line.pageNumber),
      }));
    }
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
    const printedAmounts = [initial, reduction, reduced].filter(
      (amount): amount is number => amount !== null,
    );
    return (
      hasField(fields, "SANCTION_REFERENCE") &&
      hasField(fields, "ALLEGATION_BUSINESS_DAYS") &&
      printedAmounts.length > 0
    );
  }
  if (familyId === "compliance.formal_filing_requirement") {
    return [
      "PROCEDURE_ID",
      "MODEL_PERIOD",
      "REQUEST_MODEL",
      "RESPONSE_BUSINESS_DAYS",
    ].some((code) => hasField(fields, code));
  }
  if (familyId === "seizure.bank_account") return bankSeizure !== null;
  if (familyId === "collection.enforcement_order") {
    return (
      ["DEBT_KEY", "LIQUIDATION_KEY", "DOCUMENT_REFERENCE"].some((code) =>
        hasField(fields, code),
      ) &&
      ["PRINCIPAL", "OUTSTANDING_PRINCIPAL"].some((code) =>
        hasField(fields, code),
      )
    );
  }
  if (familyId === "collection.offset_ex_officio") {
    return (
      offsetRows.length > 0 ||
      hasField(fields, "AGREEMENT_ID") ||
      hasField(fields, "ISSUE_DATE")
    );
  }
  if (familyId === "registry.tax_registration_resolution") {
    return ["ACT_ID", "REQUEST_MODEL", "REQUEST_DATE", "EFFECTIVE_DATE"].some(
      (code) => hasField(fields, code),
    );
  }
  if (familyId === "collection.deferral_grant" || familyId === "collection.deferral_modification") {
    return (
      ["AGREEMENT_ID", "DEBT_KEY", "PLAN_PRINCIPAL", "PLAN_INTEREST"].some(
        (code) => hasField(fields, code),
      ) ||
      installments.length > 0 ||
      paymentPlan !== null
    );
  }
  if (familyId === "collection.offset_requested") return hasField(fields, "OFFSET_REFERENCE");
  if (familyId === "collection.external_debt") return hasField(fields, "EXTERNAL_DEBT_REFERENCE") && hasField(fields, "EXTERNAL_PRINCIPAL") && hasField(fields, "EXTERNAL_ORDINARY_TOTAL");
  if (familyId === "compliance.document_request") {
    return [
      "PROCEDURE_ID",
      "REQUESTED_YEAR",
      "RESPONSE_BUSINESS_DAYS",
      "DOCUMENT_CATEGORY_1",
    ].some((code) => hasField(fields, code));
  }
  const quota = fields.find((field) => field.fieldCode === "ASSESSMENT_QUOTA");
  const interest = fields.find((field) => field.fieldCode === "ASSESSMENT_INTEREST");
  const total = fields.find((field) => field.fieldCode === "ASSESSMENT_TOTAL");
  if (!hasField(fields, "FINAL_ASSESSMENT_REFERENCE")) return false;
  const printedAmounts = [quota, interest, total].filter(
    (field) => field?.kind === "MONEY",
  );
  if (printedAmounts.length === 0) return false;
  return true;
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
  const hasAeatAuthority =
    contains(index, "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA") ||
    contains(index, "AGENCIA TRIBUTARIA") ||
    contains(index, "AEAT") ||
    (contains(index, "ADMINISTRACIÓN") && contains(index, "TRIBUTARIA"));
  if (!hasAeatAuthority) return unknown(document, index);
  const familyId = recognize(index);
  if (!familyId) return unknown(document, index);
  const base = await extractAeatRealCorpusDocumentV6(document);
  const installments = parseInstallments(index);
  const offsetRows = parseOffsetRows(index);
  const bankSeizure = familyId === "seizure.bank_account" ? parseBankSeizure(index) : null;
  const paymentPlan = familyId === "collection.deferral_grant" ? parsePlan(index, false)
    : familyId === "collection.deferral_modification" ? parsePlan(index, true) : null;
  if (familyId === "seizure.bank_account" && !bankSeizure) return unknown(document, index);
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
  const extractedFields = fieldsFor(index, familyId, base.status === "REVIEW_REQUIRED" && base.familyId === familyId ? base.fields : Object.freeze([]), offsetRows, bankSeizure);
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
