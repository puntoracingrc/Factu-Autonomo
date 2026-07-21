import {
  assertBoundedDocumentInput,
  assertNotAborted,
  type BoundedDocumentInput,
} from "../input-contract";
import type {
  RealCorpusEvidenceV2,
  RealCorpusFieldV2,
} from "./real-corpus-extractor.v2";

export const REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V3 = 3 as const;
export const REAL_CORPUS_EXTRACTOR_VERSION_V3 =
  "aeat-real-corpus-extractor.2026-07-19.v3.2" as const;

export const REAL_CORPUS_FAMILY_IDS_V3 = Object.freeze([
  "collection.enforcement_order",
  "collection.deferral_grant",
  "seizure.bank_account",
  "information.model_filing_reminder",
  "refund.payment_communication",
  "information.regulatory_change",
  "seizure.release",
  "certificate.tax_compliance",
] as const);
export type RealCorpusFamilyIdV3 = (typeof REAL_CORPUS_FAMILY_IDS_V3)[number];

export type RealCorpusLayoutVariantV3 =
  | "MODERN_10_PAGE_WITH_TWO_PAYMENT_FORM_COPIES"
  | "MODERN_NO_GUARANTEE_WITH_TWO_ANNEXES"
  | "DEBTOR_NOTIFICATION_WITH_ANNEX"
  | "BILINGUAL_SPANISH_CATALAN_PARALLEL_COPY"
  | "NET_REFUND_AFTER_EXTERNAL_PUBLIC_DEDUCTIONS"
  | "MODEL_303_CHANNEL_CHANGE_NO_TITLE"
  | "MOVABLE_ASSET_RELEASE_WITH_ASSET_ANNEX"
  | "NEGATIVE_CERTIFICATE_BY_EXECUTIVE_DEBT";

export type RealCorpusSegmentTypeV3 =
  | "PRIMARY_ACT"
  | "BLANK_SEPARATOR"
  | "BLANK_TRAILER"
  | "PAYMENT_FORM_INTERESTED_COPY"
  | "PAYMENT_FORM_BANK_COPY"
  | "ANNEX_INSTALLMENT_SCHEDULE"
  | "ANNEX_INTEREST_CALCULATION"
  | "ANNEX_DEBT_AND_ACCOUNT"
  | "SPANISH_VERSION"
  | "CATALAN_PARALLEL_VERSION"
  | "PRIMARY_RELEASE_ACT"
  | "ANNEX_PREVIOUSLY_SEIZED_ASSET";

export interface RealCorpusSegmentV3 {
  readonly type: RealCorpusSegmentTypeV3;
  readonly pageNumbers: readonly number[];
  readonly relationToPrimary:
    | "PRIMARY"
    | "BLANK"
    | "PAYMENT_FORM_FOR"
    | "PAYMENT_EVIDENCE_FOR"
    | "PARALLEL_LANGUAGE_COPY"
    | "ANNEX_ONLY";
  readonly provesPayment: boolean;
  readonly createsIndependentDebt: false;
}

export interface RealCorpusInstallmentV3 {
  readonly installmentId: string;
  readonly sequence: number;
  readonly dueDate: string;
  readonly baseCents: number;
  readonly interestCents: number;
  readonly totalCents: number;
  readonly pageNumber: number;
}

export interface RealCorpusAmountScenarioV3 {
  readonly code:
    | "PRINCIPAL_ONLY_WITH_5_PERCENT_IF_PREPAID"
    | "REDUCED_SURCHARGE_10_PERCENT"
    | "ORDINARY_SURCHARGE_20_PERCENT";
  readonly amountCents: number;
  readonly condition:
    | "PRINCIPAL_PAID_BEFORE_NOTICE"
    | "PAID_WITHIN_NOTICE_DEADLINE"
    | "ORDINARY_ENFORCEMENT_OUTCOME";
}

export interface RealCorpusExplanationV3 {
  readonly whatIs: string;
  readonly result: string;
  readonly action: string;
  readonly deadline: string;
  readonly consequence: string;
}

export interface RealCorpusExtractorOutcomeV3 {
  readonly schemaVersion: typeof REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V3;
  readonly extractorVersion: typeof REAL_CORPUS_EXTRACTOR_VERSION_V3;
  readonly status: "REVIEW_REQUIRED" | "UNKNOWN";
  readonly familyId: RealCorpusFamilyIdV3 | null;
  readonly canonicalTitle: string | null;
  readonly layoutVariant: RealCorpusLayoutVariantV3 | null;
  readonly physicalPageCount: number;
  readonly contentPageCount: number;
  readonly fields: readonly RealCorpusFieldV2[];
  readonly installments: readonly RealCorpusInstallmentV3[];
  readonly amountScenarios: readonly RealCorpusAmountScenarioV3[];
  readonly segments: readonly RealCorpusSegmentV3[];
  readonly explanation: RealCorpusExplanationV3 | null;
  readonly paymentFormStatus:
    "NONE" | "PAYMENT_FORM_ONLY" | "PAYMENT_EVIDENCE_PRESENT";
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED";
  readonly confirmsDebt: false;
  readonly confirmsPayment: false;
  readonly confirmsDeadline: false;
}

interface IndexedLineV3 {
  readonly pageNumber: number;
  readonly raw: string;
  readonly normalized: string;
}

interface DocumentIndexV3 {
  readonly lines: readonly IndexedLineV3[];
  readonly normalizedText: string;
  readonly blankPageNumbers: readonly number[];
}

interface BankSeizureDebtRowV3 {
  readonly debtKey: Readonly<{ value: string; pageNumber: number }>;
  readonly pendingDebt: Readonly<{ value: string; pageNumber: number }>;
}

interface BankSeizureAssetRowV3 {
  readonly ordinal: number;
  readonly seizedAmount: Readonly<{ value: string; pageNumber: number }>;
}

const CONTROL = /[\u0000-\u001f\u007f-\u009f]/u;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;
const SPANISH_DATE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/u;
const REFERENCE = /^[A-Z0-9][A-Z0-9./:_+-]{1,199}$/u;
const PRIVATE_REFERENCE =
  /^(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]|ES\d{22}|[6789]\d{8})$/u;

const EXPLANATIONS: Readonly<
  Record<RealCorpusFamilyIdV3, RealCorpusExplanationV3>
> = Object.freeze({
  "collection.enforcement_order": Object.freeze({
    whatIs:
      "Es una providencia de apremio: una cuota o deuda no se pagó en período voluntario y pasa a vía ejecutiva.",
    result:
      "Muestra el principal pendiente y tres escenarios de recargo condicionados por cuándo se pague.",
    action:
      "Comprueba la fecha real de recepción antes de elegir el importe aplicable. La carta de pago adjunta sirve para ingresar, pero no acredita que ya se haya pagado.",
    deadline:
      "Depende de la quincena en que se recibió; sin fecha de recepción no se calcula el último día.",
    consequence:
      "Si no se paga en el plazo abierto por la providencia, puede continuar el embargo y devengarse intereses y costas.",
  }),
  "collection.deferral_grant": Object.freeze({
    whatIs:
      "La AEAT ha concedido pagar la deuda mediante las cuotas y fechas del Anexo I.",
    result:
      "La deuda principal no desaparece: queda sometida al calendario concedido y genera los intereses detallados.",
    action:
      "Mantén saldo suficiente para cada vencimiento y revisa por separado cualquier cuota que ya estuviera vencida al notificarse el acuerdo.",
    deadline:
      "Cada cuota tiene su propia fecha. El plazo de diez días del texto solo aplica a cuotas ya vencidas o que venzan dentro de ese período y no hayan podido cargarse.",
    consequence:
      "El impago de una cuota puede iniciar o continuar el apremio y, según el caso, anticipar el vencimiento de cuotas pendientes.",
  }),
  "seizure.bank_account": Object.freeze({
    whatIs:
      "La AEAT ha ordenado embargar dinero de una o varias cuentas o depósitos para cobrar una deuda que ya está en vía ejecutiva.",
    result:
      "La tabla identifica la deuda pendiente; el límite indica cuánto puede alcanzar la orden y cada fila de cuenta muestra cuánto declara embargado el documento.",
    action:
      "Comprueba que reconoces la deuda y los importes. Si ya estaba pagada, suspendida, aplazada o existe otra causa de oposición, revisa el expediente antes de actuar.",
    deadline:
      "El plazo para recurrir empieza con la notificación efectiva, no con la fecha impresa, la firma ni el día en que subiste el PDF.",
    consequence:
      "El banco puede retener fondos hasta el límite ordenado. Esta diligencia no demuestra por sí sola que el banco ya los haya transferido al Tesoro ni que la deuda haya quedado extinguida.",
  }),
  "information.model_filing_reminder": Object.freeze({
    whatIs:
      "Es un recordatorio informativo sobre una declaración anual que la AEAT espera por los modelos periódicos presentados.",
    result:
      "Indica el modelo y ejercicio, pero no acredita que falte la presentación ni que exista una sanción o deuda.",
    action:
      "Comprueba si el modelo anual ya fue presentado y conserva su justificante.",
    deadline:
      "Solo muestra el comienzo del período. Si no imprime la fecha final, no debe inventarse.",
    consequence:
      "El documento no declara una consecuencia concreta ni abre por sí solo un procedimiento sancionador.",
  }),
  "refund.payment_communication": Object.freeze({
    whatIs:
      "Es el desglose de una devolución: cuánto se reconoció, cuánto se descontó para otras deudas públicas y qué líquido se ordenó transferir.",
    result:
      "La suma de las deducciones y el líquido debe cuadrar con el importe ordenado.",
    action:
      "Comprueba el abono bancario y consulta con cada organismo público si no reconoces una deducción.",
    deadline: "No abre por sí sola un plazo de pago.",
    consequence:
      "Las deducciones reducen el efectivo de la devolución, pero este documento no demuestra que las deudas externas quedaran totalmente extinguidas.",
  }),
  "information.regulatory_change": Object.freeze({
    whatIs:
      "Es una comunicación general sobre un cambio de canal de presentación del modelo 303.",
    result:
      "Desde el ejercicio indicado ya no se permite imprimir la predeclaración para presentarla en papel.",
    action:
      "Utiliza la presentación electrónica o un tercero autorizado; el pago puede seguir realizándose con el documento de ingreso cuando proceda.",
    deadline: "No crea un vencimiento individual.",
    consequence: "No es un requerimiento, liquidación ni sanción.",
  }),
  "seizure.release": Object.freeze({
    whatIs:
      "La AEAT levanta un embargo anterior sobre un bien mueble y ordena cancelar la anotación correspondiente.",
    result: "El anexo identifica el bien afectado por el levantamiento.",
    action:
      "Conserva el documento y verifica la cancelación registral si necesitas disponer del bien.",
    deadline: "No muestra una actuación obligatoria inmediata.",
    consequence:
      "El bien deja de estar afectado por esa diligencia en el alcance indicado.",
  }),
  "certificate.tax_compliance": Object.freeze({
    whatIs:
      "Es un certificado negativo de estar al corriente, emitido a petición del interesado.",
    result:
      "A la fecha del certificado constaban deudas o sanciones en ejecutiva no suspendidas ni aplazadas.",
    action:
      "Consulta las deudas vigentes. Si los datos del certificado son incorrectos, el contexto oficial prevé un escrito de disconformidad, no un recurso ordinario.",
    deadline:
      "La disconformidad se cuenta desde la recepción; sin esa fecha no se calcula el último día.",
    consequence:
      "Puede impedir acreditar estar al corriente para la finalidad solicitada.",
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

function buildIndex(document: BoundedDocumentInput): DocumentIndexV3 {
  const lines: IndexedLineV3[] = [];
  const blankPageNumbers: number[] = [];
  for (const page of document.pages) {
    if (page.isBlank || page.text.trim().length === 0) {
      blankPageNumbers.push(page.pageNumber);
      continue;
    }
    const rawLines = [
      ...page.text.split(/\r?\n/gu),
      ...(page.layoutRows ?? []).map((row) =>
        row.cells.map((cell) => cell.text).join(" | "),
      ),
    ];
    for (const rawLine of rawLines) {
      const raw = rawLine.trim();
      if (!raw || raw.length > 2_000 || CONTROL.test(raw)) continue;
      lines.push(
        Object.freeze({
          pageNumber: page.pageNumber,
          raw,
          normalized: normalize(raw),
        }),
      );
    }
  }
  return Object.freeze({
    lines: Object.freeze(lines),
    normalizedText: lines.map((line) => line.normalized).join("\n"),
    blankPageNumbers: Object.freeze(blankPageNumbers),
  });
}

function contains(index: DocumentIndexV3, value: string): boolean {
  return index.normalizedText
    .replace(/\s+/gu, " ")
    .includes(normalize(value));
}

function isAeat(index: DocumentIndexV3): boolean {
  return (
    contains(index, "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA") ||
    contains(index, "AGENCIA TRIBUTARIA") ||
    /(?:^|\s)AEAT(?:\s|$)/u.test(index.normalizedText)
  );
}

function hasLinePrefix(index: DocumentIndexV3, title: string): boolean {
  const expected = normalize(title);
  return index.lines.some(
    (line) =>
      line.normalized === expected ||
      line.normalized.startsWith(`${expected} `) ||
      line.normalized.startsWith(`${expected}:`),
  );
}

function lineValue(
  index: DocumentIndexV3,
  labels: readonly string[],
): Readonly<{ value: string; pageNumber: number }> | null {
  const expected = labels.map(normalize);
  for (let position = 0; position < index.lines.length; position += 1) {
    const line = index.lines[position]!;
    const label = expected.find(
      (candidate) =>
        line.normalized === candidate ||
        line.normalized.startsWith(`${candidate}:`) ||
        line.normalized.startsWith(`${candidate} `) ||
        line.normalized.startsWith(`${candidate} |`),
    );
    if (!label) continue;
    const rawLabel = labels[expected.indexOf(label)]!;
    const inline = line.raw
      .slice(Math.min(line.raw.length, rawLabel.length))
      .replace(/^\s*(?::|\||-)?\s*/u, "")
      .trim();
    if (inline)
      return Object.freeze({ value: inline, pageNumber: line.pageNumber });
    const next = index.lines[position + 1];
    if (next?.pageNumber === line.pageNumber) {
      return Object.freeze({ value: next.raw, pageNumber: next.pageNumber });
    }
  }
  return null;
}

function numberedReferenceInLine(
  index: DocumentIndexV3,
  markers: readonly string[],
): Readonly<{ value: string; pageNumber: number }> | null {
  const normalizedMarkers = markers.map(normalize);
  for (const line of index.lines) {
    if (
      !normalizedMarkers.some((marker) => line.normalized.includes(marker))
    ) {
      continue;
    }
    const match = /(?:^|\s)(\d{12,20}[A-Z])(?=\s|$)/u.exec(
      line.normalized,
    );
    if (match?.[1]) {
      return Object.freeze({
        value: match[1],
        pageNumber: line.pageNumber,
      });
    }
  }
  return null;
}

function embeddedReferenceAfterLabel(
  index: DocumentIndexV3,
  label: string,
  pattern: RegExp,
): Readonly<{ value: string; pageNumber: number }> | null {
  const marker = `${normalize(label)}:`;
  for (const line of index.lines) {
    const markerIndex = line.normalized.indexOf(marker);
    if (markerIndex < 0) continue;
    const match = pattern.exec(
      line.normalized.slice(markerIndex + marker.length).trim(),
    );
    if (match?.[1]) {
      return Object.freeze({
        value: match[1],
        pageNumber: line.pageNumber,
      });
    }
  }
  return null;
}

function nextLineAfterContaining(
  index: DocumentIndexV3,
  markers: readonly string[],
): IndexedLineV3 | null {
  const normalizedMarkers = markers.map(normalize);
  for (let position = 0; position < index.lines.length - 1; position += 1) {
    const line = index.lines[position]!;
    if (!normalizedMarkers.some((marker) => line.normalized.includes(marker))) {
      continue;
    }
    const next = index.lines[position + 1]!;
    if (
      next.pageNumber === line.pageNumber &&
      moneySourceFromLine(next) !== null
    ) {
      return next;
    }
  }
  return null;
}

function moneySourceFromLine(
  line: IndexedLineV3 | null,
): Readonly<{ value: string; pageNumber: number }> | null {
  if (!line) return null;
  const matches = [
    ...line.raw.matchAll(
      /(-)?\s*((?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?)\s*(?:EUR|€)?/giu,
    ),
  ];
  const match = matches.at(-1);
  return match?.[0]
    ? Object.freeze({ value: match[0], pageNumber: line.pageNumber })
    : null;
}

function tableCells(line: IndexedLineV3): readonly string[] {
  return Object.freeze(line.raw.split("|").map((cell) => cell.trim()));
}

function isLiquidationNumberHeader(value: string): boolean {
  const normalized = normalize(value).replace(/[^A-Z0-9]/gu, "");
  return (
    normalized === "NLIQUIDACION" ||
    normalized === "NOLIQUIDACION" ||
    normalized === "NUMLIQUIDACION" ||
    normalized === "NUMEROLIQUIDACION" ||
    normalized === "CLAVEDELIQUIDACION" ||
    normalized === "CLAVEDEDEUDA"
  );
}

function isPendingAmountHeader(value: string): boolean {
  const normalized = normalize(value).replace(/[^A-Z0-9]/gu, "");
  return (
    normalized === "IMPPENDIENTE" ||
    normalized === "IMPORTEPENDIENTE" ||
    normalized === "DEUDAPENDIENTE"
  );
}

function bankSeizureDebtRow(
  index: DocumentIndexV3,
): BankSeizureDebtRowV3 | null {
  for (let position = 0; position < index.lines.length - 1; position += 1) {
    const header = index.lines[position]!;
    const headers = tableCells(header);
    const debtColumn = headers.findIndex(isLiquidationNumberHeader);
    const pendingColumn = headers.findIndex(isPendingAmountHeader);
    if (debtColumn < 0 || pendingColumn < 0) continue;
    const row = index.lines[position + 1]!;
    if (row.pageNumber !== header.pageNumber) continue;
    const cells = tableCells(row);
    const debtKey = safeReference(cells[debtColumn] ?? "");
    const pendingDebt = parseMoney(cells[pendingColumn] ?? "");
    if (!debtKey || pendingDebt === null || pendingDebt < 0) continue;
    return Object.freeze({
      debtKey: Object.freeze({ value: debtKey, pageNumber: row.pageNumber }),
      pendingDebt: Object.freeze({
        value: cells[pendingColumn]!,
        pageNumber: row.pageNumber,
      }),
    });
  }
  return null;
}

function bankSeizureAssetRows(
  index: DocumentIndexV3,
): readonly BankSeizureAssetRowV3[] {
  const rows: BankSeizureAssetRowV3[] = [];
  for (let position = 0; position < index.lines.length - 1; position += 1) {
    const header = index.lines[position]!;
    const headers = tableCells(header);
    const amountColumn = headers.findIndex(
      (cell) =>
        normalize(cell).replace(/[^A-Z0-9]/gu, "") === "IMPORTEEMBARGADO",
    );
    if (amountColumn < 0) continue;
    for (
      let rowPosition = position + 1;
      rowPosition < index.lines.length;
      rowPosition += 1
    ) {
      const row = index.lines[rowPosition]!;
      if (row.pageNumber !== header.pageNumber) break;
      const cells = tableCells(row);
      const rawAmount = cells[amountColumn];
      if (!rawAmount || parseMoney(rawAmount) === null) break;
      rows.push(
        Object.freeze({
          ordinal: rows.length + 1,
          seizedAmount: Object.freeze({
            value: rawAmount,
            pageNumber: row.pageNumber,
          }),
        }),
      );
    }
    if (rows.length > 0) break;
  }
  if (rows.length === 0) {
    const fallback = lineValue(index, [
      "Importe embargado",
      "Cantidad embargada",
    ]);
    if (fallback && parseMoney(fallback.value) !== null) {
      rows.push(Object.freeze({ ordinal: 1, seizedAmount: fallback }));
    }
  }
  if (rows.length === 0) {
    const observedRow = nextLineAfterContaining(index, ["Importe embargado"]);
    const amount = moneySourceFromLine(observedRow);
    if (amount && parseMoney(amount.value) !== null) {
      rows.push(Object.freeze({ ordinal: 1, seizedAmount: amount }));
    }
  }
  return Object.freeze(rows);
}

function markerValue(
  index: DocumentIndexV3,
  markers: readonly string[],
  value: string,
): Readonly<{ value: string; pageNumber: number }> | null {
  for (const marker of markers) {
    const expected = normalize(marker);
    const line = index.lines.find((item) => item.normalized.includes(expected));
    if (line) return Object.freeze({ value, pageNumber: line.pageNumber });
  }
  return null;
}

function allLineValues(
  index: DocumentIndexV3,
  labels: readonly string[],
): readonly Readonly<{ value: string; pageNumber: number }>[] {
  const values: Readonly<{ value: string; pageNumber: number }>[] = [];
  const normalizedLabels = labels.map(normalize);
  for (const line of index.lines) {
    const label = normalizedLabels.find(
      (candidate) =>
        line.normalized.startsWith(`${candidate}:`) ||
        line.normalized.startsWith(`${candidate} |`) ||
        line.normalized.startsWith(`${candidate} `),
    );
    if (!label) continue;
    const rawLabel = labels[normalizedLabels.indexOf(label)]!;
    const value = line.raw
      .slice(Math.min(line.raw.length, rawLabel.length))
      .replace(/^\s*(?::|\||-)?\s*/u, "")
      .trim();
    if (value)
      values.push(Object.freeze({ value, pageNumber: line.pageNumber }));
  }
  return Object.freeze(values);
}

function validDate(year: number, month: number, day: number): string | null {
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day &&
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
  const match = [
    ...raw.matchAll(
      /(-)?\s*((?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?)\s*(?:EUR|€)?/giu,
    ),
  ].at(-1);
  if (!match) return null;
  const number = Number(match[2].replace(/\./gu, "").replace(",", "."));
  const cents = Math.round(number * 100) * (match[1] ? -1 : 1);
  return Number.isSafeInteger(cents) ? cents : null;
}

function safeReference(raw: string): string | null {
  const value = raw.trim().toUpperCase().replace(/\s+/gu, "");
  return REFERENCE.test(value) &&
    /\d/u.test(value) &&
    !PRIVATE_REFERENCE.test(value)
    ? value
    : null;
}

function evidence(pageNumber: number): RealCorpusEvidenceV2 {
  return Object.freeze({
    pageNumbers: Object.freeze([pageNumber]),
    assertionType: "EXPLICIT_IN_DOCUMENT" as const,
  });
}

function referenceField(
  code: string,
  label: string,
  source: Readonly<{ value: string; pageNumber: number }> | null,
): RealCorpusFieldV2 | null {
  if (!source) return null;
  const value = safeReference(source.value);
  return value
    ? Object.freeze({
        fieldCode: code,
        label,
        kind: "REFERENCE" as const,
        value,
        evidence: evidence(source.pageNumber),
      })
    : null;
}

function dateField(
  code: string,
  label: string,
  source: Readonly<{ value: string; pageNumber: number }> | null,
): RealCorpusFieldV2 | null {
  if (!source) return null;
  const value = parseDate(source.value);
  return value
    ? Object.freeze({
        fieldCode: code,
        label,
        kind: "DATE" as const,
        value,
        evidence: evidence(source.pageNumber),
      })
    : null;
}

function moneyField(
  code: string,
  label: string,
  source: Readonly<{ value: string; pageNumber: number }> | null,
): RealCorpusFieldV2 | null {
  if (!source) return null;
  const amountCents = parseMoney(source.value);
  return amountCents === null
    ? null
    : Object.freeze({
        fieldCode: code,
        label,
        kind: "MONEY" as const,
        amountCents,
        currency: "EUR" as const,
        evidence: evidence(source.pageNumber),
      });
}

function textField(
  code: string,
  label: string,
  value: string,
  pageNumber: number,
): RealCorpusFieldV2 {
  return Object.freeze({
    fieldCode: code,
    label,
    kind: "TEXT" as const,
    value,
    evidence: evidence(pageNumber),
  });
}

function booleanField(
  code: string,
  label: string,
  value: boolean,
  pageNumber: number,
): RealCorpusFieldV2 {
  return Object.freeze({
    fieldCode: code,
    label,
    kind: "BOOLEAN" as const,
    value,
    evidence: evidence(pageNumber),
  });
}

function compact(
  fields: readonly (RealCorpusFieldV2 | null)[],
): readonly RealCorpusFieldV2[] {
  return Object.freeze(
    fields.filter((item): item is RealCorpusFieldV2 => item !== null),
  );
}

function pageRange(
  from: number,
  to: number,
  pageCount: number,
): readonly number[] {
  const pages: number[] = [];
  for (let page = from; page <= Math.min(to, pageCount); page += 1)
    pages.push(page);
  return Object.freeze(pages);
}

function segment(
  type: RealCorpusSegmentTypeV3,
  pageNumbers: readonly number[],
  relationToPrimary: RealCorpusSegmentV3["relationToPrimary"],
  provesPayment = false,
): RealCorpusSegmentV3 {
  return Object.freeze({
    type,
    pageNumbers: Object.freeze([...pageNumbers]),
    relationToPrimary,
    provesPayment,
    createsIndependentDebt: false as const,
  });
}

function segmentsFor(
  familyId: RealCorpusFamilyIdV3,
  pageCount: number,
  paymentEvidenceCopies: ReadonlySet<
    "PAYMENT_FORM_INTERESTED_COPY" | "PAYMENT_FORM_BANK_COPY"
  > = new Set(),
): readonly RealCorpusSegmentV3[] {
  if (familyId === "collection.enforcement_order") {
    return Object.freeze([
      segment("PRIMARY_ACT", pageRange(1, 5, pageCount), "PRIMARY"),
      segment("BLANK_SEPARATOR", pageRange(6, 6, pageCount), "BLANK"),
      segment(
        "PAYMENT_FORM_INTERESTED_COPY",
        pageRange(7, 8, pageCount),
        paymentEvidenceCopies.has("PAYMENT_FORM_INTERESTED_COPY")
          ? "PAYMENT_EVIDENCE_FOR"
          : "PAYMENT_FORM_FOR",
        paymentEvidenceCopies.has("PAYMENT_FORM_INTERESTED_COPY"),
      ),
      segment(
        "PAYMENT_FORM_BANK_COPY",
        pageRange(9, 10, pageCount),
        paymentEvidenceCopies.has("PAYMENT_FORM_BANK_COPY")
          ? "PAYMENT_EVIDENCE_FOR"
          : "PAYMENT_FORM_FOR",
        paymentEvidenceCopies.has("PAYMENT_FORM_BANK_COPY"),
      ),
    ]);
  }
  if (familyId === "collection.deferral_grant") {
    return Object.freeze([
      segment("PRIMARY_ACT", pageRange(1, 5, pageCount), "PRIMARY"),
      segment("BLANK_SEPARATOR", pageRange(6, 6, pageCount), "BLANK"),
      segment(
        "ANNEX_INSTALLMENT_SCHEDULE",
        pageRange(7, 8, pageCount),
        "ANNEX_ONLY",
      ),
      segment(
        "ANNEX_INTEREST_CALCULATION",
        pageRange(9, 10, pageCount),
        "ANNEX_ONLY",
      ),
    ]);
  }
  if (familyId === "seizure.bank_account") {
    return Object.freeze([
      segment("PRIMARY_ACT", pageRange(1, 3, pageCount), "PRIMARY"),
      segment("BLANK_SEPARATOR", pageRange(4, 4, pageCount), "BLANK"),
      segment(
        "ANNEX_DEBT_AND_ACCOUNT",
        pageRange(5, 5, pageCount),
        "ANNEX_ONLY",
      ),
      segment("BLANK_TRAILER", pageRange(6, 6, pageCount), "BLANK"),
    ]);
  }
  if (familyId === "information.model_filing_reminder") {
    return Object.freeze([
      segment("SPANISH_VERSION", pageRange(1, 3, pageCount), "PRIMARY"),
      segment(
        "CATALAN_PARALLEL_VERSION",
        pageRange(4, 5, pageCount),
        "PARALLEL_LANGUAGE_COPY",
      ),
      segment("BLANK_TRAILER", pageRange(6, 6, pageCount), "BLANK"),
    ]);
  }
  if (familyId === "seizure.release") {
    return Object.freeze([
      segment("PRIMARY_RELEASE_ACT", pageRange(1, 2, pageCount), "PRIMARY"),
      segment(
        "ANNEX_PREVIOUSLY_SEIZED_ASSET",
        pageRange(3, 3, pageCount),
        "ANNEX_ONLY",
      ),
      segment("BLANK_TRAILER", pageRange(4, 4, pageCount), "BLANK"),
    ]);
  }
  return Object.freeze([]);
}

function installmentId(input: {
  ownerScope: string;
  debtKey: string;
  dueDate: string;
  sequence: number;
}): string {
  return [
    "aeat-installment-v3",
    encodeURIComponent(input.ownerScope),
    "AEAT",
    input.debtKey,
    input.dueDate,
    String(input.sequence),
  ].join(":");
}

function extractInstallments(
  document: BoundedDocumentInput,
  index: DocumentIndexV3,
  debtKey: string | null,
): readonly RealCorpusInstallmentV3[] {
  if (!debtKey) return Object.freeze([]);
  const rows: RealCorpusInstallmentV3[] = [];
  const seen = new Set<string>();
  const pattern =
    /(?:CUOTA\s*)?(\d{1,3})\s*(?:\||;|·)\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4})\s*(?:\||;|·)\s*(?:BASE\s*(?::|=)?\s*)?([\d.]+,\d{1,2})\s*(?:EUR|€)?\s*(?:\||;|·)\s*(?:INTER[EÉ]S\s*(?::|=)?\s*)?([\d.]+,\d{1,2})\s*(?:EUR|€)?\s*(?:\||;|·)\s*(?:TOTAL\s*(?::|=)?\s*)?([\d.]+,\d{1,2})/iu;
  for (const line of index.lines) {
    const match = pattern.exec(line.raw);
    if (!match) continue;
    const sequence = Number(match[1]);
    const dueDate = parseDate(match[2]);
    const baseCents = parseMoney(match[3]);
    const interestCents = parseMoney(match[4]);
    const totalCents = parseMoney(match[5]);
    if (
      !Number.isSafeInteger(sequence) ||
      sequence < 1 ||
      sequence > 999 ||
      !dueDate ||
      baseCents === null ||
      interestCents === null ||
      totalCents === null ||
      baseCents < 0 ||
      interestCents < 0 ||
      totalCents < 0
    ) {
      continue;
    }
    const id = installmentId({
      ownerScope: document.ownerScope,
      debtKey,
      dueDate,
      sequence,
    });
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push(
      Object.freeze({
        installmentId: id,
        sequence,
        dueDate,
        baseCents,
        interestCents,
        totalCents,
        pageNumber: line.pageNumber,
      }),
    );
  }
  return Object.freeze(
    rows.sort((left, right) => left.sequence - right.sequence),
  );
}

function reviewed(
  document: BoundedDocumentInput,
  index: DocumentIndexV3,
  input: Omit<
    RealCorpusExtractorOutcomeV3,
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
): RealCorpusExtractorOutcomeV3 {
  return Object.freeze({
    schemaVersion: REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V3,
    extractorVersion: REAL_CORPUS_EXTRACTOR_VERSION_V3,
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

function enforcement(
  document: BoundedDocumentInput,
  index: DocumentIndexV3,
): RealCorpusExtractorOutcomeV3 | null {
  if (
    !hasLinePrefix(index, "PROVIDENCIA DE APREMIO") ||
    document.pages.length < 9 ||
    !contains(index, "PRINCIPAL") ||
    !contains(index, "RECARGO") ||
    !contains(index, "CARTA DE PAGO") ||
    !contains(index, "INTERESADO") ||
    !contains(index, "ENTIDAD COLABORADORA")
  ) {
    return null;
  }
  const printedFields = compact([
    referenceField(
      "LIQUIDATION_KEY",
      "Clave de liquidación",
      lineValue(index, ["Clave de liquidación", "Clave de deuda"]),
    ),
    referenceField(
      "TAX_MODEL",
      "Modelo",
      lineValue(index, ["Modelo", "Concepto modelo"]),
    ),
    referenceField("FISCAL_YEAR", "Ejercicio", lineValue(index, ["Ejercicio"])),
    referenceField(
      "TAX_PERIOD",
      "Período",
      lineValue(index, ["Período", "Periodo"]),
    ),
    dateField(
      "VOLUNTARY_PAYMENT_DEADLINE",
      "Vencimiento de la cuota",
      lineValue(index, [
        "Final del período voluntario",
        "Final periodo voluntario",
        "Vencimiento de la cuota",
        "Fecha de vencimiento",
      ]),
    ),
    dateField(
      "ISSUE_DATE",
      "Fecha del documento",
      lineValue(index, ["Fecha de emisión", "Fecha del documento", "Fecha"]),
    ),
    moneyField(
      "OUTSTANDING_PRINCIPAL",
      "Principal pendiente",
      lineValue(index, ["Principal pendiente", "Principal"]),
    ),
    moneyField(
      "EXECUTIVE_SURCHARGE_20",
      "Recargo de apremio ordinario del 20 %",
      lineValue(index, [
        "Recargo de apremio ordinario 20%",
        "Recargo ordinario 20%",
        "Recargo de apremio ordinario",
      ]),
    ),
    moneyField(
      "TOTAL_WITH_ORDINARY_SURCHARGE",
      "Total con recargo ordinario",
      lineValue(index, [
        "Total con recargo ordinario",
        "Total ordinario",
        "Importe total",
      ]),
    ),
    moneyField(
      "AMOUNT_WITH_REDUCED_SURCHARGE_10",
      "Importe con recargo reducido",
      lineValue(index, [
        "Importe con recargo reducido 10%",
        "Importe con recargo reducido",
        "Total reducido",
      ]),
    ),
    moneyField(
      "EXECUTIVE_SURCHARGE_5_IF_PRINCIPAL_PREPAID",
      "Recargo del 5 % si el principal ya se pagó",
      lineValue(index, ["Recargo ejecutivo 5%", "Recargo del 5%"]),
    ),
    referenceField(
      "PAYMENT_FORM_REFERENCE",
      "Número de la carta de pago",
      lineValue(index, [
        "Referencia de carta de pago",
        "Referencia de pago",
        "Número de justificante",
      ]),
    ),
    moneyField(
      "PAYMENT_FORM_AMOUNT",
      "Importe de la carta de pago",
      lineValue(index, ["Importe de carta de pago", "Importe a ingresar"]),
    ),
  ]);
  const principal = moneyAmount(printedFields, "OUTSTANDING_PRINCIPAL");
  const reduced = moneyAmount(
    printedFields,
    "AMOUNT_WITH_REDUCED_SURCHARGE_10",
  );
  const ordinary = moneyAmount(printedFields, "TOTAL_WITH_ORDINARY_SURCHARGE");
  const surcharge5 = moneyAmount(
    printedFields,
    "EXECUTIVE_SURCHARGE_5_IF_PRINCIPAL_PREPAID",
  );
  const paymentDate = dateField(
    "PAYMENT_DATE",
    "Fecha de pago",
    lineValue(index, ["Fecha de pago"]),
  );
  const nrc = referenceField("NRC", "NRC", lineValue(index, ["NRC"]));
  const paymentEvidenceCopies = new Set<
    "PAYMENT_FORM_INTERESTED_COPY" | "PAYMENT_FORM_BANK_COPY"
  >();
  if (paymentDate?.kind === "DATE" && nrc?.kind === "REFERENCE") {
    const datePage = paymentDate.evidence.pageNumbers[0];
    const nrcPage = nrc.evidence.pageNumbers[0];
    if (
      datePage !== undefined &&
      nrcPage !== undefined &&
      datePage >= 7 &&
      datePage <= 8 &&
      nrcPage >= 7 &&
      nrcPage <= 8
    ) {
      paymentEvidenceCopies.add("PAYMENT_FORM_INTERESTED_COPY");
    }
    if (
      datePage !== undefined &&
      nrcPage !== undefined &&
      datePage >= 9 &&
      datePage <= 10 &&
      nrcPage >= 9 &&
      nrcPage <= 10
    ) {
      paymentEvidenceCopies.add("PAYMENT_FORM_BANK_COPY");
    }
  }
  const hasPaymentEvidence = paymentEvidenceCopies.size > 0;
  const fields = hasPaymentEvidence
    ? compact([...printedFields, paymentDate, nrc])
    : printedFields;
  const scenarios: RealCorpusAmountScenarioV3[] = [];
  if (principal !== null && surcharge5 !== null) {
    scenarios.push(
      Object.freeze({
        code: "PRINCIPAL_ONLY_WITH_5_PERCENT_IF_PREPAID" as const,
        amountCents: principal + surcharge5,
        condition: "PRINCIPAL_PAID_BEFORE_NOTICE" as const,
      }),
    );
  }
  if (reduced !== null) {
    scenarios.push(
      Object.freeze({
        code: "REDUCED_SURCHARGE_10_PERCENT" as const,
        amountCents: reduced,
        condition: "PAID_WITHIN_NOTICE_DEADLINE" as const,
      }),
    );
  }
  if (ordinary !== null) {
    scenarios.push(
      Object.freeze({
        code: "ORDINARY_SURCHARGE_20_PERCENT" as const,
        amountCents: ordinary,
        condition: "ORDINARY_ENFORCEMENT_OUTCOME" as const,
      }),
    );
  }
  return reviewed(document, index, {
    familyId: "collection.enforcement_order",
    canonicalTitle: "Providencia de apremio",
    layoutVariant: "MODERN_10_PAGE_WITH_TWO_PAYMENT_FORM_COPIES",
    fields,
    installments: Object.freeze([]),
    amountScenarios: Object.freeze(scenarios),
    segments: segmentsFor(
      "collection.enforcement_order",
      document.pages.length,
      paymentEvidenceCopies,
    ),
    explanation: EXPLANATIONS["collection.enforcement_order"],
    paymentFormStatus: hasPaymentEvidence
      ? "PAYMENT_EVIDENCE_PRESENT"
      : "PAYMENT_FORM_ONLY",
  });
}

function deferral(
  document: BoundedDocumentInput,
  index: DocumentIndexV3,
): RealCorpusExtractorOutcomeV3 | null {
  if (
    !hasLinePrefix(
      index,
      "CONCESIÓN DEL APLAZAMIENTO/FRACCIONAMIENTO DE PAGO SIN GARANTÍA",
    ) &&
    !hasLinePrefix(index, "CONCESIÓN DE APLAZAMIENTO O FRACCIONAMIENTO")
  ) {
    return null;
  }
  const debt = referenceField(
    "DEBT_KEY",
    "Clave de deuda",
    lineValue(index, ["Clave de liquidación", "Clave de deuda"]),
  );
  const debtKey = debt?.kind === "REFERENCE" ? debt.value : null;
  const installments = extractInstallments(document, index, debtKey);
  if (document.pages.length < 8 || installments.length === 0) return null;
  const directDebit = markerValue(
    index,
    ["DOMICILIACIÓN", "DOMICILIACION"],
    "Domiciliación bancaria",
  );
  const fields = compact([
    referenceField(
      "AGREEMENT_ID",
      "Referencia del acuerdo",
      lineValue(index, [
        "Referencia del acuerdo",
        "Número de acuerdo",
        "Referencia",
      ]),
    ),
    debt,
    moneyField(
      "GRANTED_PRINCIPAL",
      "Principal concedido",
      lineValue(index, [
        "Principal concedido",
        "Importe aplazado",
        "Deuda principal",
      ]),
    ),
    moneyField(
      "INTEREST_TOTAL",
      "Intereses del plan",
      lineValue(index, ["Total intereses", "Intereses totales", "Intereses"]),
    ),
    moneyField(
      "PLAN_TOTAL",
      "Total del plan",
      lineValue(index, ["Total del plan", "Total a pagar"]),
    ),
    dateField(
      "ISSUE_DATE",
      "Fecha del documento",
      lineValue(index, [
        "Fecha de emisión",
        "Fecha del documento",
        "Fecha del acuerdo",
      ]),
    ),
    directDebit
      ? textField(
          "DIRECT_DEBIT_EXISTS",
          "Forma prevista de pago",
          directDebit.value,
          directDebit.pageNumber,
        )
      : null,
  ]);
  return reviewed(document, index, {
    familyId: "collection.deferral_grant",
    canonicalTitle: "Concesión de aplazamiento o fraccionamiento",
    layoutVariant: "MODERN_NO_GUARANTEE_WITH_TWO_ANNEXES",
    fields,
    installments,
    amountScenarios: Object.freeze([]),
    segments: segmentsFor("collection.deferral_grant", document.pages.length),
    explanation: EXPLANATIONS["collection.deferral_grant"],
    paymentFormStatus: "NONE",
  });
}

function bankSeizure(
  document: BoundedDocumentInput,
  index: DocumentIndexV3,
): RealCorpusExtractorOutcomeV3 | null {
  const exactTitle =
    hasLinePrefix(
      index,
      "NOTIFICACIÓN DE DILIGENCIA DE EMBARGO DE CUENTAS Y DEPÓSITOS",
    ) ||
    hasLinePrefix(
      index,
      "NOTIFICACIÓN DE DILIGENCIA DE EMBARGO DE CUENTAS",
    ) ||
    hasLinePrefix(
      index,
      "NOTIFICACIÓN AL DEUDOR DE DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS",
    ) ||
    hasLinePrefix(index, "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS");
  const seizureOrder = lineValue(index, [
    "Número de diligencia",
    "Nº de la diligencia",
    "Nº de diligencia",
    "Nº diligencia",
    "Referencia de la diligencia",
  ]);
  const seizureDate = lineValue(index, [
    "Fecha de la diligencia",
    "Fecha del embargo",
  ]);
  const debtRow = bankSeizureDebtRow(index);
  const pendingDebtTotal = lineValue(index, [
    "Importe pendiente total",
    "Total pendiente",
    "Deuda pendiente total",
  ]);
  const seizureLimit = lineValue(index, [
    "Importe a embargar",
    "Límite del embargo",
  ]);
  const assetRows = bankSeizureAssetRows(index);
  const hasAccountsBlock =
    contains(index, "DEPÓSITOS Y CUENTAS") ||
    contains(index, "CUENTAS BANCARIAS");
  if (
    !exactTitle ||
    document.pages.length !== 6 ||
    !isAeat(index) ||
    !seizureOrder ||
    !seizureDate ||
    !hasAccountsBlock
  ) {
    return null;
  }
  const remitted =
    contains(index, "RESPUESTA DE LA ENTIDAD FINANCIERA") ||
    contains(index, "JUSTIFICANTE DE TRANSFERENCIA AL TESORO")
      ? lineValue(index, [
          "Importe remitido al Tesoro",
          "Importe ingresado al Tesoro",
        ])
      : null;
  const recipient =
    markerValue(
      index,
      ["CONDICIÓN DE OBLIGADO AL PAGO", "CONDICION DE OBLIGADO AL PAGO"],
      "Obligado al pago",
    ) ??
    markerValue(
      index,
      [
        "ENTIDAD FINANCIERA DESTINATARIA",
        "ENTIDAD DE CRÉDITO DESTINATARIA",
        "NOTIFICACIÓN DIRIGIDA A LA ENTIDAD FINANCIERA",
        "NOTIFICACION DIRIGIDA A LA ENTIDAD FINANCIERA",
      ],
      "Entidad financiera destinataria",
    );
  const bankAsset = markerValue(
    index,
    [
      "SALDOS DE LAS CUENTAS",
      "CUENTAS BANCARIAS",
      "CUENTA O DEPÓSITO",
      "DEPÓSITOS Y CUENTAS",
      "DEPOSITOS Y CUENTAS",
    ],
    "Cuenta o depósito bancario",
  );
  const fields = compact([
    referenceField(
      "SEIZURE_ORDER_ID",
      "Referencia de la diligencia",
      seizureOrder,
    ),
    dateField("SEIZURE_DATE", "Fecha de la diligencia", seizureDate),
    ...(debtRow
      ? [
          referenceField("DEBT_KEY", "Número de liquidación", debtRow.debtKey),
          moneyField("PENDING_DEBT", "Deuda pendiente", debtRow.pendingDebt),
        ]
      : []),
    moneyField("PENDING_DEBT_TOTAL", "Total pendiente", pendingDebtTotal),
    moneyField("SEIZURE_LIMIT", "Límite del embargo", seizureLimit),
    ...assetRows.map((asset) =>
      moneyField("SEIZED_AMOUNT", "Importe embargado", asset.seizedAmount),
    ),
    ...(remitted
      ? [moneyField("REMITTED_AMOUNT", "Importe remitido al Tesoro", remitted)]
      : []),
    recipient
      ? textField(
          "RECIPIENT_ROLE",
          "Destinatario",
          recipient.value,
          recipient.pageNumber,
        )
      : null,
    bankAsset
      ? textField(
          "ASSET_KIND",
          "Bien afectado",
          bankAsset.value,
          bankAsset.pageNumber,
        )
      : null,
    dateField(
      "SIGNING_DATE",
      "Fecha de firma",
      lineValue(index, ["Fecha de firma"]),
    ),
  ]);
  return reviewed(document, index, {
    familyId: "seizure.bank_account",
    canonicalTitle: "Embargo de cuenta o depósito",
    layoutVariant: "DEBTOR_NOTIFICATION_WITH_ANNEX",
    fields,
    installments: Object.freeze([]),
    amountScenarios: Object.freeze([]),
    segments: segmentsFor("seizure.bank_account", document.pages.length),
    explanation: EXPLANATIONS["seizure.bank_account"],
    paymentFormStatus: "NONE",
  });
}

function reminder(
  document: BoundedDocumentInput,
  index: DocumentIndexV3,
): RealCorpusExtractorOutcomeV3 | null {
  if (
    !contains(index, "MODELO 115") ||
    document.pages.length < 5 ||
    !contains(index, "MODELO 180") ||
    !contains(index, "DECLARACIONES INFORMATIVAS") ||
    !contains(index, "1 DE ENERO")
  ) {
    return null;
  }
  const electronicChannel = markerValue(
    index,
    [
      "PRESENTACIÓN ELECTRÓNICA",
      "PRESENTACION ELECTRONICA",
      "VÍA ELECTRÓNICA",
      "VIA ELECTRONICA",
    ],
    "Presentación electrónica",
  );
  const fields = compact([
    referenceField(
      "DOCUMENT_REFERENCE",
      "Referencia del documento",
      lineValue(index, ["Referencia del documento", "Referencia"]),
    ),
    referenceField(
      "SOURCE_MODEL",
      "Modelo periódico citado",
      lineValue(index, ["Modelo de origen", "Modelo presentado"]) ??
        markerValue(index, ["MODELO 115"], "115"),
    ),
    referenceField(
      "EXPECTED_MODEL",
      "Modelo anual esperado",
      lineValue(index, ["Modelo esperado", "Modelo anual"]) ??
        markerValue(index, ["MODELO 180"], "180"),
    ),
    referenceField("FISCAL_YEAR", "Ejercicio", lineValue(index, ["Ejercicio"])),
    referenceField(
      "PRINTED_START_DATE",
      "Inicio impreso del período",
      lineValue(index, ["Inicio del período", "Fecha de inicio"]) ??
        markerValue(index, ["1 DE ENERO"], "01-01"),
    ),
    electronicChannel
      ? textField(
          "ELECTRONIC_CHANNEL",
          "Canal indicado",
          electronicChannel.value,
          electronicChannel.pageNumber,
        )
      : null,
  ]);
  return reviewed(document, index, {
    familyId: "information.model_filing_reminder",
    canonicalTitle: "Recordatorio de obligación de presentar un modelo",
    layoutVariant: "BILINGUAL_SPANISH_CATALAN_PARALLEL_COPY",
    fields,
    installments: Object.freeze([]),
    amountScenarios: Object.freeze([]),
    segments: segmentsFor(
      "information.model_filing_reminder",
      document.pages.length,
    ),
    explanation: EXPLANATIONS["information.model_filing_reminder"],
    paymentFormStatus: "NONE",
  });
}

function refund(
  document: BoundedDocumentInput,
  index: DocumentIndexV3,
): RealCorpusExtractorOutcomeV3 | null {
  if (!hasLinePrefix(index, "COMUNICACIÓN DE PAGO DE DEVOLUCIÓN")) return null;
  const labeledDeductions = allLineValues(index, [
    "Deducción organismo público",
    "Deducción",
  ]);
  const narrativeDeductions = index.lines.flatMap((line, position) => {
    if (
      !line.normalized.includes("DEUDAS") ||
      (!line.normalized.includes("SEGURIDAD SOCIAL") &&
        !line.normalized.includes("AGENCIA TRIBUTARIA"))
    ) {
      return [];
    }
    const authority = line.normalized.includes("SEGURIDAD SOCIAL")
      ? "Seguridad Social"
      : "Hacienda autonómica";
    for (
      let candidatePosition = position;
      candidatePosition <= Math.min(position + 2, index.lines.length - 1);
      candidatePosition += 1
    ) {
      const candidate = index.lines[candidatePosition]!;
      if (candidate.pageNumber !== line.pageNumber) break;
      const amount = moneySourceFromLine(candidate);
      if (!amount || !amount.value.includes(",")) continue;
      return [
        Object.freeze({
          value: `${authority} | ${amount.value}`,
          pageNumber: amount.pageNumber,
        }),
      ];
    }
    return [];
  });
  const deductions = [...labeledDeductions, ...narrativeDeductions].slice(
    0,
    16,
  );
  const deductionReferences = allLineValues(index, [
    "Referencia de deducción",
    "Referencia de la deducción",
    "Referencia externa",
    "Referencia del descuento",
  ]).slice(0, 16);
  const netRefundSource = lineValue(index, [
    "Líquido a transferir",
    "Importe líquido",
    "Neto a transferir",
  ]);
  if (
    deductions.length === 0 ||
    parseMoney(netRefundSource?.value ?? "") === null
  ) {
    return null;
  }
  const observedAuthority = (value: string): string | null => {
    const authority = normalize(value.split("|")[0] ?? "");
    if (authority.includes("SEGURIDAD SOCIAL")) return "Seguridad Social";
    if (
      authority.includes("HACIENDA AUTONOMICA") ||
      authority.includes("AGENCIA TRIBUTARIA AUTONOMICA") ||
      authority.includes("COMUNIDAD AUTONOMA")
    ) {
      return "Hacienda autonómica";
    }
    return null;
  };
  const fields = compact([
    referenceField(
      "REFUND_REFERENCE",
      "Referencia de la devolución",
      lineValue(index, ["Referencia de la devolución", "Referencia"]),
    ),
    referenceField(
      "REFUND_DECISION_REFERENCE",
      "Referencia del acuerdo",
      lineValue(index, [
        "Referencia del acuerdo de devolución",
        "Referencia de la resolución",
      ]) ?? numberedReferenceInLine(index, ["Importe acordado"]),
    ),
    moneyField(
      "REFUND_REQUESTED",
      "Devolución solicitada",
      lineValue(index, ["Devolución solicitada", "Importe solicitado"]),
    ),
    moneyField(
      "REFUND_AGREED",
      "Devolución acordada",
      lineValue(index, [
        "Devolución acordada",
        "Importe acordado",
        "Importe reconocido",
      ]),
    ),
    moneyField(
      "REFUND_ORDERED",
      "Devolución ordenada",
      lineValue(index, [
        "Devolución ordenada",
        "Importe ordenado",
        "Total devolución",
      ]),
    ),
    moneyField(
      "DEDUCTION_TOTAL",
      "Total deducciones",
      lineValue(index, ["Total deducciones", "Deducciones totales"]),
    ),
    moneyField(
      "NET_REFUND_PAYMENT",
      "Líquido cuya transferencia se ordena",
      netRefundSource,
    ),
    dateField(
      "ISSUE_DATE",
      "Fecha del documento",
      lineValue(index, ["Fecha de emisión", "Fecha del documento", "Fecha"]),
    ),
    ...deductions.flatMap((item, position) => {
      const authority = observedAuthority(item.value);
      return [
        authority
          ? textField(
              `PUBLIC_AUTHORITY_ROLE_${position + 1}`,
              `Organismo público ${position + 1}`,
              authority,
              item.pageNumber,
            )
          : null,
        moneyField(
          `EXTERNAL_DEDUCTION_${position + 1}`,
          `Deducción ${position + 1}`,
          item,
        ),
        referenceField(
          `EXTERNAL_DEDUCTION_REFERENCE_${position + 1}`,
          `Referencia de la deducción ${position + 1}`,
          deductionReferences[position] ?? null,
        ),
      ];
    }),
  ]);
  return reviewed(document, index, {
    familyId: "refund.payment_communication",
    canonicalTitle: "Comunicación de pago de devolución",
    layoutVariant: "NET_REFUND_AFTER_EXTERNAL_PUBLIC_DEDUCTIONS",
    fields,
    installments: Object.freeze([]),
    amountScenarios: Object.freeze([]),
    segments: Object.freeze([]),
    explanation: EXPLANATIONS["refund.payment_communication"],
    paymentFormStatus: "NONE",
  });
}

function regulatoryChange(
  document: BoundedDocumentInput,
  index: DocumentIndexV3,
): RealCorpusExtractorOutcomeV3 | null {
  if (
    !contains(index, "DESAPARECE LA MODALIDAD DE PRESENTACIÓN") ||
    !contains(index, "MODELO 303") ||
    !contains(index, "PREDECLARACIÓN") ||
    !contains(index, "EJERCICIO 2023 Y SIGUIENTES")
  ) {
    return null;
  }
  const electronicFiling = markerValue(
    index,
    ["PRESENTACIÓN ELECTRÓNICA", "PRESENTACION ELECTRONICA"],
    "Presentación electrónica",
  );
  return reviewed(document, index, {
    familyId: "information.regulatory_change",
    canonicalTitle: "Comunicación informativa de cambio normativo o de canal",
    layoutVariant: "MODEL_303_CHANNEL_CHANGE_NO_TITLE",
    fields: compact([
      referenceField(
        "DOCUMENT_REFERENCE",
        "Referencia del documento",
        lineValue(index, ["Referencia del documento", "Referencia"]) ??
          embeddedReferenceAfterLabel(
            index,
            "Referencia",
            /^([A-Z]{1,4}\s*\d{10,20}[A-Z]?)(?:\s|$)/u,
          ),
      ),
      referenceField(
        "AFFECTED_MODEL",
        "Modelo afectado",
        lineValue(index, ["Modelo afectado", "Modelo"]),
      ),
      textField(
        "EFFECTIVE_EXERCISES",
        "Ejercicios afectados",
        "Ejercicio 2023 y siguientes",
        markerValue(index, ["EJERCICIO 2023 Y SIGUIENTES"], "observed")!
          .pageNumber,
      ),
      textField(
        "REMOVED_CHANNEL",
        "Canal retirado",
        "Predeclaración en papel retirada",
        markerValue(index, ["DESAPARECE LA MODALIDAD DE PRESENTACIÓN"], "observed")!
          .pageNumber,
      ),
      electronicFiling
        ? textField(
            "ALLOWED_IDENTITY_METHODS",
            "Canal disponible",
            electronicFiling.value,
            electronicFiling.pageNumber,
          )
        : null,
      dateField(
        "ISSUE_DATE",
        "Fecha del documento",
        lineValue(index, ["Fecha de emisión", "Fecha del documento", "Fecha"]),
      ),
    ]),
    installments: Object.freeze([]),
    amountScenarios: Object.freeze([]),
    segments: Object.freeze([]),
    explanation: EXPLANATIONS["information.regulatory_change"],
    paymentFormStatus: "NONE",
  });
}

function release(
  document: BoundedDocumentInput,
  index: DocumentIndexV3,
): RealCorpusExtractorOutcomeV3 | null {
  if (
    !hasLinePrefix(index, "LEVANTAMIENTO DE EMBARGO DE BIENES MUEBLES") ||
    document.pages.length < 3 ||
    (!contains(index, "CANCELACIÓN") && !contains(index, "CANCELACION")) ||
    (!contains(index, "VEHÍCULO") &&
      !contains(index, "VEHICULO") &&
      !contains(index, "MATRÍCULA") &&
      !contains(index, "MATRICULA") &&
      !contains(index, "BASTIDOR"))
  )
    return null;
  const asset = markerValue(
    index,
    ["VEHÍCULO", "VEHICULO", "MATRÍCULA", "MATRICULA", "BASTIDOR"],
    "Vehículo o bien mueble",
  );
  const releaseExtent = markerValue(
    index,
    ["LEVANTAMIENTO DE EMBARGO DE BIENES MUEBLES", "SE ACUERDA EL LEVANTAMIENTO"],
    "Levantamiento del embargo",
  );
  const registryCancellation = markerValue(
    index,
    ["CANCELACIÓN", "CANCELACION"],
    "Cancelación registral ordenada",
  );
  return reviewed(document, index, {
    familyId: "seizure.release",
    canonicalTitle: "Levantamiento de embargo",
    layoutVariant: "MOVABLE_ASSET_RELEASE_WITH_ASSET_ANNEX",
    fields: compact([
      referenceField(
        "SEIZURE_ORDER_ID",
        "Referencia del embargo anterior",
        lineValue(index, [
          "Número de diligencia",
          "Referencia del embargo",
          "Diligencia de origen",
        ]),
      ),
      dateField(
        "SOURCE_SEIZURE_DATE",
        "Fecha del embargo anterior",
        lineValue(index, [
          "Fecha de la diligencia",
          "Fecha del embargo anterior",
        ]),
      ),
      dateField(
        "RELEASE_DATE",
        "Fecha del levantamiento",
        lineValue(index, [
          "Fecha del levantamiento",
          "Fecha del acuerdo",
          "Fecha de firma",
        ]),
      ),
      asset
        ? textField("ASSET_KIND", "Tipo de bien", asset.value, asset.pageNumber)
        : null,
      releaseExtent
        ? textField(
            "RELEASE_EXTENT",
            "Alcance",
            releaseExtent.value,
            releaseExtent.pageNumber,
          )
        : null,
      registryCancellation
        ? booleanField(
            "REGISTRY_CANCELLATION_ORDERED",
            "Cancelación registral ordenada",
            true,
            registryCancellation.pageNumber,
          )
        : null,
    ]),
    installments: Object.freeze([]),
    amountScenarios: Object.freeze([]),
    segments: segmentsFor("seizure.release", document.pages.length),
    explanation: EXPLANATIONS["seizure.release"],
    paymentFormStatus: "NONE",
  });
}

function certificate(
  document: BoundedDocumentInput,
  index: DocumentIndexV3,
): RealCorpusExtractorOutcomeV3 | null {
  const classicNegative =
    hasLinePrefix(index, "DENEGACIÓN DE CERTIFICADO") &&
    contains(index, "DEUDAS O SANCIONES");
  const observedCertificateNegative =
    contains(index, "SOLICITUD DE CERTIFICADO") &&
    contains(index, "CORRIENTE") &&
    contains(index, "DEUDAS") &&
    contains(index, "SANCIONES") &&
    contains(index, "CERTIFICADO") &&
    contains(index, "NEGATIVO");
  if (!classicNegative && !observedCertificateNegative) {
    return null;
  }
  const negativeResult = markerValue(
    index,
    [
      "DENEGACIÓN DE CERTIFICADO",
      "DENEGACION DE CERTIFICADO",
      "CERTIFICADO NEGATIVO",
      "NEGATIVO",
    ],
    "Negativo",
  );
  const negativeReason = markerValue(
    index,
    ["DEUDAS O SANCIONES", "DEUDAS", "SANCIONES"],
    "Deudas o sanciones indicadas en el certificado",
  );
  return reviewed(document, index, {
    familyId: "certificate.tax_compliance",
    canonicalTitle: "Certificado de estar al corriente",
    layoutVariant: "NEGATIVE_CERTIFICATE_BY_EXECUTIVE_DEBT",
    fields: compact([
      referenceField(
        "CERTIFICATE_REFERENCE",
        "Referencia del certificado",
        lineValue(index, [
          "Referencia del certificado",
          "Código de certificado",
          "Número de referencia",
          "Nº referencia",
          "Referencia",
        ]),
      ),
      negativeResult
        ? textField(
            "CERTIFICATE_RESULT",
            "Resultado",
            negativeResult.value,
            negativeResult.pageNumber,
          )
        : null,
      negativeReason
        ? textField(
            "NEGATIVE_REASON",
            "Motivo indicado",
            negativeReason.value,
            negativeReason.pageNumber,
          )
        : null,
      dateField(
        "ISSUE_DATE",
        "Fecha del certificado",
        lineValue(index, [
          "Fecha de emisión",
          "Fecha del certificado",
          "Fecha",
        ]),
      ),
    ]),
    installments: Object.freeze([]),
    amountScenarios: Object.freeze([]),
    segments: Object.freeze([]),
    explanation: EXPLANATIONS["certificate.tax_compliance"],
    paymentFormStatus: "NONE",
  });
}

function moneyAmount(
  fields: readonly RealCorpusFieldV2[],
  code: string,
): number | null {
  const item = fields.find(
    (candidate) => candidate.fieldCode === code && candidate.kind === "MONEY",
  );
  return item?.kind === "MONEY" ? item.amountCents : null;
}

function unknown(
  document: BoundedDocumentInput,
  index: DocumentIndexV3,
): RealCorpusExtractorOutcomeV3 {
  return Object.freeze({
    schemaVersion: REAL_CORPUS_EXTRACTOR_SCHEMA_VERSION_V3,
    extractorVersion: REAL_CORPUS_EXTRACTOR_VERSION_V3,
    status: "UNKNOWN" as const,
    familyId: null,
    canonicalTitle: null,
    layoutVariant: null,
    physicalPageCount: document.pages.length,
    contentPageCount: document.pages.length - index.blankPageNumbers.length,
    fields: Object.freeze([]),
    installments: Object.freeze([]),
    amountScenarios: Object.freeze([]),
    segments: Object.freeze([]),
    explanation: null,
    paymentFormStatus: "NONE" as const,
    retainedSourceContent: "NONE" as const,
    requiresHumanReview: true as const,
    materializationPolicy: "PROHIBITED" as const,
    confirmsDebt: false as const,
    confirmsPayment: false as const,
    confirmsDeadline: false as const,
  });
}

/**
 * Deterministic V3 extractor trained from the repository-safe synthetic
 * contract. Raw text and personal values never cross the returned boundary.
 */
export async function extractAeatRealCorpusDocumentV3(
  document: BoundedDocumentInput,
): Promise<RealCorpusExtractorOutcomeV3> {
  assertBoundedDocumentInput(document);
  assertNotAborted(document.signal);
  const index = buildIndex(document);
  if (!isAeat(index)) return unknown(document, index);
  const result =
    enforcement(document, index) ??
    deferral(document, index) ??
    bankSeizure(document, index) ??
    reminder(document, index) ??
    refund(document, index) ??
    regulatoryChange(document, index) ??
    release(document, index) ??
    certificate(document, index);
  assertNotAborted(document.signal);
  return result ?? unknown(document, index);
}
