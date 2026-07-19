import {
  validateAdministrativeDomainProjection,
  type AdministrativeMoneyKind,
} from "./administrative-domain";
import { parseAeatDeferralGrantFactsContractV1 } from "./aeat-deferral-grant-facts.v1-contract";
import type {
  AeatDeferralGrantFactsResultV1,
  AeatDeferralMoneyFactV1,
} from "./aeat-deferral-grant-facts.v1";
import { parseAeatEnforcementExplicitFieldsV2 } from "./aeat-enforcement-explicit-fields.v2";
import type {
  AeatEnforcementMoneyFact,
  AeatEnforcementMoneyFactKind,
  AeatEnforcementMoneyFactsResult,
} from "./aeat-enforcement-money-facts";
import { parseAeatOffsetAgreementFactsContractV1 } from "./aeat-offset-agreement-facts.v1-contract";
import type {
  AeatOffsetAgreementFactsResultV1,
  AeatOffsetMoneyFactV1,
} from "./aeat-offset-agreement-facts.v1";
import {
  FISCAL_NOTIFICATION_INPUT_LIMITS,
  assertBoundedId,
  assertBoundedOwnerScope,
} from "./input-contract";
import type { FiscalNotificationLocalAnalysisResult } from "./local-review-flow";
import type {
  AssertionType,
  FieldEvidence,
  FiscalNotificationsWorkspace,
  MoneyComponent,
  PaymentOption,
  UnknownExtractedField,
} from "./types";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";

export const FISCAL_NOTIFICATION_SPECIALIZED_FACTS_ENRICHMENT_VERSION_V1 =
  "1.0.0" as const;

const ENRICHMENT_MARKER = "SPECIALIZED_EXPLICIT_FACTS_V1";
const ANALYSIS_KEYS = new Set([
  "schemaVersion",
  "analysisVersion",
  "technicalReview",
  "ephemeralEnforcementMoneyFacts",
  "ephemeralEnforcementExplicitFields",
  "ephemeralEnforcementPartyFacts",
  "ephemeralDeferralGrantFacts",
  "ephemeralOffsetAgreementFacts",
  "ephemeralVerticalSliceReview",
  "textAcquisition",
  "sourceContentPolicy",
  "requiresHumanReview",
  "materializationPolicy",
]);
const TECHNICAL_REVIEW_KEYS = new Set([
  "schemaVersion",
  "flowVersion",
  "status",
  "reason",
  "engineId",
  "engineVersion",
  "pageCount",
  "byteLength",
  "sha256",
  "candidates",
  "selectedFamilyId",
  "providerCalled",
  "requiresHumanReview",
  "materializationPolicy",
  "retainedSourceContent",
]);
const ENFORCEMENT_ROOT_KEYS = new Set([
  "schemaVersion",
  "engineId",
  "engineVersion",
  "documentType",
  "status",
  "outcome",
  "facts",
  "issues",
  "selectedPaymentAmountKind",
  "semanticPolicy",
  "legalRuleStatus",
  "requiresHumanReview",
  "materializationPolicy",
  "retainedSourceContent",
]);
const ENFORCEMENT_FACT_KEYS = new Set([
  "kind",
  "amountCents",
  "currency",
  "evidence",
  "reviewStatus",
]);
const ENFORCEMENT_EVIDENCE_KEYS = new Set([
  "pageNumber",
  "label",
  "extractionMethod",
  "assertionType",
]);
const ENFORCEMENT_KINDS = new Set<AeatEnforcementMoneyFactKind>([
  "OUTSTANDING_PRINCIPAL",
  "ORDINARY_ENFORCEMENT_SURCHARGE",
  "PAYMENT_ON_ACCOUNT",
  "DOCUMENT_TOTAL",
]);
const ENFORCEMENT_LABELS: Readonly<
  Record<
    AeatEnforcementMoneyFactKind,
    AeatEnforcementMoneyFact["evidence"][number]["label"]
  >
> = Object.freeze({
  OUTSTANDING_PRINCIPAL: "OUTSTANDING_PRINCIPAL_LABEL",
  ORDINARY_ENFORCEMENT_SURCHARGE:
    "ORDINARY_ENFORCEMENT_SURCHARGE_LABEL",
  PAYMENT_ON_ACCOUNT: "PAYMENT_ON_ACCOUNT_LABEL",
  DOCUMENT_TOTAL: "DOCUMENT_TOTAL_LABEL",
});
const MAX_AMOUNT_CENTS = 100_000_000_000;
const REVIEW_DOCUMENT_ID =
  /^document:([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}):vertical:/u;

export interface EnrichVerticalSliceSpecializedFactsInputV1 {
  readonly ownerScope: string;
  readonly createdAt: string;
  readonly workspace: FiscalNotificationsWorkspace;
  readonly documentIds: readonly string[];
  readonly analysis: FiscalNotificationLocalAnalysisResult;
}

export type EnrichVerticalSliceSpecializedFactsResultV1 = Readonly<{
  status: "APPLIED" | "UNCHANGED";
  workspace: FiscalNotificationsWorkspace;
  materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
  requiresHumanReview: true;
}>;

export class FiscalNotificationSpecializedFactsEnrichmentErrorV1 extends Error {
  constructor() {
    super("INVALID_FISCAL_NOTIFICATION_SPECIALIZED_FACTS_ENRICHMENT_V1");
    this.name = "FiscalNotificationSpecializedFactsEnrichmentErrorV1";
  }
}

/**
 * Añade a una ficha vertical únicamente hechos especializados ya extraídos.
 * La transformación conserva importes, fechas y unidades ordinales, pero no
 * copia sujeto, NIF, cuenta, descripción, referencia literal ni texto fuente.
 * Todos los hechos siguen propuestos y la operación no materializa efectos.
 */
export function enrichVerticalSliceSpecializedFactsV1(
  value: EnrichVerticalSliceSpecializedFactsInputV1,
): EnrichVerticalSliceSpecializedFactsResultV1 {
  try {
    assertBoundedOwnerScope(value.ownerScope, "ownerScope");
    if (!isIsoTimestamp(value.createdAt)) throw invalid();
    const documentIds = snapshotIdArray(value.documentIds);
    if (!documentIds || documentIds.length === 0) throw invalid();
    const inputValidation = validateFiscalNotificationsWorkspaceIntegrity(
      value.workspace,
      value.ownerScope,
    );
    if (!inputValidation.valid) throw invalid();
    if (value.workspace.updatedAt !== value.createdAt) throw invalid();

    const analysis = snapshotRecord(value.analysis, ANALYSIS_KEYS);
    if (
      !analysis ||
      analysis.schemaVersion !== 6 ||
      analysis.analysisVersion !== "6.0.0" ||
      analysis.sourceContentPolicy !== "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST" ||
      analysis.requiresHumanReview !== true ||
      analysis.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW"
    ) {
      throw invalid();
    }
    const technical = snapshotRecord(
      analysis.technicalReview,
      TECHNICAL_REVIEW_KEYS,
    );
    if (
      !technical ||
      !Number.isSafeInteger(technical.pageCount) ||
      Number(technical.pageCount) < 1 ||
      Number(technical.pageCount) > FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages
    ) {
      throw invalid();
    }
    const pageCount = Number(technical.pageCount);
    const workspace = structuredClone(
      value.workspace,
    ) as FiscalNotificationsWorkspace;
    const targets = documentIds.map((id) => {
      const document = workspace.documents.find((item) => item.id === id);
      if (!document || document.ownerScope !== value.ownerScope) throw invalid();
      return document;
    });
    if (new Set(targets.map((item) => item.id)).size !== targets.length) {
      throw invalid();
    }

    let changed = false;
    const deferralValue = ownDataValue(analysis, "ephemeralDeferralGrantFacts");
    if (deferralValue !== null) {
      const facts = parseAeatDeferralGrantFactsContractV1(
        deferralValue,
        pageCount,
      );
      if (facts.documentType !== null && facts.debtSchedules.length > 0) {
        const target = optionalUniqueTarget(targets, [
          "collection.deferral_grant",
          "collection.deferral_modification",
        ]);
        if (target) {
          changed =
            enrichDeferral(workspace, target, facts, value.createdAt) || changed;
        }
      }
    }

    const offsetValue = ownDataValue(analysis, "ephemeralOffsetAgreementFacts");
    if (offsetValue !== null) {
      const facts = parseAeatOffsetAgreementFactsContractV1(
        offsetValue,
        pageCount,
      );
      if (
        facts.documentType !== null &&
        facts.agreementMode !== null &&
        (facts.credits.length > 0 || facts.debts.length > 0)
      ) {
        const expectedFamily =
          facts.agreementMode === "REQUESTED"
            ? "collection.offset_requested"
            : "collection.offset_ex_officio";
        const target = optionalUniqueTarget(targets, [expectedFamily]);
        if (target) {
          changed =
            enrichOffset(workspace, target, facts, value.createdAt) || changed;
        }
      }
    }

    const enforcementValue = ownDataValue(
      analysis,
      "ephemeralEnforcementMoneyFacts",
    );
    if (enforcementValue !== null) {
      const facts = parseEnforcementMoneyFacts(enforcementValue, pageCount);
      const explicitValue = ownDataValue(
        analysis,
        "ephemeralEnforcementExplicitFields",
      );
      const explicit =
        explicitValue === null
          ? null
          : parseAeatEnforcementExplicitFieldsV2(explicitValue, pageCount);
      if (facts.facts.length > 0) {
        const target = optionalUniqueTarget(targets, [
          "collection.enforcement_order",
        ]);
        if (target) {
          changed =
            enrichEnforcement(
              workspace,
              target,
              facts,
              explicit,
              value.createdAt,
            ) || changed;
        }
      }
    }

    if (!changed) return freezeResult("UNCHANGED", value.workspace);
    const outputValidation = validateFiscalNotificationsWorkspaceIntegrity(
      workspace,
      value.ownerScope,
    );
    if (!outputValidation.valid) throw invalid();
    return freezeResult("APPLIED", workspace);
  } catch (error) {
    if (error instanceof FiscalNotificationSpecializedFactsEnrichmentErrorV1) {
      throw error;
    }
    throw invalid();
  }
}

function enrichDeferral(
  workspace: FiscalNotificationsWorkspace,
  document: FiscalNotificationsWorkspace["documents"][number],
  facts: AeatDeferralGrantFactsResultV1,
  createdAt: string,
): boolean {
  const context = enrichmentContext(workspace, document, "deferral");
  if (!context) return false;
  const { snapshot, token } = context;
  const newEvidence: FieldEvidence[] = [];
  const newMoney = [...(snapshot.structuredData.administrativeDomain?.moneyFacts ?? [])];
  const paymentOptions: PaymentOption[] = [];

  if (facts.header.grantedTotal) {
    const evidenceId = moneyEvidence(
      newEvidence,
      document,
      `${token}:d:grant`,
      "Importe total concedido",
      facts.header.grantedTotal,
    );
    newMoney.push(
      moneyFact(
        document,
        `${token}:d:grant`,
        "DOCUMENT_TOTAL",
        facts.header.grantedTotal.amountCents,
        [evidenceId],
        createdAt,
      ),
    );
  }

  let ordinal = 0;
  facts.debtSchedules.forEach((schedule, scheduleIndex) => {
    if (schedule.listedDebtAmount) {
      const evidenceId = moneyEvidence(
        newEvidence,
        document,
        `${token}:d:s${pad(scheduleIndex)}:base`,
        "Importe de deuda del calendario",
        schedule.listedDebtAmount,
      );
      newMoney.push(
        moneyFact(
          document,
          `${token}:d:s${pad(scheduleIndex)}:base`,
          "ORIGINAL_TAX_PRINCIPAL",
          schedule.listedDebtAmount.amountCents,
          [evidenceId],
          createdAt,
        ),
      );
    }
    schedule.installments.forEach((installment, installmentIndex) => {
      ordinal += 1;
      const unit = `s${pad(scheduleIndex)}:i${pad(installmentIndex)}`;
      const totalEvidenceId = moneyEvidence(
        newEvidence,
        document,
        `${token}:d:${unit}:t`,
        "Importe de la cuota",
        installment.installmentTotal,
      );
      const dueEvidenceId = dateEvidence(
        newEvidence,
        document,
        `${token}:d:${unit}:v`,
        "Vencimiento de la cuota",
        installment.dueDate.calendarDate,
        installment.dueDate.pageNumbers,
      );
      const components: MoneyComponent[] = [];
      if (installment.layout === "COMPONENT_BREAKDOWN") {
        components.push(
          component(
            "PRINCIPAL",
            installment.principal,
            moneyEvidence(
              newEvidence,
              document,
              `${token}:d:${unit}:p`,
              "Principal de la cuota",
              installment.principal,
            ),
          ),
          component(
            "OTHER",
            installment.enforcementSurcharge,
            moneyEvidence(
              newEvidence,
              document,
              `${token}:d:${unit}:r`,
              "Recargo de la cuota",
              installment.enforcementSurcharge,
            ),
          ),
          component(
            "INTEREST",
            installment.interest,
            moneyEvidence(
              newEvidence,
              document,
              `${token}:d:${unit}:j`,
              "Interés de la cuota",
              installment.interest,
            ),
          ),
        );
      } else {
        components.push({
          type: "AMOUNT_TO_PAY",
          amountCents: installment.installmentTotal.amountCents,
          assertionType: "EXPLICIT_IN_DOCUMENT",
          evidenceIds: [totalEvidenceId],
        });
      }
      const evidenceIds = unique([
        totalEvidenceId,
        dueEvidenceId,
        ...components.flatMap((item) => item.evidenceIds),
      ]);
      paymentOptions.push({
        id: `payment-option:${token}:d:${unit}`,
        ownerScope: document.ownerScope,
        documentId: document.id,
        title: `Cuota ${ordinal}`,
        eligibilityCondition: "Dato del documento pendiente de revisión humana.",
        components,
        totalCents: installment.installmentTotal.amountCents,
        deadline: installment.dueDate.calendarDate,
        deadlineStatus: "DOCUMENT_STATED",
        evidenceIds,
      });
    });
  });
  if (paymentOptions.length === 0 && newMoney.length === 0) return false;
  assertNewIds(workspace.evidence, newEvidence);
  assertNewIds(workspace.paymentOptions, paymentOptions);
  workspace.evidence.push(...newEvidence);
  workspace.paymentOptions.push(...paymentOptions);
  replaceAdministrativeMoney(snapshot, document, newMoney);
  document.documentType = "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT";
  snapshot.structuredData.documentType =
    "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT";
  snapshot.structuredData.paymentOptionIds.push(
    ...paymentOptions.map((item) => item.id),
  );
  snapshot.evidenceIds.push(...newEvidence.map((item) => item.id));
  pushUniqueCodes(
    snapshot.structuredData.validationCodes,
    ENRICHMENT_MARKER,
    "PRINTED_INSTALLMENT_UNITS_PRESERVED",
    "NO_OPERATIONAL_EFFECT",
  );
  document.updatedAt = createdAt;
  return true;
}

function enrichOffset(
  workspace: FiscalNotificationsWorkspace,
  document: FiscalNotificationsWorkspace["documents"][number],
  facts: AeatOffsetAgreementFactsResultV1,
  createdAt: string,
): boolean {
  const context = enrichmentContext(workspace, document, "offset");
  if (!context) return false;
  const { snapshot, token } = context;
  const newEvidence: FieldEvidence[] = [];
  const newUnknown: UnknownExtractedField[] = [];
  const newMoney = [...(snapshot.structuredData.administrativeDomain?.moneyFacts ?? [])];

  facts.credits.forEach((credit, index) => {
    const row = `c${pad(index)}`;
    appendOffsetMoney(newMoney, newEvidence, document, token, row, "REFUND_CREDIT", "Crédito reconocido", credit.creditAmount, createdAt);
    appendOffsetMoney(newMoney, newEvidence, document, token, row, "LATE_PAYMENT_INTEREST", "Interés del crédito", credit.delayInterest, createdAt);
    appendOffsetMoney(newMoney, newEvidence, document, token, row, "CREDIT_TOTAL", "Total del crédito", credit.totalCredit, createdAt);
    appendOffsetMoney(newMoney, newEvidence, document, token, row, "OFFSET_APPLIED", "Compensación aplicada al crédito", credit.compensatedAmount, createdAt);
  });
  facts.debts.forEach((debt, index) => {
    const row = `b${pad(index)}`;
    appendOffsetMoney(newMoney, newEvidence, document, token, row, "OUTSTANDING_PRINCIPAL", "Principal pendiente", debt.principalPending, createdAt);
    appendOffsetMoney(newMoney, newEvidence, document, token, row, "EXECUTIVE_SURCHARGE_PRINTED", "Recargo ejecutivo", debt.enforcementSurcharge, createdAt);
    if (debt.delayInterest) {
      appendOffsetMoney(newMoney, newEvidence, document, token, row, "LATE_PAYMENT_INTEREST", "Interés de demora", debt.delayInterest, createdAt);
    }
    appendOffsetMoney(newMoney, newEvidence, document, token, row, "PAYMENT_ON_ACCOUNT", "Ingreso a cuenta", debt.paymentsOnAccount, createdAt);
    appendOffsetMoney(newMoney, newEvidence, document, token, row, "TOTAL_BEFORE_OFFSET", "Total antes de compensar", debt.totalBeforeOffset, createdAt);
    appendOffsetMoney(newMoney, newEvidence, document, token, row, "OFFSET_APPLIED", "Compensación aplicada", debt.compensatedAmount, createdAt);
    appendOffsetMoney(newMoney, newEvidence, document, token, row, "REMAINING_AFTER_OFFSET", "Pendiente tras compensar", debt.remainingAfterOffset, createdAt);
    const dateId = dateEvidence(
      newEvidence,
      document,
      `${token}:o:${row}:f`,
      "Fecha de efectos de la fila",
      debt.effectDate.calendarDate,
      debt.effectDate.pageNumbers,
    );
    newUnknown.push({
      labelRaw: `SPECIALIZED|OFFSET|DEBT|${pad(index)}|EFFECT_DATE`,
      valueRaw: debt.effectDate.calendarDate,
      page: debt.effectDate.pageNumbers[0]!,
      evidenceId: dateId,
      confidence: "EXACT",
    });
    const effectId = addEvidence(
      newEvidence,
      document,
      `${token}:o:${row}:e`,
      "Efecto indicado en la fila",
      debt.effectMeaning,
      debt.effectStatementPageNumbers,
      "INFERRED",
      "HIGH",
    );
    newUnknown.push({
      labelRaw: `SPECIALIZED|OFFSET|DEBT|${pad(index)}|EFFECT`,
      valueRaw: debt.effectMeaning,
      page: debt.effectStatementPageNumbers[0]!,
      evidenceId: effectId,
      confidence: "HIGH",
    });
  });
  if (newEvidence.length === 0) return false;
  assertNewIds(workspace.evidence, newEvidence);
  workspace.evidence.push(...newEvidence);
  replaceAdministrativeMoney(snapshot, document, newMoney);
  document.documentType = "AEAT_OFFSET_AGREEMENT";
  snapshot.structuredData.documentType = "AEAT_OFFSET_AGREEMENT";
  snapshot.structuredData.unknownFields.push(...newUnknown);
  snapshot.evidenceIds.push(...newEvidence.map((item) => item.id));
  pushUniqueCodes(
    snapshot.structuredData.validationCodes,
    ENRICHMENT_MARKER,
    "PRINTED_OFFSET_ROWS_PRESERVED",
    "PRINTED_EFFECT_TEXT_ONLY",
    "NO_OPERATIONAL_EFFECT",
  );
  document.updatedAt = createdAt;
  return true;
}

function enrichEnforcement(
  workspace: FiscalNotificationsWorkspace,
  document: FiscalNotificationsWorkspace["documents"][number],
  facts: AeatEnforcementMoneyFactsResult,
  explicit: ReturnType<typeof parseAeatEnforcementExplicitFieldsV2> | null,
  createdAt: string,
): boolean {
  const context = enrichmentContext(workspace, document, "enforcement");
  if (!context) return false;
  const { snapshot, token } = context;
  const newEvidence: FieldEvidence[] = [];
  const newUnknown: UnknownExtractedField[] = [];
  const newMoney = [...(snapshot.structuredData.administrativeDomain?.moneyFacts ?? [])];
  facts.facts.forEach((fact, index) => {
    const evidenceIds = fact.evidence.map((item, evidenceIndex) =>
      addEvidence(
        newEvidence,
        document,
        `${token}:a:${pad(index)}:${pad(evidenceIndex)}`,
        enforcementLabel(fact.kind),
        String(fact.amountCents),
        [item.pageNumber],
        "EXPLICIT_IN_DOCUMENT",
        "EXACT",
      ),
    );
    newMoney.push(
      moneyFact(
        document,
        `${token}:a:${pad(index)}`,
        enforcementMoneyKind(fact.kind),
        fact.amountCents,
        evidenceIds,
        createdAt,
        fact.currency,
      ),
    );
  });
  explicit?.printedDateFacts.forEach((fact, index) => {
    const evidenceId = dateEvidence(
      newEvidence,
      document,
      `${token}:a:f${pad(index)}`,
      enforcementDateLabel(fact.kind),
      fact.calendarDate,
      fact.pageNumbers,
    );
    newUnknown.push({
      labelRaw: `SPECIALIZED|ENFORCEMENT|DATE|${fact.kind}`,
      valueRaw: fact.calendarDate,
      page: fact.pageNumbers[0]!,
      evidenceId,
      confidence: "EXACT",
    });
  });
  if (newEvidence.length === 0) return false;
  assertNewIds(workspace.evidence, newEvidence);
  workspace.evidence.push(...newEvidence);
  replaceAdministrativeMoney(snapshot, document, newMoney);
  document.documentType = "AEAT_ENFORCEMENT_ORDER";
  snapshot.structuredData.documentType = "AEAT_ENFORCEMENT_ORDER";
  snapshot.structuredData.unknownFields.push(...newUnknown);
  snapshot.evidenceIds.push(...newEvidence.map((item) => item.id));
  pushUniqueCodes(
    snapshot.structuredData.validationCodes,
    ENRICHMENT_MARKER,
    "PRINTED_ENFORCEMENT_FACTS_PRESERVED",
    "NO_OPERATIONAL_EFFECT",
  );
  document.updatedAt = createdAt;
  return true;
}

function enrichmentContext(
  workspace: FiscalNotificationsWorkspace,
  document: FiscalNotificationsWorkspace["documents"][number],
  category: string,
): {
  snapshot: FiscalNotificationsWorkspace["analysisSnapshots"][number];
  token: string;
} | null {
  const snapshots = document.analysisSnapshotIds.map((id) =>
    workspace.analysisSnapshots.find((item) => item.id === id),
  );
  if (snapshots.length !== 1 || !snapshots[0]) throw invalid();
  const snapshot = snapshots[0];
  if (snapshot.ownerScope !== document.ownerScope) throw invalid();
  if (snapshot.structuredData.validationCodes.includes(ENRICHMENT_MARKER)) {
    return null;
  }
  const match = REVIEW_DOCUMENT_ID.exec(document.id);
  if (!match?.[1]) throw invalid();
  const token = `${match[1]}:${category}`;
  assertBoundedId(token, "token");
  return { snapshot, token };
}

function replaceAdministrativeMoney(
  snapshot: FiscalNotificationsWorkspace["analysisSnapshots"][number],
  document: FiscalNotificationsWorkspace["documents"][number],
  moneyFacts: NonNullable<
    FiscalNotificationsWorkspace["analysisSnapshots"][number]["structuredData"]["administrativeDomain"]
  >["moneyFacts"],
): void {
  const current = snapshot.structuredData.administrativeDomain;
  if (!current) throw invalid();
  const validation = validateAdministrativeDomainProjection(
    {
      ...current,
      status: "REVIEW_REQUIRED",
      moneyFacts,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
      requiresHumanReview: true,
    },
    document.ownerScope,
    document.id,
  );
  if (!validation.valid || !validation.projection) throw invalid();
  snapshot.structuredData.administrativeDomain = validation.projection;
}

function appendOffsetMoney(
  target: Array<
    NonNullable<
      FiscalNotificationsWorkspace["analysisSnapshots"][number]["structuredData"]["administrativeDomain"]
    >["moneyFacts"][number]
  >,
  evidence: FieldEvidence[],
  document: FiscalNotificationsWorkspace["documents"][number],
  token: string,
  row: string,
  kind: AdministrativeMoneyKind,
  label: string,
  fact: AeatOffsetMoneyFactV1,
  createdAt: string,
): void {
  const suffix = `${token}:o:${row}:${kind.toLowerCase()}`;
  const evidenceId = moneyEvidence(
    evidence,
    document,
    suffix,
    label,
    fact,
  );
  target.push(
    moneyFact(
      document,
      suffix,
      kind,
      fact.amountCents,
      [evidenceId],
      createdAt,
    ),
  );
}

function moneyEvidence(
  evidence: FieldEvidence[],
  document: FiscalNotificationsWorkspace["documents"][number],
  suffix: string,
  label: string,
  fact: AeatDeferralMoneyFactV1 | AeatOffsetMoneyFactV1,
): string {
  return addEvidence(
    evidence,
    document,
    suffix,
    label,
    String(fact.amountCents),
    fact.pageNumbers,
    "EXPLICIT_IN_DOCUMENT",
    "EXACT",
  );
}

function dateEvidence(
  evidence: FieldEvidence[],
  document: FiscalNotificationsWorkspace["documents"][number],
  suffix: string,
  label: string,
  calendarDate: string,
  pageNumbers: readonly number[],
): string {
  return addEvidence(
    evidence,
    document,
    suffix,
    label,
    calendarDate,
    pageNumbers,
    "EXPLICIT_IN_DOCUMENT",
    "EXACT",
  );
}

function addEvidence(
  target: FieldEvidence[],
  document: FiscalNotificationsWorkspace["documents"][number],
  suffix: string,
  label: string,
  retainedValue: string,
  pageNumbers: readonly number[],
  assertionType: AssertionType,
  confidence: FieldEvidence["confidence"],
): string {
  if (pageNumbers.length === 0) throw invalid();
  const id = `evidence:${suffix}`;
  assertBoundedId(id, "evidenceId");
  const pageNumber = pageNumbers[0]!;
  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1) throw invalid();
  target.push({
    id,
    ownerScope: document.ownerScope,
    documentId: document.id,
    pageNumber,
    textSnippet: label,
    rawValue: retainedValue,
    extractionMethod: "RULE",
    confidence,
    assertionType,
  });
  return id;
}

function component(
  type: MoneyComponent["type"],
  fact: AeatDeferralMoneyFactV1,
  evidenceId: string,
): MoneyComponent {
  return {
    type,
    amountCents: fact.amountCents,
    assertionType: "EXPLICIT_IN_DOCUMENT",
    evidenceIds: [evidenceId],
  };
}

function moneyFact(
  document: FiscalNotificationsWorkspace["documents"][number],
  suffix: string,
  kind: AdministrativeMoneyKind,
  amountCents: number,
  evidenceIds: readonly string[],
  createdAt: string,
  currency: "EUR" | "UNKNOWN" = "EUR",
) {
  const id = `money:${suffix}`;
  assertBoundedId(id, "moneyFactId");
  return {
    id,
    ownerScope: document.ownerScope,
    documentId: document.id,
    kind,
    amountCents,
    currency,
    assertionType: "EXPLICIT_IN_DOCUMENT" as const,
    evidenceIds: [...evidenceIds],
    lineageParentIds: [],
    status: "PROPOSED" as const,
    createdAt,
  };
}

function optionalUniqueTarget(
  documents: readonly FiscalNotificationsWorkspace["documents"][number][],
  families: readonly string[],
): FiscalNotificationsWorkspace["documents"][number] | null {
  const matches = documents.filter(
    (document) =>
      document.documentSubtype !== undefined &&
      families.includes(document.documentSubtype),
  );
  if (matches.length > 1) throw invalid();
  return matches[0] ?? null;
}

function parseEnforcementMoneyFacts(
  value: unknown,
  pageCount: number,
): AeatEnforcementMoneyFactsResult {
  const root = snapshotRecord(value, ENFORCEMENT_ROOT_KEYS);
  if (
    !root ||
    root.schemaVersion !== 1 ||
    root.engineId !== "aeat-enforcement-money-facts" ||
    (root.engineVersion !== "1.0.0" &&
      root.engineVersion !== "1.1.0" &&
      root.engineVersion !== "1.2.0") ||
    root.documentType !== "AEAT_ENFORCEMENT_ORDER" ||
    root.status !== "REVIEW_REQUIRED" ||
    root.outcome !== "FACTS_AVAILABLE" ||
    root.selectedPaymentAmountKind !== null ||
    root.semanticPolicy !== "EXPLICIT_DOCUMENT_FACTS_ONLY" ||
    root.legalRuleStatus !== "NOT_APPLIED" ||
    root.requiresHumanReview !== true ||
    root.materializationPolicy !== "PROHIBITED_UNTIL_REVIEW" ||
    root.retainedSourceContent !== "NONE"
  ) {
    throw invalid();
  }
  const factsInput = snapshotArray(root.facts, 4);
  const issues = snapshotArray(root.issues, 32);
  if (!factsInput || factsInput.length === 0 || !issues || issues.length !== 0) {
    throw invalid();
  }
  const seen = new Set<string>();
  const facts = factsInput.map((entry) => {
    const fact = snapshotRecord(entry, ENFORCEMENT_FACT_KEYS);
    if (
      !fact ||
      !ENFORCEMENT_KINDS.has(fact.kind as AeatEnforcementMoneyFactKind) ||
      seen.has(String(fact.kind)) ||
      !Number.isSafeInteger(fact.amountCents) ||
      Number(fact.amountCents) < 0 ||
      Number(fact.amountCents) > MAX_AMOUNT_CENTS ||
      (fact.currency !== "EUR" && fact.currency !== "UNKNOWN") ||
      fact.reviewStatus !== "REVIEW_REQUIRED"
    ) {
      throw invalid();
    }
    seen.add(String(fact.kind));
    const evidenceInput = snapshotArray(fact.evidence, pageCount);
    if (!evidenceInput || evidenceInput.length === 0) throw invalid();
    const evidence = evidenceInput.map((entryValue) => {
      const item = snapshotRecord(entryValue, ENFORCEMENT_EVIDENCE_KEYS);
      if (
        !item ||
        !Number.isSafeInteger(item.pageNumber) ||
        Number(item.pageNumber) < 1 ||
        Number(item.pageNumber) > pageCount ||
        item.label !==
          ENFORCEMENT_LABELS[fact.kind as AeatEnforcementMoneyFactKind] ||
        item.extractionMethod !== "RULE" ||
        item.assertionType !== "EXPLICIT_IN_DOCUMENT"
      ) {
        throw invalid();
      }
      return Object.freeze({
        pageNumber: Number(item.pageNumber),
        label: item.label as AeatEnforcementMoneyFact["evidence"][number]["label"],
        extractionMethod: "RULE" as const,
        assertionType: "EXPLICIT_IN_DOCUMENT" as const,
      });
    });
    return Object.freeze({
      kind: fact.kind as AeatEnforcementMoneyFactKind,
      amountCents: Number(fact.amountCents),
      currency: fact.currency as "EUR" | "UNKNOWN",
      evidence: Object.freeze(evidence),
      reviewStatus: "REVIEW_REQUIRED" as const,
    });
  });
  return Object.freeze({
    schemaVersion: 1 as const,
    engineId: "aeat-enforcement-money-facts" as const,
    engineVersion: root.engineVersion as "1.0.0" | "1.1.0" | "1.2.0",
    documentType: "AEAT_ENFORCEMENT_ORDER" as const,
    status: "REVIEW_REQUIRED" as const,
    outcome: "FACTS_AVAILABLE" as const,
    facts: Object.freeze(facts),
    issues: Object.freeze([]),
    selectedPaymentAmountKind: null,
    semanticPolicy: "EXPLICIT_DOCUMENT_FACTS_ONLY" as const,
    legalRuleStatus: "NOT_APPLIED" as const,
    requiresHumanReview: true as const,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW" as const,
    retainedSourceContent: "NONE" as const,
  });
}

function enforcementMoneyKind(
  value: AeatEnforcementMoneyFactKind,
): AdministrativeMoneyKind {
  switch (value) {
    case "OUTSTANDING_PRINCIPAL":
      return "OUTSTANDING_PRINCIPAL";
    case "ORDINARY_ENFORCEMENT_SURCHARGE":
      return "EXECUTIVE_SURCHARGE_20";
    case "PAYMENT_ON_ACCOUNT":
      return "PAYMENT_ON_ACCOUNT";
    case "DOCUMENT_TOTAL":
      return "DOCUMENT_TOTAL";
  }
}

function enforcementLabel(value: AeatEnforcementMoneyFactKind): string {
  switch (value) {
    case "OUTSTANDING_PRINCIPAL":
      return "Principal pendiente";
    case "ORDINARY_ENFORCEMENT_SURCHARGE":
      return "Recargo de apremio ordinario";
    case "PAYMENT_ON_ACCOUNT":
      return "Ingreso a cuenta";
    case "DOCUMENT_TOTAL":
      return "Importe total";
  }
}

function enforcementDateLabel(value: string): string {
  switch (value) {
    case "PRINTED_ISSUE_DATE":
      return "Fecha de emisión";
    case "PRINTED_SIGNATURE_DATE":
      return "Fecha de firma";
    case "PRINTED_VOLUNTARY_PERIOD_END_DATE":
      return "Fin del período voluntario";
    default:
      throw invalid();
  }
}

function ownDataValue(record: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
    throw invalid();
  }
  return descriptor.value;
}

function snapshotRecord(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const result: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string" || !allowedKeys.has(key)) return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        return null;
      }
      result[key] = descriptor.value;
    }
    return result;
  } catch {
    return null;
  }
}

function snapshotArray(value: unknown, max: number): unknown[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  try {
    const result: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        return null;
      }
      result.push(descriptor.value);
    }
    return Reflect.ownKeys(value).length === value.length + 1 ? result : null;
  } catch {
    return null;
  }
}

function snapshotIdArray(value: unknown): string[] | null {
  const items = snapshotArray(value, FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems);
  if (!items) return null;
  const ids: string[] = [];
  for (const item of items) {
    try {
      assertBoundedId(item, "documentId");
    } catch {
      return null;
    }
    ids.push(item as string);
  }
  return ids;
}

function assertNewIds(
  existing: readonly { readonly id: string }[],
  additions: readonly { readonly id: string }[],
): void {
  const seen = new Set(existing.map((item) => item.id));
  for (const item of additions) {
    assertBoundedId(item.id, "id");
    if (seen.has(item.id)) throw invalid();
    seen.add(item.id);
  }
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function pushUniqueCodes(target: string[], ...codes: string[]): void {
  const seen = new Set(target);
  for (const code of codes) {
    if (!seen.has(code)) {
      target.push(code);
      seen.add(code);
    }
  }
}

function pad(value: number): string {
  return String(value + 1).padStart(3, "0");
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function freezeResult(
  status: "APPLIED" | "UNCHANGED",
  workspace: FiscalNotificationsWorkspace,
): EnrichVerticalSliceSpecializedFactsResultV1 {
  deepFreeze(workspace);
  return Object.freeze({
    status,
    workspace,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW" as const,
    requiresHumanReview: true as const,
  });
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function invalid(): FiscalNotificationSpecializedFactsEnrichmentErrorV1 {
  return new FiscalNotificationSpecializedFactsEnrichmentErrorV1();
}
