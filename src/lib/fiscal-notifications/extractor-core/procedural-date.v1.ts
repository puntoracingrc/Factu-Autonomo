import { FiscalNotificationInputError, assertBoundedId } from "../input-contract";
import {
  type SourceCoordinatesV1,
  assertBoundedLiteralV1,
  assertConfidenceV1,
  assertExactDataRecordV1,
  assertPageNumberV1,
  assertSourceCoordinatesV1,
  freezeCoordinatesV1,
} from "./shared.v1";

export const PROCEDURAL_DATE_TYPES_V1 = Object.freeze([
  "ISSUE_DATE",
  "SIGNING_DATE",
  "AVAILABILITY_DATE",
  "ACCESS_DATE",
  "REJECTION_DATE",
  "EXPIRATION_DATE",
  "EFFECTIVE_NOTIFICATION_DATE",
  "ACTION_DATE",
  "VOLUNTARY_PAYMENT_DEADLINE",
  "RESPONSE_DEADLINE",
  "APPEAL_DEADLINE",
  "INSTALLMENT_DUE_DATE",
  "INTEREST_START_DATE",
  "INTEREST_END_DATE",
  "PAYMENT_FORM_DATE",
  "PAYMENT_DATE",
  "SEIZURE_DATE",
  "RELEASE_DATE",
] as const);
export type ProceduralDateTypeV1 = (typeof PROCEDURAL_DATE_TYPES_V1)[number];

export interface ProceduralDateV1 {
  readonly proceduralDateId: string;
  readonly dateType: ProceduralDateTypeV1;
  readonly rawText: string;
  readonly rawDeadlineText: string | null;
  readonly parsedDate: string | null;
  readonly timezone: "Europe/Madrid" | null;
  readonly sourceDocumentId: string;
  readonly sourcePage: number;
  readonly sourceLabel: string | null;
  readonly sourceCoordinates: SourceCoordinatesV1 | null;
  readonly extractionConfidence: number;
  readonly explicitlyPrinted: boolean;
  readonly legallyComputed: boolean;
  readonly computationRuleId: string | null;
  readonly requiresReview: boolean;
}

const DEADLINE_TYPES = new Set<ProceduralDateTypeV1>([
  "VOLUNTARY_PAYMENT_DEADLINE",
  "RESPONSE_DEADLINE",
  "APPEAL_DEADLINE",
  "INSTALLMENT_DUE_DATE",
]);

export function createProceduralDateV1(input: ProceduralDateV1): ProceduralDateV1 {
  assertExactDataRecordV1(input, "date", [
    "proceduralDateId", "dateType", "rawText", "rawDeadlineText", "parsedDate", "timezone",
    "sourceDocumentId", "sourcePage", "sourceLabel", "sourceCoordinates", "extractionConfidence",
    "explicitlyPrinted", "legallyComputed", "computationRuleId", "requiresReview",
  ]);
  assertBoundedId(input.proceduralDateId, "date.proceduralDateId");
  if (!PROCEDURAL_DATE_TYPES_V1.includes(input.dateType)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "date.dateType");
  }
  assertBoundedLiteralV1(input.rawText, "date.rawText", { maxChars: 500 });
  assertBoundedLiteralV1(input.rawDeadlineText, "date.rawDeadlineText", {
    maxChars: 500,
    nullable: true,
  });
  if (DEADLINE_TYPES.has(input.dateType) && input.rawDeadlineText === null) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "date.rawDeadlineText");
  }
  if (input.parsedDate !== null && !isValidIsoDateV1(input.parsedDate)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "date.parsedDate");
  }
  if (input.timezone !== null && input.timezone !== "Europe/Madrid") {
    throw new FiscalNotificationInputError("INVALID_INPUT", "date.timezone");
  }
  assertBoundedId(input.sourceDocumentId, "date.sourceDocumentId");
  assertPageNumberV1(input.sourcePage, "date.sourcePage");
  assertBoundedLiteralV1(input.sourceLabel, "date.sourceLabel", { maxChars: 240, nullable: true });
  assertSourceCoordinatesV1(input.sourceCoordinates, "date.sourceCoordinates");
  assertConfidenceV1(input.extractionConfidence, "date.extractionConfidence");
  if (typeof input.explicitlyPrinted !== "boolean" || typeof input.legallyComputed !== "boolean") {
    throw new FiscalNotificationInputError("INVALID_INPUT", "date.evidenceMode");
  }
  if (input.explicitlyPrinted === input.legallyComputed) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "date.evidenceMode");
  }
  if (input.computationRuleId !== null) assertBoundedId(input.computationRuleId, "date.computationRuleId");
  if (input.legallyComputed !== (input.computationRuleId !== null)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "date.computationRuleId");
  }
  if (typeof input.requiresReview !== "boolean" || (input.legallyComputed && !input.requiresReview)) {
    throw new FiscalNotificationInputError("INVALID_INPUT", "date.requiresReview");
  }
  return Object.freeze({ ...input, sourceCoordinates: freezeCoordinatesV1(input.sourceCoordinates) });
}

function isValidIsoDateV1(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
