import type {
  AdministrativeDocument,
  AssertionType,
  FiscalNotificationsWorkspace,
  MoneyComponent,
} from "./types";
import { sha256Hex } from "../document-integrity/snapshot-hash";
import {
  DOCUMENT_DATE_KINDS_V2,
  FISCAL_NOTIFICATIONS_PROJECTED_RELATION_ALGORITHM_VERSION_V2,
  parseFiscalNotificationsWorkspaceForPersistenceV2,
  type AssertionTypeV2,
  type ChronologyBasisV2,
  type DocumentDateKindV2,
  type FiscalNotificationsPersistedWorkspaceV2,
  type IssuerCodeV2,
  type PersistedAmountFactV2,
  type PersistedDateFactV2,
  type PersistedReferenceV2,
  type PersistedStateValueV2,
  type PersistedTypedFactV2,
} from "./persisted-workspace.v2";
import type { FiscalNotificationDocumentFamilyIdV3 } from "./knowledge/document-families.v3";
import { resolveAeatDocumentProfileV1 } from "./knowledge/aeat-document-knowledge.v1";
import {
  resolveAeatOfficialCatalogProfileV9,
  type AeatOfficialCatalogProfileIdV9,
} from "./knowledge/official-catalog-expansion.v9";
import { normalizeFiscalNotificationReferenceV2 } from "./exact-reference-index.v2";
import {
  createSensitiveReferenceV2Sync,
  normalizeSensitiveReferenceForFingerprintV2,
  parseSensitiveReferenceMemoryCarrierV2,
} from "./sensitive-reference.v2";
import { resolveFiscalNotificationChronologyV2 } from "./chronology-date.v2";
import { isInternalFiscalNotificationFieldArtifact } from "./document-fact-observation.v1";
import { GLOBAL_RECONCILIATION_RULE_VERSION_V8 } from "./global-reconciliation.v8";
import {
  STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2,
  STRUCTURED_REVIEW_RELATION_ALGORITHM_VERSION_V1,
  STRUCTURED_REVIEW_TYPED_RELATION_ALGORITHM_VERSION_V1,
} from "./structured-review-relation-suggestions.v1";

const SENSITIVE_REFERENCE_TYPES = new Set([
  "CSV",
  "NRC",
  "VEHICLE_OR_FINE_REFERENCE",
]);
const DOCUMENT_DATE_FIELD_KINDS = new Set<string>(DOCUMENT_DATE_KINDS_V2);
const PROJECTABLE_RELATION_ALGORITHMS = new Set<string>([
  STRUCTURED_REVIEW_RELATION_ALGORITHM_VERSION_V1,
  STRUCTURED_REVIEW_TYPED_RELATION_ALGORITHM_VERSION_V1,
  STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2,
  GLOBAL_RECONCILIATION_RULE_VERSION_V8,
  FISCAL_NOTIFICATIONS_PROJECTED_RELATION_ALGORITHM_VERSION_V2,
]);
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;

function isIsoCalendarDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function projectedEntityId(
  prefix: "date" | "amount" | "fact",
  identity: readonly unknown[],
  existingIds: readonly string[],
): string {
  const base = `${prefix}:v2:${sha256Hex(JSON.stringify(identity)).slice(0, 32)}`;
  const occurrence = existingIds.filter(
    (id) => id === base || id.startsWith(`${base}:`),
  ).length;
  return occurrence === 0 ? base : `${base}:${occurrence}`;
}

function issuerForDocument(
  document: AdministrativeDocument,
  workspace: FiscalNotificationsWorkspace,
): IssuerCodeV2 {
  const authority = workspace.authorities.find(
    (entry) => entry.id === document.authorityId,
  );
  return authority?.administrationType ?? "OTHER";
}

function assertionType(value: AssertionType): AssertionTypeV2 {
  if (value === "EXPLICIT_IN_DOCUMENT") return "EXPLICIT_IN_DOCUMENT";
  if (value === "CALCULATED") return "CALCULATED_FROM_PRINTED_VALUES";
  return "NOT_PROVEN_BY_DOCUMENT";
}

const EXACT_LEGACY_FAMILY_MAP: Readonly<
  Partial<
    Record<
      AdministrativeDocument["documentType"],
      FiscalNotificationDocumentFamilyIdV3
    >
  >
> = Object.freeze({
  AEAT_ENFORCEMENT_ORDER: "collection.enforcement_order",
  AEAT_INSTALLMENT_OR_DEFERRAL_GRANT: "collection.deferral_grant",
  AEAT_INSTALLMENT_OR_DEFERRAL_DENIAL: "collection.deferral_denial",
  AEAT_PAYMENT_FORM: "payment.payment_form",
  AEAT_ASSESSMENT_PROPOSAL: "assessment.allegations_and_proposal",
  AEAT_ASSESSMENT: "assessment.final_provisional_assessment",
  AEAT_SANCTION_PROPOSAL: "sanction.initiation_and_hearing",
  AEAT_SANCTION_DECISION: "sanction.resolution",
});

function recognizedFamilyForDocument(
  document: AdministrativeDocument,
  workspace: FiscalNotificationsWorkspace,
):
  FiscalNotificationDocumentFamilyIdV3 | AeatOfficialCatalogProfileIdV9 | null {
  if (
    document.documentType === "AEAT_OFFSET_AGREEMENT" &&
    issuerForDocument(document, workspace) === "AEAT"
  ) {
    if (document.documentSubtype === "REQUESTED") {
      return "collection.offset_requested";
    }
    if (document.documentSubtype === "EX_OFFICIO") {
      return "collection.offset_ex_officio";
    }
  }
  const knowledgeProfile = resolveAeatDocumentProfileV1(
    document.documentSubtype,
  );
  if (knowledgeProfile && issuerForDocument(document, workspace) === "AEAT") {
    return knowledgeProfile.id;
  }
  const officialCatalogProfile = resolveAeatOfficialCatalogProfileV9(
    document.documentSubtype,
  );
  if (
    officialCatalogProfile &&
    issuerForDocument(document, workspace) === "AEAT"
  ) {
    return officialCatalogProfile.id;
  }
  const snapshots = document.analysisSnapshotIds
    .map((id) => workspace.analysisSnapshots.find((entry) => entry.id === id))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .sort((left, right) => right.version - left.version);
  for (const snapshot of snapshots) {
    const recognition = snapshot.structuredData.templateRecognition;
    if (
      recognition?.status !== "MATCHED" ||
      !recognition.selectedTemplateId ||
      !recognition.selectedTemplateVersion
    ) {
      continue;
    }
    const candidate = recognition.candidates.find(
      (entry) =>
        entry.templateId === recognition.selectedTemplateId &&
        entry.templateVersion === recognition.selectedTemplateVersion &&
        entry.activationReady,
    );
    const profile = resolveAeatDocumentProfileV1(candidate?.familyId);
    if (profile) return profile.id;
  }
  return issuerForDocument(document, workspace) === "AEAT"
    ? (EXACT_LEGACY_FAMILY_MAP[document.documentType] ?? null)
    : null;
}

function identityProjection(workspace: FiscalNotificationsWorkspace) {
  const subjectParties = workspace.documents
    .map((document) => document.subjectParty)
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
  const statuses = subjectParties
    .map((subjectParty) => subjectParty.matchesBusinessProfile)
    .filter((value): value is "MATCH" | "MISMATCH" | "UNKNOWN" =>
      Boolean(value),
    );
  const identityMatchStatus = statuses.includes("MISMATCH")
    ? ("MISMATCH" as const)
    : statuses.includes("MATCH")
      ? ("MATCH" as const)
      : ("UNKNOWN" as const);
  return {
    ownerScope: workspace.ownerScope,
    role: "ACCOUNT_HOLDER" as const,
    identityMatchStatus,
    identityMatchMethod: subjectParties.some((subjectParty) =>
      Boolean(subjectParty.taxIdNormalized),
    )
      ? ("TAX_ID" as const)
      : statuses.length > 0
        ? ("STRUCTURAL_ROLE" as const)
        : ("NOT_AVAILABLE" as const),
  };
}

function pushDocumentDates(input: {
  workspace: FiscalNotificationsWorkspace;
  document: AdministrativeDocument;
  dates: PersistedDateFactV2[];
}): void {
  const evidenceById = new Map(
    input.workspace.evidence
      .filter((entry) => entry.documentId === input.document.id)
      .map((entry) => [entry.id, entry] as const),
  );
  const explicitDates = input.document.analysisSnapshotIds.flatMap(
    (snapshotId) => {
      const snapshot = input.workspace.analysisSnapshots.find(
        (entry) =>
          entry.id === snapshotId && entry.documentId === input.document.id,
      );
      if (!snapshot) return [];
      return snapshot.structuredData.unknownFields.flatMap((field) => {
        const parts = field.labelRaw.split("|");
        if (parts[0] !== "VSR2" || parts.length < 5 || parts[2] !== "DATE") {
          return [];
        }
        const encodedFieldId = parts[1]!;
        const canonicalType = parts[3]!;
        const label = parts.slice(4).join("|");
        const profileFieldCode = /^profile:date:([A-Z0-9_]+):\d+$/u.exec(
          encodedFieldId,
        )?.[1];
        const rawFieldCode = profileFieldCode ?? canonicalType;
        const fieldCode =
          rawFieldCode === "SIGNATURE_DATE" ? "SIGNING_DATE" : rawFieldCode;
        if (!DOCUMENT_DATE_FIELD_KINDS.has(fieldCode)) return [];
        const evidence = field.evidenceId
          ? evidenceById.get(field.evidenceId)
          : undefined;
        if (
          !evidence ||
          evidence.assertionType !== "EXPLICIT_IN_DOCUMENT" ||
          evidence.extractionMethod !== "RULE"
        ) {
          return [];
        }
        if (
          !isIsoCalendarDate(field.valueRaw) ||
          isInternalFiscalNotificationFieldArtifact({
            fieldId: encodedFieldId,
            semantic: "DATE",
            canonicalType,
            label,
            value: field.valueRaw,
          })
        ) {
          return [];
        }
        return [
          {
            fieldId: fieldCode,
            kind: fieldCode as DocumentDateKindV2,
            value: field.valueRaw,
            evidenceIds: [evidence.id],
          },
        ];
      });
    },
  );
  const explicitByKind = new Map(
    explicitDates.map((entry) => [entry.kind, entry] as const),
  );
  const candidates: Array<{
    fieldId: string;
    kind: DocumentDateKindV2;
    value: string | undefined;
    evidenceIds: readonly string[];
  }> = [
    {
      fieldId: "ISSUE_DATE",
      kind: "ISSUE_DATE",
      value:
        input.document.issueDate ?? explicitByKind.get("ISSUE_DATE")?.value,
      evidenceIds: explicitByKind.get("ISSUE_DATE")?.evidenceIds ?? [],
    },
    {
      fieldId: "SIGNING_DATE",
      kind: "SIGNING_DATE",
      value:
        input.document.signatureDate ??
        explicitByKind.get("SIGNING_DATE")?.value,
      evidenceIds: explicitByKind.get("SIGNING_DATE")?.evidenceIds ?? [],
    },
    {
      fieldId: "AVAILABILITY_DATE",
      kind: "AVAILABILITY_DATE",
      value:
        input.document.notificationDates.madeAvailableAt ??
        explicitByKind.get("AVAILABILITY_DATE")?.value,
      evidenceIds: explicitByKind.get("AVAILABILITY_DATE")?.evidenceIds ?? [],
    },
    {
      fieldId: "ACCESS_DATE",
      kind: "ACCESS_DATE",
      value:
        input.document.notificationDates.accessedAt ??
        explicitByKind.get("ACCESS_DATE")?.value,
      evidenceIds: explicitByKind.get("ACCESS_DATE")?.evidenceIds ?? [],
    },
    {
      fieldId: "REJECTION_DATE",
      kind: "REJECTION_DATE",
      value:
        input.document.notificationDates.rejectedAt ??
        explicitByKind.get("REJECTION_DATE")?.value,
      evidenceIds: explicitByKind.get("REJECTION_DATE")?.evidenceIds ?? [],
    },
    {
      fieldId: "EFFECTIVE_NOTIFICATION_DATE",
      kind: "EFFECTIVE_NOTIFICATION_DATE",
      value:
        input.document.notificationDates.effectiveAt ??
        explicitByKind.get("EFFECTIVE_NOTIFICATION_DATE")?.value,
      evidenceIds:
        explicitByKind.get("EFFECTIVE_NOTIFICATION_DATE")?.evidenceIds ?? [],
    },
    ...explicitDates.filter(
      (entry) =>
        ![
          "ISSUE_DATE",
          "SIGNING_DATE",
          "AVAILABILITY_DATE",
          "ACCESS_DATE",
          "REJECTION_DATE",
          "EFFECTIVE_NOTIFICATION_DATE",
        ].includes(entry.kind),
    ),
  ];
  for (const candidate of candidates) {
    if (!candidate.value) continue;
    const dateValue = candidate.value.slice(0, 10);
    if (!isIsoCalendarDate(dateValue)) continue;
    input.dates.push({
      id: projectedEntityId(
        "date",
        [
          input.workspace.ownerScope,
          input.document.id,
          candidate.fieldId,
          candidate.kind,
          dateValue,
          [...new Set(candidate.evidenceIds)].sort(),
        ],
        input.dates.map((date) => date.id),
      ),
      ownerScope: input.workspace.ownerScope,
      documentId: input.document.id,
      fieldId: candidate.fieldId,
      kind: candidate.kind,
      value: dateValue,
      assertionType:
        candidate.evidenceIds.length > 0
          ? "EXPLICIT_IN_DOCUMENT"
          : "NOT_PROVEN_BY_DOCUMENT",
      evidenceIds: [...candidate.evidenceIds],
    });
  }
}

function addDocumentDate(input: {
  workspace: FiscalNotificationsWorkspace;
  dates: PersistedDateFactV2[];
  documentId: string;
  fieldId: string;
  kind: DocumentDateKindV2;
  value: string | undefined;
  evidenceIds?: readonly string[];
  assertionType?: AssertionTypeV2;
}): void {
  if (!input.value) return;
  const validEvidenceIds = new Set(
    input.workspace.evidence
      .filter((entry) => entry.documentId === input.documentId)
      .map((entry) => entry.id),
  );
  const evidenceIds = (input.evidenceIds ?? []).filter((id) =>
    validEvidenceIds.has(id),
  );
  const id = projectedEntityId(
    "date",
    [
      input.workspace.ownerScope,
      input.documentId,
      input.fieldId,
      input.kind,
      input.value,
      [...new Set(evidenceIds)].sort(),
    ],
    input.dates.map((date) => date.id),
  );
  input.dates.push({
    id,
    ownerScope: input.workspace.ownerScope,
    documentId: input.documentId,
    fieldId: input.fieldId,
    kind: input.kind,
    value: input.value,
    assertionType:
      (input.assertionType ??
        (evidenceIds.length > 0
          ? "EXPLICIT_IN_DOCUMENT"
          : "NOT_PROVEN_BY_DOCUMENT")) === "EXPLICIT_IN_DOCUMENT" &&
      evidenceIds.length > 0
        ? "EXPLICIT_IN_DOCUMENT"
        : "NOT_PROVEN_BY_DOCUMENT",
    evidenceIds,
  });
}

function pushTypedEntityDates(
  workspace: FiscalNotificationsWorkspace,
  dates: PersistedDateFactV2[],
): void {
  const documentIds = new Set(workspace.documents.map((entry) => entry.id));
  for (const option of workspace.paymentOptions) {
    if (!documentIds.has(option.documentId)) continue;
    addDocumentDate({
      workspace,
      dates,
      documentId: option.documentId,
      fieldId: "PAYMENT_OPTION_DEADLINE",
      kind: "VOLUNTARY_PAYMENT_DEADLINE",
      value: option.deadline,
      evidenceIds: option.evidenceIds,
      assertionType:
        option.deadlineStatus === "DOCUMENT_STATED" ||
        option.deadlineStatus === "CONFIRMED"
          ? "EXPLICIT_IN_DOCUMENT"
          : "NOT_PROVEN_BY_DOCUMENT",
    });
  }
  for (const debt of workspace.debts) {
    for (const documentId of debt.documentIds) {
      if (!documentIds.has(documentId)) continue;
      addDocumentDate({
        workspace,
        dates,
        documentId,
        fieldId: "DEBT_VOLUNTARY_PAYMENT_DEADLINE",
        kind: "VOLUNTARY_PAYMENT_DEADLINE",
        value: debt.voluntaryDeadline,
      });
    }
  }
  const plansById = new Map(
    workspace.paymentPlans.map((plan) => [plan.id, plan] as const),
  );
  for (const plan of workspace.paymentPlans) {
    if (!documentIds.has(plan.sourceDocumentId)) continue;
    addDocumentDate({
      workspace,
      dates,
      documentId: plan.sourceDocumentId,
      fieldId: "PLAN_START_DATE",
      kind: "START_DATE",
      value: plan.startDate,
    });
    addDocumentDate({
      workspace,
      dates,
      documentId: plan.sourceDocumentId,
      fieldId: "PLAN_END_DATE",
      kind: "END_DATE",
      value: plan.endDate,
    });
  }
  const installmentsById = new Map(
    workspace.installments.map(
      (installment) => [installment.id, installment] as const,
    ),
  );
  for (const installment of workspace.installments) {
    const plan = plansById.get(installment.paymentPlanId);
    if (!plan || !documentIds.has(plan.sourceDocumentId)) continue;
    addDocumentDate({
      workspace,
      dates,
      documentId: plan.sourceDocumentId,
      fieldId: `INSTALLMENT_${installment.sequence}_DUE_DATE`,
      kind: "INSTALLMENT_DUE_DATE",
      value: installment.dueDate,
      evidenceIds: installment.evidenceIds,
    });
    addDocumentDate({
      workspace,
      dates,
      documentId: plan.sourceDocumentId,
      fieldId: `INSTALLMENT_${installment.sequence}_PAYMENT_DATE`,
      kind: "PAYMENT_DATE",
      value: installment.paidAt,
      evidenceIds: installment.evidenceIds,
    });
  }
  for (const interest of workspace.interestCalculations) {
    const installment = installmentsById.get(interest.installmentId);
    const plan = installment
      ? plansById.get(installment.paymentPlanId)
      : undefined;
    if (!plan || !documentIds.has(plan.sourceDocumentId)) continue;
    addDocumentDate({
      workspace,
      dates,
      documentId: plan.sourceDocumentId,
      fieldId: "INTEREST_START_DATE",
      kind: "INTEREST_START_DATE",
      value: interest.periodFrom,
      evidenceIds: interest.evidenceIds,
    });
    addDocumentDate({
      workspace,
      dates,
      documentId: plan.sourceDocumentId,
      fieldId: "INTEREST_END_DATE",
      kind: "INTEREST_END_DATE",
      value: interest.periodTo,
      evidenceIds: interest.evidenceIds,
    });
  }
  for (const obligation of workspace.obligations) {
    if (
      !documentIds.has(obligation.sourceDocumentId) ||
      !["DOCUMENT_STATED", "CONFIRMED"].includes(obligation.dueDateStatus)
    ) {
      continue;
    }
    const kind: DocumentDateKindV2 =
      obligation.type === "PAY"
        ? "VOLUNTARY_PAYMENT_DEADLINE"
        : obligation.type === "FILE_APPEAL"
          ? "APPEAL_DEADLINE"
          : ["PROVIDE_DOCUMENTATION", "RESPOND", "ATTEND"].includes(
                obligation.type,
              )
            ? "RESPONSE_DEADLINE"
            : "EXPIRATION_DATE";
    addDocumentDate({
      workspace,
      dates,
      documentId: obligation.sourceDocumentId,
      fieldId: "OBLIGATION_DEADLINE",
      kind,
      value: obligation.dueDate,
      evidenceIds: obligation.evidenceIds,
    });
  }
}

function addAmount(
  amounts: PersistedAmountFactV2[],
  workspace: FiscalNotificationsWorkspace,
  documentId: string,
  fieldId: string,
  componentType: string,
  amountCents: number | undefined,
  assertion: AssertionTypeV2,
  evidenceIds: readonly string[],
): void {
  if (amountCents === undefined) return;
  const validEvidence = new Set(
    workspace.evidence
      .filter((entry) => entry.documentId === documentId)
      .map((entry) => entry.id),
  );
  const validEvidenceIds = evidenceIds.filter((id) => validEvidence.has(id));
  const normalizedEvidenceIds = [...new Set(validEvidenceIds)].sort();
  if (
    amounts.some(
      (amount) =>
        amount.documentId === documentId &&
        amount.componentType === componentType &&
        amount.amountCents === amountCents &&
        amount.assertionType ===
          (assertion === "EXPLICIT_IN_DOCUMENT" &&
          normalizedEvidenceIds.length === 0
            ? "NOT_PROVEN_BY_DOCUMENT"
            : assertion) &&
        JSON.stringify([...amount.evidenceIds].sort()) ===
          JSON.stringify(normalizedEvidenceIds),
    )
  ) {
    return;
  }
  amounts.push({
    id: projectedEntityId(
      "amount",
      [
        workspace.ownerScope,
        documentId,
        fieldId,
        componentType,
        amountCents,
        assertion,
        normalizedEvidenceIds,
      ],
      amounts.map((amount) => amount.id),
    ),
    ownerScope: workspace.ownerScope,
    documentId,
    fieldId,
    componentType,
    amountCents,
    currency: "EUR",
    assertionType:
      assertion === "EXPLICIT_IN_DOCUMENT" && validEvidenceIds.length === 0
        ? "NOT_PROVEN_BY_DOCUMENT"
        : assertion,
    evidenceIds: normalizedEvidenceIds,
  });
}

function addComponents(
  amounts: PersistedAmountFactV2[],
  workspace: FiscalNotificationsWorkspace,
  documentId: string,
  prefix: string,
  components: readonly MoneyComponent[],
): void {
  for (const component of components) {
    addAmount(
      amounts,
      workspace,
      documentId,
      `${prefix}_${component.type}`,
      component.type,
      component.amountCents,
      assertionType(component.assertionType),
      component.evidenceIds,
    );
  }
}

function projectAmounts(
  workspace: FiscalNotificationsWorkspace,
): PersistedAmountFactV2[] {
  const amounts: PersistedAmountFactV2[] = [];
  for (const snapshot of workspace.analysisSnapshots) {
    for (const fact of
      snapshot.structuredData.administrativeDomain?.moneyFacts ?? []) {
      addAmount(
        amounts,
        workspace,
        snapshot.documentId,
        `OBSERVED_MONEY_${sha256Hex(fact.id).slice(0, 24).toUpperCase()}`,
        fact.kind,
        fact.amountCents,
        assertionType(fact.assertionType),
        fact.evidenceIds,
      );
    }
  }
  for (const option of workspace.paymentOptions) {
    addComponents(
      amounts,
      workspace,
      option.documentId,
      "PAYMENT_OPTION",
      option.components,
    );
    addAmount(
      amounts,
      workspace,
      option.documentId,
      "PAYMENT_OPTION_TOTAL",
      "AMOUNT_TO_PAY",
      option.totalCents,
      "EXPLICIT_IN_DOCUMENT",
      option.evidenceIds,
    );
  }
  for (const debt of workspace.debts) {
    for (const documentId of debt.documentIds) {
      addAmount(
        amounts,
        workspace,
        documentId,
        "DEBT_ORIGINAL_PRINCIPAL",
        "PRINCIPAL",
        debt.originalPrincipalCents,
        "EXPLICIT_IN_DOCUMENT",
        [],
      );
      addAmount(
        amounts,
        workspace,
        documentId,
        "DEBT_OUTSTANDING_PRINCIPAL",
        "PRINCIPAL",
        debt.outstandingPrincipalCents,
        "EXPLICIT_IN_DOCUMENT",
        [],
      );
    }
  }
  for (const observation of workspace.debtObservations) {
    addAmount(
      amounts,
      workspace,
      observation.documentId,
      "OBSERVED_PRINCIPAL",
      "PRINCIPAL",
      observation.observedPrincipalCents,
      "EXPLICIT_IN_DOCUMENT",
      observation.evidenceIds,
    );
    addAmount(
      amounts,
      workspace,
      observation.documentId,
      "OBSERVED_OUTSTANDING",
      "PRINCIPAL",
      observation.observedOutstandingCents,
      "EXPLICIT_IN_DOCUMENT",
      observation.evidenceIds,
    );
  }
  for (const obligation of workspace.obligations) {
    addAmount(
      amounts,
      workspace,
      obligation.sourceDocumentId,
      "OBLIGATION_AMOUNT",
      "AMOUNT_TO_PAY",
      obligation.amountCents,
      "EXPLICIT_IN_DOCUMENT",
      obligation.evidenceIds,
    );
    addComponents(
      amounts,
      workspace,
      obligation.sourceDocumentId,
      "OBLIGATION",
      obligation.components,
    );
  }
  for (const plan of workspace.paymentPlans) {
    addAmount(
      amounts,
      workspace,
      plan.sourceDocumentId,
      "PLAN_REQUESTED_AMOUNT",
      "TOTAL_DEBT",
      plan.requestedAmountCents,
      "EXPLICIT_IN_DOCUMENT",
      [],
    );
    addAmount(
      amounts,
      workspace,
      plan.sourceDocumentId,
      "PLAN_GRANTED_PRINCIPAL",
      "PRINCIPAL",
      plan.grantedPrincipalCents,
      "EXPLICIT_IN_DOCUMENT",
      [],
    );
    addAmount(
      amounts,
      workspace,
      plan.sourceDocumentId,
      "PLAN_TOTAL_INTEREST",
      "INTEREST",
      plan.totalInterestCents,
      "EXPLICIT_IN_DOCUMENT",
      [],
    );
    addAmount(
      amounts,
      workspace,
      plan.sourceDocumentId,
      "PLAN_TOTAL_AMOUNT",
      "TOTAL_DEBT",
      plan.totalPlanAmountCents,
      "EXPLICIT_IN_DOCUMENT",
      [],
    );
  }
  return amounts;
}

function projectReferences(
  workspace: FiscalNotificationsWorkspace,
): PersistedReferenceV2[] | null {
  const documentsById = new Map(
    workspace.documents.map((entry) => [entry.id, entry]),
  );
  const result: PersistedReferenceV2[] = [];
  for (const reference of workspace.references) {
    const document = documentsById.get(reference.documentId);
    const sensitiveType = reference.referenceType as
      "CSV" | "NRC" | "VEHICLE_OR_FINE_REFERENCE";
    const protectedCarrier = SENSITIVE_REFERENCE_TYPES.has(
      reference.referenceType,
    )
      ? parseSensitiveReferenceMemoryCarrierV2(
          reference.normalizedValue,
          sensitiveType,
        )
      : null;
    const normalized = protectedCarrier
      ? null
      : normalizeSensitiveReferenceForFingerprintV2(reference.normalizedValue);
    if ((!protectedCarrier && !normalized) || !document) return null;
    const issuerCode = issuerForDocument(document, workspace);
    let value: PersistedReferenceV2["value"] | null;
    try {
      value = SENSITIVE_REFERENCE_TYPES.has(reference.referenceType)
        ? (protectedCarrier ??
          createSensitiveReferenceV2Sync({
            ownerScope: workspace.ownerScope,
            issuerCode,
            referenceType: sensitiveType,
            printedValue: normalized!,
          }))
        : {
            storage: "NORMALIZED_REFERENCE" as const,
            normalizedValue: normalizeFiscalNotificationReferenceV2(
              normalized!,
            ),
          };
    } catch {
      return null;
    }
    if (!value) return null;
    const validEvidence = new Set(
      workspace.evidence
        .filter((entry) => entry.documentId === reference.documentId)
        .map((entry) => entry.id),
    );
    result.push({
      id: reference.id,
      ownerScope: workspace.ownerScope,
      documentId: reference.documentId,
      referenceType: reference.referenceType,
      issuerCode,
      value,
      assertionType: reference.occurrenceIds.some((entry) =>
        validEvidence.has(entry),
      )
        ? "EXPLICIT_IN_DOCUMENT"
        : "NOT_PROVEN_BY_DOCUMENT",
      evidenceIds: reference.occurrenceIds.filter((entry) =>
        validEvidence.has(entry),
      ),
    });
  }
  return result;
}

function factState(
  document: AdministrativeDocument,
): Extract<PersistedTypedFactV2, { valueType: "STATE" }>["stateValue"] {
  if (document.status === "ACTIVE") return "ACTIVE";
  if (document.status === "CLOSED" || document.status === "REPLACED")
    return "CLOSED";
  return "UNKNOWN";
}

function pushStateFact(input: {
  facts: PersistedTypedFactV2[];
  workspace: FiscalNotificationsWorkspace;
  documentId: string;
  fieldId: string;
  stateValue: PersistedStateValueV2;
}): void {
  if (!input.workspace.documents.some((entry) => entry.id === input.documentId))
    return;
  input.facts.push({
    id: projectedEntityId(
      "fact",
      [
        input.workspace.ownerScope,
        input.documentId,
        input.fieldId,
        "STATE",
        input.stateValue,
      ],
      input.facts.map((fact) => fact.id),
    ),
    ownerScope: input.workspace.ownerScope,
    documentId: input.documentId,
    fieldId: input.fieldId,
    valueType: "STATE",
    stateValue: input.stateValue,
    assertionType: "NOT_PROVEN_BY_DOCUMENT",
    evidenceIds: [],
  });
}

const LEGACY_FACT_LABEL_CODES = Object.freeze(
  new Map<string, string>([
    ["Motivo de la denegación", "REASON"],
    ["Límite de pago", "PAYMENT_TIME"],
    ["Plazo de recurso", "APPEAL_INFORMATION"],
    ["Dónde indica que puede pagarse", "PAYMENT_MEDIUM"],
    ["Efecto indicado en el documento", "OFFSET_EFFECT_MEANING"],
  ]),
);

function projectTypedFacts(
  workspace: FiscalNotificationsWorkspace,
): PersistedTypedFactV2[] {
  const facts: PersistedTypedFactV2[] = workspace.documents.map(
    (document) => ({
      id: projectedEntityId(
        "fact",
        [
          workspace.ownerScope,
          document.id,
          "DOCUMENT_STATE",
          factState(document),
        ],
        [],
      ),
      ownerScope: workspace.ownerScope,
      documentId: document.id,
      fieldId: "DOCUMENT_STATE",
      valueType: "STATE" as const,
      stateValue: factState(document),
      assertionType: "NOT_PROVEN_BY_DOCUMENT" as const,
      evidenceIds: [],
    }),
  );
  for (const [debtIndex, debt] of workspace.debts.entries()) {
    for (const documentId of debt.documentIds) {
      pushStateFact({
        facts,
        workspace,
        documentId,
        fieldId: `DEBT_${debtIndex}_COLLECTION_STAGE`,
        stateValue: debt.collectionStage,
      });
      pushStateFact({
        facts,
        workspace,
        documentId,
        fieldId: `DEBT_${debtIndex}_STATUS`,
        stateValue: debt.currentStatus,
      });
    }
  }
  const plansById = new Map(
    workspace.paymentPlans.map((plan) => [plan.id, plan] as const),
  );
  for (const [planIndex, plan] of workspace.paymentPlans.entries()) {
    pushStateFact({
      facts,
      workspace,
      documentId: plan.sourceDocumentId,
      fieldId: `PLAN_${planIndex}_GRANT_STATUS`,
      stateValue: plan.grantStatus,
    });
    pushStateFact({
      facts,
      workspace,
      documentId: plan.sourceDocumentId,
      fieldId: `PLAN_${planIndex}_STATUS`,
      stateValue: plan.status,
    });
  }
  for (const [
    installmentIndex,
    installment,
  ] of workspace.installments.entries()) {
    const plan = plansById.get(installment.paymentPlanId);
    if (!plan) continue;
    pushStateFact({
      facts,
      workspace,
      documentId: plan.sourceDocumentId,
      fieldId: `INSTALLMENT_${installmentIndex}_STATUS`,
      stateValue: installment.status,
    });
  }
  for (const [obligationIndex, obligation] of workspace.obligations.entries()) {
    const fieldId = `OBLIGATION_${obligationIndex}_${obligation.type}`;
    const evidenceIds = obligation.evidenceIds.filter((evidenceId) =>
      workspace.evidence.some(
        (entry) =>
          entry.id === evidenceId &&
          entry.documentId === obligation.sourceDocumentId,
      ),
    );
    facts.push({
      id: projectedEntityId(
        "fact",
        [
          workspace.ownerScope,
          obligation.sourceDocumentId,
          fieldId,
          "BOOLEAN",
          true,
          [...evidenceIds].sort(),
        ],
        facts.map((fact) => fact.id),
      ),
      ownerScope: workspace.ownerScope,
      documentId: obligation.sourceDocumentId,
      fieldId,
      valueType: "BOOLEAN",
      booleanValue: true,
      assertionType: "NOT_PROVEN_BY_DOCUMENT",
      evidenceIds,
    });
    pushStateFact({
      facts,
      workspace,
      documentId: obligation.sourceDocumentId,
      fieldId: `OBLIGATION_${obligationIndex}_STATUS`,
      stateValue: obligation.status,
    });
  }
  for (const snapshot of workspace.analysisSnapshots) {
    const validEvidence = new Set(
      workspace.evidence
        .filter((entry) => entry.documentId === snapshot.documentId)
        .map((entry) => entry.id),
    );
    for (const [
      fieldIndex,
      field,
    ] of snapshot.structuredData.unknownFields.entries()) {
      const exactCode = LEGACY_FACT_LABEL_CODES.get(field.labelRaw);
      const code =
        exactCode ??
        (field.labelRaw.startsWith("Consecuencia indicada ")
          ? "EXPLICIT_CONSEQUENCE"
          : field.labelRaw.startsWith("Deuda afectada ")
            ? "OBLIGATION"
            : null);
      if (!code) continue;
      const evidenceIds =
        field.evidenceId && validEvidence.has(field.evidenceId)
          ? [field.evidenceId]
          : [];
      facts.push({
        id: projectedEntityId(
          "fact",
          [
            workspace.ownerScope,
            snapshot.documentId,
            code,
            fieldIndex,
            "BOOLEAN",
            true,
            evidenceIds,
          ],
          facts.map((fact) => fact.id),
        ),
        ownerScope: workspace.ownerScope,
        documentId: snapshot.documentId,
        fieldId: `${code}_${fieldIndex}`,
        valueType: "BOOLEAN",
        booleanValue: true,
        assertionType: "NOT_PROVEN_BY_DOCUMENT",
        evidenceIds,
      });
    }
  }
  for (const snapshot of workspace.analysisSnapshots) {
    const evidenceById = new Map(
      workspace.evidence
        .filter(
          (entry) =>
            entry.documentId === snapshot.documentId &&
            entry.assertionType === "EXPLICIT_IN_DOCUMENT",
        )
        .map((entry) => [entry.id, entry] as const),
    );
    for (const field of snapshot.structuredData.unknownFields) {
      const parts = field.labelRaw.split("|");
      if (
        parts[0] !== "VSR2" ||
        parts.length < 5 ||
        (parts[2] !== "DETAIL" && parts[2] !== "OBLIGATION") ||
        !field.evidenceId ||
        !evidenceById.has(field.evidenceId)
      ) {
        continue;
      }
      const sourceFieldId = parts[1]!;
      const semantic = parts[2]!;
      const canonicalType = parts[3]!;
      const label = parts.slice(4).join("|");
      if (
        isInternalFiscalNotificationFieldArtifact({
          fieldId: sourceFieldId,
          semantic,
          canonicalType,
          label,
          value: field.valueRaw,
        })
      ) {
        continue;
      }
      const profileFact = /^profile:fact:([A-Z0-9_]+):\d+$/u.exec(
        sourceFieldId,
      );
      const restoredFact = /^persisted:fact:((?:PROFILE|OBSERVED)_FACT_[A-Z0-9_]+)$/u.exec(
        sourceFieldId,
      );
      const fieldId = restoredFact
        ? restoredFact[1]!
        : profileFact
          ? `PROFILE_FACT_${profileFact[1]}`
          : `OBSERVED_FACT_${sha256Hex(sourceFieldId).slice(0, 24).toUpperCase()}`;
      const evidenceIds = [field.evidenceId];
      facts.push({
        id: projectedEntityId(
          "fact",
          [
            workspace.ownerScope,
            snapshot.documentId,
            fieldId,
            "BOOLEAN",
            true,
            evidenceIds,
          ],
          facts.map((fact) => fact.id),
        ),
        ownerScope: workspace.ownerScope,
        documentId: snapshot.documentId,
        fieldId,
        valueType: "BOOLEAN",
        booleanValue: true,
        assertionType: "EXPLICIT_IN_DOCUMENT",
        evidenceIds,
      });
    }
  }
  return facts;
}

/**
 * Projects a validated V1 graph into the minimal V2 privacy model. It never
 * copies party names, tax identifiers, addresses, bank accounts, source text,
 * titles, snippets, raw values, filenames or arbitrary notes.
 */
export function projectFiscalNotificationsWorkspacePrivacyV2(
  workspace: FiscalNotificationsWorkspace,
  expectedOwnerScope: string,
): Readonly<FiscalNotificationsPersistedWorkspaceV2> | null {
  if (workspace.ownerScope !== expectedOwnerScope) return null;
  const references = projectReferences(workspace);
  if (!references) return null;
  const dates: PersistedDateFactV2[] = [];
  workspace.documents.forEach((document) =>
    pushDocumentDates({ workspace, document, dates }),
  );
  pushTypedEntityDates(workspace, dates);
  const amounts = projectAmounts(workspace);
  const evidence = workspace.evidence.map((entry) => ({
    id: entry.id,
    ownerScope: workspace.ownerScope,
    documentId: entry.documentId,
    fieldId: `V1_${entry.extractionMethod}`,
    page: entry.pageNumber,
    locator: entry.boundingBox
      ? {
          kind: "BOUNDING_BOX" as const,
          x: entry.boundingBox.x,
          y: entry.boundingBox.y,
          width: entry.boundingBox.width,
          height: entry.boundingBox.height,
          ...(entry.boundingBox.pageWidth === undefined
            ? {}
            : { pageWidth: entry.boundingBox.pageWidth }),
          ...(entry.boundingBox.pageHeight === undefined
            ? {}
            : { pageHeight: entry.boundingBox.pageHeight }),
        }
      : { kind: "PAGE" as const },
    extractionMethod: entry.extractionMethod,
    confidence: entry.confidence,
    rule: { id: `V1_${entry.extractionMethod}_PROJECTION`, version: "1.0.0" },
    assertionType: assertionType(entry.assertionType),
  }));
  const evidenceByDocument = new Map<string, string[]>();
  for (const entry of evidence) {
    const ids = evidenceByDocument.get(entry.documentId) ?? [];
    ids.push(entry.id);
    evidenceByDocument.set(entry.documentId, ids);
  }
  const facts = projectTypedFacts(workspace);
  const relationReferences = new Map(
    references.map((entry) => [entry.id, entry] as const),
  );
  const legacyOnlyRelationTypes = new Set<string>([
    "BELONGS_TO_CASE",
    "DUPLICATE_COPY_OF",
    "RELATED_TO_PAYMENT_PLAN",
    "RELATED_TO_INSTALLMENT",
    "POSSIBLY_RELATED",
  ]);
  const relations = workspace.relations.flatMap((relation) => {
    if (!PROJECTABLE_RELATION_ALGORITHMS.has(relation.algorithmVersion)) {
      return [];
    }
    const isLegacyOnly = legacyOnlyRelationTypes.has(relation.relationType);
    const sourceRefs = references.filter(
      (entry) => entry.documentId === relation.sourceDocumentId,
    );
    const targetRefs = references.filter(
      (entry) => entry.documentId === relation.targetDocumentId,
    );
    const exactReferenceIds = sourceRefs.flatMap((source) => {
      const matching = targetRefs.find(
        (target) =>
          target.referenceType === source.referenceType &&
          target.issuerCode === source.issuerCode &&
          (target.value.storage === "FINGERPRINT_ONLY"
            ? source.value.storage === "FINGERPRINT_ONLY" &&
              target.value.fingerprintSha256 === source.value.fingerprintSha256
            : source.value.storage === "NORMALIZED_REFERENCE" &&
              target.value.normalizedValue === source.value.normalizedValue) &&
          source.referenceType !== "BANK_REFERENCE" &&
          relation.evidence.matchingReferenceTypes.includes(
            source.referenceType,
          ),
      );
      return matching ? [source.id, matching.id] : [];
    });
    const uniqueExact = [...new Set(exactReferenceIds)].filter((id) =>
      relationReferences.has(id),
    );
    const sourceAmounts = amounts.filter(
      (entry) => entry.documentId === relation.sourceDocumentId,
    );
    const targetAmounts = amounts.filter(
      (entry) => entry.documentId === relation.targetDocumentId,
    );
    const contextualAmountFactIds = sourceAmounts.flatMap((source) => {
      const matching = targetAmounts.find(
        (target) =>
          target.componentType === source.componentType &&
          target.amountCents === source.amountCents &&
          relation.evidence.matchingAmountTypes.includes(
            source.componentType as (typeof relation.evidence.matchingAmountTypes)[number],
          ),
      );
      return matching ? [source.id, matching.id] : [];
    });
    const sourceDates = dates.filter(
      (entry) => entry.documentId === relation.sourceDocumentId,
    );
    const targetDates = dates.filter(
      (entry) => entry.documentId === relation.targetDocumentId,
    );
    const contextualDateFactIds = sourceDates.flatMap((source) => {
      const matching = targetDates.find(
        (target) =>
          target.value === source.value &&
          relation.evidence.matchingDates.includes(source.value),
      );
      return matching ? [source.id, matching.id] : [];
    });
    if (
      !isLegacyOnly &&
      relation.status === "SYSTEM_CONFIRMED_EXACT" &&
      uniqueExact.length === 0
    )
      return [];
    return [
      {
        id: relation.id,
        ownerScope: workspace.ownerScope,
        sourceDocumentId: relation.sourceDocumentId,
        targetDocumentId: relation.targetDocumentId,
        relationType: relation.relationType,
        status:
          isLegacyOnly && relation.status === "SYSTEM_CONFIRMED_EXACT"
            ? ("SUGGESTED" as const)
            : relation.status,
        exactReferenceIds: uniqueExact,
        contextualDateFactIds: [...new Set(contextualDateFactIds)],
        contextualAmountFactIds: [...new Set(contextualAmountFactIds)],
        algorithmVersion:
          relation.algorithmVersion === GLOBAL_RECONCILIATION_RULE_VERSION_V8
            ? relation.algorithmVersion
            : FISCAL_NOTIFICATIONS_PROJECTED_RELATION_ALGORITHM_VERSION_V2,
        createdAt: relation.createdAt,
        ...(relation.reconciliationHistory
          ? {
              reconciliationHistory: relation.reconciliationHistory.map(
                (entry) => ({
                  ...entry,
                  evidenceKinds: [...entry.evidenceKinds],
                }),
              ),
            }
          : {}),
      },
    ];
  });
  const projected: FiscalNotificationsPersistedWorkspaceV2 = {
    schemaVersion: 2,
    workspaceId: workspace.workspaceId,
    ownerScope: workspace.ownerScope,
    revision: workspace.revision,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    accountHolder: identityProjection(workspace),
    documents: workspace.documents.map((document) => {
      const documentDates = dates.filter(
        (entry) => entry.documentId === document.id,
      );
      const evidencedDates = documentDates.filter(
        (entry) =>
          entry.assertionType === "EXPLICIT_IN_DOCUMENT" &&
          entry.evidenceIds.length > 0,
      );
      const selected = resolveFiscalNotificationChronologyV2({
        issueDate: evidencedDates.find((entry) => entry.kind === "ISSUE_DATE")
          ?.value,
        signingDate: evidencedDates.find(
          (entry) => entry.kind === "SIGNING_DATE",
        )?.value,
        actionDate: evidencedDates.find((entry) => entry.kind === "ACTION_DATE")
          ?.value,
        effectiveNotificationDate: evidencedDates.find(
          (entry) => entry.kind === "EFFECTIVE_NOTIFICATION_DATE",
        )?.value,
      });
      const familyId = recognizedFamilyForDocument(document, workspace);
      return {
        id: document.id,
        ownerScope: workspace.ownerScope,
        familyId,
        legacyDocumentType: document.documentType,
        recognitionStatus:
          familyId !== null
            ? ("EXACT_FAMILY" as const)
            : document.documentType === "UNKNOWN"
              ? ("UNKNOWN" as const)
              : ("LEGACY_TYPE_ONLY" as const),
        issuerCode: issuerForDocument(document, workspace),
        reviewStatus: document.humanReviewStatus,
        chronologyDate: selected.chronologyDate,
        chronologyBasis:
          selected.chronologyDateBasis as ChronologyBasisV2 | null,
        dateFactIds: dates
          .filter((entry) => entry.documentId === document.id)
          .map((entry) => entry.id),
        referenceIds: references
          .filter((entry) => entry.documentId === document.id)
          .map((entry) => entry.id),
        amountFactIds: amounts
          .filter((entry) => entry.documentId === document.id)
          .map((entry) => entry.id),
        factIds: facts
          .filter((entry) => entry.documentId === document.id)
          .map((entry) => entry.id),
        evidenceIds: evidenceByDocument.get(document.id) ?? [],
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      };
    }),
    references,
    dates,
    amounts,
    facts,
    evidence,
    thirdParties: [],
    relations,
    driveArchives: (workspace.driveArchives ?? []).map((archive) => ({
      id: archive.id,
      ownerScope: archive.ownerScope,
      documentIds: [...archive.documentIds],
      sourceSha256: archive.sourceSha256,
      driveFileId: archive.driveFileId,
      driveFolderId: archive.driveFolderId,
      documentDate: archive.documentDate,
      archiveStatus: archive.archiveStatus,
      reviewStatus: archive.reviewStatus,
      verificationMethod: archive.verificationMethod,
      archivedAt: archive.archivedAt,
    })),
  };
  return parseFiscalNotificationsWorkspaceForPersistenceV2(
    projected,
    expectedOwnerScope,
  );
}
