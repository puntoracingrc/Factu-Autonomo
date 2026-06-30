import { documentTotals } from "./calculations";
import { getCustomerDisplayName, migrateCustomer } from "./customers";
import type { Customer, Document, DocumentType } from "./types";

export type ReminderVoiceLinkMode = "none" | "generate" | "rectify" | "reset";
export type ReminderVoiceGenerateType = Extract<
  DocumentType,
  "factura" | "presupuesto" | "recibo"
>;
export type ReminderVoiceRectifyType = Extract<
  DocumentType,
  "factura" | "presupuesto"
>;
export type ReminderVoiceConfidence = "alta" | "media";

export interface ReminderVoiceCustomerMatch {
  customer: Customer;
  score: number;
  confidence: ReminderVoiceConfidence;
  matchedText: string;
}

export interface ReminderVoiceDocumentMatch {
  document: Document;
  score: number;
  confidence: ReminderVoiceConfidence;
}

export interface ReminderVoiceIntent {
  linkMode: ReminderVoiceLinkMode;
  generateType?: ReminderVoiceGenerateType;
  rectifyType?: ReminderVoiceRectifyType;
  customerMatch?: ReminderVoiceCustomerMatch;
  documentMatch?: ReminderVoiceDocumentMatch;
  wantsCustomer: boolean;
}

const GENERATE_ACTION_WORDS =
  /\b(haz|hacer|crea|crear|genera|generar|prepara|preparar|emite|emitir|facturar|presupuestar)\b/;
const RECTIFY_WORDS =
  /\b(rectifica|rectificar|rectificativa|corrige|corregir|correccion|corrección|anula|anular|abono)\b/;
const NO_CUSTOMER_WORDS = /\b(sin cliente|sin ningun cliente|sin ningún cliente)\b/;
const RESET_EXACT_COMMANDS = new Set([
  "borra",
  "borralo",
  "limpia",
  "limpialo",
  "olvida",
  "olvidalo",
  "empieza de nuevo",
  "empezamos de nuevo",
  "empecemos de nuevo",
  "desde cero",
]);
const RESET_COMMAND_PATTERNS = [
  /\b(empieza|empezamos|empecemos|comienza|comencemos|reinicia|reiniciar)\b.*\b(de nuevo|otra vez|desde cero)\b/,
  /\b(borra|borrar|borralo|elimina|eliminar|quita|quitar|limpia|limpiar|limpialo|olvida|olvidar|olvidalo)\b.*\b(todo|esto|lo anterior|lo que he dicho|lo dicho|la nota|el texto|el recordatorio|este recordatorio)\b/,
  /\b(me he liado|me lie|me he equivocado|me equivoque|no era eso)\b.*\b(borra|borralo|limpia|olvida|empieza|empezamos|empecemos|reinicia)\b/,
  /\b(borra|borralo|limpia|olvida|empieza|empezamos|empecemos|reinicia)\b.*\b(me he liado|me lie|me he equivocado|me equivoque|no era eso)\b/,
];

export function normalizeReminderVoiceText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isReminderVoiceResetCommand(transcript: string): boolean {
  const normalized = normalizeReminderVoiceText(transcript);
  if (!normalized) return false;
  if (RESET_EXACT_COMMANDS.has(normalized)) return true;
  return RESET_COMMAND_PATTERNS.some((pattern) => pattern.test(normalized));
}

function phoneticReminderKey(value: string): string {
  return normalizeReminderVoiceText(value)
    .replace(/ll/g, "y")
    .replace(/v/g, "b")
    .replace(/h/g, "")
    .replace(/qu/g, "k")
    .replace(/ce|ci/g, "z")
    .replace(/c/g, "k")
    .replace(/\s+/g, " ")
    .trim();
}

function reminderTokens(value: string): string[] {
  return normalizeReminderVoiceText(value)
    .split(" ")
    .filter((token) => token.length > 0);
}

function ngrams(tokens: string[], minSize: number, maxSize: number): string[] {
  const result: string[] = [];
  for (let size = minSize; size <= maxSize; size += 1) {
    if (size < 1 || size > tokens.length) continue;
    for (let index = 0; index <= tokens.length - size; index += 1) {
      result.push(tokens.slice(index, index + size).join(" "));
    }
  }
  return result;
}

function levenshtein(left: string, right: string): number {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }
    for (let index = 0; index < previous.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[right.length];
}

function similarity(left: string, right: string): number {
  const max = Math.max(left.length, right.length);
  if (max === 0) return 0;
  return 1 - levenshtein(left, right) / max;
}

function scoreLabelInTranscript(label: string, transcript: string): number {
  const normalizedLabel = normalizeReminderVoiceText(label);
  if (normalizedLabel.length < 3) return 0;

  const normalizedTranscript = normalizeReminderVoiceText(transcript);
  if (normalizedTranscript.includes(normalizedLabel)) return 1;

  const phoneticLabel = phoneticReminderKey(label);
  const phoneticTranscript = phoneticReminderKey(transcript);
  if (phoneticTranscript.includes(phoneticLabel)) return 0.96;

  const labelTokens = reminderTokens(label);
  const transcriptTokens = reminderTokens(transcript);
  const candidates = ngrams(
    transcriptTokens,
    Math.max(1, labelTokens.length - 1),
    labelTokens.length + 1,
  );

  return candidates.reduce((best, candidate) => {
    const candidateScore = similarity(phoneticLabel, phoneticReminderKey(candidate));
    return Math.max(best, candidateScore);
  }, 0);
}

function customerLabels(customer: Customer): string[] {
  const migrated = migrateCustomer(customer);
  return [
    getCustomerDisplayName(migrated),
    migrated.firstName,
    migrated.lastName,
    migrated.name,
    migrated.nif,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .filter((value, index, values) => values.indexOf(value) === index);
}

export function findReminderVoiceCustomerMatch(
  customers: Customer[],
  transcript: string,
): ReminderVoiceCustomerMatch | null {
  const scored = customers
    .map((customer) => {
      const labels = customerLabels(customer);
      const bestLabel = labels.reduce(
        (best, label) => {
          const score = scoreLabelInTranscript(label, transcript);
          return score > best.score ? { label, score } : best;
        },
        { label: "", score: 0 },
      );
      return { customer, ...bestLabel };
    })
    .filter((entry) => entry.score >= 0.7)
    .sort((left, right) => right.score - left.score);

  const best = scored[0];
  if (!best) return null;

  const secondScore = scored[1]?.score ?? 0;
  const clearEnough =
    best.score >= 0.9 || (best.score >= 0.78 && best.score - secondScore >= 0.08);
  if (!clearEnough) return null;

  return {
    customer: migrateCustomer(best.customer),
    score: best.score,
    confidence: best.score >= 0.9 ? "alta" : "media",
    matchedText: best.label,
  };
}

function detectGenerateType(
  normalizedTranscript: string,
): ReminderVoiceGenerateType | null {
  if (/\b(recibo|recibos)\b/.test(normalizedTranscript)) return "recibo";
  if (/\b(presupuesto|presupuestos|presu|oferta|ofertas)\b/.test(normalizedTranscript)) {
    return "presupuesto";
  }
  if (/\b(factura|facturas|facturar|facturacion)\b/.test(normalizedTranscript)) {
    return "factura";
  }
  return null;
}

function isGenerateRequest(normalizedTranscript: string): boolean {
  if (GENERATE_ACTION_WORDS.test(normalizedTranscript)) return true;
  return /\b(factura|facturas|presupuesto|presupuestos|recibo|recibos)\b.*\b(a|para)\b/.test(
    normalizedTranscript,
  );
}

function documentClientName(document: Document): string {
  return document.client.name || document.client.lastName || document.client.firstName || "";
}

function scoreDocumentInTranscript(document: Document, transcript: string): number {
  const normalized = normalizeReminderVoiceText(transcript);
  const byNumber = normalizeReminderVoiceText(document.number);
  if (byNumber && normalized.includes(byNumber)) return 1;

  const clientName = documentClientName(document);
  const clientScore = [
    clientName,
    ...reminderTokens(clientName).filter((token) => token.length >= 3),
  ].reduce(
    (best, label) => Math.max(best, scoreLabelInTranscript(label, transcript)),
    0,
  );
  const amount = documentTotals(document).total.toFixed(2).replace(".", ",");
  const amountAlt = amount.replace(",", ".");
  const amountScore =
    normalized.includes(normalizeReminderVoiceText(amount)) ||
    normalized.includes(normalizeReminderVoiceText(amountAlt))
      ? 0.72
      : 0;

  return Math.max(clientScore * 0.88, amountScore);
}

export function findReminderVoiceDocumentMatch(
  documents: Document[],
  transcript: string,
  type: ReminderVoiceRectifyType,
): ReminderVoiceDocumentMatch | null {
  const scored = documents
    .filter((document) => document.type === type)
    .map((document) => ({
      document,
      score: scoreDocumentInTranscript(document, transcript),
    }))
    .filter((entry) => entry.score >= 0.76)
    .sort((left, right) => {
      const byScore = right.score - left.score;
      if (byScore) return byScore;
      return right.document.date.localeCompare(left.document.date);
    });

  const best = scored[0];
  if (!best) return null;

  const secondScore = scored[1]?.score ?? 0;
  const clearEnough =
    best.score >= 0.9 || (best.score >= 0.8 && best.score - secondScore >= 0.08);
  if (!clearEnough) return null;

  return {
    document: best.document,
    score: best.score,
    confidence: best.score >= 0.9 ? "alta" : "media",
  };
}

export function interpretReminderVoiceIntent({
  transcript,
  customers,
  documents = [],
}: {
  transcript: string;
  customers: Customer[];
  documents?: Document[];
}): ReminderVoiceIntent {
  const normalized = normalizeReminderVoiceText(transcript);
  if (isReminderVoiceResetCommand(transcript)) {
    return {
      linkMode: "reset",
      wantsCustomer: false,
    };
  }

  const generateType = detectGenerateType(normalized);
  const wantsRectify = RECTIFY_WORDS.test(normalized);
  const wantsGenerate = Boolean(generateType) && isGenerateRequest(normalized);
  const wantsCustomer = !NO_CUSTOMER_WORDS.test(normalized);

  if (wantsRectify) {
    const rectifyType: ReminderVoiceRectifyType =
      generateType === "presupuesto" ? "presupuesto" : "factura";
    const documentMatch = findReminderVoiceDocumentMatch(
      documents,
      transcript,
      rectifyType,
    );
    return {
      linkMode: "rectify",
      rectifyType,
      documentMatch: documentMatch ?? undefined,
      wantsCustomer,
    };
  }

  if (wantsGenerate && generateType) {
    const customerMatch = wantsCustomer
      ? findReminderVoiceCustomerMatch(customers, transcript)
      : null;

    return {
      linkMode: "generate",
      generateType,
      customerMatch: customerMatch ?? undefined,
      wantsCustomer,
    };
  }

  return {
    linkMode: "none",
    wantsCustomer,
  };
}
