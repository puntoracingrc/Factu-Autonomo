import {
  assertBoundedDocumentInput,
  assertNotAborted,
  type BoundedDocumentInput,
} from "./input-contract";

export const AEAT_OFFSET_AGREEMENT_FACTS_SCHEMA_VERSION_V1 = 1 as const;
export const AEAT_OFFSET_AGREEMENT_FACTS_ENGINE_ID_V1 =
  "aeat-offset-agreement-explicit-facts" as const;
export const AEAT_OFFSET_AGREEMENT_FACTS_ENGINE_VERSION_V1 = "1.0.0" as const;

export const AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1 = Object.freeze({
  maxLinesPerPage: 5_000,
  maxLineCharacters: 2_000,
  maxIdentifierCharacters: 80,
  maxSubjectNameCharacters: 160,
  maxDescriptionCharacters: 240,
  maxCredits: 32,
  maxDebts: 256,
  maxAmountCents: 100_000_000_000,
} as const);

export type AeatOffsetAgreementModeV1 = "REQUESTED" | "EX_OFFICIO";

export type AeatOffsetAgreementFactsOutcomeV1 =
  | "FACTS_AVAILABLE"
  | "INFORMATION_PENDING"
  | "AMBIGUOUS"
  | "PROCESSING_BLOCKED";

export type AeatOffsetAgreementFactsIssueCodeV1 =
  | "FAMILY_GATE_NOT_SATISFIED"
  | "MULTIPLE_AGREEMENT_MODES"
  | "NO_ANNEX_I_SECTION"
  | "NO_CREDIT_ROWS"
  | "NO_DEBT_ROWS"
  | "INVALID_CREDIT_ROW"
  | "DEBT_ROW_WITHOUT_REFERENCE"
  | "INVALID_DEBT_ROW"
  | "INVALID_PRINTED_DATE"
  | "INVALID_PRINTED_AMOUNT"
  | "EFFECT_CODE_WITHOUT_EXPLICIT_STATEMENT"
  | "MULTIPLE_DISTINCT_SUBJECT_VALUES"
  | "MULTIPLE_DISTINCT_AGREEMENT_VALUES"
  | "MULTIPLE_DISTINCT_REQUEST_DATES"
  | "RESOURCE_LIMIT_EXCEEDED"
  | "UNSUPPORTED_TEXT_STATE";

export interface AeatOffsetAgreementFactsIssueV1 {
  readonly code: AeatOffsetAgreementFactsIssueCodeV1;
  readonly pageNumbers: readonly number[];
  readonly creditIndex: number | null;
  readonly debtIndex: number | null;
}

export interface AeatOffsetTextFactV1 {
  readonly printedValue: string;
  readonly pageNumbers: readonly number[];
  readonly extractionMethod: "RULE";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly valueDisclosure: "EPHEMERAL_UI_ONLY";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface AeatOffsetMoneyFactV1 {
  readonly printedValue: string;
  readonly amountCents: number;
  readonly currency: "EUR";
  readonly pageNumbers: readonly number[];
  readonly extractionMethod: "RULE";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly valueDisclosure: "EPHEMERAL_UI_ONLY";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface AeatOffsetPrintedDateFactV1 {
  readonly printedValue: string;
  readonly calendarDate: string;
  readonly pageNumbers: readonly number[];
  readonly extractionMethod: "RULE";
  readonly assertionType: "EXPLICIT_IN_DOCUMENT";
  readonly dateMeaning: "PRINTED_LABEL_ONLY";
  readonly legalEffect: "NOT_DETERMINED";
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface AeatOffsetAgreementHeaderFactsV1 {
  readonly subjectName: AeatOffsetTextFactV1 | null;
  readonly subjectTaxId: AeatOffsetTextFactV1 | null;
  readonly agreementNumber: AeatOffsetTextFactV1 | null;
  readonly requestDate: AeatOffsetPrintedDateFactV1 | null;
}

export interface AeatOffsetCreditFactV1 {
  readonly reference: AeatOffsetTextFactV1;
  readonly description: AeatOffsetTextFactV1;
  readonly recognitionDate: AeatOffsetPrintedDateFactV1;
  readonly creditAmount: AeatOffsetMoneyFactV1;
  readonly delayInterest: AeatOffsetMoneyFactV1;
  readonly totalCredit: AeatOffsetMoneyFactV1;
  readonly compensatedAmount: AeatOffsetMoneyFactV1;
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export type AeatOffsetPrintedEffectMeaningV1 =
  | "TOTAL_EXTINGUISHED_IN_VOLUNTARY_PERIOD"
  | "PARTIALLY_EXTINGUISHED_IN_ENFORCEMENT"
  | "TOTAL_EXTINGUISHED_IN_ENFORCEMENT"
  | "PRINTED_CODE_UNMAPPED";

export interface AeatOffsetDebtFactV1 {
  readonly liquidationKey: AeatOffsetTextFactV1;
  readonly description: AeatOffsetTextFactV1;
  readonly effectDate: AeatOffsetPrintedDateFactV1;
  readonly principalPending: AeatOffsetMoneyFactV1;
  readonly enforcementSurcharge: AeatOffsetMoneyFactV1;
  readonly delayInterest: AeatOffsetMoneyFactV1 | null;
  readonly paymentsOnAccount: AeatOffsetMoneyFactV1;
  readonly totalBeforeOffset: AeatOffsetMoneyFactV1;
  readonly compensatedAmount: AeatOffsetMoneyFactV1;
  readonly remainingAfterOffset: AeatOffsetMoneyFactV1;
  readonly effectCode: AeatOffsetTextFactV1;
  readonly effectMeaning: AeatOffsetPrintedEffectMeaningV1;
  readonly effectStatementPageNumbers: readonly number[];
  readonly reviewStatus: "REVIEW_REQUIRED";
}

export interface AeatOffsetAgreementFactsResultV1 {
  readonly schemaVersion: 1;
  readonly engineId: "aeat-offset-agreement-explicit-facts";
  readonly engineVersion: "1.0.0";
  readonly documentType: "AEAT_OFFSET_AGREEMENT" | null;
  readonly agreementMode: AeatOffsetAgreementModeV1 | null;
  readonly status: "REVIEW_REQUIRED" | "INFORMATION_PENDING";
  readonly outcome: AeatOffsetAgreementFactsOutcomeV1;
  readonly header: AeatOffsetAgreementHeaderFactsV1;
  readonly credits: readonly AeatOffsetCreditFactV1[];
  readonly debts: readonly AeatOffsetDebtFactV1[];
  readonly issues: readonly AeatOffsetAgreementFactsIssueV1[];
  readonly semanticPolicy: "EXPLICIT_PRINTED_FACTS_ONLY";
  readonly effectPolicy: "PRINTED_EFFECT_TEXT_ONLY";
  readonly amountPolicy: "PRINTED_VALUES_NOT_RECALCULATED";
  readonly legalRuleStatus: "NOT_APPLIED";
  readonly relationPolicy: "NOT_CREATED";
  readonly debtMutationPolicy: "NOT_PERFORMED";
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

interface DateObservation {
  readonly printedValue: string;
  readonly calendarDate: string;
  readonly pageNumber: number;
}

interface ParsedMoney {
  readonly printedValue: string;
  readonly amountCents: number;
}

interface PendingDebt {
  readonly liquidationKey: ScalarObservation;
  readonly description: ScalarObservation;
  readonly pageNumber: number;
}

interface EffectObservation {
  readonly meaning: Exclude<
    AeatOffsetPrintedEffectMeaningV1,
    "PRINTED_CODE_UNMAPPED"
  >;
  readonly pageNumber: number;
}

const MONEY_SOURCE = String.raw`(?:\d{1,3}(?:[.\u00a0 ]\d{3})+|\d+),\d{2}`;
const MONEY_TOKEN = new RegExp(
  String.raw`^(\d{1,3}(?:[.\u00a0 ]\d{3})+|\d+),(\d{2})$`,
  "u",
);
const CREDIT_ROW = new RegExp(
  String.raw`^\s*([A-Z0-9][A-Z0-9./_-]{2,79})\s+(.{1,240}?)\s+(\d{2}[-/]\d{2}[-/]\d{4})\s+(${MONEY_SOURCE})\s+(${MONEY_SOURCE})\s+(${MONEY_SOURCE})\s+(${MONEY_SOURCE})\s*$`,
  "iu",
);
const REQUESTED_DEBT_ROW = new RegExp(
  String.raw`^\s*(\d{2}[-/]\d{2}[-/]\d{4})\s+(${MONEY_SOURCE})\s+(${MONEY_SOURCE})\s+(${MONEY_SOURCE})\s+(${MONEY_SOURCE})\s+(${MONEY_SOURCE})\s+(${MONEY_SOURCE})\s+(${MONEY_SOURCE})\s+\(\s*([0-9]{1,3})\s*\)\s*$`,
  "u",
);
const EX_OFFICIO_DEBT_ROW = new RegExp(
  String.raw`^\s*(\d{2}[-/]\d{2}[-/]\d{4})\s+(${MONEY_SOURCE})\s+(${MONEY_SOURCE})\s+(${MONEY_SOURCE})\s+(${MONEY_SOURCE})\s+(${MONEY_SOURCE})\s+(${MONEY_SOURCE})\s+\(\s*([0-9]{1,3})\s*\)\s*$`,
  "u",
);
const DEBT_REFERENCE_ROW =
  /^\s*vencimiento\s*:\s*([A-Z0-9][A-Z0-9./_-]{2,79})\s+(.{1,240}?)\s*$/iu;
const IDENTIFIER = /^[A-Z0-9][A-Z0-9./_-]*$/u;
const TAX_ID = /^[A-Z0-9][A-Z0-9 -]{7,15}$/u;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f-\u009f]/u;

const REQUESTED_TITLE =
  "acuerdo de compensacion a instancia del obligado al pago";
const EX_OFFICIO_TITLE = "acuerdo de compensacion de oficio";
const OFFICIAL_HOST_LINES = new Set([
  "www.agenciatributaria.es",
  "www.agenciatributaria.gob.es",
  "agenciatributaria.gob.es",
  "sede.agenciatributaria.gob.es",
  "https sede agenciatributaria gob es",
]);

/**
 * Reads facts printed in an AEAT offset agreement and its Annexes I/II. It
 * does not decide legal effects beyond closed statements printed in Annex II,
 * and it never creates or updates a debt, payment, relation or journal entry.
 */
export function extractAeatOffsetAgreementFactsV1(
  value: unknown,
): AeatOffsetAgreementFactsResultV1 {
  assertBoundedDocumentInput(value);
  const input = value as BoundedDocumentInput;
  assertNotAborted(input.signal);

  const gate = detectAgreementMode(input);
  if (gate.blocked) {
    if (gate.reason === "RESOURCE_LIMIT_EXCEEDED") {
      return blockedResult(gate.pageNumbers[0] ?? 1);
    }
    return freezeResult({
      documentType: null,
      agreementMode: null,
      status: "INFORMATION_PENDING",
      outcome: gate.multiple ? "AMBIGUOUS" : "INFORMATION_PENDING",
      header: emptyHeader(),
      credits: [],
      debts: [],
      issues: [
        issue(
          gate.multiple
            ? "MULTIPLE_AGREEMENT_MODES"
            : "FAMILY_GATE_NOT_SATISFIED",
          gate.pageNumbers,
          null,
          null,
        ),
      ],
    });
  }

  const subjectNames: ScalarObservation[] = [];
  const subjectTaxIds: ScalarObservation[] = [];
  const agreementNumbers: ScalarObservation[] = [];
  const requestDates: DateObservation[] = [];
  const credits: AeatOffsetCreditFactV1[] = [];
  const parsedDebts: Array<{
    readonly pending: PendingDebt;
    readonly row: RegExpExecArray;
    readonly rowPageNumber: number;
  }> = [];
  const effectStatements = new Map<string, EffectObservation>();
  const issues: AeatOffsetAgreementFactsIssueV1[] = [];
  let insideAnnexI = false;
  let annexIFound = false;
  let section: "NONE" | "CREDIT" | "DEBT" = "NONE";
  let pendingDebt: PendingDebt | null = null;

  for (const page of input.pages) {
    assertNotAborted(input.signal);
    const lines = page.text.split(/\r\n|[\n\r\u2028\u2029]/u);
    if (lines.length > AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxLinesPerPage) {
      return blockedResult(page.pageNumber);
    }
    collectEffectStatements(page.text, page.pageNumber, effectStatements);

    for (const rawLine of lines) {
      assertNotAborted(input.signal);
      if (
        rawLine.length >
        AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxLineCharacters
      ) {
        return blockedResult(page.pageNumber);
      }
      const normalized = normalizeClosedText(rawLine);
      if (normalized === "anexo i") {
        insideAnnexI = true;
        annexIFound = true;
        section = "NONE";
        pendingDebt = null;
        continue;
      }
      if (normalized === "anexo ii") {
        insideAnnexI = false;
        section = "NONE";
        pendingDebt = null;
        continue;
      }
      if (!insideAnnexI) continue;

      collectHeaderObservation(
        rawLine,
        page.pageNumber,
        subjectNames,
        subjectTaxIds,
        agreementNumbers,
        requestDates,
        issues,
      );

      if (/^\s*cr[eé]dito\s*:\s*$/iu.test(rawLine)) {
        section = "CREDIT";
        pendingDebt = null;
        continue;
      }
      if (/^\s*deuda\s*:\s*$/iu.test(rawLine)) {
        section = "DEBT";
        pendingDebt = null;
        continue;
      }

      if (section === "CREDIT") {
        const creditMatch = CREDIT_ROW.exec(rawLine);
        if (creditMatch) {
          if (credits.length >= AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxCredits) {
            return blockedResult(page.pageNumber);
          }
          const credit = parseCreditRow(creditMatch, page.pageNumber);
          if (!credit) {
            issues.push(
              issue("INVALID_CREDIT_ROW", [page.pageNumber], credits.length, null),
            );
          } else {
            credits.push(credit);
          }
        } else if (looksLikeCreditRow(rawLine)) {
          issues.push(
            issue("INVALID_CREDIT_ROW", [page.pageNumber], credits.length, null),
          );
        }
        continue;
      }

      if (section !== "DEBT") continue;
      const debtReference = DEBT_REFERENCE_ROW.exec(rawLine);
      if (debtReference) {
        const liquidationKey = parseIdentifierObservation(
          debtReference[1] ?? "",
          page.pageNumber,
        );
        const description = parseTextObservation(
          debtReference[2] ?? "",
          page.pageNumber,
          AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxDescriptionCharacters,
        );
        if (!liquidationKey || !description) {
          issues.push(
            issue(
              "DEBT_ROW_WITHOUT_REFERENCE",
              [page.pageNumber],
              null,
              parsedDebts.length,
            ),
          );
          pendingDebt = null;
        } else {
          pendingDebt = { liquidationKey, description, pageNumber: page.pageNumber };
        }
        continue;
      }

      const row =
        gate.mode === "REQUESTED"
          ? REQUESTED_DEBT_ROW.exec(rawLine)
          : EX_OFFICIO_DEBT_ROW.exec(rawLine);
      if (row) {
        if (!pendingDebt) {
          issues.push(
            issue(
              "DEBT_ROW_WITHOUT_REFERENCE",
              [page.pageNumber],
              null,
              parsedDebts.length,
            ),
          );
          continue;
        }
        if (parsedDebts.length >= AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxDebts) {
          return blockedResult(page.pageNumber);
        }
        parsedDebts.push({
          pending: pendingDebt,
          row,
          rowPageNumber: page.pageNumber,
        });
        pendingDebt = null;
      } else if (looksLikeDebtMoneyRow(rawLine)) {
        issues.push(
          issue("INVALID_DEBT_ROW", [page.pageNumber], null, parsedDebts.length),
        );
      }
    }
  }
  assertNotAborted(input.signal);

  if (!annexIFound) issues.push(issue("NO_ANNEX_I_SECTION", [], null, null));
  if (credits.length === 0) issues.push(issue("NO_CREDIT_ROWS", [], null, null));
  if (parsedDebts.length === 0) issues.push(issue("NO_DEBT_ROWS", [], null, null));

  const debts: AeatOffsetDebtFactV1[] = [];
  for (let index = 0; index < parsedDebts.length; index += 1) {
    const item = parsedDebts[index]!;
    const parsed = parseDebtRow(
      gate.mode,
      item.pending,
      item.row,
      item.rowPageNumber,
      effectStatements,
      index,
      issues,
    );
    if (parsed) debts.push(parsed);
  }

  const header = {
    subjectName: uniqueTextFact(
      subjectNames,
      "MULTIPLE_DISTINCT_SUBJECT_VALUES",
      issues,
    ),
    subjectTaxId: uniqueTextFact(
      subjectTaxIds,
      "MULTIPLE_DISTINCT_SUBJECT_VALUES",
      issues,
    ),
    agreementNumber: uniqueTextFact(
      agreementNumbers,
      "MULTIPLE_DISTINCT_AGREEMENT_VALUES",
      issues,
    ),
    requestDate: uniqueDateFact(requestDates, issues),
  };
  const ambiguous = issues.some((item) =>
    [
      "MULTIPLE_AGREEMENT_MODES",
      "INVALID_CREDIT_ROW",
      "DEBT_ROW_WITHOUT_REFERENCE",
      "INVALID_DEBT_ROW",
      "INVALID_PRINTED_DATE",
      "INVALID_PRINTED_AMOUNT",
      "EFFECT_CODE_WITHOUT_EXPLICIT_STATEMENT",
      "MULTIPLE_DISTINCT_SUBJECT_VALUES",
      "MULTIPLE_DISTINCT_AGREEMENT_VALUES",
      "MULTIPLE_DISTINCT_REQUEST_DATES",
      "UNSUPPORTED_TEXT_STATE",
    ].includes(item.code),
  );
  const hasFacts =
    Boolean(
      header.subjectName ||
        header.subjectTaxId ||
        header.agreementNumber ||
        header.requestDate,
    ) ||
    credits.length > 0 ||
    debts.length > 0;

  return freezeResult({
    documentType: "AEAT_OFFSET_AGREEMENT",
    agreementMode: gate.mode,
    status: hasFacts ? "REVIEW_REQUIRED" : "INFORMATION_PENDING",
    outcome: ambiguous
      ? "AMBIGUOUS"
      : credits.length > 0 && debts.length > 0
        ? "FACTS_AVAILABLE"
        : "INFORMATION_PENDING",
    header,
    credits,
    debts,
    issues,
  });
}

function detectAgreementMode(input: BoundedDocumentInput):
  | {
      readonly blocked: false;
      readonly mode: AeatOffsetAgreementModeV1;
    }
  | {
      readonly blocked: true;
      readonly multiple: boolean;
      readonly reason: "FAMILY_GATE_NOT_SATISFIED" | "RESOURCE_LIMIT_EXCEEDED";
      readonly pageNumbers: readonly number[];
    } {
  const requestedPages: number[] = [];
  const exOfficioPages: number[] = [];
  let officialHost = false;
  let annexI = false;
  let agreementNumberLabel = false;
  let creditSection = false;
  let debtSection = false;
  let requestedAnnexHeading = false;
  let exOfficioAnnexHeading = false;

  for (const page of input.pages) {
    assertNotAborted(input.signal);
    const lines = page.text.split(/\r\n|[\n\r\u2028\u2029]/u);
    if (lines.length > AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxLinesPerPage) {
      return {
        blocked: true,
        multiple: false,
        reason: "RESOURCE_LIMIT_EXCEEDED",
        pageNumbers: [page.pageNumber],
      };
    }
    for (const rawLine of lines) {
      if (
        rawLine.length >
        AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxLineCharacters
      ) {
        return {
          blocked: true,
          multiple: false,
          reason: "RESOURCE_LIMIT_EXCEEDED",
          pageNumbers: [page.pageNumber],
        };
      }
      const normalized = normalizeClosedText(rawLine);
      if (normalized === REQUESTED_TITLE) requestedPages.push(page.pageNumber);
      if (normalized === EX_OFFICIO_TITLE) exOfficioPages.push(page.pageNumber);
      if (OFFICIAL_HOST_LINES.has(normalized)) officialHost = true;
      if (normalized === "anexo i") annexI = true;
      if (normalized === "credito y deudas") requestedAnnexHeading = true;
      if (normalized === "credito y deudas compensadas de oficio") {
        exOfficioAnnexHeading = true;
      }
      if (normalized.startsWith("numero de acuerdo de compensacion")) {
        agreementNumberLabel = true;
      }
      if (normalized === "credito") creditSection = true;
      if (normalized === "deuda") debtSection = true;
    }
  }
  const multiple = requestedPages.length > 0 && exOfficioPages.length > 0;
  if (multiple) {
    return {
      blocked: true,
      multiple: true,
      reason: "FAMILY_GATE_NOT_SATISFIED",
      pageNumbers: Object.freeze([
        ...new Set([...requestedPages, ...exOfficioPages]),
      ]),
    };
  }
  const mode: AeatOffsetAgreementModeV1 | null =
    requestedPages.length > 0
      ? "REQUESTED"
      : exOfficioPages.length > 0
        ? "EX_OFFICIO"
        : null;
  const correctAnnexHeading =
    mode === "REQUESTED"
      ? requestedAnnexHeading
      : mode === "EX_OFFICIO"
        ? exOfficioAnnexHeading
        : false;
  if (
    !mode ||
    !officialHost ||
    !annexI ||
    !correctAnnexHeading ||
    !agreementNumberLabel ||
    !creditSection ||
    !debtSection
  ) {
    return {
      blocked: true,
      multiple: false,
      reason: "FAMILY_GATE_NOT_SATISFIED",
      pageNumbers: Object.freeze([]),
    };
  }
  return { blocked: false, mode };
}

function collectHeaderObservation(
  rawLine: string,
  pageNumber: number,
  subjectNames: ScalarObservation[],
  subjectTaxIds: ScalarObservation[],
  agreementNumbers: ScalarObservation[],
  requestDates: DateObservation[],
  issues: AeatOffsetAgreementFactsIssueV1[],
): void {
  const nameValue = valueAfterClosedLabel(
    rawLine,
    /^nombre\s+y\s+apellidos\s*\/\s*raz[oó]n\s+social\s*:/iu,
  );
  if (nameValue !== null) {
    const subject = parseTextObservation(
      nameValue,
      pageNumber,
      AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxSubjectNameCharacters,
    );
    if (subject) subjectNames.push(subject);
    else issues.push(issue("UNSUPPORTED_TEXT_STATE", [pageNumber], null, null));
  }
  const taxIdMatch = /^\s*N\.?\s*I\.?\s*F\.?\s*:\s*([^\s]+)/iu.exec(rawLine);
  if (taxIdMatch?.[1]) {
    const printed = taxIdMatch[1].toUpperCase();
    if (TAX_ID.test(printed)) {
      subjectTaxIds.push({
        printedValue: printed,
        canonicalValue: printed.replace(/[ -]/gu, ""),
        pageNumber,
      });
    } else {
      issues.push(issue("UNSUPPORTED_TEXT_STATE", [pageNumber], null, null));
    }
  }
  const agreementValue = valueAfterClosedLabel(
    rawLine,
    /^n[uú]mero\s+de\s+acuerdo\s+de\s+compensaci[oó]n\s*:/iu,
  );
  if (agreementValue !== null) {
    const agreement = parseIdentifierObservation(agreementValue, pageNumber);
    if (agreement) agreementNumbers.push(agreement);
    else issues.push(issue("UNSUPPORTED_TEXT_STATE", [pageNumber], null, null));
  }
  const requestDateValue = valueAfterClosedLabel(
    rawLine,
    /^fecha\s+de\s+presentaci[oó]n\s+de\s+la\s+solicitud\s+de\s+compensaci[oó]n\s*:/iu,
  );
  if (requestDateValue !== null) {
    const requestDate = parsePrintedDate(requestDateValue, pageNumber);
    if (requestDate) requestDates.push(requestDate);
    else issues.push(issue("INVALID_PRINTED_DATE", [pageNumber], null, null));
  }
}

function collectEffectStatements(
  pageText: string,
  pageNumber: number,
  target: Map<string, EffectObservation>,
): void {
  const normalized = normalizeClosedText(pageText);
  if (
    normalized.includes("1 efectos de la compensacion") &&
    normalized.includes("ha quedado extinguido en periodo voluntario de ingreso")
  ) {
    target.set("1", {
      meaning: "TOTAL_EXTINGUISHED_IN_VOLUNTARY_PERIOD",
      pageNumber,
    });
  }
  if (
    normalized.includes("3 efectos de la compensacion") &&
    normalized.includes(
      "ha quedado parcialmente extinguida con efectos desde el reconocimiento del credito",
    )
  ) {
    target.set("3", {
      meaning: "PARTIALLY_EXTINGUISHED_IN_ENFORCEMENT",
      pageNumber,
    });
  }
  if (
    normalized.includes("4 efectos de la compensacion") &&
    normalized.includes(
      "ha quedado totalmente extinguida con efectos desde el reconocimiento del credito",
    )
  ) {
    target.set("4", {
      meaning: "TOTAL_EXTINGUISHED_IN_ENFORCEMENT",
      pageNumber,
    });
  }
}

function parseCreditRow(
  match: RegExpExecArray,
  pageNumber: number,
): AeatOffsetCreditFactV1 | null {
  const reference = parseIdentifierObservation(match[1] ?? "", pageNumber);
  const description = parseTextObservation(
    match[2] ?? "",
    pageNumber,
    AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxDescriptionCharacters,
  );
  const recognitionDate = parsePrintedDate(match[3] ?? "", pageNumber);
  const amounts = [4, 5, 6, 7].map((index) =>
    parseSpanishMoney(match[index] ?? ""),
  );
  if (
    !reference ||
    !description ||
    !recognitionDate ||
    amounts.some((item) => item === null)
  ) {
    return null;
  }
  const [creditAmount, delayInterest, totalCredit, compensatedAmount] =
    amounts as [ParsedMoney, ParsedMoney, ParsedMoney, ParsedMoney];
  return Object.freeze({
    reference: textFact(reference.printedValue, [pageNumber]),
    description: textFact(description.printedValue, [pageNumber]),
    recognitionDate: dateFact(recognitionDate),
    creditAmount: moneyFact(creditAmount, pageNumber),
    delayInterest: moneyFact(delayInterest, pageNumber),
    totalCredit: moneyFact(totalCredit, pageNumber),
    compensatedAmount: moneyFact(compensatedAmount, pageNumber),
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function parseDebtRow(
  mode: AeatOffsetAgreementModeV1,
  pending: PendingDebt,
  row: RegExpExecArray,
  rowPageNumber: number,
  effects: ReadonlyMap<string, EffectObservation>,
  debtIndex: number,
  issues: AeatOffsetAgreementFactsIssueV1[],
): AeatOffsetDebtFactV1 | null {
  const date = parsePrintedDate(row[1] ?? "", rowPageNumber);
  const amountCount = mode === "REQUESTED" ? 7 : 6;
  const amounts = Array.from({ length: amountCount }, (_, index) =>
    parseSpanishMoney(row[index + 2] ?? ""),
  );
  const effectCodeIndex = mode === "REQUESTED" ? 9 : 8;
  const effectCode = row[effectCodeIndex] ?? "";
  if (!date) {
    issues.push(
      issue("INVALID_PRINTED_DATE", [rowPageNumber], null, debtIndex),
    );
    return null;
  }
  if (amounts.some((item) => item === null)) {
    issues.push(
      issue("INVALID_PRINTED_AMOUNT", [rowPageNumber], null, debtIndex),
    );
    return null;
  }
  const effect = effects.get(effectCode);
  if (!effect) {
    issues.push(
      issue(
        "EFFECT_CODE_WITHOUT_EXPLICIT_STATEMENT",
        [rowPageNumber],
        null,
        debtIndex,
      ),
    );
  }
  const values = amounts as ParsedMoney[];
  const requestedInterest = mode === "REQUESTED" ? values[2]! : null;
  const paymentsIndex = mode === "REQUESTED" ? 3 : 2;
  const totalIndex = mode === "REQUESTED" ? 4 : 3;
  const compensatedIndex = mode === "REQUESTED" ? 5 : 4;
  const remainingIndex = mode === "REQUESTED" ? 6 : 5;
  return Object.freeze({
    liquidationKey: textFact(pending.liquidationKey.printedValue, [pending.pageNumber]),
    description: textFact(pending.description.printedValue, [pending.pageNumber]),
    effectDate: dateFact(date),
    principalPending: moneyFact(values[0]!, rowPageNumber),
    enforcementSurcharge: moneyFact(values[1]!, rowPageNumber),
    delayInterest: requestedInterest
      ? moneyFact(requestedInterest, rowPageNumber)
      : null,
    paymentsOnAccount: moneyFact(values[paymentsIndex]!, rowPageNumber),
    totalBeforeOffset: moneyFact(values[totalIndex]!, rowPageNumber),
    compensatedAmount: moneyFact(values[compensatedIndex]!, rowPageNumber),
    remainingAfterOffset: moneyFact(values[remainingIndex]!, rowPageNumber),
    effectCode: textFact(effectCode, [rowPageNumber]),
    effectMeaning: effect?.meaning ?? "PRINTED_CODE_UNMAPPED",
    effectStatementPageNumbers: Object.freeze(effect ? [effect.pageNumber] : []),
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
      amount > BigInt(AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxAmountCents) ||
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
  const canonicalValue = printed.toUpperCase();
  if (
    printed.length === 0 ||
    printed.length > AEAT_OFFSET_AGREEMENT_FACTS_LIMITS_V1.maxIdentifierCharacters ||
    CONTROL_CHARACTER.test(printed) ||
    !IDENTIFIER.test(canonicalValue)
  ) {
    return null;
  }
  return Object.freeze({ printedValue: printed, canonicalValue, pageNumber });
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
    AeatOffsetAgreementFactsIssueCodeV1,
    | "MULTIPLE_DISTINCT_SUBJECT_VALUES"
    | "MULTIPLE_DISTINCT_AGREEMENT_VALUES"
  >,
  issues: AeatOffsetAgreementFactsIssueV1[],
): AeatOffsetTextFactV1 | null {
  if (observations.length === 0) return null;
  const byValue = new Map<string, ScalarObservation[]>();
  for (const observation of observations) {
    const items = byValue.get(observation.canonicalValue) ?? [];
    items.push(observation);
    byValue.set(observation.canonicalValue, items);
  }
  if (byValue.size !== 1) {
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
  const same = [...byValue.values()][0] ?? [];
  const first = same[0];
  return first
    ? textFact(first.printedValue, same.map((item) => item.pageNumber))
    : null;
}

function uniqueDateFact(
  observations: readonly DateObservation[],
  issues: AeatOffsetAgreementFactsIssueV1[],
): AeatOffsetPrintedDateFactV1 | null {
  if (observations.length === 0) return null;
  const byValue = new Map<string, DateObservation[]>();
  for (const observation of observations) {
    const items = byValue.get(observation.calendarDate) ?? [];
    items.push(observation);
    byValue.set(observation.calendarDate, items);
  }
  if (byValue.size !== 1) {
    issues.push(
      issue(
        "MULTIPLE_DISTINCT_REQUEST_DATES",
        observations.map((item) => item.pageNumber),
        null,
        null,
      ),
    );
    return null;
  }
  const first = [...byValue.values()][0]?.[0];
  return first ? dateFact(first) : null;
}

function textFact(
  printedValue: string,
  pageNumbers: readonly number[],
): AeatOffsetTextFactV1 {
  return Object.freeze({
    printedValue,
    pageNumbers: Object.freeze([...new Set(pageNumbers)].sort((a, b) => a - b)),
    extractionMethod: "RULE",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    valueDisclosure: "EPHEMERAL_UI_ONLY",
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function moneyFact(
  value: ParsedMoney,
  pageNumber: number,
): AeatOffsetMoneyFactV1 {
  return Object.freeze({
    printedValue: value.printedValue,
    amountCents: value.amountCents,
    currency: "EUR",
    pageNumbers: Object.freeze([pageNumber]),
    extractionMethod: "RULE",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    valueDisclosure: "EPHEMERAL_UI_ONLY",
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function dateFact(value: DateObservation): AeatOffsetPrintedDateFactV1 {
  return Object.freeze({
    printedValue: value.printedValue,
    calendarDate: value.calendarDate,
    pageNumbers: Object.freeze([value.pageNumber]),
    extractionMethod: "RULE",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    dateMeaning: "PRINTED_LABEL_ONLY",
    legalEffect: "NOT_DETERMINED",
    reviewStatus: "REVIEW_REQUIRED",
  });
}

function valueAfterClosedLabel(
  rawLine: string,
  labelPattern: RegExp,
): string | null {
  const match = labelPattern.exec(rawLine);
  if (!match || match.index !== 0) return null;
  return rawLine.slice(match[0].length).trim();
}

function looksLikeCreditRow(rawLine: string): boolean {
  return (
    /\d{2}[-/]\d{2}[-/]\d{4}/u.test(rawLine) &&
    (rawLine.match(/,\d{2}\b/gu)?.length ?? 0) >= 3
  );
}

function looksLikeDebtMoneyRow(rawLine: string): boolean {
  return (
    /^\s*\d{2}[-/]\d{2}[-/]\d{4}/u.test(rawLine) &&
    (rawLine.match(/,\d{2}\b/gu)?.length ?? 0) >= 4
  );
}

function normalizeClosedText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9./:-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/:$/u, "");
}

function issue(
  code: AeatOffsetAgreementFactsIssueCodeV1,
  pageNumbers: readonly number[],
  creditIndex: number | null,
  debtIndex: number | null,
): AeatOffsetAgreementFactsIssueV1 {
  return Object.freeze({
    code,
    pageNumbers: Object.freeze([...new Set(pageNumbers)].sort((a, b) => a - b)),
    creditIndex,
    debtIndex,
  });
}

function emptyHeader(): AeatOffsetAgreementHeaderFactsV1 {
  return Object.freeze({
    subjectName: null,
    subjectTaxId: null,
    agreementNumber: null,
    requestDate: null,
  });
}

function blockedResult(pageNumber: number): AeatOffsetAgreementFactsResultV1 {
  return freezeResult({
    documentType: null,
    agreementMode: null,
    status: "INFORMATION_PENDING",
    outcome: "PROCESSING_BLOCKED",
    header: emptyHeader(),
    credits: [],
    debts: [],
    issues: [issue("RESOURCE_LIMIT_EXCEEDED", [pageNumber], null, null)],
  });
}

function freezeResult(input: {
  readonly documentType: "AEAT_OFFSET_AGREEMENT" | null;
  readonly agreementMode: AeatOffsetAgreementModeV1 | null;
  readonly status: "REVIEW_REQUIRED" | "INFORMATION_PENDING";
  readonly outcome: AeatOffsetAgreementFactsOutcomeV1;
  readonly header: AeatOffsetAgreementHeaderFactsV1;
  readonly credits: readonly AeatOffsetCreditFactV1[];
  readonly debts: readonly AeatOffsetDebtFactV1[];
  readonly issues: readonly AeatOffsetAgreementFactsIssueV1[];
}): AeatOffsetAgreementFactsResultV1 {
  return Object.freeze({
    schemaVersion: AEAT_OFFSET_AGREEMENT_FACTS_SCHEMA_VERSION_V1,
    engineId: AEAT_OFFSET_AGREEMENT_FACTS_ENGINE_ID_V1,
    engineVersion: AEAT_OFFSET_AGREEMENT_FACTS_ENGINE_VERSION_V1,
    documentType: input.documentType,
    agreementMode: input.agreementMode,
    status: input.status,
    outcome: input.outcome,
    header: Object.freeze({ ...input.header }),
    credits: Object.freeze([...input.credits]),
    debts: Object.freeze([...input.debts]),
    issues: Object.freeze([...input.issues]),
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
}
