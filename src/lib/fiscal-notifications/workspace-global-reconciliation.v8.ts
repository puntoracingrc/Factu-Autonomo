import { sha256Hex } from "../document-integrity/snapshot-hash";
import { resolveFiscalNotificationChronologyV2 } from "./chronology-date.v2";
import {
  createOwnerScopedAssetFingerprintV8,
  GLOBAL_RECONCILIATION_RULE_VERSION_V8,
  reconcileGlobalDocumentRelationsV8,
  type ExistingGlobalReconciliationRelationV8,
  type GlobalReconciliationAmountKindV8,
  type GlobalReconciliationAmountV8,
  type GlobalReconciliationDocumentV8,
  type GlobalReconciliationReferenceRoleV8,
  type GlobalReconciliationReferenceTypeV8,
  type GlobalReconciliationReferenceV8,
} from "./global-reconciliation.v8";
import type {
  AdministrativeDocument,
  DocumentRelation,
  DocumentRelationReconciliationRecordV8,
  ExternalReference,
  ExternalReferenceType,
  FiscalNotificationsWorkspace,
  MoneyComponentType,
} from "./types";
import { parseFiscalNotificationsWorkspaceForPersistenceV1 } from "./workspace-persistence.v1";

export type AppendWorkspaceGlobalReconciliationResultV8 =
  | {
      readonly status: "APPLIED";
      readonly changedRelationIds: readonly string[];
      readonly workspace: FiscalNotificationsWorkspace;
    }
  | {
      readonly status: "UNCHANGED";
      readonly changedRelationIds: readonly [];
      readonly workspace: FiscalNotificationsWorkspace;
    }
  | {
      readonly status: "REVIEW_REQUIRED";
      readonly reason: "INVALID_WORKSPACE" | "RECONCILIATION_BLOCKED";
      readonly changedRelationIds: readonly [];
      readonly workspace: FiscalNotificationsWorkspace;
    };

interface ProjectionMetadataV8 {
  readonly documents: readonly GlobalReconciliationDocumentV8[];
  readonly referenceTypesById: ReadonlyMap<string, ExternalReferenceType>;
  readonly amountTypesById: ReadonlyMap<string, MoneyComponentType>;
}

const MEMORY_ASSET_CARRIER =
  /^FACTU_PROTECTED_REFERENCE_V2:VEHICLE_OR_FINE_REFERENCE:([a-f0-9]{64})$/u;
const PENDING_INSTALLMENT_STATES = new Set([
  "PENDING_CONFIRMATION",
  "PENDING",
  "OVERDUE_NO_PAYMENT_RECORDED",
  "UNPAID_CONFIRMED",
]);

/**
 * Adapta el workspace privado al motor global V8 y aplica sus cambios de forma
 * monotónica. Las decisiones humanas y las relaciones exactas nunca se
 * degradan; el resultado se vuelve a validar antes de salir.
 */
export function appendWorkspaceGlobalReconciliationV8(input: {
  readonly ownerScope: string;
  readonly workspace: FiscalNotificationsWorkspace;
  readonly reevaluatedAt: string;
}): AppendWorkspaceGlobalReconciliationResultV8 {
  const original = parseFiscalNotificationsWorkspaceForPersistenceV1(
    input.workspace,
    input.ownerScope,
  );
  if (!original || original.updatedAt !== input.reevaluatedAt) {
    return blocked(input.workspace, "INVALID_WORKSPACE");
  }
  const projection = projectWorkspace(original);
  if (!projection) return blocked(original, "RECONCILIATION_BLOCKED");

  const existingRelations: ExistingGlobalReconciliationRelationV8[] =
    original.relations.map((relation) => {
      const latest = relation.reconciliationHistory?.at(-1);
      return {
        sourceDocumentId: relation.sourceDocumentId,
        targetDocumentId: relation.targetDocumentId,
        status: relation.status,
        relationType: relation.relationType,
        globalRelationType: latest?.globalRelationType ?? null,
        ruleVersion: latest?.ruleVersion ?? null,
      };
    });
  const reconciliation = reconcileGlobalDocumentRelationsV8({
    documents: projection.documents,
    existingRelations,
    reevaluatedAt: input.reevaluatedAt,
  });
  if (reconciliation.status === "REVIEW_REQUIRED") {
    return blocked(original, "RECONCILIATION_BLOCKED");
  }
  if (reconciliation.status === "UNCHANGED") {
    return Object.freeze({
      status: "UNCHANGED",
      changedRelationIds: Object.freeze([]) as readonly [],
      workspace: original,
    });
  }

  const relationIndexes = new Map<string, number[]>();
  original.relations.forEach((relation, index) => {
    const key = pairKey(relation.sourceDocumentId, relation.targetDocumentId);
    const indexes = relationIndexes.get(key) ?? [];
    indexes.push(index);
    relationIndexes.set(key, indexes);
  });
  const relations = original.relations.map((relation) => ({
    ...relation,
    evidence: {
      ...relation.evidence,
      matchingReferenceTypes: [...relation.evidence.matchingReferenceTypes],
      matchingAmountTypes: [...relation.evidence.matchingAmountTypes],
      matchingDates: [...relation.evidence.matchingDates],
      differences: [...relation.evidence.differences],
    },
    ...(relation.reconciliationHistory
      ? {
          reconciliationHistory: relation.reconciliationHistory.map((entry) => ({
            ...entry,
            evidenceKinds: [...entry.evidenceKinds],
          })),
        }
      : {}),
  }));
  const changedIds: string[] = [];
  for (const change of reconciliation.changes) {
    const pair = pairKey(
      change.edge.sourceDocumentId,
      change.edge.targetDocumentId,
    );
    const candidates = relationIndexes.get(pair) ?? [];
    const selectedIndex = chooseRelationIndex(relations, candidates);
    const history: DocumentRelationReconciliationRecordV8 = {
      ruleVersion: GLOBAL_RECONCILIATION_RULE_VERSION_V8,
      previousStatus: change.previousStatus,
      newStatus: change.edge.status,
      resultClassification: change.edge.resultClassification,
      previousRelationType: change.previousRelationType,
      newRelationType: change.edge.persistedRelationType,
      globalRelationType: change.edge.relationType,
      evidenceKinds: [...change.edge.evidenceKinds],
      reasonCode: change.reasonCode,
      reevaluatedAt: change.reevaluatedAt,
      rowAssignmentReviewRequired: change.edge.rowAssignmentReviewRequired,
    };
    const matchingReferenceTypes = referenceTypesForEdge(
      change.edge.relationType,
      change.edge.matchingReferenceIds,
      projection.referenceTypesById,
    );
    const matchingAmountTypes = change.edge.matchingAmountIds
      .map((id) => projection.amountTypesById.get(id))
      .filter((value): value is MoneyComponentType => value !== undefined);
    const sourceDate = projection.documents.find(
      (document) => document.documentId === change.edge.sourceDocumentId,
    )?.documentDate;
    const targetDate = projection.documents.find(
      (document) => document.documentId === change.edge.targetDocumentId,
    )?.documentDate;
    const matchingDates = sourceDate && targetDate && sourceDate === targetDate
      ? [sourceDate]
      : [];
    if (selectedIndex === null) {
      const id = relationId(
        change.edge.sourceDocumentId,
        change.edge.targetDocumentId,
      );
      if (relations.some((relation) => relation.id === id)) {
        return blocked(original, "RECONCILIATION_BLOCKED");
      }
      relations.push({
        id,
        ownerScope: input.ownerScope,
        sourceDocumentId: change.edge.sourceDocumentId,
        targetDocumentId: change.edge.targetDocumentId,
        relationType: change.edge.persistedRelationType,
        confidenceBand:
          change.edge.status === "SYSTEM_CONFIRMED_EXACT" ? "EXACT" : "HIGH",
        score: change.edge.status === "SYSTEM_CONFIRMED_EXACT" ? 100 : 75,
        evidence: {
          matchingReferenceTypes,
          matchingAmountTypes: [...new Set(matchingAmountTypes)].sort(),
          matchingDates,
          citedText: change.edge.phrase,
          differences: [change.edge.caution],
        },
        algorithmVersion: GLOBAL_RECONCILIATION_RULE_VERSION_V8,
        status: change.edge.status,
        createdAt: change.reevaluatedAt,
        reconciliationHistory: [history],
      });
      relationIndexes.set(pair, [relations.length - 1]);
      changedIds.push(id);
      continue;
    }
    const previous = relations[selectedIndex]!;
    if (
      previous.status === "USER_CONFIRMED" ||
      previous.status === "USER_REJECTED" ||
      (previous.status === "SYSTEM_CONFIRMED_EXACT" &&
        change.edge.status === "SUGGESTED")
    ) {
      continue;
    }
    const updated: DocumentRelation = {
      ...previous,
      sourceDocumentId: change.edge.sourceDocumentId,
      targetDocumentId: change.edge.targetDocumentId,
      relationType: change.edge.persistedRelationType,
      confidenceBand:
        change.edge.status === "SYSTEM_CONFIRMED_EXACT" ? "EXACT" : "HIGH",
      score: change.edge.status === "SYSTEM_CONFIRMED_EXACT" ? 100 : 75,
      evidence: {
        matchingReferenceTypes,
        matchingAmountTypes: [...new Set(matchingAmountTypes)].sort(),
        matchingDates,
        citedText: change.edge.phrase,
        differences: [change.edge.caution],
      },
      algorithmVersion: GLOBAL_RECONCILIATION_RULE_VERSION_V8,
      status: change.edge.status,
      reconciliationHistory: [
        ...(previous.reconciliationHistory ?? []),
        history,
      ].slice(-32),
    };
    relations[selectedIndex] = updated;
    changedIds.push(updated.id);
  }

  if (changedIds.length === 0) {
    return Object.freeze({
      status: "UNCHANGED",
      changedRelationIds: Object.freeze([]) as readonly [],
      workspace: original,
    });
  }
  if (original.revision >= Number.MAX_SAFE_INTEGER) {
    return blocked(original, "RECONCILIATION_BLOCKED");
  }
  const parsed = parseFiscalNotificationsWorkspaceForPersistenceV1(
    {
      ...original,
      revision: original.revision + 1,
      updatedAt: input.reevaluatedAt,
      relations,
    },
    input.ownerScope,
  );
  if (!parsed) return blocked(original, "RECONCILIATION_BLOCKED");
  return Object.freeze({
    status: "APPLIED",
    changedRelationIds: Object.freeze([...new Set(changedIds)].sort()),
    workspace: parsed,
  });
}

function projectWorkspace(
  workspace: FiscalNotificationsWorkspace,
): ProjectionMetadataV8 | null {
  const authorityById = new Map(
    workspace.authorities.map((authority) => [authority.id, authority]),
  );
  const evidenceById = new Map(
    workspace.evidence.map((evidence) => [evidence.id, evidence]),
  );
  const partById = new Map(workspace.parts.map((part) => [part.id, part]));
  const referenceById = new Map(
    workspace.references.map((reference) => [reference.id, reference]),
  );
  const debtById = new Map(workspace.debts.map((debt) => [debt.id, debt]));
  const referencesByDocument = new Map<string, ExternalReference[]>();
  for (const reference of workspace.references) {
    const entries = referencesByDocument.get(reference.documentId) ?? [];
    entries.push(reference);
    referencesByDocument.set(reference.documentId, entries);
  }
  const snapshotsByDocument = new Map(
    workspace.documents.map((document) => [
      document.id,
      workspace.analysisSnapshots.filter((snapshot) => snapshot.documentId === document.id),
    ]),
  );
  const paymentOptionsByDocument = new Map(
    workspace.documents.map((document) => [
      document.id,
      workspace.paymentOptions.filter((option) => option.documentId === document.id),
    ]),
  );
  const observationsByDocument = new Map(
    workspace.documents.map((document) => [
      document.id,
      workspace.debtObservations.filter((observation) => observation.documentId === document.id),
    ]),
  );
  const referenceTypesById = new Map<string, ExternalReferenceType>();
  const amountTypesById = new Map<string, MoneyComponentType>();
  const documents: GlobalReconciliationDocumentV8[] = [];
  for (const document of workspace.documents) {
    const authority = authorityById.get(document.authorityId);
    if (!authority || authority.administrationType !== "AEAT") continue;
    const familyId = familyForDocument(document);
    if (!familyId) continue;
    const references: GlobalReconciliationReferenceV8[] = [];
    let opaqueAssetFingerprint: string | null = null;
    for (const reference of referencesByDocument.get(document.id) ?? []) {
      if (
        reference.confirmationStatus === "REJECTED" ||
        reference.confidence !== "EXACT"
      ) continue;
      if (reference.referenceType === "VEHICLE_OR_FINE_REFERENCE") {
        const carrier = MEMORY_ASSET_CARRIER.exec(reference.normalizedValue);
        opaqueAssetFingerprint = carrier?.[1]
          ? `opaque:${carrier[1]}`
          : createOwnerScopedAssetFingerprintV8(
              workspace.ownerScope,
              reference.normalizedValue,
            );
        referenceTypesById.set(reference.id, reference.referenceType);
        continue;
      }
      const type = globalReferenceType(reference.referenceType, familyId);
      if (!type) continue;
      const role = referenceRole(
        reference,
        familyId,
        evidenceById,
        partById,
      );
      references.push({
        referenceId: reference.id,
        type,
        normalizedValue: reference.normalizedValue,
        role,
      });
      referenceTypesById.set(reference.id, reference.referenceType);
    }
    const documentDebtKey = uniqueDocumentDebtKey(references);
    const amounts: GlobalReconciliationAmountV8[] = [];
    for (const snapshot of snapshotsByDocument.get(document.id) ?? []) {
      for (const money of snapshot.structuredData.administrativeDomain?.moneyFacts ?? []) {
        const kind = globalAmountKind(money.kind, familyId);
        if (!kind || money.currency !== "EUR") continue;
        amounts.push({
          amountId: money.id,
          kind,
          amountCents: money.amountCents,
          debtKey:
            debtKeyForReferenceId(
              money.sourceActRefId,
              document.id,
              referenceById,
            ) ?? documentDebtKey,
        });
        amountTypesById.set(money.id, memoryAmountType(money.kind));
      }
    }
    for (const option of paymentOptionsByDocument.get(document.id) ?? []) {
      if (option.totalCents !== undefined) {
        const id = `${option.id}:total`;
        amounts.push({
          amountId: id,
          kind: globalAmountKind("DOCUMENT_TOTAL", familyId)!,
          amountCents: option.totalCents,
          debtKey:
            debtKeyForEvidenceIds(
              option.evidenceIds,
              document.id,
              referencesByDocument,
            ) ?? documentDebtKey,
        });
        amountTypesById.set(id, "TOTAL_DEBT");
      }
      option.components.forEach((component, index) => {
        const kind = globalAmountKind(component.type, familyId);
        if (!kind) return;
        const id = `${option.id}:component:${index}`;
        amounts.push({
          amountId: id,
          kind,
          amountCents: component.amountCents,
          debtKey:
            debtKeyForEvidenceIds(
              component.evidenceIds,
              document.id,
              referencesByDocument,
            ) ?? documentDebtKey,
        });
        amountTypesById.set(id, component.type);
      });
    }
    for (const observation of observationsByDocument.get(document.id) ?? []) {
      if (observation.observedPrincipalCents !== undefined) {
        const id = `${observation.id}:principal`;
        amounts.push({
          amountId: id,
          kind: familyId.startsWith("seizure.") ? "SEIZURE_ROW" : "PRINCIPAL",
          amountCents: observation.observedPrincipalCents,
          debtKey:
            debtKeyForObservation(
              observation,
              document.id,
              debtById,
              referenceById,
            ) ?? documentDebtKey,
        });
        amountTypesById.set(id, "PRINCIPAL");
      }
      if (observation.observedOutstandingCents !== undefined) {
        const id = `${observation.id}:outstanding`;
        amounts.push({
          amountId: id,
          kind: familyId.startsWith("seizure.")
            ? "SEIZURE_ROW"
            : familyId === "collection.deferral_denial"
              ? "DENIAL_SNAPSHOT"
              : "ORDINARY_TOTAL",
          amountCents: observation.observedOutstandingCents,
          debtKey:
            debtKeyForObservation(
              observation,
              document.id,
              debtById,
              referenceById,
            ) ?? documentDebtKey,
        });
        amountTypesById.set(id, "TOTAL_DEBT");
      }
    }
    const snapshots = snapshotsByDocument.get(document.id) ?? [];
    const offsetRows = familyId.startsWith("collection.offset_")
      ? Math.max(
          observationsByDocument.get(document.id)?.length ?? 0,
          snapshots.flatMap((snapshot) => snapshot.structuredData.unknownFields)
            .filter((field) => field.labelRaw.includes("SPECIALIZED|OFFSET|DEBT|") && field.labelRaw.endsWith("|EFFECT_DATE"))
            .length,
        )
      : 0;
    const chronology = resolveFiscalNotificationChronologyV2({
      issueDate: document.issueDate?.slice(0, 10),
      signingDate: document.signatureDate?.slice(0, 10),
      effectiveNotificationDate:
        document.notificationDates.effectiveAt?.slice(0, 10),
    });
    documents.push({
      ownerScope: workspace.ownerScope,
      documentId: document.id,
      issuer: "AEAT",
      familyId,
      documentDate: chronology.chronologyDate,
      references: uniqueById(references),
      amounts: uniqueById(amounts, "amountId"),
      remainingPlanPrincipalCents: remainingPlanPrincipal(workspace, document.id),
      modifiedPlan: familyId === "collection.deferral_modification",
      compatibleAutomaticOffsetClause:
        familyId === "collection.deferral_modification",
      offsetRows,
      offsetRowsRecalculated:
        familyId.startsWith("collection.offset_") && offsetRows > 1,
      opaqueAssetFingerprint,
    });
  }
  return {
    documents,
    referenceTypesById,
    amountTypesById,
  };
}

function uniqueDocumentDebtKey(
  references: readonly GlobalReconciliationReferenceV8[],
): string | null {
  const values = [
    ...new Set(
      references
        .filter(
          (reference) =>
            reference.type === "DEBT_KEY" ||
            reference.type === "LIQUIDATION_KEY",
        )
        .map((reference) => reference.normalizedValue),
    ),
  ];
  return values.length === 1 ? values[0]! : null;
}

function debtKeyForReferenceId(
  referenceId: string | undefined,
  documentId: string,
  references: ReadonlyMap<string, ExternalReference>,
): string | null {
  if (!referenceId) return null;
  const reference = references.get(referenceId);
  return reference &&
      reference.documentId === documentId &&
      reference.confirmationStatus !== "REJECTED" &&
      reference.confidence === "EXACT" &&
      (reference.referenceType === "DEBT_KEY" ||
        reference.referenceType === "LIQUIDATION_KEY")
    ? reference.normalizedValue
    : null;
}

function debtKeyForEvidenceIds(
  evidenceIds: readonly string[],
  documentId: string,
  referencesByDocument: ReadonlyMap<string, ExternalReference[]>,
): string | null {
  const evidence = new Set(evidenceIds);
  const values = [
    ...new Set(
      (referencesByDocument.get(documentId) ?? [])
        .filter(
          (reference) =>
            reference.confirmationStatus !== "REJECTED" &&
            reference.confidence === "EXACT" &&
            (reference.referenceType === "DEBT_KEY" ||
              reference.referenceType === "LIQUIDATION_KEY") &&
            reference.occurrenceIds.some((id) => evidence.has(id)),
        )
        .map((reference) => reference.normalizedValue),
    ),
  ];
  return values.length === 1 ? values[0]! : null;
}

function debtKeyForObservation(
  observation: FiscalNotificationsWorkspace["debtObservations"][number],
  documentId: string,
  debts: ReadonlyMap<string, FiscalNotificationsWorkspace["debts"][number]>,
  references: ReadonlyMap<string, ExternalReference>,
): string | null {
  const referenceValues = [
    ...new Set(
      observation.referenceIds.flatMap((referenceId) => {
        const value = debtKeyForReferenceId(
          referenceId,
          documentId,
          references,
        );
        return value ? [value] : [];
      }),
    ),
  ];
  if (referenceValues.length === 1) return referenceValues[0]!;
  if (referenceValues.length > 1) return null;
  const debt = debts.get(observation.debtId);
  return debt?.debtKey ?? debt?.liquidationKey ?? null;
}

function remainingPlanPrincipal(
  workspace: FiscalNotificationsWorkspace,
  documentId: string,
): number | null {
  const plans = workspace.paymentPlans.filter(
    (plan) => plan.sourceDocumentId === documentId,
  );
  const amounts: number[] = [];
  for (const plan of plans) {
    const installmentIds = new Set(plan.installmentIds);
    for (const installment of workspace.installments) {
      if (
        !installmentIds.has(installment.id) ||
        !PENDING_INSTALLMENT_STATES.has(installment.status)
      ) continue;
      const principal = installment.components
        .filter((component) => component.type === "PRINCIPAL")
        .reduce((sum, component) => sum + component.amountCents, 0);
      if (principal > 0) amounts.push(principal);
    }
  }
  if (amounts.length < 2) return null;
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  return Number.isSafeInteger(total) ? total : null;
}

function familyForDocument(document: AdministrativeDocument): string | null {
  if (document.documentSubtype?.includes(".")) return document.documentSubtype;
  const fallback: Partial<Record<AdministrativeDocument["documentType"], string>> = {
    AEAT_ENFORCEMENT_ORDER: "collection.enforcement_order",
    AEAT_INSTALLMENT_OR_DEFERRAL_GRANT: "collection.deferral_grant",
    AEAT_INSTALLMENT_OR_DEFERRAL_DENIAL: "collection.deferral_denial",
    AEAT_OFFSET_AGREEMENT: "collection.offset_requested",
    AEAT_ASSESSMENT: "assessment.final_provisional_assessment",
    AEAT_SEIZURE_ORDER: "seizure.bank_account",
  };
  return fallback[document.documentType] ?? null;
}

function globalReferenceType(
  type: ExternalReferenceType,
  familyId: string,
): GlobalReconciliationReferenceTypeV8 | null {
  if (type === "TAX_MODEL") return "MODEL";
  if (type === "TAX_EXERCISE") return "FISCAL_YEAR";
  if (type === "DEBT_KEY" || type === "LIQUIDATION_KEY" || type === "NOTIFICATION_ID") {
    return type;
  }
  if (type === "DOCUMENT_REFERENCE") {
    return familyId.startsWith("seizure.")
      ? "SEIZURE_ORDER_ID"
      : "DOCUMENT_REFERENCE";
  }
  return null;
}

function referenceRole(
  reference: ExternalReference,
  familyId: string,
  evidenceById: ReadonlyMap<string, FiscalNotificationsWorkspace["evidence"][number]>,
  partById: ReadonlyMap<string, FiscalNotificationsWorkspace["parts"][number]>,
): GlobalReconciliationReferenceRoleV8 {
  const evidence = reference.occurrenceIds
    .map((id) => evidenceById.get(id))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);
  if (
    evidence.some((entry) => {
      const part = entry.partId ? partById.get(entry.partId) : null;
      return part?.type === "PAYMENT_FORM" ||
        part?.type === "PAYMENT_INSTRUCTIONS" ||
        part?.type === "COPY_FOR_BANK" ||
        /CARTA DE PAGO|PAYMENT FORM/u.test(
          entry.textSnippet
            .normalize("NFD")
            .replace(/\p{M}/gu, "")
            .toLocaleUpperCase("es"),
        );
    })
  ) return "PAYMENT_FORM";
  if (familyId === "collection.deferral_denial" && evidence.some((entry) => {
    const part = entry.partId ? partById.get(entry.partId) : null;
    return part?.type === "ANNEX_DEBTS" ||
      entry.textSnippet.toLocaleUpperCase("es").includes("DEUDA");
  })) return "CITED_EXECUTIVE_DEBT";
  if (familyId.startsWith("notification.")) return "NOTIFICATION_TARGET";
  if (familyId.startsWith("seizure.") && reference.referenceType === "DOCUMENT_REFERENCE") {
    return "SEIZURE_ORDER";
  }
  return "GENERIC";
}

function globalAmountKind(
  kind: string,
  familyId: string,
): GlobalReconciliationAmountKindV8 | null {
  if (["PRINCIPAL", "ORIGINAL_TAX_PRINCIPAL", "OUTSTANDING_PRINCIPAL", "FINAL_QUOTA"].includes(kind)) {
    return familyId.startsWith("seizure.") ? "SEIZURE_ROW" : "PRINCIPAL";
  }
  if (["SEIZED_AMOUNT", "RETAINED_AMOUNT"].includes(kind)) return "SEIZURE_ROW";
  if (kind === "TOTAL_BEFORE_OFFSET") return "ORDINARY_TOTAL";
  if (["TOTAL_DEBT", "AMOUNT_TO_PAY", "DOCUMENT_TOTAL"].includes(kind)) {
    if (familyId.startsWith("seizure.")) return "SEIZURE_ROW";
    if (familyId === "collection.enforcement_order") return "ORDINARY_TOTAL";
    if (familyId === "collection.deferral_denial") return "DENIAL_SNAPSHOT";
    return "DOCUMENT_TOTAL";
  }
  return null;
}

function memoryAmountType(kind: string): MoneyComponentType {
  if (["PRINCIPAL", "ORIGINAL_TAX_PRINCIPAL", "OUTSTANDING_PRINCIPAL", "FINAL_QUOTA"].includes(kind)) {
    return "PRINCIPAL";
  }
  if (kind === "PAYMENT_ON_ACCOUNT") return "PAYMENT_ON_ACCOUNT";
  return "TOTAL_DEBT";
}

function referenceTypesForEdge(
  relationType: string,
  ids: readonly string[],
  byId: ReadonlyMap<string, ExternalReferenceType>,
): ExternalReferenceType[] {
  const types = ids
    .map((id) => byId.get(id))
    .filter((value): value is ExternalReferenceType => value !== undefined);
  if (relationType === "RELEASED_ASSET_LATER_RESEIZED") {
    types.push("VEHICLE_OR_FINE_REFERENCE");
  }
  return [...new Set(types)].sort();
}

function chooseRelationIndex(
  relations: readonly DocumentRelation[],
  candidates: readonly number[],
): number | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort((left, right) => {
    const leftRelation = relations[left]!;
    const rightRelation = relations[right]!;
    return relationPriority(rightRelation) - relationPriority(leftRelation) ||
      leftRelation.id.localeCompare(rightRelation.id);
  })[0]!;
}

function relationPriority(relation: DocumentRelation): number {
  if (relation.status === "USER_CONFIRMED" || relation.status === "USER_REJECTED") return 3;
  return relation.status === "SYSTEM_CONFIRMED_EXACT" ? 2 : 1;
}

function relationId(left: string, right: string): string {
  return `relation:global-v8:${sha256Hex(pairKey(left, right)).slice(0, 32)}`;
}

function pairKey(left: string, right: string): string {
  return JSON.stringify(left.localeCompare(right) <= 0 ? [left, right] : [right, left]);
}

function uniqueById<T extends { readonly referenceId: string }>(
  entries: readonly T[],
  key?: "amountId",
): T[];
function uniqueById<T extends { readonly amountId: string }>(
  entries: readonly T[],
  key: "amountId",
): T[];
function uniqueById<T extends { readonly referenceId?: string; readonly amountId?: string }>(
  entries: readonly T[],
  key: "amountId" | "referenceId" = "referenceId",
): T[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const id = entry[key];
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function blocked(
  workspace: FiscalNotificationsWorkspace,
  reason: Extract<AppendWorkspaceGlobalReconciliationResultV8, { status: "REVIEW_REQUIRED" }>["reason"],
): AppendWorkspaceGlobalReconciliationResultV8 {
  return Object.freeze({
    status: "REVIEW_REQUIRED",
    reason,
    changedRelationIds: Object.freeze([]) as readonly [],
    workspace,
  });
}
