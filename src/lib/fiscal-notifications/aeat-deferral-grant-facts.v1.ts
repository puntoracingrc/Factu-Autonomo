import { extractFiscalNotificationCandidates } from "./extraction-dispatcher";
import {
  assertNotAborted,
  type BoundedDocumentInput,
} from "./input-contract";

export const AEAT_DEFERRAL_GRANT_FACTS_SCHEMA_VERSION_V1 = 1 as const;
export const AEAT_DEFERRAL_GRANT_FACTS_ENGINE_ID_V1 =
  "aeat-deferral-grant-explicit-facts" as const;
export const AEAT_DEFERRAL_GRANT_FACTS_ENGINE_VERSION_V1 = "1.0.0" as const;

export const AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1 = Object.freeze({
  maxLinesPerPage: 5_000,
  maxLineCharacters: 2_000,
  maxIdentifierCharacters: 80,
  maxSubjectNameCharacters: 160,
  maxConceptCharacters: 240,
  maxSchedules: 64,
  maxInstallments: 256,
  maxAmountCents: 100_000_000_000,
} as const);

export type AeatDeferralGrantFactsOutcomeV1 =
  | "FACTS_AVAILABLE"
  | "INFORMATION_PENDING"
  | "AMBIGUOUS"
  | "PROCESSING_BLOCKED";

export type AeatDeferralGrantFactsIssueCodeV1 =
  | "FAMILY_GATE_NOT_SATISFIED"
  | "NO_ANNEX_I_SECTION"
  | "NO_INSTALLMENT_ROWS"
  | "SCHEDULE_WITHOUT_LIQUIDATION_KEY"
  | "INVALID_INSTALLMENT_ROW"
  | "INVALID_PRINTED_DATE"
  | "INVALID_PRINTED_AMOUNT"
  | "INSTALLMENT_PRINTED_TOTAL_MISMATCH"
  | "MULTIPLE_DISTINCT_SUBJECT_VALUES"
  | "MULTIPLE_DISTINCT_EXPEDIENT_VALUES"
  | "MULTIPLE_DISTINCT_PAYMENT_ACCOUNTS"
  | "MULTIPLE_DISTINCT_GRANTED_TOTALS"
  | "RESOURCE_LIMIT_EXCEEDED"
  | "UNSUPPORTED_TEXT_STATE";

export interface AeatDeferralGrantFactsIssueV1 {
  readonly code: AeatDeferralGrantFactsIssueCodeV1;
  readonly pageNumbers: readonly number[];
  readonly scheduleIndex: number | null;
  readonly installmentIndex: number | null;
}

export interface AeatDeferralTextFactV1 {
  readonly printedValue: string;
  readonly pageNumbers: readonly number[];
  readonly extractionMethod: "RULE";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly valueDisclosure: "EPHEMERAL_UI_ONLY";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface AeatDeferralMoneyFactV1 {
  readonly printedValue: string;
  readonly amountCents: number;
  readonly currency: "EUR";
  readonly pageNumbers: readonly number[];
  readonly extractionMethod: "RULE";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly valueDisclosure: "EPHEMERAL_UI_ONLY";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface AeatDeferralPrintedDateFactV1 {
  readonly printedValue: string;
  readonly calendarDate: string;
  readonly pageNumbers: readonly number[];
  readonly extractionMethod: "RULE";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly dateMeaning: "PRINTED_LABEL_ONLY";
  readonly legalEffect: "NOT_DETERMINED";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface AeatDeferralGrantHeaderFactsV1 {
  readonly subjectName: AeatDeferralTextFactV1 | null;
  readonly subjectTaxId: AeatDeferralTextFactV1 | null;
  readonly expediente: AeatDeferralTextFactV1 | null;
  readonly grantedTotal: AeatDeferralMoneyFactV1 | null;
  readonly paymentAccount: AeatDeferralTextFactV1 | null;
}

export interface AeatDeferralComponentInstallmentFactV1 {
  readonly layout: "COMPONENT_BREAKDOWN";
  readonly principal: AeatDeferralMoneyFactV1;
  readonly enforcementSurcharge: AeatDeferralMoneyFactV1;
  readonly debtTotal: AeatDeferralMoneyFactV1;
  readonly interest: AeatDeferralMoneyFactV1;
  readonly installmentTotal: AeatDeferralMoneyFactV1;
  readonly dueDate: AeatDeferralPrintedDateFactV1;
  readonly printedArithmetic:
    | "CONSISTENT"
    | "PRINTED_TOTAL_MISMATCH";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface AeatDeferralScheduledAmountInstallmentFactV1 {
  readonly layout: "SCHEDULED_AMOUNT_ONLY";
  readonly installmentTotal: AeatDeferralMoneyFactV1;
  readonly dueDate: AeatDeferralPrintedDateFactV1;
  readonly printedArithmetic: "NOT_APPLICABLE_COMPONENTS_NOT_PRINTED";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export type AeatDeferralInstallmentFactV1 =
  | AeatDeferralComponentInstallmentFactV1
  | AeatDeferralScheduledAmountInstallmentFactV1;

export interface AeatDeferralDebtScheduleV1 {
  readonly liquidationKey: AeatDeferralTextFactV1;
  readonly concept: AeatDeferralTextFactV1 | null;
  readonly interestStartDate: AeatDeferralPrintedDateFactV1 | null;
  readonly listedDebtAmount: AeatDeferralMoneyFactV1 | null;
  readonly installments: readonly AeatDeferralInstallmentFactV1[];
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface AeatDeferralGrantFactsResultV1 {
  readonly schemaVersion: 1;
  readonly engineId: "aeat-deferral-grant-explicit-facts";
  readonly engineVersion: "1.0.0";
  readonly documentType: "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT" | null;
  readonly status: "REVIEW_REQUIRED" | "INFORMATION_PENDING";
  readonly outcome: AeatDeferralGrantFactsOutcomeV1;
  readonly header: AeatDeferralGrantHeaderFactsV1;
  readonly debtSchedules: readonly AeatDeferralDebtScheduleV1[];
  readonly issues: readonly AeatDeferralGrantFactsIssueV1[];
  readonly semanticPolicy: "EXPLICIT_PRINTED_FACTS_ONLY";
  readonly installmentPolicy: "PRINTED_VALUES_NOT_RECALCULATED";
  readonly dateMeaningPolicy: "PRINTED_DUE_DATE_NO_LEGAL_EFFECT";
  readonly legalRuleStatus: "NOT_APPLIED";
  readonly paymentActionPolicy: "NOT_CREATED";
  readonly accountingActionPolicy: "NOT_CREATED";
  readonly persistencePolicy: "DO_NOT_PERSIST";
  readonly networkPolicy: "NO_NETWORK";
  readonly retainedSourceContent: "NONE";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
}

interface ScalarObservation {
  readonly printedValue: string;
  readonly canonicalValue: string;
  readonly pageNumber: number;
}

interface MoneyObservation {
  readonly printedValue: string;
  readonly amountCents: number;
  readonly pageNumber: number;
}

interface MutableSchedule {
  readonly liquidationKey: ScalarObservation;
  concept: ScalarObservation | null;
  interestStartDate: DateObservation | null;
  listedDebtAmount: MoneyObservation | null;
  readonly installments: AeatDeferralInstallmentFactV1[];
}

interface DateObservation {
  readonly printedValue: string;
  readonly calendarDate: string;
  readonly pageNumber: number;
}

interface ParsedMoney {
  readonly printedValue: string;
  readonly amountCents: number;
}

const MONEY_SOURCE = String.raw`(?:\d{1,3}(?:[.\u00a0 ]\d{3})+|\d+),\d{2}`;
const INSTALLMENT_ROW = new RegExp(
  String.raw`^\s*(${MONEY_SOURCE})\s+(${MONEY_SOURCE})\s+(${MONEY_SOURCE})\s+(${MONEY_SOURCE})\s+(${MONEY_SOURCE})\s+(\d{2}[-/]\d{2}[-/]\d{4})\s*$`,
  "u",
);
const SCHEDULE_FIRST_ROW = new RegExp(
  String.raw`^\s*([A-Z0-9][A-Z0-9./_-]{2,79})\s+(.{1,240}?)\s+(\d{2}[-/]\d{2}[-/]\d{4})\s+(${MONEY_SOURCE})\s+(${MONEY_SOURCE})\s+(\d{2}[-/]\d{2}[-/]\d{4})\s*$`,
  "iu",
);
const SCHEDULE_CONTINUATION_ROW = new RegExp(
  String.raw`^\s*(${MONEY_SOURCE})\s+(\d{2}[-/]\d{2}[-/]\d{4})\s*$`,
  "u",
);
const MONEY_TOKEN = new RegExp(
  String.raw`^(\d{1,3}(?:[.\u00a0 ]\d{3})+|\d+),(\d{2})$`,
  "u",
);
const TAX_ID = /^[A-Z0-9][A-Z0-9 -]{7,15}$/u;
const IDENTIFIER = /^[A-Z0-9][A-Z0-9./_-]*$/u;
const SPANISH_IBAN = /\bES\d{2}(?:[ \u00a0-]?\d{4}){5}\b/giu;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f-\u009f]/u;

/**
 * Lee hechos expresamente impresos en una concesión AEAT. No interpreta sus
 * efectos, no calcula plazos y no crea pagos, deudas ni asientos.
 */
export function extractAeatDeferralGrantFactsV1(
  value: unknown,
): AeatDeferralGrantFactsResultV1 {
  const gate = extractFiscalNotificationCandidates(value);
  const input = value as BoundedDocumentInput;
  assertNotAborted(input.signal);
  if (
    gate.reason !== "SUPPORTED_FAMILY_CANDIDATE" ||
    gate.candidates.length !== 1 ||
    gate.candidates[0]?.familyId !== "AEAT_DEFERRAL_GRANT_CANDIDATE" ||
    gate.candidates[0].signalStatus !== "COMPLETE_REQUIRED_ANCHORS"
  ) {
    return freezeResult({
      documentType: null,
      status: "INFORMATION_PENDING",
      outcome: "INFORMATION_PENDING",
      header: emptyHeader(),
      debtSchedules: [],
      issues: [issue("FAMILY_GATE_NOT_SATISFIED", [], null, null)],
    });
  }

  const subjectNames: ScalarObservation[] = [];
  const subjectTaxIds: ScalarObservation[] = [];
  const expedientes: ScalarObservation[] = [];
  const paymentAccounts: ScalarObservation[] = [];
  const grantedTotals: MoneyObservation[] = [];
  const schedules: MutableSchedule[] = [];
  const issues: AeatDeferralGrantFactsIssueV1[] = [];
  let currentSchedule: MutableSchedule | null = null;
  let insideAnnexI = false;
  let annexIFound = false;
  let installmentCount = 0;

  for (const page of input.pages) {
    assertNotAborted(input.signal);
    const lines = page.text.split(/\r\n|[\n\r\u2028\u2029]/u);
    if (lines.length > AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1.maxLinesPerPage) {
      return blockedResult(
        issue("RESOURCE_LIMIT_EXCEEDED", [page.pageNumber], null, null),
      );
    }

    collectHeaderObservations(
      page.text,
      lines,
      page.pageNumber,
      subjectNames,
      subjectTaxIds,
      expedientes,
      paymentAccounts,
      grantedTotals,
    );

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      assertNotAborted(input.signal);
      const rawLine = lines[lineIndex] ?? "";
      if (
        rawLine.length >
        AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1.maxLineCharacters
      ) {
        return blockedResult(
          issue("RESOURCE_LIMIT_EXCEEDED", [page.pageNumber], null, null),
        );
      }
      const normalized = normalizeClosedText(rawLine);
      if (normalized.startsWith("anexo i ") || normalized === "anexo i") {
        insideAnnexI = true;
        annexIFound = true;
        continue;
      }
      if (normalized.startsWith("anexo ii ") || normalized === "anexo ii") {
        insideAnnexI = false;
        currentSchedule = null;
        continue;
      }
      if (!insideAnnexI) continue;

      const liquidationValue = valueAfterClosedLabel(
        rawLine,
        /^(?:(?:clave|n[uú]mero)\s+)?liquidaci[oó]n\s*:/iu,
      );
      if (liquidationValue !== null) {
        const observation = parseIdentifierObservation(
          liquidationValue,
          page.pageNumber,
        );
        if (!observation) {
          issues.push(
            issue(
              "SCHEDULE_WITHOUT_LIQUIDATION_KEY",
              [page.pageNumber],
              schedules.length,
              null,
            ),
          );
          currentSchedule = null;
          continue;
        }
        if (
          schedules.length >=
          AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1.maxSchedules
        ) {
          return blockedResult(
            issue("RESOURCE_LIMIT_EXCEEDED", [page.pageNumber], null, null),
          );
        }
        currentSchedule = {
          liquidationKey: observation,
          concept: null,
          interestStartDate: null,
          listedDebtAmount: null,
          installments: [],
        };
        schedules.push(currentSchedule);
        continue;
      }

      const conceptValue = valueAfterClosedLabel(rawLine, /^concepto\s*:/iu);
      if (conceptValue !== null) {
        if (!currentSchedule) {
          issues.push(
            issue(
              "SCHEDULE_WITHOUT_LIQUIDATION_KEY",
              [page.pageNumber],
              schedules.length,
              null,
            ),
          );
          continue;
        }
        const concept = parseTextObservation(
          conceptValue,
          page.pageNumber,
          AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1.maxConceptCharacters,
        );
        if (!concept) {
          issues.push(
            issue(
              "UNSUPPORTED_TEXT_STATE",
              [page.pageNumber],
              schedules.indexOf(currentSchedule),
              null,
            ),
          );
          continue;
        }
        currentSchedule.concept = concept;
        continue;
      }

      const interestDateValue = valueAfterClosedLabel(
        rawLine,
        /^fecha\s+de\s+inter[eé]s(?:es)?\s*:/iu,
      );
      if (interestDateValue !== null) {
        if (!currentSchedule) {
          issues.push(
            issue(
              "SCHEDULE_WITHOUT_LIQUIDATION_KEY",
              [page.pageNumber],
              schedules.length,
              null,
            ),
          );
          continue;
        }
        const date = parsePrintedDate(interestDateValue, page.pageNumber);
        if (!date) {
          issues.push(
            issue(
              "INVALID_PRINTED_DATE",
              [page.pageNumber],
              schedules.indexOf(currentSchedule),
              null,
            ),
          );
          continue;
        }
        currentSchedule.interestStartDate = date;
        continue;
      }

      const rowMatch = INSTALLMENT_ROW.exec(rawLine);
      const scheduleFirstRowMatch = SCHEDULE_FIRST_ROW.exec(rawLine);
      const scheduleContinuationMatch = SCHEDULE_CONTINUATION_ROW.exec(rawLine);
      if (!rowMatch && scheduleFirstRowMatch) {
        if (
          schedules.length >=
            AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1.maxSchedules ||
          installmentCount >=
            AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1.maxInstallments
        ) {
          return blockedResult(
            issue("RESOURCE_LIMIT_EXCEEDED", [page.pageNumber], null, null),
          );
        }
        const parsed = parseScheduleFirstRow(
          scheduleFirstRowMatch,
          page.pageNumber,
        );
        if (!parsed) {
          issues.push(
            issue(
              "INVALID_INSTALLMENT_ROW",
              [page.pageNumber],
              schedules.length,
              0,
            ),
          );
          currentSchedule = null;
          continue;
        }
        currentSchedule = parsed.schedule;
        schedules.push(currentSchedule);
        installmentCount += 1;
        continue;
      }
      if (
        !rowMatch &&
        scheduleContinuationMatch &&
        currentSchedule?.listedDebtAmount
      ) {
        if (
          installmentCount >=
          AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1.maxInstallments
        ) {
          return blockedResult(
            issue("RESOURCE_LIMIT_EXCEEDED", [page.pageNumber], null, null),
          );
        }
        const installment = parseScheduledAmountInstallment(
          scheduleContinuationMatch,
          page.pageNumber,
        );
        if (!installment) {
          issues.push(
            issue(
              "INVALID_INSTALLMENT_ROW",
              [page.pageNumber],
              schedules.indexOf(currentSchedule),
              currentSchedule.installments.length,
            ),
          );
          continue;
        }
        currentSchedule.installments.push(installment);
        installmentCount += 1;
        continue;
      }
      if (!rowMatch) {
        if (looksLikeInstallmentRow(rawLine)) {
          issues.push(
            issue(
              "INVALID_INSTALLMENT_ROW",
              [page.pageNumber],
              currentSchedule ? schedules.indexOf(currentSchedule) : null,
              currentSchedule?.installments.length ?? null,
            ),
          );
        }
        continue;
      }
      if (!currentSchedule) {
        issues.push(
          issue(
            "SCHEDULE_WITHOUT_LIQUIDATION_KEY",
            [page.pageNumber],
            null,
            null,
          ),
        );
        continue;
      }
      if (
        installmentCount >=
        AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1.maxInstallments
      ) {
        return blockedResult(
          issue("RESOURCE_LIMIT_EXCEEDED", [page.pageNumber], null, null),
        );
      }
      if (!parsePrintedDate(rowMatch[6] ?? "", page.pageNumber)) {
        issues.push(
          issue(
            "INVALID_PRINTED_DATE",
            [page.pageNumber],
            schedules.indexOf(currentSchedule),
            currentSchedule.installments.length,
          ),
        );
        continue;
      }
      const parsedRow = parseInstallmentRow(rowMatch, page.pageNumber);
      if (!parsedRow) {
        issues.push(
          issue(
            "INVALID_PRINTED_AMOUNT",
            [page.pageNumber],
            schedules.indexOf(currentSchedule),
            currentSchedule.installments.length,
          ),
        );
        continue;
      }
      currentSchedule.installments.push(parsedRow);
      installmentCount += 1;
      if (parsedRow.printedArithmetic === "PRINTED_TOTAL_MISMATCH") {
        issues.push(
          issue(
            "INSTALLMENT_PRINTED_TOTAL_MISMATCH",
            [page.pageNumber],
            schedules.indexOf(currentSchedule),
            currentSchedule.installments.length - 1,
          ),
        );
      }
    }
  }
  assertNotAborted(input.signal);

  if (!annexIFound) {
    issues.push(issue("NO_ANNEX_I_SECTION", [], null, null));
  }
  if (installmentCount === 0) {
    issues.push(issue("NO_INSTALLMENT_ROWS", [], null, null));
  }

  const subjectName = uniqueTextFact(
    subjectNames,
    "MULTIPLE_DISTINCT_SUBJECT_VALUES",
    issues,
  );
  const subjectTaxId = uniqueTextFact(
    subjectTaxIds,
    "MULTIPLE_DISTINCT_SUBJECT_VALUES",
    issues,
  );
  const expediente = uniqueTextFact(
    expedientes,
    "MULTIPLE_DISTINCT_EXPEDIENT_VALUES",
    issues,
  );
  const paymentAccount = uniqueTextFact(
    paymentAccounts,
    "MULTIPLE_DISTINCT_PAYMENT_ACCOUNTS",
    issues,
  );
  const grantedTotal = uniqueMoneyFact(
    grantedTotals,
    "MULTIPLE_DISTINCT_GRANTED_TOTALS",
    issues,
  );
  const returnedScheduleIndexes = schedules.flatMap((schedule, index) =>
    schedule.installments.length > 0 ? [index] : [],
  );
  const scheduleIndexMap = new Map(
    returnedScheduleIndexes.map((sourceIndex, resultIndex) => [
      sourceIndex,
      resultIndex,
    ]),
  );
  const frozenSchedules = returnedScheduleIndexes.map((index) =>
    freezeSchedule(schedules[index]!),
  );
  const returnedIssues = issues.map((item) => {
    if (item.scheduleIndex === null) return item;
    const mappedScheduleIndex = scheduleIndexMap.get(item.scheduleIndex);
    return mappedScheduleIndex === undefined
      ? issue(item.code, item.pageNumbers, null, null)
      : issue(
          item.code,
          item.pageNumbers,
          mappedScheduleIndex,
          item.installmentIndex,
        );
  });
  const hasFacts =
    Boolean(
      subjectName ||
        subjectTaxId ||
        expediente ||
        paymentAccount ||
        grantedTotal,
    ) || frozenSchedules.length > 0;
  const ambiguous = returnedIssues.some((item) =>
    [
      "MULTIPLE_DISTINCT_SUBJECT_VALUES",
      "MULTIPLE_DISTINCT_EXPEDIENT_VALUES",
      "MULTIPLE_DISTINCT_PAYMENT_ACCOUNTS",
      "MULTIPLE_DISTINCT_GRANTED_TOTALS",
      "INSTALLMENT_PRINTED_TOTAL_MISMATCH",
      "INVALID_INSTALLMENT_ROW",
      "INVALID_PRINTED_AMOUNT",
      "INVALID_PRINTED_DATE",
      "SCHEDULE_WITHOUT_LIQUIDATION_KEY",
      "UNSUPPORTED_TEXT_STATE",
    ].includes(item.code),
  );

  return freezeResult({
    documentType: "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT",
    status: hasFacts ? "REVIEW_REQUIRED" : "INFORMATION_PENDING",
    outcome: ambiguous
      ? "AMBIGUOUS"
      : hasFacts && frozenSchedules.length > 0
        ? "FACTS_AVAILABLE"
        : "INFORMATION_PENDING",
    header: {
      subjectName,
      subjectTaxId,
      expediente,
      grantedTotal,
      paymentAccount,
    },
    debtSchedules: frozenSchedules,
    issues: returnedIssues,
  });
}

function collectHeaderObservations(
  pageText: string,
  lines: readonly string[],
  pageNumber: number,
  subjectNames: ScalarObservation[],
  subjectTaxIds: ScalarObservation[],
  expedientes: ScalarObservation[],
  paymentAccounts: ScalarObservation[],
  grantedTotals: MoneyObservation[],
): void {
  for (const rawLine of lines) {
    const taxIdMatch = /^\s*N\.?\s*I\.?\s*F\.?\s*:\s*([^\s]+)/iu.exec(rawLine);
    if (taxIdMatch?.[1]) {
      const printed = taxIdMatch[1].toUpperCase();
      if (TAX_ID.test(printed)) {
        subjectTaxIds.push({
          printedValue: printed,
          canonicalValue: printed.replace(/[ -]/gu, ""),
          pageNumber,
        });
      }
    }
    const nameValue = valueAfterClosedLabel(rawLine, /^nombre\s*:/iu);
    if (nameValue !== null) {
      const subject = parseTextObservation(
        nameValue,
        pageNumber,
        AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1.maxSubjectNameCharacters,
      );
      if (subject) subjectNames.push(subject);
    }
    const expedienteMatch = /(?:n[uú]mero\s+de\s+)?expediente\s*:\s*([A-Z0-9./_-]+)/iu.exec(
      rawLine,
    );
    if (expedienteMatch?.[1]) {
      const expediente = parseIdentifierObservation(
        expedienteMatch[1],
        pageNumber,
      );
      if (expediente) expedientes.push(expediente);
    }
  }

  if (
    normalizeClosedText(pageText).includes("plazo y formas de pago") &&
    normalizeClosedText(pageText).includes("cuenta")
  ) {
    for (const match of pageText.matchAll(SPANISH_IBAN)) {
      const printed = match[0];
      const canonical = printed.replace(/[ \u00a0-]/gu, "").toUpperCase();
      if (canonical.length !== 24) continue;
      paymentAccounts.push({
        printedValue: printed,
        canonicalValue: canonical,
        pageNumber,
      });
    }
  }

  const normalizedPage = normalizeWhitespace(pageText);
  if (normalizeClosedText(pageText).includes("acuerdo")) {
    const grantedMatch = new RegExp(
      String.raw`(?:por\s+)?(?:el\s+)?importe\s+de\s+(${MONEY_SOURCE})\s+euros`,
      "iu",
    ).exec(normalizedPage);
    if (grantedMatch?.[1]) {
      const money = parseSpanishMoney(grantedMatch[1]);
      if (money) grantedTotals.push({ ...money, pageNumber });
    }
  }
}

function parseInstallmentRow(
  match: RegExpExecArray,
  pageNumber: number,
): AeatDeferralComponentInstallmentFactV1 | null {
  const money = [1, 2, 3, 4, 5].map((index) =>
    parseSpanishMoney(match[index] ?? ""),
  );
  const dueDate = parsePrintedDate(match[6] ?? "", pageNumber);
  if (money.some((item) => item === null) || !dueDate) return null;
  const [principal, surcharge, debtTotal, interest, installmentTotal] = money as [
    ParsedMoney,
    ParsedMoney,
    ParsedMoney,
    ParsedMoney,
    ParsedMoney,
  ];
  const arithmeticConsistent =
    safeAdd(principal.amountCents, surcharge.amountCents) ===
      debtTotal.amountCents &&
    safeAdd(debtTotal.amountCents, interest.amountCents) ===
      installmentTotal.amountCents;
  return Object.freeze({
    layout: "COMPONENT_BREAKDOWN",
    principal: moneyFact(principal, pageNumber),
    enforcementSurcharge: moneyFact(surcharge, pageNumber),
    debtTotal: moneyFact(debtTotal, pageNumber),
    interest: moneyFact(interest, pageNumber),
    installmentTotal: moneyFact(installmentTotal, pageNumber),
    dueDate: dateFact(dueDate),
    printedArithmetic: arithmeticConsistent
      ? "CONSISTENT"
      : "PRINTED_TOTAL_MISMATCH",
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function parseScheduleFirstRow(
  match: RegExpExecArray,
  pageNumber: number,
): { readonly schedule: MutableSchedule } | null {
  const liquidationKey = parseIdentifierObservation(match[1] ?? "", pageNumber);
  const concept = parseTextObservation(
    match[2] ?? "",
    pageNumber,
    AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1.maxConceptCharacters,
  );
  const interestStartDate = parsePrintedDate(match[3] ?? "", pageNumber);
  const listedDebtAmount = parseSpanishMoney(match[4] ?? "");
  const firstInstallment = parseScheduledAmountInstallmentValues(
    match[5] ?? "",
    match[6] ?? "",
    pageNumber,
  );
  if (
    !liquidationKey ||
    !concept ||
    !interestStartDate ||
    !listedDebtAmount ||
    !firstInstallment
  ) {
    return null;
  }
  return Object.freeze({
    schedule: {
      liquidationKey,
      concept,
      interestStartDate,
      listedDebtAmount: Object.freeze({
        ...listedDebtAmount,
        pageNumber,
      }),
      installments: [firstInstallment],
    },
  });
}

function parseScheduledAmountInstallment(
  match: RegExpExecArray,
  pageNumber: number,
): AeatDeferralScheduledAmountInstallmentFactV1 | null {
  return parseScheduledAmountInstallmentValues(
    match[1] ?? "",
    match[2] ?? "",
    pageNumber,
  );
}

function parseScheduledAmountInstallmentValues(
  printedAmount: string,
  printedDueDate: string,
  pageNumber: number,
): AeatDeferralScheduledAmountInstallmentFactV1 | null {
  const amount = parseSpanishMoney(printedAmount);
  const dueDate = parsePrintedDate(printedDueDate, pageNumber);
  if (!amount || !dueDate) return null;
  return Object.freeze({
    layout: "SCHEDULED_AMOUNT_ONLY",
    installmentTotal: moneyFact(amount, pageNumber),
    dueDate: dateFact(dueDate),
    printedArithmetic: "NOT_APPLICABLE_COMPONENTS_NOT_PRINTED",
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function parseSpanishMoney(value: string): ParsedMoney | null {
  if (value.length > 32) return null;
  const match = MONEY_TOKEN.exec(value.trim());
  if (!match) return null;
  try {
    const euros = BigInt((match[1] ?? "").replace(/[.\u00a0 ]/gu, ""));
    const cents = BigInt(match[2] ?? "");
    const amount = euros * BigInt(100) + cents;
    if (
      amount > BigInt(AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1.maxAmountCents) ||
      amount > BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      return null;
    }
    const amountCents = Number(amount);
    if (!Number.isSafeInteger(amountCents) || amountCents < 0) return null;
    return Object.freeze({ printedValue: value.trim(), amountCents });
  } catch {
    return null;
  }
}

function parsePrintedDate(
  value: string,
  pageNumber: number,
): DateObservation | null {
  const match = /^(\d{2})([-/])(\d{2})\2(\d{4})$/u.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[3]);
  const year = Number(match[4]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return Object.freeze({
    printedValue: value.trim(),
    calendarDate: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    pageNumber,
  });
}

function parseIdentifierObservation(
  value: string,
  pageNumber: number,
): ScalarObservation | null {
  const printed = value.trim();
  if (
    printed.length === 0 ||
    printed.length >
      AEAT_DEFERRAL_GRANT_FACTS_LIMITS_V1.maxIdentifierCharacters ||
    CONTROL_CHARACTER.test(printed) ||
    !IDENTIFIER.test(printed.toUpperCase())
  ) {
    return null;
  }
  return Object.freeze({
    printedValue: printed,
    canonicalValue: printed.toUpperCase(),
    pageNumber,
  });
}

function parseTextObservation(
  value: string,
  pageNumber: number,
  maxCharacters: number,
): ScalarObservation | null {
  const printed = value.trim();
  if (
    printed.length === 0 ||
    printed.length > maxCharacters ||
    CONTROL_CHARACTER.test(printed)
  ) {
    return null;
  }
  return Object.freeze({
    printedValue: printed,
    canonicalValue: normalizeClosedText(printed),
    pageNumber,
  });
}

function uniqueTextFact(
  observations: readonly ScalarObservation[],
  conflictCode: Extract<
    AeatDeferralGrantFactsIssueCodeV1,
    | "MULTIPLE_DISTINCT_SUBJECT_VALUES"
    | "MULTIPLE_DISTINCT_EXPEDIENT_VALUES"
    | "MULTIPLE_DISTINCT_PAYMENT_ACCOUNTS"
  >,
  issues: AeatDeferralGrantFactsIssueV1[],
): AeatDeferralTextFactV1 | null {
  if (observations.length === 0) return null;
  const values = new Map<string, ScalarObservation[]>();
  for (const observation of observations) {
    const items = values.get(observation.canonicalValue) ?? [];
    items.push(observation);
    values.set(observation.canonicalValue, items);
  }
  if (values.size !== 1) {
    issues.push(
      issue(
        conflictCode,
        observations.map((item) => item.pageNumber),
        null,
        null,
      ),
    );
    return null;
  }
  const same = [...values.values()][0] ?? [];
  const first = same[0];
  if (!first) return null;
  return textFact(first.printedValue, same.map((item) => item.pageNumber));
}

function uniqueMoneyFact(
  observations: readonly MoneyObservation[],
  conflictCode: "MULTIPLE_DISTINCT_GRANTED_TOTALS",
  issues: AeatDeferralGrantFactsIssueV1[],
): AeatDeferralMoneyFactV1 | null {
  if (observations.length === 0) return null;
  const values = new Map<number, MoneyObservation[]>();
  for (const observation of observations) {
    const items = values.get(observation.amountCents) ?? [];
    items.push(observation);
    values.set(observation.amountCents, items);
  }
  if (values.size !== 1) {
    issues.push(
      issue(
        conflictCode,
        observations.map((item) => item.pageNumber),
        null,
        null,
      ),
    );
    return null;
  }
  const same = [...values.values()][0] ?? [];
  const first = same[0];
  if (!first) return null;
  return moneyFact(first, first.pageNumber, same.map((item) => item.pageNumber));
}

function freezeSchedule(schedule: MutableSchedule): AeatDeferralDebtScheduleV1 {
  return Object.freeze({
    liquidationKey: textFact(
      schedule.liquidationKey.printedValue,
      [schedule.liquidationKey.pageNumber],
    ),
    concept: schedule.concept
      ? textFact(schedule.concept.printedValue, [schedule.concept.pageNumber])
      : null,
    interestStartDate: schedule.interestStartDate
      ? dateFact(schedule.interestStartDate)
      : null,
    listedDebtAmount: schedule.listedDebtAmount
      ? moneyFact(schedule.listedDebtAmount, schedule.listedDebtAmount.pageNumber)
      : null,
    installments: Object.freeze([...schedule.installments]),
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function textFact(
  printedValue: string,
  pageNumbers: readonly number[],
): AeatDeferralTextFactV1 {
  return Object.freeze({
    printedValue,
    pageNumbers: Object.freeze(uniqueSortedPageNumbers(pageNumbers)),
    extractionMethod: "RULE",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    valueDisclosure: "EPHEMERAL_UI_ONLY",
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function moneyFact(
  money: ParsedMoney | MoneyObservation,
  pageNumber: number,
  pageNumbers: readonly number[] = [pageNumber],
): AeatDeferralMoneyFactV1 {
  return Object.freeze({
    printedValue: money.printedValue,
    amountCents: money.amountCents,
    currency: "EUR",
    pageNumbers: Object.freeze(uniqueSortedPageNumbers(pageNumbers)),
    extractionMethod: "RULE",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    valueDisclosure: "EPHEMERAL_UI_ONLY",
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function dateFact(date: DateObservation): AeatDeferralPrintedDateFactV1 {
  return Object.freeze({
    printedValue: date.printedValue,
    calendarDate: date.calendarDate,
    pageNumbers: Object.freeze([date.pageNumber]),
    extractionMethod: "RULE",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    dateMeaning: "PRINTED_LABEL_ONLY",
    legalEffect: "NOT_DETERMINED",
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function valueAfterClosedLabel(
  rawLine: string,
  pattern: RegExp,
): string | null {
  const line = rawLine.trimStart();
  const match = pattern.exec(line);
  if (!match || match.index !== 0) return null;
  return line.slice(match[0].length).trim();
}

function looksLikeInstallmentRow(value: string): boolean {
  const moneyMatches = value.match(new RegExp(MONEY_SOURCE, "gu")) ?? [];
  const dateMatches = value.match(/\d{2}[-/]\d{2}[-/]\d{4}/gu) ?? [];
  return moneyMatches.length >= 3 && dateMatches.length > 0;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function normalizeClosedText(value: string): string {
  let normalized = "";
  let pendingSeparator = false;
  for (const codePoint of value) {
    for (const unit of codePoint.normalize("NFKD")) {
      if (/\p{Mark}/u.test(unit)) continue;
      for (const loweredUnit of unit.toLocaleLowerCase("es")) {
        if (/[\p{Letter}\p{Number}]/u.test(loweredUnit)) {
          if (pendingSeparator && normalized.length > 0) normalized += " ";
          normalized += loweredUnit;
          pendingSeparator = false;
        } else if (normalized.length > 0) {
          pendingSeparator = true;
        }
      }
    }
  }
  return normalized;
}

function safeAdd(left: number, right: number): number | null {
  const total = left + right;
  return Number.isSafeInteger(total) ? total : null;
}

function uniqueSortedPageNumbers(values: readonly number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

function issue(
  code: AeatDeferralGrantFactsIssueCodeV1,
  pageNumbers: readonly number[],
  scheduleIndex: number | null,
  installmentIndex: number | null,
): AeatDeferralGrantFactsIssueV1 {
  return Object.freeze({
    code,
    pageNumbers: Object.freeze(uniqueSortedPageNumbers(pageNumbers)),
    scheduleIndex,
    installmentIndex,
  });
}

function emptyHeader(): AeatDeferralGrantHeaderFactsV1 {
  return Object.freeze({
    subjectName: null,
    subjectTaxId: null,
    expediente: null,
    grantedTotal: null,
    paymentAccount: null,
  });
}

function blockedResult(
  blockingIssue: AeatDeferralGrantFactsIssueV1,
): AeatDeferralGrantFactsResultV1 {
  return freezeResult({
    documentType: "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT",
    status: "REVIEW_REQUIRED",
    outcome: "PROCESSING_BLOCKED",
    header: emptyHeader(),
    debtSchedules: [],
    issues: [blockingIssue],
  });
}

function freezeResult(input: {
  readonly documentType: "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT" | null;
  readonly status: "REVIEW_REQUIRED" | "INFORMATION_PENDING";
  readonly outcome: AeatDeferralGrantFactsOutcomeV1;
  readonly header: AeatDeferralGrantHeaderFactsV1;
  readonly debtSchedules: readonly AeatDeferralDebtScheduleV1[];
  readonly issues: readonly AeatDeferralGrantFactsIssueV1[];
}): AeatDeferralGrantFactsResultV1 {
  return Object.freeze({
    schemaVersion: AEAT_DEFERRAL_GRANT_FACTS_SCHEMA_VERSION_V1,
    engineId: AEAT_DEFERRAL_GRANT_FACTS_ENGINE_ID_V1,
    engineVersion: AEAT_DEFERRAL_GRANT_FACTS_ENGINE_VERSION_V1,
    documentType: input.documentType,
    status: input.status,
    outcome: input.outcome,
    header: Object.freeze({ ...input.header }),
    debtSchedules: Object.freeze([...input.debtSchedules]),
    issues: Object.freeze([...input.issues]),
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
}
