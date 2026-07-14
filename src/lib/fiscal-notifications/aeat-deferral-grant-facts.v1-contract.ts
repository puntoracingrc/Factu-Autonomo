import {
  AEAT_DEFERRAL_GRANT_FACTS_ENGINE_ID_V1,
  AEAT_DEFERRAL_GRANT_FACTS_ENGINE_VERSION_V1,
  AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1,
  AEAT_DEFERRAL_GRANT_FACTS_SCHEMA_VERSION_V1,
  type AeatDeferralComponentInstallmentFactV1,
  type AeatDeferralDebtScheduleV1,
  type AeatDeferralGrantFactsIssueCodeV1,
  type AeatDeferralGrantFactsIssueV1,
  type AeatDeferralGrantFactsResultV1,
  type AeatDeferralGrantHeaderFactsV1,
  type AeatDeferralInstallmentFactV1,
  type AeatDeferralMoneyFactV1,
  type AeatDeferralPrintedDateFactV1,
  type AeatDeferralScheduledAmountInstallmentFactV1,
  type AeatDeferralTextFactV1,
} from "./aeat-deferral-grant-facts.v1";
import { FISCAL_NOTIFICATION_INPUT_LIMITS } from "./input-contract";

export class AeatDeferralGrantFactsContractErrorV1 extends Error {
  constructor() {
    super("AEAT_DEFERRAL_GRANT_FACTS_CONTRACT_INVALID");
    this.name = "AeatDeferralGrantFactsContractErrorV1";
  }
}

const ROOT_KEYS = new Set([
  "schemaVersion",
  "engineId",
  "engineVersion",
  "documentType",
  "status",
  "outcome",
  "header",
  "debtSchedules",
  "issues",
  "semanticPolicy",
  "installmentPolicy",
  "dateMeaningPolicy",
  "legalRuleStatus",
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
  "expediente",
  "grantedTotal",
  "paymentAccount",
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
const SCHEDULE_KEYS = new Set([
  "liquidationKey",
  "concept",
  "interestStartDate",
  "listedDebtAmount",
  "installments",
  "reviewStatus",
]);
const COMPONENT_INSTALLMENT_KEYS = new Set([
  "layout",
  "principal",
  "enforcementSurcharge",
  "debtTotal",
  "interest",
  "installmentTotal",
  "dueDate",
  "printedArithmetic",
  "reviewStatus",
]);
const SCHEDULED_INSTALLMENT_KEYS = new Set([
  "layout",
  "installmentTotal",
  "dueDate",
  "printedArithmetic",
  "reviewStatus",
]);
const ISSUE_KEYS = new Set([
  "code",
  "pageNumbers",
  "scheduleIndex",
  "installmentIndex",
]);
const ISSUE_CODES = new Set<AeatDeferralGrantFactsIssueCodeV1>([
  "FAMILY_GATE_NOT_SATISFIED",
  "NO_ANNEX_I_SECTION",
  "NO_INSTALLMENT_ROWS",
  "SCHEDULE_WITHOUT_LIQUIDATION_KEY",
  "INVALID_INSTALLMENT_ROW",
  "INVALID_PRINTED_DATE",
  "INVALID_PRINTED_AMOUNT",
  "INSTALLMENT_PRINTED_TOTAL_MISMATCH",
  "MULTIPLE_DISTINCT_SUBJECT_VALUES",
  "MULTIPLE_DISTINCT_EXPEDIENT_VALUES",
  "MULTIPLE_DISTINCT_PAYMENT_ACCOUNTS",
  "MULTIPLE_DISTINCT_GRANTED_TOTALS",
  "RESOURCE_LIMIT_EXCEEDED",
  "UNSUPPORTED_TEXT_STATE",
]);
const OUTCOMES = new Set([
  "FACTS_AVAILABLE",
  "INFORMATION_PENDING",
  "AMBIGUOUS",
  "PROCESSING_BLOCKED",
]);
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f-\u009f]/u;
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;
const PRINTED_DATE = /^(\d{2})([-/])(\d{2})\2(\d{4})$/u;

/** Validación fail-closed del mensaje que cruza el límite del Worker. */
export function parseAeatDeferralGrantFactsContractV1(
  value: unknown,
  pageCount: number,
): AeatDeferralGrantFactsResultV1 {
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
      root.schemaVersion !== AEAT_DEFERRAL_GRANT_FACTS_SCHEMA_VERSION_V1 ||
      root.engineId !== AEAT_DEFERRAL_GRANT_FACTS_ENGINE_ID_V1 ||
      root.engineVersion !== AEAT_DEFERRAL_GRANT_FACTS_ENGINE_VERSION_V1 ||
      (root.documentType !== null &&
        root.documentType !== "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT") ||
      (root.status !== "REVIEW_REQUIRED" &&
        root.status !== "INFORMATION_PENDING") ||
      !OUTCOMES.has(String(root.outcome)) ||
      root.semanticPolicy !== "EXPLICIT_PRINTED_FACTS_ONLY" ||
      root.installmentPolicy !== "PRINTED_VALUES_NOT_RECALCULATED" ||
      root.dateMeaningPolicy !== "PRINTED_DUE_DATE_NO_LEGAL_EFFECT" ||
      root.legalRuleStatus !== "NOT_APPLIED" ||
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
    const scheduleValues = snapshotArray(
      root.debtSchedules,
      AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1.maxSchedules,
    );
    let installmentCount = 0;
    const debtSchedules = scheduleValues.map((item, scheduleIndex) => {
      const schedule = parseSchedule(item, pageCount);
      installmentCount += schedule.installments.length;
      if (
        installmentCount >
        AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1.maxInstallments
      ) {
        throw invalid();
      }
      if (schedule.installments.length === 0 || scheduleIndex < 0) {
        throw invalid();
      }
      return schedule;
    });
    const issueValues = snapshotArray(
      root.issues,
      AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1.maxInstallments +
        AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1.maxSchedules +
        8,
    );
    const issues = issueValues.map((item) =>
      parseIssue(item, pageCount, debtSchedules),
    );
    const hasHeaderFact = Object.values(header).some((item) => item !== null);
    const hasFacts = hasHeaderFact || debtSchedules.length > 0;
    const outcome = root.outcome as AeatDeferralGrantFactsResultV1["outcome"];

    if (
      (root.documentType === null &&
        (hasFacts ||
          issues.length !== 1 ||
          issues[0]?.code !== "FAMILY_GATE_NOT_SATISFIED" ||
          root.status !== "INFORMATION_PENDING" ||
          outcome !== "INFORMATION_PENDING")) ||
      (root.documentType !== null && root.status === "INFORMATION_PENDING" && hasFacts) ||
      (outcome === "FACTS_AVAILABLE" &&
        (debtSchedules.length === 0 || issues.length > 0)) ||
      (outcome === "AMBIGUOUS" && issues.length === 0) ||
      (outcome === "PROCESSING_BLOCKED" &&
        (hasFacts ||
          issues.length !== 1 ||
          issues[0]?.code !== "RESOURCE_LIMIT_EXCEEDED")) ||
      (outcome === "INFORMATION_PENDING" &&
        root.documentType !== null &&
        !issues.some((item) =>
          ["NO_ANNEX_I_SECTION", "NO_INSTALLMENT_ROWS"].includes(item.code),
        ))
    ) {
      throw invalid();
    }

    return Object.freeze({
      schemaVersion: AEAT_DEFERRAL_GRANT_FACTS_SCHEMA_VERSION_V1,
      engineId: AEAT_DEFERRAL_GRANT_FACTS_ENGINE_ID_V1,
      engineVersion: AEAT_DEFERRAL_GRANT_FACTS_ENGINE_VERSION_V1,
      documentType: root.documentType as
        | "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT"
        | null,
      status: root.status as "REVIEW_REQUIRED" | "INFORMATION_PENDING",
      outcome,
      header,
      debtSchedules: Object.freeze(debtSchedules),
      issues: Object.freeze(issues),
      semanticPolicy: "EXPLICIT_PRINTED_FACTS_ONLY",
      installmentPolicy: "PRINTED_VALUES_NOT_RECALCULATED",
      dateMeaningPolicy: "PRINTED_DUE_DATE_NO_LEGAL_EFFECT",
      legalRuleStatus: "NOT_APPLIED",
      paymentActionPolicy: "NOT_CREATED",
      accountingActionPolicy: "NOT_CREATED",
      persistencePolicy: "DO_NOT_PERSIST",
      networkPolicy: "NO_NETWORK",
      retainedSourceContent: "NONE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
  } catch (error) {
    if (error instanceof AeatDeferralGrantFactsContractErrorV1) throw error;
    throw invalid();
  }
}

function parseHeader(
  value: unknown,
  pageCount: number,
): AeatDeferralGrantHeaderFactsV1 {
  const header = snapshotRecord(value, HEADER_KEYS);
  return Object.freeze({
    subjectName:
      header.subjectName === null
        ? null
        : parseTextFact(header.subjectName, pageCount, 160),
    subjectTaxId:
      header.subjectTaxId === null
        ? null
        : parseTextFact(header.subjectTaxId, pageCount, 24),
    expediente:
      header.expediente === null
        ? null
        : parseTextFact(header.expediente, pageCount, 80),
    grantedTotal:
      header.grantedTotal === null
        ? null
        : parseMoneyFact(header.grantedTotal, pageCount),
    paymentAccount:
      header.paymentAccount === null
        ? null
        : parseTextFact(header.paymentAccount, pageCount, 40),
  });
}

function parseSchedule(
  value: unknown,
  pageCount: number,
): AeatDeferralDebtScheduleV1 {
  const schedule = snapshotRecord(value, SCHEDULE_KEYS);
  if (schedule.reviewStatus !== "REVIEW_REQUIRED") throw invalid();
  const installments = snapshotArray(
    schedule.installments,
    AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1.maxInstallments,
  ).map((item) => parseInstallment(item, pageCount));
  return Object.freeze({
    liquidationKey: parseTextFact(schedule.liquidationKey, pageCount, 80),
    concept:
      schedule.concept === null
        ? null
        : parseTextFact(schedule.concept, pageCount, 240),
    interestStartDate:
      schedule.interestStartDate === null
        ? null
        : parseDateFact(schedule.interestStartDate, pageCount),
    listedDebtAmount:
      schedule.listedDebtAmount === null
        ? null
        : parseMoneyFact(schedule.listedDebtAmount, pageCount),
    installments: Object.freeze(installments),
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function parseInstallment(
  value: unknown,
  pageCount: number,
): AeatDeferralInstallmentFactV1 {
  const layout = readDataProperty(value, "layout");
  if (layout === "COMPONENT_BREAKDOWN") {
    const item = snapshotRecord(value, COMPONENT_INSTALLMENT_KEYS);
    if (item.reviewStatus !== "REVIEW_REQUIRED") throw invalid();
    const principal = parseMoneyFact(item.principal, pageCount);
    const enforcementSurcharge = parseMoneyFact(
      item.enforcementSurcharge,
      pageCount,
    );
    const debtTotal = parseMoneyFact(item.debtTotal, pageCount);
    const interest = parseMoneyFact(item.interest, pageCount);
    const installmentTotal = parseMoneyFact(item.installmentTotal, pageCount);
    const consistent =
      safeAdd(principal.amountCents, enforcementSurcharge.amountCents) ===
        debtTotal.amountCents &&
      safeAdd(debtTotal.amountCents, interest.amountCents) ===
        installmentTotal.amountCents;
    const expectedArithmetic = consistent
      ? "CONSISTENT"
      : "PRINTED_TOTAL_MISMATCH";
    if (item.printedArithmetic !== expectedArithmetic) throw invalid();
    return Object.freeze({
      layout,
      principal,
      enforcementSurcharge,
      debtTotal,
      interest,
      installmentTotal,
      dueDate: parseDateFact(item.dueDate, pageCount),
      printedArithmetic: expectedArithmetic,
      reviewStatus: "REVIEW_REQUIRED",
    } satisfies AeatDeferralComponentInstallmentFactV1);
  }
  if (layout !== "SCHEDULED_AMOUNT_ONLY") throw invalid();
  const item = snapshotRecord(value, SCHEDULED_INSTALLMENT_KEYS);
  if (
    item.printedArithmetic !== "NOT_APPLICABLE_COMPONENTS_NOT_PRINTED" ||
    item.reviewStatus !== "REVIEW_REQUIRED"
  ) {
    throw invalid();
  }
  return Object.freeze({
    layout,
    installmentTotal: parseMoneyFact(item.installmentTotal, pageCount),
    dueDate: parseDateFact(item.dueDate, pageCount),
    printedArithmetic: "NOT_APPLICABLE_COMPONENTS_NOT_PRINTED",
    reviewStatus: "REVIEW_REQUIRED",
  } satisfies AeatDeferralScheduledAmountInstallmentFactV1);
}

function parseTextFact(
  value: unknown,
  pageCount: number,
  maxCharacters: number,
): AeatDeferralTextFactV1 {
  const fact = snapshotRecord(value, TEXT_FACT_KEYS);
  assertCommonFact(fact);
  const printedValue = parsePrintedValue(fact.printedValue, maxCharacters);
  return Object.freeze({
    printedValue,
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
): AeatDeferralMoneyFactV1 {
  const fact = snapshotRecord(value, MONEY_FACT_KEYS);
  assertCommonFact(fact);
  if (
    fact.currency !== "EUR" ||
    !Number.isSafeInteger(fact.amountCents) ||
    Number(fact.amountCents) < 0 ||
    Number(fact.amountCents) >
      AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1.maxAmountCents
  ) {
    throw invalid();
  }
  const printedValue = parsePrintedValue(fact.printedValue, 32);
  const expectedCents = parsePrintedMoneyCents(printedValue);
  if (expectedCents === null || expectedCents !== fact.amountCents) {
    throw invalid();
  }
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
): AeatDeferralPrintedDateFactV1 {
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
  if (!calendarDate || calendarDate !== fact.calendarDate) throw invalid();
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
  schedules: readonly AeatDeferralDebtScheduleV1[],
): AeatDeferralGrantFactsIssueV1 {
  const item = snapshotRecord(value, ISSUE_KEYS);
  if (!ISSUE_CODES.has(item.code as AeatDeferralGrantFactsIssueCodeV1)) {
    throw invalid();
  }
  const scheduleIndex = parseNullableIndex(
    item.scheduleIndex,
    schedules.length,
  );
  const installmentIndex =
    item.installmentIndex === null
      ? null
      : scheduleIndex === null
        ? (() => {
            throw invalid();
          })()
        : parseNullableIndex(
            item.installmentIndex,
            schedules[scheduleIndex]?.installments.length ?? 0,
          );
  return Object.freeze({
    code: item.code as AeatDeferralGrantFactsIssueCodeV1,
    pageNumbers: parsePageNumbers(item.pageNumbers, pageCount, true),
    scheduleIndex,
    installmentIndex,
  });
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

function parseNullableIndex(value: unknown, length: number): number | null {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) >= length) {
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
      amount > BigInt(AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1.maxAmountCents)
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
  const calendarDate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return CALENDAR_DATE.test(calendarDate) ? calendarDate : null;
}

function safeAdd(left: number, right: number): number | null {
  const result = left + right;
  return Number.isSafeInteger(result) ? result : null;
}

function readDataProperty(value: unknown, key: string): unknown {
  const record = snapshotDataRecord(value);
  return record[key];
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

function invalid(): AeatDeferralGrantFactsContractErrorV1 {
  return new AeatDeferralGrantFactsContractErrorV1();
}
