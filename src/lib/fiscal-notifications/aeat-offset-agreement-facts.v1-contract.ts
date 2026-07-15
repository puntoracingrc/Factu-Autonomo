import {
  AEAT_OFFSET_AGREEMENT_FACTS_ENGINE_ID_V1,
  AEAT_OFFSET_AGREEMENT_FACTS_ENGINE_VERSION_V1,
  AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1,
  AEAT_OFFSET_AGREEMENT_FACTS_SCHEMA_VERSION_V1,
  type AeatOffsetAgreementFactsIssueCodeV1,
  type AeatOffsetAgreementFactsIssueV1,
  type AeatOffsetAgreementFactsResultV1,
  type AeatOffsetAgreementHeaderFactsV1,
  type AeatOffsetCreditFactV1,
  type AeatOffsetDebtFactV1,
  type AeatOffsetMoneyFactV1,
  type AeatOffsetPrintedDateFactV1,
  type AeatOffsetPrintedEffectMeaningV1,
  type AeatOffsetTextFactV1,
} from "./aeat-offset-agreement-facts.v1";
import { FISCAL_NOTIFICATION_INPUT_LIMITS } from "./input-contract";

export class AeatOffsetAgreementFactsContractErrorV1 extends Error {
  constructor() {
    super("AEAT_OFFSET_AGREEMENT_FACTS_CONTRACT_INVALID");
    this.name = "AeatOffsetAgreementFactsContractErrorV1";
  }
}

const ROOT_KEYS = new Set([
  "schemaVersion",
  "engineId",
  "engineVersion",
  "documentType",
  "agreementMode",
  "status",
  "outcome",
  "header",
  "credits",
  "debts",
  "issues",
  "semanticPolicy",
  "effectPolicy",
  "amountPolicy",
  "legalRuleStatus",
  "relationPolicy",
  "debtMutationPolicy",
  "paymentActionPolicy",
  "accountingActionPolicy",
  "persistencePolicy",
  "networkPolicy",
  "retainedSourceContent",
  "requiresHumanReview",
  "materializationPolicy",
]);
const HEADER_KEYS = new Set([
  "subjectName",
  "subjectTaxId",
  "agreementNumber",
  "requestDate",
  "signatureDate",
]);
const CREDIT_KEYS = new Set([
  "reference",
  "description",
  "recognitionDate",
  "creditAmount",
  "delayInterest",
  "totalCredit",
  "compensatedAmount",
  "reviewStatus",
]);
const DEBT_KEYS = new Set([
  "liquidationKey",
  "description",
  "effectDate",
  "principalPending",
  "enforcementSurcharge",
  "delayInterest",
  "paymentsOnAccount",
  "totalBeforeOffset",
  "compensatedAmount",
  "remainingAfterOffset",
  "effectCode",
  "effectMeaning",
  "effectStatementPageNumbers",
  "reviewStatus",
]);
const TEXT_FACT_KEYS = new Set([
  "printedValue",
  "pageNumbers",
  "extractionMethod",
  "assertionType",
  "valueDisclosure",
  "reviewStatus",
]);
const MONEY_FACT_KEYS = new Set([
  "printedValue",
  "amountCents",
  "currency",
  "pageNumbers",
  "extractionMethod",
  "assertionType",
  "valueDisclosure",
  "reviewStatus",
]);
const DATE_FACT_KEYS = new Set([
  "printedValue",
  "calendarDate",
  "pageNumbers",
  "extractionMethod",
  "assertionType",
  "dateMeaning",
  "legalEffect",
  "reviewStatus",
]);
const ISSUE_KEYS = new Set([
  "code",
  "pageNumbers",
  "creditIndex",
  "debtIndex",
]);
const ISSUE_CODES = new Set<AeatOffsetAgreementFactsIssueCodeV1>([
  "FAMILY_GATE_NOT_SATISFIED",
  "MULTIPLE_AGREEMENT_MODES",
  "NO_ANNEX_I_SECTION",
  "NO_CREDIT_ROWS",
  "NO_DEBT_ROWS",
  "INVALID_CREDIT_ROW",
  "DEBT_ROW_WITHOUT_REFERENCE",
  "INVALID_DEBT_ROW",
  "INVALID_PRINTED_DATE",
  "INVALID_PRINTED_AMOUNT",
  "EFFECT_CODE_WITHOUT_EXPLICIT_STATEMENT",
  "MULTIPLE_DISTINCT_SUBJECT_VALUES",
  "MULTIPLE_DISTINCT_AGREEMENT_VALUES",
  "MULTIPLE_DISTINCT_REQUEST_DATES",
  "MULTIPLE_DISTINCT_SIGNATURE_DATES",
  "RESOURCE_LIMIT_EXCEEDED",
  "UNSUPPORTED_TEXT_STATE",
]);
const OUTCOMES = new Set([
  "FACTS_AVAILABLE",
  "INFORMATION_PENDING",
  "AMBIGUOUS",
  "PROCESSING_BLOCKED",
]);
const EFFECT_MEANINGS = new Set<AeatOffsetPrintedEffectMeaningV1>([
  "TOTAL_EXTINGUISHED_IN_VOLUNTARY_PERIOD",
  "PARTIALLY_EXTINGUISHED_IN_ENFORCEMENT",
  "TOTAL_EXTINGUISHED_IN_ENFORCEMENT",
  "PRINTED_CODE_UNMAPPED",
]);
const EFFECT_CODE_MEANING: Readonly<
  Record<string, AeatOffsetPrintedEffectMeaningV1>
> = Object.freeze({
  "1": "TOTAL_EXTINGUISHED_IN_VOLUNTARY_PERIOD",
  "3": "PARTIALLY_EXTINGUISHED_IN_ENFORCEMENT",
  "4": "TOTAL_EXTINGUISHED_IN_ENFORCEMENT",
});
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f-\u009f]/u;
const PRINTED_DATE = /^(\d{2})([-/])(\d{2})\2(\d{4})$/u;

/** Validación fail-closed de los hechos que cruzan el límite del Worker. */
export function parseAeatOffsetAgreementFactsContractV1(
  value: unknown,
  pageCount: number,
): AeatOffsetAgreementFactsResultV1 {
  try {
    if (
      !Number.isSafeInteger(pageCount) ||
      pageCount <= 0 ||
      pageCount > FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages
    ) {
      throw invalid();
    }
    const root = snapshotRecord(value, ROOT_KEYS);
    if (
      root.schemaVersion !== AEAT_OFFSET_AGREEMENT_FACTS_SCHEMA_VERSION_V1 ||
      root.engineId !== AEAT_OFFSET_AGREEMENT_FACTS_ENGINE_ID_V1 ||
      root.engineVersion !== AEAT_OFFSET_AGREEMENT_FACTS_ENGINE_VERSION_V1 ||
      (root.documentType !== null &&
        root.documentType !== "AEAT_OFFSET_AGREEMENT") ||
      (root.agreementMode !== null &&
        root.agreementMode !== "REQUESTED" &&
        root.agreementMode !== "EX_OFFICIO") ||
      (root.status !== "REVIEW_REQUIRED" &&
        root.status !== "INFORMATION_PENDING") ||
      !OUTCOMES.has(String(root.outcome)) ||
      root.semanticPolicy !== "EXPLICIT_PRINTED_FACTS_ONLY" ||
      root.effectPolicy !== "PRINTED_EFFECT_TEXT_ONLY" ||
      root.amountPolicy !== "PRINTED_VALUES_NOT_RECALCULATED" ||
      root.legalRuleStatus !== "NOT_APPLIED" ||
      root.relationPolicy !== "NOT_CREATED" ||
      root.debtMutationPolicy !== "NOT_PERFORMED" ||
      root.paymentActionPolicy !== "NOT_CREATED" ||
      root.accountingActionPolicy !== "NOT_CREATED" ||
      root.persistencePolicy !== "DO_NOT_PERSIST" ||
      root.networkPolicy !== "NO_NETWORK" ||
      root.retainedSourceContent !== "NONE" ||
      root.requiresHumanReview !== true ||
      root.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW"
    ) {
      throw invalid();
    }

    const header = parseHeader(root.header, pageCount);
    const credits = snapshotArray(
      root.credits,
      AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxCredits,
    ).map((item) => parseCredit(item, pageCount));
    const debts = snapshotArray(
      root.debts,
      AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxDebts,
    ).map((item) => parseDebt(item, pageCount));
    const issues = snapshotArray(
      root.issues,
      AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxCredits +
        AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxDebts +
        16,
    ).map((item) => parseIssue(item, pageCount));
    const hasHeader = Object.values(header).some((item) => item !== null);
    const hasFacts = hasHeader || credits.length > 0 || debts.length > 0;
    const outcome = root.outcome as AeatOffsetAgreementFactsResultV1["outcome"];

    if (
      (root.documentType === null && root.agreementMode !== null) ||
      (root.documentType !== null && root.agreementMode === null) ||
      (root.documentType === null &&
        (hasFacts ||
          root.status !== "INFORMATION_PENDING" ||
          !validEmptyOutcome(outcome, issues))) ||
      (root.documentType !== null &&
        ((root.status === "INFORMATION_PENDING") !== !hasFacts ||
          outcome === "PROCESSING_BLOCKED")) ||
      (outcome === "FACTS_AVAILABLE" &&
        (credits.length === 0 || debts.length === 0 || issues.length > 0)) ||
      (outcome === "AMBIGUOUS" && issues.length === 0) ||
      (outcome === "INFORMATION_PENDING" &&
        root.documentType !== null &&
        !issues.some((item) =>
          ["NO_ANNEX_I_SECTION", "NO_CREDIT_ROWS", "NO_DEBT_ROWS"].includes(
            item.code,
          ),
        )) ||
      !validateEffectIssues(debts, issues)
    ) {
      throw invalid();
    }

    return Object.freeze({
      schemaVersion: AEAT_OFFSET_AGREEMENT_FACTS_SCHEMA_VERSION_V1,
      engineId: AEAT_OFFSET_AGREEMENT_FACTS_ENGINE_ID_V1,
      engineVersion: AEAT_OFFSET_AGREEMENT_FACTS_ENGINE_VERSION_V1,
      documentType: root.documentType as "AEAT_OFFSET_AGREEMENT" | null,
      agreementMode: root.agreementMode as "REQUESTED" | "EX_OFFICIO" | null,
      status: root.status as "REVIEW_REQUIRED" | "INFORMATION_PENDING",
      outcome,
      header,
      credits: Object.freeze(credits),
      debts: Object.freeze(debts),
      issues: Object.freeze(issues),
      semanticPolicy: "EXPLICIT_PRINTED_FACTS_ONLY",
      effectPolicy: "PRINTED_EFFECT_TEXT_ONLY",
      amountPolicy: "PRINTED_VALUES_NOT_RECALCULATED",
      legalRuleStatus: "NOT_APPLIED",
      relationPolicy: "NOT_CREATED",
      debtMutationPolicy: "NOT_PERFORMED",
      paymentActionPolicy: "NOT_CREATED",
      accountingActionPolicy: "NOT_CREATED",
      persistencePolicy: "DO_NOT_PERSIST",
      networkPolicy: "NO_NETWORK",
      retainedSourceContent: "NONE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
  } catch (error) {
    if (error instanceof AeatOffsetAgreementFactsContractErrorV1) throw error;
    throw invalid();
  }
}

function parseHeader(
  value: unknown,
  pageCount: number,
): AeatOffsetAgreementHeaderFactsV1 {
  const header = snapshotRecord(value, HEADER_KEYS);
  return Object.freeze({
    subjectName:
      header.subjectName === null
        ? null
        : parseTextFact(
            header.subjectName,
            pageCount,
            AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxSubjectNameCharacters,
          ),
    subjectTaxId:
      header.subjectTaxId === null
        ? null
        : parseTextFact(header.subjectTaxId, pageCount, 24),
    agreementNumber:
      header.agreementNumber === null
        ? null
        : parseTextFact(
            header.agreementNumber,
            pageCount,
            AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxIdentifierCharacters,
          ),
    requestDate:
      header.requestDate === null
        ? null
        : parseDateFact(header.requestDate, pageCount),
    signatureDate:
      header.signatureDate === null
        ? null
        : parseDateFact(header.signatureDate, pageCount),
  });
}

function parseCredit(value: unknown, pageCount: number): AeatOffsetCreditFactV1 {
  const item = snapshotRecord(value, CREDIT_KEYS);
  if (item.reviewStatus !== "REVIEW_REQUIRED") throw invalid();
  return Object.freeze({
    reference: parseTextFact(
      item.reference,
      pageCount,
      AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxIdentifierCharacters,
    ),
    description: parseTextFact(
      item.description,
      pageCount,
      AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxDescriptionCharacters,
    ),
    recognitionDate: parseDateFact(item.recognitionDate, pageCount),
    creditAmount: parseMoneyFact(item.creditAmount, pageCount),
    delayInterest: parseMoneyFact(item.delayInterest, pageCount),
    totalCredit: parseMoneyFact(item.totalCredit, pageCount),
    compensatedAmount: parseMoneyFact(item.compensatedAmount, pageCount),
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function parseDebt(value: unknown, pageCount: number): AeatOffsetDebtFactV1 {
  const item = snapshotRecord(value, DEBT_KEYS);
  if (
    item.reviewStatus !== "REVIEW_REQUIRED" ||
    !EFFECT_MEANINGS.has(
      item.effectMeaning as AeatOffsetPrintedEffectMeaningV1,
    )
  ) {
    throw invalid();
  }
  const effectCode = parseTextFact(item.effectCode, pageCount, 8);
  const effectMeaning = item.effectMeaning as AeatOffsetPrintedEffectMeaningV1;
  const effectStatementPageNumbers = parsePageNumbers(
    item.effectStatementPageNumbers,
    pageCount,
    effectMeaning === "PRINTED_CODE_UNMAPPED",
  );
  const expectedMeaning = EFFECT_CODE_MEANING[effectCode.printedValue];
  if (
    (effectMeaning === "PRINTED_CODE_UNMAPPED" &&
      (expectedMeaning !== undefined || effectStatementPageNumbers.length > 0)) ||
    (effectMeaning !== "PRINTED_CODE_UNMAPPED" &&
      (expectedMeaning !== effectMeaning ||
        effectStatementPageNumbers.length !== 1))
  ) {
    throw invalid();
  }
  return Object.freeze({
    liquidationKey: parseTextFact(
      item.liquidationKey,
      pageCount,
      AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxIdentifierCharacters,
    ),
    description: parseTextFact(
      item.description,
      pageCount,
      AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxDescriptionCharacters,
    ),
    effectDate: parseDateFact(item.effectDate, pageCount),
    principalPending: parseMoneyFact(item.principalPending, pageCount),
    enforcementSurcharge: parseMoneyFact(
      item.enforcementSurcharge,
      pageCount,
    ),
    delayInterest:
      item.delayInterest === null
        ? null
        : parseMoneyFact(item.delayInterest, pageCount),
    paymentsOnAccount: parseMoneyFact(item.paymentsOnAccount, pageCount),
    totalBeforeOffset: parseMoneyFact(item.totalBeforeOffset, pageCount),
    compensatedAmount: parseMoneyFact(item.compensatedAmount, pageCount),
    remainingAfterOffset: parseMoneyFact(item.remainingAfterOffset, pageCount),
    effectCode,
    effectMeaning,
    effectStatementPageNumbers,
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function parseTextFact(
  value: unknown,
  pageCount: number,
  maxCharacters: number,
): AeatOffsetTextFactV1 {
  const fact = snapshotRecord(value, TEXT_FACT_KEYS);
  assertCommonFact(fact);
  return Object.freeze({
    printedValue: parsePrintedValue(fact.printedValue, maxCharacters),
    pageNumbers: parsePageNumbers(fact.pageNumbers, pageCount),
    extractionMethod: "RULE",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    valueDisclosure: "EPHEMERAL_UI_ONLY",
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function parseMoneyFact(
  value: unknown,
  pageCount: number,
): AeatOffsetMoneyFactV1 {
  const fact = snapshotRecord(value, MONEY_FACT_KEYS);
  assertCommonFact(fact);
  if (
    fact.currency !== "EUR" ||
    !Number.isSafeInteger(fact.amountCents) ||
    Number(fact.amountCents) < 0 ||
    Number(fact.amountCents) >
      AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxAmountCents
  ) {
    throw invalid();
  }
  const printedValue = parsePrintedValue(fact.printedValue, 32);
  if (parsePrintedMoneyCents(printedValue) !== fact.amountCents) throw invalid();
  return Object.freeze({
    printedValue,
    amountCents: fact.amountCents as number,
    currency: "EUR",
    pageNumbers: parsePageNumbers(fact.pageNumbers, pageCount),
    extractionMethod: "RULE",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    valueDisclosure: "EPHEMERAL_UI_ONLY",
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function parseDateFact(
  value: unknown,
  pageCount: number,
): AeatOffsetPrintedDateFactV1 {
  const fact = snapshotRecord(value, DATE_FACT_KEYS);
  if (
    fact.extractionMethod !== "RULE" ||
    fact.assertionType !== "EXPLICIT_IN_DOCUMENT" ||
    fact.dateMeaning !== "PRINTED_LABEL_ONLY" ||
    fact.legalEffect !== "NOT_DETERMINED" ||
    fact.reviewStatus !== "REVIEW_REQUIRED"
  ) {
    throw invalid();
  }
  const printedValue = parsePrintedValue(fact.printedValue, 10);
  const calendarDate = parsePrintedCalendarDate(printedValue);
  if (!calendarDate || fact.calendarDate !== calendarDate) throw invalid();
  return Object.freeze({
    printedValue,
    calendarDate,
    pageNumbers: parsePageNumbers(fact.pageNumbers, pageCount),
    extractionMethod: "RULE",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    dateMeaning: "PRINTED_LABEL_ONLY",
    legalEffect: "NOT_DETERMINED",
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function parseIssue(
  value: unknown,
  pageCount: number,
): AeatOffsetAgreementFactsIssueV1 {
  const item = snapshotRecord(value, ISSUE_KEYS);
  if (!ISSUE_CODES.has(item.code as AeatOffsetAgreementFactsIssueCodeV1)) {
    throw invalid();
  }
  return Object.freeze({
    code: item.code as AeatOffsetAgreementFactsIssueCodeV1,
    pageNumbers: parsePageNumbers(item.pageNumbers, pageCount, true),
    creditIndex: parseNullableIndex(
      item.creditIndex,
      AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxCredits,
    ),
    debtIndex: parseNullableIndex(
      item.debtIndex,
      AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxDebts,
    ),
  });
}

function validEmptyOutcome(
  outcome: AeatOffsetAgreementFactsResultV1["outcome"],
  issues: readonly AeatOffsetAgreementFactsIssueV1[],
): boolean {
  if (issues.length !== 1) return false;
  if (outcome === "PROCESSING_BLOCKED") {
    return issues[0]?.code === "RESOURCE_LIMIT_EXCEEDED";
  }
  if (outcome === "AMBIGUOUS") {
    return issues[0]?.code === "MULTIPLE_AGREEMENT_MODES";
  }
  return (
    outcome === "INFORMATION_PENDING" &&
    issues[0]?.code === "FAMILY_GATE_NOT_SATISFIED"
  );
}

function validateEffectIssues(
  debts: readonly AeatOffsetDebtFactV1[],
  issues: readonly AeatOffsetAgreementFactsIssueV1[],
): boolean {
  const unmapped = new Set(
    issues
      .filter((item) => item.code === "EFFECT_CODE_WITHOUT_EXPLICIT_STATEMENT")
      .map((item) => item.debtIndex),
  );
  return debts.every((debt, index) =>
    debt.effectMeaning === "PRINTED_CODE_UNMAPPED"
      ? unmapped.has(index)
      : !unmapped.has(index),
  );
}

function assertCommonFact(value: Record<string, unknown>): void {
  if (
    value.extractionMethod !== "RULE" ||
    value.assertionType !== "EXPLICIT_IN_DOCUMENT" ||
    value.valueDisclosure !== "EPHEMERAL_UI_ONLY" ||
    value.reviewStatus !== "REVIEW_REQUIRED"
  ) {
    throw invalid();
  }
}

function parsePageNumbers(
  value: unknown,
  pageCount: number,
  allowEmpty = false,
): readonly number[] {
  const items = snapshotArray(
    value,
    FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages,
  );
  if (!allowEmpty && items.length === 0) throw invalid();
  let previous = 0;
  const result = items.map((item) => {
    if (
      !Number.isSafeInteger(item) ||
      Number(item) <= previous ||
      Number(item) > pageCount
    ) {
      throw invalid();
    }
    previous = Number(item);
    return Number(item);
  });
  return Object.freeze(result);
}

function parseNullableIndex(value: unknown, max: number): number | null {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) >= max) {
    throw invalid();
  }
  return Number(value);
}

function parsePrintedValue(value: unknown, maxCharacters: number): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxCharacters ||
    value !== value.trim() ||
    CONTROL_CHARACTER.test(value)
  ) {
    throw invalid();
  }
  return value;
}

function parsePrintedMoneyCents(value: string): number | null {
  const match = /^(\d{1,3}(?:[.\u00a0 ]\d{3})+|\d+),(\d{2})$/u.exec(value);
  if (!match) return null;
  try {
    const amount =
      BigInt((match[1] ?? "").replace(/[.\u00a0 ]/gu, "")) * BigInt(100) +
      BigInt(match[2] ?? "");
    if (
      amount > BigInt(Number.MAX_SAFE_INTEGER) ||
      amount > BigInt(AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxAmountCents)
    ) {
      return null;
    }
    return Number(amount);
  } catch {
    return null;
  }
}

function parsePrintedCalendarDate(value: string): string | null {
  const printed = PRINTED_DATE.exec(value);
  if (!printed) return null;
  const day = Number(printed[1]);
  const month = Number(printed[3]);
  const year = Number(printed[4]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function snapshotRecord(
  value: unknown,
  keys: ReadonlySet<string>,
): Record<string, unknown> {
  const record = snapshotDataRecord(value);
  for (const key of Reflect.ownKeys(record)) {
    if (typeof key !== "string" || !keys.has(key)) throw invalid();
  }
  if (Object.keys(record).length !== keys.size) throw invalid();
  return record;
}

function snapshotDataRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw invalid();
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw invalid();
  const result: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") throw invalid();
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) throw invalid();
    result[key] = descriptor.value;
  }
  return result;
}

function snapshotArray(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw invalid();
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) throw invalid();
    result.push(value[index]);
  }
  return result;
}

function invalid(): AeatOffsetAgreementFactsContractErrorV1 {
  return new AeatOffsetAgreementFactsContractErrorV1();
}
