import {
  TaxEngineConfigurationError,
  TaxEngineValidationError,
  type TaxEngineValidationIssue,
} from "./errors";
import type {
  AiFallbackMetadata,
  AiFallbackTaxProposal,
  AnswerValue,
  DirectTaxRegime,
  EvaluationResult,
  ExpenseAnswers,
  ExpenseAnnualContext,
  ExpenseInput,
  InvoiceType,
  Jurisdiction,
  PaymentMethod,
  RuleCategory,
  TaxContext,
  TaxOutcome,
  TaxpayerType,
  VatRegime,
} from "./types";

const MAX_MONEY_CENTS = 100_000_000_000;

const JURISDICTIONS: readonly Jurisdiction[] = [
  "UNKNOWN",
  "ES_COMMON",
  "ES_CANARY_IGIC",
  "ES_NAVARRA",
  "ES_BASQUE_COUNTRY",
  "ES_CEUTA_MELILLA",
];
const TAXPAYER_TYPES: readonly TaxpayerType[] = [
  "UNKNOWN",
  "SELF_EMPLOYED_IRPF",
  "COMPANY_IS",
];
const DIRECT_TAX_REGIMES: readonly DirectTaxRegime[] = [
  "DIRECT_ESTIMATION_NORMAL",
  "DIRECT_ESTIMATION_SIMPLIFIED",
  "UNKNOWN",
];
const VAT_REGIMES: readonly VatRegime[] = [
  "GENERAL",
  "PRORATA",
  "EXEMPT",
  "UNKNOWN",
];
const PAYMENT_METHODS: readonly PaymentMethod[] = [
  "CARD",
  "BANK_TRANSFER",
  "DIRECT_DEBIT",
  "CASH",
  "OTHER",
  "UNKNOWN",
];
const INVOICE_TYPES: readonly InvoiceType[] = [
  "FULL_INVOICE",
  "SIMPLIFIED_INVOICE",
  "RECEIPT",
  "NO_DOCUMENT",
  "UNKNOWN",
];
const RULE_CATEGORIES: readonly RuleCategory[] = [
  "MEALS_AND_HOSPITALITY",
  "VEHICLE_RUNNING_COSTS",
];

export interface EvaluationRequestPayload {
  input: ExpenseInput;
  context: TaxContext;
  previousAnswers: ExpenseAnswers;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : null;
}

function cleanString(
  value: unknown,
  field: string,
  issues: TaxEngineValidationIssue[],
  options: { required?: boolean; maxLength: number },
): string | undefined {
  if (value === undefined || value === null) {
    if (options.required) issues.push({ field, message: "Es obligatorio." });
    return undefined;
  }
  if (typeof value !== "string") {
    issues.push({ field, message: "Debe ser texto." });
    return undefined;
  }
  const normalized = value.trim();
  if (options.required && !normalized) {
    issues.push({ field, message: "Es obligatorio." });
  }
  if (normalized.length > options.maxLength) {
    issues.push({ field, message: "Es demasiado largo." });
  }
  return normalized || undefined;
}

function centsValue(
  value: unknown,
  field: string,
  issues: TaxEngineValidationIssue[],
): number | undefined {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    issues.push({
      field,
      message: "Debe ser un importe no negativo expresado en céntimos enteros.",
    });
    return undefined;
  }
  const amount = value as number;
  if (amount > MAX_MONEY_CENTS) {
    issues.push({ field, message: "El importe supera el máximo permitido." });
    return undefined;
  }
  return amount;
}

function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function parseAnswers(
  value: unknown,
  field: string,
  issues: TaxEngineValidationIssue[],
): ExpenseAnswers {
  if (value === undefined) return {};
  if (!isRecord(value)) {
    issues.push({ field, message: "Las respuestas no son válidas." });
    return {};
  }
  const result: Record<string, AnswerValue> = {};
  for (const [key, answer] of Object.entries(value)) {
    if (!/^[a-z0-9._-]{1,100}$/i.test(key)) {
      issues.push({ field: `${field}.${key}`, message: "Identificador no válido." });
      continue;
    }
    if (typeof answer === "boolean") {
      result[key] = answer;
      continue;
    }
    if (
      typeof answer === "number" &&
      Number.isSafeInteger(answer) &&
      answer >= 0 &&
      answer <= MAX_MONEY_CENTS
    ) {
      result[key] = answer;
      continue;
    }
    if (typeof answer === "string" && answer.length <= 1_000) {
      result[key] = answer.trim();
      continue;
    }
    if (
      Array.isArray(answer) &&
      answer.length <= 30 &&
      answer.every((item) => typeof item === "string" && item.length <= 200)
    ) {
      result[key] = answer.map((item) => item.trim()).filter(Boolean);
      continue;
    }
    issues.push({
      field: `${field}.${key}`,
      message: "El formato de la respuesta no es válido.",
    });
  }
  return result;
}

function parseAnnualContext(
  value: unknown,
  issues: TaxEngineValidationIssue[],
): ExpenseAnnualContext | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    issues.push({
      field: "input.annualContext",
      message: "El contexto anual no es válido.",
    });
    return undefined;
  }
  const result: ExpenseAnnualContext = {};
  if (value.netTurnoverCents !== undefined) {
    result.netTurnoverCents = centsValue(
      value.netTurnoverCents,
      "input.annualContext.netTurnoverCents",
      issues,
    );
  }
  if (value.clientAttentionDeductedCents !== undefined) {
    result.clientAttentionDeductedCents = centsValue(
      value.clientAttentionDeductedCents,
      "input.annualContext.clientAttentionDeductedCents",
      issues,
    );
  }
  if (value.maintenanceDeductedSameDayCents !== undefined) {
    result.maintenanceDeductedSameDayCents = centsValue(
      value.maintenanceDeductedSameDayCents,
      "input.annualContext.maintenanceDeductedSameDayCents",
      issues,
    );
  }
  return result;
}

function parseInput(
  value: unknown,
  issues: TaxEngineValidationIssue[],
): ExpenseInput | null {
  if (!isRecord(value)) {
    issues.push({ field: "input", message: "El gasto no es válido." });
    return null;
  }
  const concept = cleanString(value.concept, "input.concept", issues, {
    required: true,
    maxLength: 240,
  });
  const supplierName = cleanString(
    value.supplierName,
    "input.supplierName",
    issues,
    { maxLength: 160 },
  );
  const expenseDate = cleanString(
    value.expenseDate,
    "input.expenseDate",
    issues,
    { required: true, maxLength: 10 },
  );
  if (expenseDate && !validIsoDate(expenseDate)) {
    issues.push({ field: "input.expenseDate", message: "La fecha no es válida." });
  }
  const netAmountCents = centsValue(
    value.netAmountCents,
    "input.netAmountCents",
    issues,
  );
  const vatAmountCents = centsValue(
    value.vatAmountCents,
    "input.vatAmountCents",
    issues,
  );
  const totalAmountCents = centsValue(
    value.totalAmountCents,
    "input.totalAmountCents",
    issues,
  );
  const amountsKnown = value.amountsKnown !== false;
  if (
    !amountsKnown &&
    [netAmountCents, vatAmountCents, totalAmountCents].some(
      (amount) => amount !== undefined && amount !== 0,
    )
  ) {
    issues.push({
      field: "input.amountsKnown",
      message:
        "Los importes desconocidos no pueden incluir cantidades aparentemente válidas.",
    });
  }
  if (
    vatAmountCents !== undefined &&
    totalAmountCents !== undefined &&
    vatAmountCents > totalAmountCents
  ) {
    issues.push({
      field: "input.vatAmountCents",
      message: "El IVA no puede superar el total.",
    });
  }
  if (
    netAmountCents !== undefined &&
    totalAmountCents !== undefined &&
    netAmountCents > totalAmountCents
  ) {
    issues.push({
      field: "input.netAmountCents",
      message:
        "La base no puede superar el total en esta versión, que todavía no modela retenciones superiores al IVA.",
    });
  }
  if (
    amountsKnown &&
    netAmountCents !== undefined &&
    vatAmountCents !== undefined &&
    totalAmountCents !== undefined &&
    Math.abs(netAmountCents + vatAmountCents - totalAmountCents) > 1
  ) {
    issues.push({
      field: "input.totalAmountCents",
      message:
        "La base y el IVA deben coincidir con el total (se admite un céntimo de ajuste por redondeo). Esta versión no modela retenciones en gastos.",
    });
  }
  const currency = cleanString(value.currency, "input.currency", issues, {
    required: true,
    maxLength: 3,
  })?.toUpperCase();
  if (currency && !/^[A-Z]{3}$/.test(currency)) {
    issues.push({ field: "input.currency", message: "La moneda no es válida." });
  }
  const paymentMethod = enumValue(value.paymentMethod, PAYMENT_METHODS);
  if (!paymentMethod) {
    issues.push({ field: "input.paymentMethod", message: "El medio de pago no es válido." });
  }
  const invoiceType = enumValue(value.invoiceType, INVOICE_TYPES);
  if (!invoiceType) {
    issues.push({ field: "input.invoiceType", message: "El justificante no es válido." });
  }
  const extractedText = cleanString(
    value.extractedText,
    "input.extractedText",
    issues,
    { maxLength: 10_000 },
  );
  const manualCategory =
    value.manualCategory === undefined
      ? undefined
      : enumValue(value.manualCategory, RULE_CATEGORIES);
  if (value.manualCategory !== undefined && !manualCategory) {
    issues.push({ field: "input.manualCategory", message: "La categoría no es válida." });
  }
  const answers = parseAnswers(value.answers, "input.answers", issues);
  const annualContext = parseAnnualContext(value.annualContext, issues);

  if (
    !concept ||
    !expenseDate ||
    netAmountCents === undefined ||
    vatAmountCents === undefined ||
    totalAmountCents === undefined ||
    !currency ||
    !paymentMethod ||
    !invoiceType
  ) {
    return null;
  }
  return {
    concept,
    ...(supplierName ? { supplierName } : {}),
    expenseDate,
    ...(!amountsKnown ? { amountsKnown: false } : {}),
    netAmountCents,
    vatAmountCents,
    totalAmountCents,
    currency,
    paymentMethod,
    invoiceType,
    ...(extractedText ? { extractedText } : {}),
    answers,
    ...(annualContext ? { annualContext } : {}),
    ...(manualCategory ? { manualCategory } : {}),
  };
}

function parseContext(
  value: unknown,
  issues: TaxEngineValidationIssue[],
): TaxContext | null {
  if (!isRecord(value)) {
    issues.push({ field: "context", message: "El contexto fiscal no es válido." });
    return null;
  }
  const jurisdiction = enumValue(value.jurisdiction, JURISDICTIONS);
  const taxpayerType = enumValue(value.taxpayerType, TAXPAYER_TYPES);
  const directTaxRegime = enumValue(value.directTaxRegime, DIRECT_TAX_REGIMES);
  const vatRegime = enumValue(value.vatRegime, VAT_REGIMES);
  const hasFullVatDeductionRight = value.hasFullVatDeductionRight;
  const activityDescription = cleanString(
    value.activityDescription,
    "context.activityDescription",
    issues,
    { maxLength: 500 },
  );
  const activityCode = cleanString(
    value.activityCode,
    "context.activityCode",
    issues,
    { maxLength: 40 },
  );
  const fiscalYear =
    typeof value.fiscalYear === "number" ? value.fiscalYear : Number.NaN;

  if (!jurisdiction) issues.push({ field: "context.jurisdiction", message: "El territorio no es válido." });
  if (!taxpayerType) issues.push({ field: "context.taxpayerType", message: "El contribuyente no es válido." });
  if (!directTaxRegime) issues.push({ field: "context.directTaxRegime", message: "El régimen de IRPF no es válido." });
  if (!vatRegime) issues.push({ field: "context.vatRegime", message: "El régimen de IVA no es válido." });
  if (typeof hasFullVatDeductionRight !== "boolean") {
    issues.push({ field: "context.hasFullVatDeductionRight", message: "Debe indicarse el derecho general a deducir IVA." });
  }
  if (!Number.isInteger(fiscalYear) || fiscalYear < 2000 || fiscalYear > 2100) {
    issues.push({ field: "context.fiscalYear", message: "El ejercicio fiscal no es válido." });
  }
  if (
    !jurisdiction ||
    !taxpayerType ||
    !directTaxRegime ||
    !vatRegime ||
    typeof hasFullVatDeductionRight !== "boolean" ||
    !Number.isInteger(fiscalYear)
  ) {
    return null;
  }
  return {
    jurisdiction,
    taxpayerType,
    directTaxRegime,
    vatRegime,
    hasFullVatDeductionRight,
    activityDescription: activityDescription ?? "",
    ...(activityCode ? { activityCode } : {}),
    fiscalYear: fiscalYear as number,
  };
}

export function parseEvaluationRequest(value: unknown): EvaluationRequestPayload {
  const issues: TaxEngineValidationIssue[] = [];
  if (!isRecord(value)) {
    throw new TaxEngineValidationError([
      { field: "request", message: "La petición no es válida." },
    ]);
  }
  const input = parseInput(value.input, issues);
  const context = parseContext(value.context, issues);
  const previousAnswers = parseAnswers(
    value.previousAnswers,
    "previousAnswers",
    issues,
  );
  if (input && context) {
    const expenseYear = Number(input.expenseDate.slice(0, 4));
    if (context.fiscalYear !== expenseYear) {
      issues.push({
        field: "context.fiscalYear",
        message: "El ejercicio debe coincidir con la fecha del gasto.",
      });
    }
  }
  if (!input || !context || issues.length > 0) {
    throw new TaxEngineValidationError(issues);
  }
  return { input, context, previousAnswers };
}

function assertTaxOutcome(
  outcome: TaxOutcome | null,
  maximumCents: number,
  label: string,
  allowedTaxTypes: ReadonlySet<TaxOutcome["taxType"]>,
): void {
  if (!outcome) return;
  if (!allowedTaxTypes.has(outcome.taxType)) {
    throw new TaxEngineConfigurationError(
      `${label}: tipo de impuesto no válido.`,
    );
  }
  if (
    !new Set([
      "FULL",
      "PARTIAL",
      "POTENTIALLY_DEDUCTIBLE",
      "NONE",
      "NEEDS_REVIEW",
      "NOT_APPLICABLE",
    ]).has(outcome.eligibility)
  ) {
    throw new TaxEngineConfigurationError(
      `${label}: elegibilidad no válida.`,
    );
  }
  if (
    !Number.isInteger(outcome.theoreticalPercentage) ||
    outcome.theoreticalPercentage < 0 ||
    outcome.theoreticalPercentage > 100
  ) {
    throw new TaxEngineConfigurationError(`${label}: porcentaje no válido.`);
  }
  if (
    outcome.amountStatus !== undefined &&
    outcome.amountStatus !== "CALCULATED" &&
    outcome.amountStatus !== "NOT_CALCULATED"
  ) {
    throw new TaxEngineConfigurationError(`${label}: estado de importe no válido.`);
  }
  if (
    outcome.amountStatus === "NOT_CALCULATED" &&
    (outcome.deductibleAmountCents !== 0 || outcome.appliedLimit !== null)
  ) {
    throw new TaxEngineConfigurationError(
      `${label}: un importe no calculado no puede aparentar una cantidad o límite real.`,
    );
  }
  if (
    !Number.isSafeInteger(outcome.deductibleAmountCents) ||
    outcome.deductibleAmountCents < 0 ||
    outcome.deductibleAmountCents > maximumCents
  ) {
    throw new TaxEngineConfigurationError(`${label}: importe deducible no válido.`);
  }
}

function assertSafeStringArray(
  value: readonly string[],
  label: string,
  options: { maxItems: number; maxLength: number; pattern?: RegExp },
): void {
  if (
    !Array.isArray(value) ||
    value.length > options.maxItems ||
    value.some(
      (item) =>
        typeof item !== "string" ||
        !item.trim() ||
        item.length > options.maxLength ||
        (options.pattern ? !options.pattern.test(item) : false),
    )
  ) {
    throw new TaxEngineConfigurationError(`${label}: lista no válida.`);
  }
}

function assertAiTaxProposal(
  proposal: AiFallbackTaxProposal,
  input: ExpenseInput,
): void {
  if (proposal.taxType !== "IRPF" && proposal.taxType !== "IVA") {
    throw new TaxEngineConfigurationError(
      "Fallback IA: tipo de impuesto no soportado.",
    );
  }
  if (
    typeof proposal.explanation !== "string" ||
    !proposal.explanation.trim() ||
    proposal.explanation.length > 700
  ) {
    throw new TaxEngineConfigurationError(
      "Fallback IA: explicación fiscal no válida.",
    );
  }
  const percentage = proposal.proposedPercentage;
  const amount = proposal.proposedDeductibleAmountCents;
  if ((percentage === null) !== (amount === null)) {
    throw new TaxEngineConfigurationError(
      "Fallback IA: porcentaje e importe deben quedar ambos pendientes o ambos propuestos.",
    );
  }
  if (percentage === null || amount === null) return;
  if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
    throw new TaxEngineConfigurationError(
      "Fallback IA: porcentaje propuesto no válido.",
    );
  }
  const maximum =
    proposal.taxType === "IVA"
      ? input.vatAmountCents
      : input.totalAmountCents;
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > maximum) {
    throw new TaxEngineConfigurationError(
      "Fallback IA: importe propuesto no válido.",
    );
  }
}

function assertAiFallbackMetadata(
  result: EvaluationResult,
  input: ExpenseInput,
): void {
  const metadata: AiFallbackMetadata | undefined = result.aiFallback;
  if (!metadata) {
    if (result.evaluationOrigin === "AI_FALLBACK") {
      throw new TaxEngineConfigurationError(
        "El origen IA requiere metadatos de fallback.",
      );
    }
    return;
  }

  if (
    !["PROPOSED", "REJECTED", "FAILED"].includes(metadata.status) ||
    !["NO_MATCH", "UNRESOLVABLE_AMBIGUITY"].includes(metadata.trigger) ||
    metadata.sourceVerificationStatus !== "VERIFIED" ||
    metadata.humanReviewRequired !== true
  ) {
    throw new TaxEngineConfigurationError(
      "Los metadatos del fallback IA no son válidos.",
    );
  }
  if (
    !metadata.promptVersion ||
    metadata.promptVersion.length > 120 ||
    !/^[a-z0-9._:-]+$/i.test(metadata.promptVersion) ||
    !metadata.modelId ||
    metadata.modelId.length > 120 ||
    !/^[a-z0-9._:-]+$/i.test(metadata.modelId) ||
    !Number.isSafeInteger(metadata.durationMs) ||
    metadata.durationMs < 0 ||
    metadata.durationMs > 120_000
  ) {
    throw new TaxEngineConfigurationError(
      "La identidad o duración del fallback IA no es válida.",
    );
  }
  for (const [label, value] of [
    ["intentos", metadata.providerAttempts],
    ["tokens de entrada", metadata.inputTokens],
    ["tokens de salida", metadata.outputTokens],
    ["tokens totales", metadata.totalTokens],
  ] as const) {
    if (
      value !== undefined &&
      (!Number.isSafeInteger(value) || value < 0 || value > 10_000_000)
    ) {
      throw new TaxEngineConfigurationError(
        `Fallback IA: ${label} no válidos.`,
      );
    }
  }
  assertSafeStringArray(metadata.suppliedSourceIds, "Fallback IA / fuentes", {
    maxItems: 40,
    maxLength: 120,
    pattern: /^[a-z0-9._:-]+$/i,
  });
  assertSafeStringArray(metadata.citedSourceIds, "Fallback IA / citas", {
    maxItems: 40,
    maxLength: 120,
    pattern: /^[a-z0-9._:-]+$/i,
  });
  assertSafeStringArray(
    metadata.validatorErrorCodes,
    "Fallback IA / validación",
    {
      maxItems: 30,
      maxLength: 80,
      pattern: /^[A-Z0-9_]+$/,
    },
  );
  const supplied = new Set(metadata.suppliedSourceIds);
  if (metadata.citedSourceIds.some((id) => !supplied.has(id))) {
    throw new TaxEngineConfigurationError(
      "El fallback IA cita una fuente no suministrada.",
    );
  }
  if (
    result.officialSources.some(
      (source) =>
        source.verificationStatus !== "VERIFIED" ||
        !metadata.citedSourceIds.includes(source.id),
    )
  ) {
    throw new TaxEngineConfigurationError(
      "Las fuentes del resultado IA no coinciden con las fuentes verificadas citadas.",
    );
  }
  if (metadata.status === "PROPOSED") {
    const resultSourceIds = new Set(
      result.officialSources.map((source) => source.id),
    );
    if (
      resultSourceIds.size !== metadata.citedSourceIds.length ||
      metadata.citedSourceIds.some((id) => !resultSourceIds.has(id))
    ) {
      throw new TaxEngineConfigurationError(
        "El resultado IA debe reconstruir exactamente las fuentes citadas.",
      );
    }
  }
  if (
    metadata.confidenceBand !== null &&
    !["LOW", "MEDIUM", "HIGH"].includes(metadata.confidenceBand)
  ) {
    throw new TaxEngineConfigurationError(
      "La banda de confianza del fallback IA no es válida.",
    );
  }
  if (
    metadata.classification !== undefined &&
    metadata.classification !== "MEALS_AND_HOSPITALITY" &&
    metadata.classification !== "VEHICLE_RUNNING_COSTS" &&
    metadata.classification !== "UNCLASSIFIED"
  ) {
    throw new TaxEngineConfigurationError(
      "La clasificación del fallback IA no es válida.",
    );
  }
  if (
    metadata.proposalSummary !== undefined &&
    (!metadata.proposalSummary.trim() || metadata.proposalSummary.length > 700)
  ) {
    throw new TaxEngineConfigurationError(
      "El resumen del fallback IA no es válido.",
    );
  }
  if (metadata.missingLegalContext) {
    assertSafeStringArray(
      metadata.missingLegalContext,
      "Fallback IA / contexto pendiente",
      { maxItems: 12, maxLength: 500 },
    );
  }
  if (metadata.taxProposals) {
    if (!Array.isArray(metadata.taxProposals) || metadata.taxProposals.length > 2) {
      throw new TaxEngineConfigurationError(
        "Fallback IA: propuestas fiscales no válidas.",
      );
    }
    const taxTypes = new Set<string>();
    for (const proposal of metadata.taxProposals) {
      assertAiTaxProposal(proposal, input);
      if (taxTypes.has(proposal.taxType)) {
        throw new TaxEngineConfigurationError(
          "Fallback IA: impuesto duplicado.",
        );
      }
      taxTypes.add(proposal.taxType);
    }
  }

  if (metadata.status === "PROPOSED") {
    if (
      result.evaluationOrigin !== "AI_FALLBACK" ||
      result.status !== "NEEDS_REVIEW" ||
      result.risk !== "UNDETERMINED" ||
      !result.requiresHumanReview ||
      metadata.validatorErrorCodes.length > 0 ||
      !metadata.proposalSummary ||
      !metadata.classification ||
      !metadata.missingLegalContext ||
      metadata.taxProposals?.length !== 2 ||
      !metadata.taxProposals.some((proposal) => proposal.taxType === "IRPF") ||
      !metadata.taxProposals.some((proposal) => proposal.taxType === "IVA")
    ) {
      throw new TaxEngineConfigurationError(
        "Toda propuesta IA debe quedar indeterminada y pendiente de revisión humana.",
      );
    }
  } else if (result.evaluationOrigin === "AI_FALLBACK") {
    throw new TaxEngineConfigurationError(
      "Un fallback rechazado o fallido no puede figurar como evaluación IA.",
    );
  }
}

export function assertEvaluationResult(
  result: EvaluationResult,
  input: ExpenseInput,
): EvaluationResult {
  const statuses = new Set([
    "RESOLVED",
    "NEEDS_INPUT",
    "NEEDS_REVIEW",
    "NO_MATCH",
    "UNSUPPORTED",
  ]);
  const risks = new Set(["GREEN", "YELLOW", "RED", "UNDETERMINED"]);
  const matchMethods = new Set([
    "EXACT",
    "ALIAS",
    "TOKEN",
    "MANUAL_CATEGORY",
    "NONE",
  ]);
  if (!statuses.has(result.status) || !risks.has(result.risk)) {
    throw new TaxEngineConfigurationError("El estado de evaluación no es válido.");
  }
  if (!matchMethods.has(result.matchedBy)) {
    throw new TaxEngineConfigurationError("El método de matching no es válido.");
  }
  if (
    result.evaluationOrigin !== undefined &&
    result.evaluationOrigin !== "LOCAL_RULE" &&
    result.evaluationOrigin !== "AI_FALLBACK"
  ) {
    throw new TaxEngineConfigurationError("El origen de evaluación no es válido.");
  }
  if (!result.evaluationId || !result.evaluatedAt) {
    throw new TaxEngineConfigurationError("Falta la identidad de la evaluación.");
  }
  if (
    !Number.isInteger(result.matchScore) ||
    result.matchScore < 0 ||
    result.matchScore > 100
  ) {
    throw new TaxEngineConfigurationError("La puntuación de matching no es válida.");
  }
  assertTaxOutcome(
    result.directTax,
    input.totalAmountCents,
    "Impuesto directo",
    new Set(["IRPF", "IS"]),
  );
  assertTaxOutcome(
    result.indirectTax,
    input.vatAmountCents,
    "Impuesto indirecto",
    new Set(["IVA", "IGIC", "IPSI"]),
  );
  if (
    !Array.isArray(result.requiredQuestions) ||
    !Array.isArray(result.missingInformation) ||
    !Array.isArray(result.evidenceRequired) ||
    !Array.isArray(result.practicalAdvice) ||
    !Array.isArray(result.warnings) ||
    !Array.isArray(result.officialSources) ||
    !Array.isArray(result.calculationTrace)
  ) {
    throw new TaxEngineConfigurationError("La respuesta no cumple el contrato serializable.");
  }
  if (
    (result.status === "NO_MATCH" || result.status === "UNSUPPORTED") &&
    (result.directTax !== null || result.indirectTax !== null)
  ) {
    throw new TaxEngineConfigurationError(
      `${result.status} no puede inventar un resultado fiscal.`,
    );
  }
  if (
    result.status === "NEEDS_INPUT" &&
    (result.risk !== "UNDETERMINED" ||
      result.directTax !== null ||
      result.indirectTax !== null)
  ) {
    throw new TaxEngineConfigurationError(
      "NEEDS_INPUT debe conservar riesgo indeterminado y no puede anticipar importes fiscales.",
    );
  }
  assertAiFallbackMetadata(result, input);
  return result;
}
