import { sha256Hex } from "../document-integrity/snapshot-hash";
import {
  assertBoundedId,
  assertBoundedOwnerScope,
  assertNonNegativeIntegerCents,
} from "./input-contract";
import type {
  DocumentRelationType,
  GlobalReconciliationEvidenceKindV8,
  GlobalReconciliationRelationTypeV8,
} from "./types";

export const GLOBAL_RECONCILIATION_RULE_VERSION_V8 =
  "global-reconcile-v8" as const;

export const GLOBAL_RECONCILIATION_MAX_DOCUMENTS_V8 = 5_000;
export const GLOBAL_RECONCILIATION_MAX_REFERENCES_V8 = 20_000;
export const GLOBAL_RECONCILIATION_MAX_AMOUNTS_V8 = 20_000;
export const GLOBAL_RECONCILIATION_MAX_RELATIONS_V8 = 10_000;

export type GlobalReconciliationReferenceRoleV8 =
  | "GENERIC"
  | "PAYMENT_FORM"
  | "CITED_EXECUTIVE_DEBT"
  | "NOTIFICATION_TARGET"
  | "SEIZURE_ORDER";

export type GlobalReconciliationReferenceTypeV8 =
  | "DEBT_KEY"
  | "LIQUIDATION_KEY"
  | "AGREEMENT_ID"
  | "SEIZURE_ORDER_ID"
  | "NOTIFICATION_ID"
  | "DOCUMENT_REFERENCE"
  | "MODEL"
  | "FISCAL_YEAR";

export type GlobalReconciliationAmountKindV8 =
  | "PRINCIPAL"
  | "ORDINARY_TOTAL"
  | "DOCUMENT_TOTAL"
  | "SEIZURE_ROW"
  | "DENIAL_SNAPSHOT";

export interface GlobalReconciliationReferenceV8 {
  readonly referenceId: string;
  readonly type: GlobalReconciliationReferenceTypeV8;
  readonly normalizedValue: string;
  readonly role: GlobalReconciliationReferenceRoleV8;
}

export interface GlobalReconciliationAmountV8 {
  readonly amountId: string;
  readonly kind: GlobalReconciliationAmountKindV8;
  readonly amountCents: number;
  readonly debtKey: string | null;
}

export interface GlobalReconciliationDocumentV8 {
  readonly ownerScope: string;
  readonly documentId: string;
  readonly issuer: "AEAT";
  readonly familyId: string;
  readonly documentDate: string | null;
  readonly references: readonly GlobalReconciliationReferenceV8[];
  readonly amounts: readonly GlobalReconciliationAmountV8[];
  readonly remainingPlanPrincipalCents: number | null;
  readonly modifiedPlan: boolean;
  readonly compatibleAutomaticOffsetClause: boolean;
  readonly offsetRows: number;
  readonly offsetRowsRecalculated: boolean;
  readonly opaqueAssetFingerprint: string | null;
}

export interface ExistingGlobalReconciliationRelationV8 {
  readonly sourceDocumentId: string;
  readonly targetDocumentId: string;
  readonly status:
    | "SUGGESTED"
    | "USER_CONFIRMED"
    | "USER_REJECTED"
    | "SYSTEM_CONFIRMED_EXACT";
  readonly relationType: DocumentRelationType;
  readonly globalRelationType: GlobalReconciliationRelationTypeV8 | null;
  readonly ruleVersion: string | null;
}

export interface GlobalReconciliationEdgeV8 {
  readonly ruleVersion: typeof GLOBAL_RECONCILIATION_RULE_VERSION_V8;
  readonly sourceDocumentId: string;
  readonly targetDocumentId: string;
  readonly relationType: GlobalReconciliationRelationTypeV8;
  readonly persistedRelationType: DocumentRelationType;
  readonly status: "SUGGESTED" | "SYSTEM_CONFIRMED_EXACT";
  readonly resultClassification:
    | "SUGGESTED"
    | "SYSTEM_CONFIRMED_EXACT"
    | "SYSTEM_CONFIRMED_EXACT_CASE_LEVEL"
    | "SYSTEM_CONFIRMED_EXACT_ASSET";
  readonly evidenceKinds: readonly GlobalReconciliationEvidenceKindV8[];
  readonly matchingReferenceIds: readonly string[];
  readonly matchingAmountIds: readonly string[];
  readonly phrase: string;
  readonly caution: string;
  readonly rowAssignmentReviewRequired: boolean;
  readonly requiresHumanReview: true;
  readonly permitsAutomaticAction: false;
  readonly confirmsPayment: false;
  readonly confirmsRemittance: false;
  readonly confirmsDebtExtinction: false;
}

export interface GlobalReconciliationChangeV8 {
  readonly edge: GlobalReconciliationEdgeV8;
  readonly previousStatus:
    | "ABSENT"
    | ExistingGlobalReconciliationRelationV8["status"];
  readonly previousRelationType: DocumentRelationType | "ABSENT";
  readonly reasonCode:
    | "NEW_DIRECT_EDGE"
    | "SUGGESTION_UPGRADED_BY_EXACT_EVIDENCE"
    | "NEW_EVIDENCE_CHANGED_CLASSIFICATION";
  readonly reevaluatedAt: string;
}

export type GlobalReconciliationResultV8 =
  | {
      readonly status: "APPLIED";
      readonly changes: readonly GlobalReconciliationChangeV8[];
      readonly directEdges: readonly GlobalReconciliationEdgeV8[];
    }
  | {
      readonly status: "UNCHANGED";
      readonly changes: readonly [];
      readonly directEdges: readonly GlobalReconciliationEdgeV8[];
    }
  | {
      readonly status: "REVIEW_REQUIRED";
      readonly reason:
        | "INVALID_INPUT"
        | "DOCUMENT_LIMIT_EXCEEDED"
        | "REFERENCE_LIMIT_EXCEEDED"
        | "AMOUNT_LIMIT_EXCEEDED"
        | "RELATION_LIMIT_EXCEEDED";
      readonly changes: readonly [];
      readonly directEdges: readonly [];
    };

export interface GlobalReconciliationChainV8 {
  readonly documentIds: readonly string[];
  readonly edgeKeys: readonly string[];
}

interface CandidateEdgeV8 extends GlobalReconciliationEdgeV8 {
  readonly sortKey: string;
}

const CONTROL_CHARACTER = /[\p{Cc}\p{Cf}]/u;
const REFERENCE = /^[A-Z0-9][A-Z0-9./:_+\-]{1,199}$/u;
const FAMILY_ID = /^[a-z][a-z0-9_.-]{2,159}$/u;
const OPAQUE_ASSET = /^opaque:[a-f0-9]{64}$/u;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;
const MAX_PER_DOCUMENT = 250;
const MAX_INDEX_GROUP = 500;

const PERSISTED_RELATION_TYPE: Readonly<
  Record<GlobalReconciliationRelationTypeV8, DocumentRelationType>
> = Object.freeze({
  RESOLUTION_ENFORCED: "INITIATES_ENFORCEMENT",
  ENFORCES_REMAINING_PLAN_PRINCIPAL: "ENFORCES",
  ENFORCES: "ENFORCES",
  CITED_AS_EXISTING_EXECUTIVE_DEBT: "REFERS_TO_DEBT",
  OFFSET_APPLIES_TO_MODIFIED_PAYMENT_PLAN: "COMPENSATES",
  RELEASES_SEIZURE: "RELEASES_SEIZURE",
  RELEASED_ASSET_LATER_RESEIZED: "CONTINUES",
  POSSIBLY_PRECEDES_ASSESSMENT: "INFORMATIONAL_CONTEXT_FOR",
  NOTIFICATION_EVIDENCE_FOR: "NOTIFICATION_EVIDENCE_FOR",
});

const PHRASES: Readonly<
  Record<
    GlobalReconciliationRelationTypeV8,
    Readonly<{ phrase: string; caution: string }>
  >
> = Object.freeze({
  RESOLUTION_ENFORCED: Object.freeze({
    phrase:
      "Esta providencia inicia el cobro ejecutivo de la liquidación anterior. La conexión está confirmada por la clave impresa en la carta de pago de la resolución.",
    caution:
      "La carta de pago de la resolución no acredita que el ingreso se realizara.",
  }),
  ENFORCES_REMAINING_PLAN_PRINCIPAL: Object.freeze({
    phrase:
      "Esta providencia reclama conjuntamente el principal de varias fracciones restantes del plan; no corresponde a una cuota aislada.",
    caution:
      "La relación no demuestra por sí sola si después se pagó o se modificó el saldo.",
  }),
  ENFORCES: Object.freeze({
    phrase:
      "Esta diligencia continúa el cobro de la deuda identificada en la providencia anterior.",
    caution:
      "El límite del embargo no acredita cuánto se obtuvo ni crea una deuda adicional.",
  }),
  CITED_AS_EXISTING_EXECUTIVE_DEBT: Object.freeze({
    phrase:
      "La denegación cita esta deuda como ya pendiente en vía ejecutiva y la usa como parte de su motivación.",
    caution:
      "La deuda citada no se suma al importe de la solicitud denegada; la providencia sigue siendo el acto de origen preferente.",
  }),
  OFFSET_APPLIES_TO_MODIFIED_PAYMENT_PLAN: Object.freeze({
    phrase:
      "La compensación aplica un crédito a vencimientos de la deuda incluida en el plan modificado.",
    caution:
      "La conexión es exacta a nivel de deuda y plan, pero las filas recalculadas deben revisarse antes de asignarlas a cuotas originales.",
  }),
  RELEASES_SEIZURE: Object.freeze({
    phrase:
      "El acuerdo de levantamiento cita la diligencia anterior y deja constancia documental de su liberación.",
    caution:
      "No se infiere que el levantamiento impida actuaciones futuras sobre el mismo bien.",
  }),
  RELEASED_ASSET_LATER_RESEIZED: Object.freeze({
    phrase:
      "El mismo bien que fue liberado anteriormente volvió a ser embargado mediante otra diligencia.",
    caution:
      "La relación usa únicamente una huella opaca limitada a esta cuenta y no conserva matrícula, bastidor ni identificador registral.",
  }),
  POSSIBLY_PRECEDES_ASSESSMENT: Object.freeze({
    phrase:
      "Este recordatorio puede ser el antecedente informativo de la comprobación posterior sobre el mismo modelo y ejercicio. Revísalo antes de confirmar la conexión.",
    caution:
      "El recordatorio no es un requerimiento ni demuestra por sí solo el origen de la liquidación.",
  }),
  NOTIFICATION_EVIDENCE_FOR: Object.freeze({
    phrase:
      "Este justificante de notificación cita el acto concreto y aporta evidencia documental sobre su comunicación.",
    caution:
      "La fecha de firma, la puesta a disposición y la notificación efectiva son hechos distintos.",
  }),
});

/**
 * Convierte transitoriamente un identificador patrimonial en una huella opaca
 * limitada al propietario. El valor original no forma parte del resultado.
 */
export function createOwnerScopedAssetFingerprintV8(
  ownerScope: string,
  directAssetIdentifier: string,
): `opaque:${string}` {
  assertBoundedOwnerScope(ownerScope, "asset.ownerScope");
  if (
    typeof directAssetIdentifier !== "string" ||
    directAssetIdentifier.length < 2 ||
    directAssetIdentifier.length > 200 ||
    CONTROL_CHARACTER.test(directAssetIdentifier)
  ) {
    throw new Error("INVALID_ASSET_IDENTIFIER:asset.identifier");
  }
  return `opaque:${sha256Hex(
    `${GLOBAL_RECONCILIATION_RULE_VERSION_V8}\u0000${ownerScope}\u0000${directAssetIdentifier}`,
  )}`;
}

/**
 * Pasada determinista todos-contra-índices. Solo emite aristas directas y
 * nunca materializa deuda, pago, remesa, extinción ni estado vigente.
 */
export function reconcileGlobalDocumentRelationsV8(input: {
  readonly documents: readonly GlobalReconciliationDocumentV8[];
  readonly existingRelations?: readonly ExistingGlobalReconciliationRelationV8[];
  readonly reevaluatedAt: string;
}): GlobalReconciliationResultV8 {
  if (!isIsoTimestamp(input.reevaluatedAt)) return review("INVALID_INPUT");
  if (
    !Array.isArray(input.documents) ||
    input.documents.length > GLOBAL_RECONCILIATION_MAX_DOCUMENTS_V8
  ) {
    return review("DOCUMENT_LIMIT_EXCEEDED");
  }
  const existingRelations = input.existingRelations ?? [];
  if (
    !Array.isArray(existingRelations) ||
    existingRelations.length > GLOBAL_RECONCILIATION_MAX_RELATIONS_V8
  ) {
    return review("RELATION_LIMIT_EXCEEDED");
  }

  const documents: GlobalReconciliationDocumentV8[] = [];
  const documentIds = new Set<string>();
  let referenceCount = 0;
  let amountCount = 0;
  try {
    for (const [index, document] of input.documents.entries()) {
      const copy = snapshotDocument(document, `documents[${index}]`);
      if (documentIds.has(copy.documentId)) return review("INVALID_INPUT");
      documentIds.add(copy.documentId);
      referenceCount += copy.references.length;
      if (referenceCount > GLOBAL_RECONCILIATION_MAX_REFERENCES_V8) {
        return review("REFERENCE_LIMIT_EXCEEDED");
      }
      amountCount += copy.amounts.length;
      if (amountCount > GLOBAL_RECONCILIATION_MAX_AMOUNTS_V8) {
        return review("AMOUNT_LIMIT_EXCEEDED");
      }
      documents.push(copy);
    }
  } catch {
    return review("INVALID_INPUT");
  }

  const byDocument = new Map(documents.map((document) => [document.documentId, document]));
  const existingByPair = new Map<string, ExistingGlobalReconciliationRelationV8>();
  for (const relation of existingRelations) {
    if (!validExistingRelation(relation, byDocument)) return review("INVALID_INPUT");
    const key = pairKey(relation.sourceDocumentId, relation.targetDocumentId);
    const current = existingByPair.get(key);
    if (!current || relationPriority(relation.status) > relationPriority(current.status)) {
      existingByPair.set(key, Object.freeze({ ...relation }));
    }
  }

  const candidates = new Map<string, CandidateEdgeV8>();
  const debtIndex = buildReferenceIndex(documents, ["DEBT_KEY", "LIQUIDATION_KEY"]);
  const seizureIndex = buildReferenceIndex(documents, ["SEIZURE_ORDER_ID"]);
  const notificationIndex = buildReferenceIndex(documents, ["NOTIFICATION_ID", "DOCUMENT_REFERENCE"]);
  const assetIndex = new Map<string, GlobalReconciliationDocumentV8[]>();
  for (const document of documents) {
    if (document.opaqueAssetFingerprint) {
      pushMap(assetIndex, tupleKey([document.ownerScope, document.opaqueAssetFingerprint]), document);
    }
  }

  if (
    hasOversizedGroup(debtIndex) ||
    hasOversizedGroup(seizureIndex) ||
    hasOversizedGroup(notificationIndex) ||
    hasOversizedGroup(assetIndex)
  ) {
    return review("RELATION_LIMIT_EXCEEDED");
  }

  try {
    for (const group of debtIndex.values()) evaluateDebtGroup(group, candidates);
    for (const group of seizureIndex.values()) evaluateSeizureGroup(group, candidates);
    for (const group of notificationIndex.values()) evaluateNotificationGroup(group, candidates);
    for (const group of assetIndex.values()) evaluateAssetGroup(group, candidates);
  } catch (error) {
    if (error instanceof RelationLimitExceededV8) {
      return review("RELATION_LIMIT_EXCEEDED");
    }
    return review("INVALID_INPUT");
  }

  if (candidates.size > GLOBAL_RECONCILIATION_MAX_RELATIONS_V8) {
    return review("RELATION_LIMIT_EXCEEDED");
  }
  const directEdges = Object.freeze(
    [...candidates.values()]
      .sort((left, right) => left.sortKey.localeCompare(right.sortKey))
      .map((candidate) => {
        const edge = { ...candidate } as Partial<CandidateEdgeV8>;
        Reflect.deleteProperty(edge, "sortKey");
        return deepFreeze(edge as GlobalReconciliationEdgeV8);
      }),
  );
  const changes: GlobalReconciliationChangeV8[] = [];
  for (const edge of directEdges) {
    const existing = existingByPair.get(
      pairKey(edge.sourceDocumentId, edge.targetDocumentId),
    );
    if (existing?.status === "USER_REJECTED" || existing?.status === "USER_CONFIRMED") {
      continue;
    }
    if (
      existing?.ruleVersion === GLOBAL_RECONCILIATION_RULE_VERSION_V8 &&
      existing.globalRelationType === edge.relationType &&
      existing.status === edge.status &&
      existing.relationType === edge.persistedRelationType
    ) {
      continue;
    }
    if (
      existing?.status === "SYSTEM_CONFIRMED_EXACT" &&
      edge.status === "SUGGESTED"
    ) {
      continue;
    }
    changes.push(
      deepFreeze({
        edge,
        previousStatus: existing?.status ?? "ABSENT",
        previousRelationType: existing?.relationType ?? "ABSENT",
        reasonCode:
          existing?.status === "SUGGESTED" && edge.status === "SYSTEM_CONFIRMED_EXACT"
            ? "SUGGESTION_UPGRADED_BY_EXACT_EVIDENCE"
            : existing
              ? "NEW_EVIDENCE_CHANGED_CLASSIFICATION"
              : "NEW_DIRECT_EDGE",
        reevaluatedAt: input.reevaluatedAt,
      }),
    );
  }
  return deepFreeze(
    changes.length === 0
      ? { status: "UNCHANGED", changes: [], directEdges }
      : { status: "APPLIED", changes, directEdges },
  ) as GlobalReconciliationResultV8;
}

/** Deriva cadenas conectadas sin persistir relaciones transitivas redundantes. */
export function deriveGlobalReconciliationChainsV8(
  edges: readonly GlobalReconciliationEdgeV8[],
): readonly GlobalReconciliationChainV8[] {
  const adjacency = new Map<string, Set<string>>();
  const edgeKeys = new Map<string, string[]>();
  for (const edge of edges) {
    const left = adjacency.get(edge.sourceDocumentId) ?? new Set<string>();
    left.add(edge.targetDocumentId);
    adjacency.set(edge.sourceDocumentId, left);
    const right = adjacency.get(edge.targetDocumentId) ?? new Set<string>();
    right.add(edge.sourceDocumentId);
    adjacency.set(edge.targetDocumentId, right);
    const key = tupleKey([edge.sourceDocumentId, edge.targetDocumentId]);
    edgeKeys.set(key, [...(edgeKeys.get(key) ?? []), edge.relationType]);
  }
  const visited = new Set<string>();
  const chains: GlobalReconciliationChainV8[] = [];
  for (const start of [...adjacency.keys()].sort()) {
    if (visited.has(start)) continue;
    const queue = [start];
    const ids: string[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      ids.push(id);
      for (const neighbor of [...(adjacency.get(id) ?? [])].sort()) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }
    if (ids.length < 2) continue;
    const members = new Set(ids);
    chains.push(
      deepFreeze({
        documentIds: ids.sort(),
        edgeKeys: [...edgeKeys.entries()]
          .filter(([key]) => {
            const parsed = JSON.parse(key) as string[];
            return members.has(parsed[0]!) && members.has(parsed[1]!);
          })
          .flatMap(([key, types]) => types.map((type) => `${key}:${type}`))
          .sort(),
      }),
    );
  }
  return Object.freeze(chains);
}

function evaluateDebtGroup(
  group: readonly GlobalReconciliationDocumentV8[],
  candidates: Map<string, CandidateEdgeV8>,
): void {
  const assessments = group.filter(isAssessment);
  const enforcements = group.filter(isEnforcement);
  const seizures = group.filter(isSeizure);
  const denials = group.filter(isDenial);
  const plans = group.filter(isPlan);
  const offsets = group.filter(isOffset);

  for (const assessment of assessments) {
    const paymentReferences = assessment.references.filter(
      (reference) =>
        reference.role === "PAYMENT_FORM" &&
        (reference.type === "DEBT_KEY" || reference.type === "LIQUIDATION_KEY"),
    );
    for (const enforcement of enforcements) {
      if (!isBefore(assessment, enforcement)) continue;
      const exact = sharedReference(paymentReferences, enforcement.references);
      const compatible = matchingAmounts(
        assessment,
        ["DOCUMENT_TOTAL", "PRINCIPAL"],
        enforcement,
        ["PRINCIPAL", "ORDINARY_TOTAL"],
        exact.normalizedValues,
      );
      if (exact.referenceIds.length > 0) {
        addCandidate(candidates, edge({
          source: assessment,
          target: enforcement,
          relationType: "RESOLUTION_ENFORCED",
          evidenceKinds: [
            "EXACT_REFERENCE",
            "PAYMENT_FORM_PART",
            ...(compatible.amountIds.length > 0
              ? (["COMPATIBLE_AMOUNT"] as const)
              : []),
          ],
          matchingReferenceIds: exact.referenceIds,
          matchingAmountIds: compatible.amountIds,
        }));
      }
    }
  }

  for (const plan of plans) {
    if (plan.remainingPlanPrincipalCents === null) continue;
    for (const enforcement of enforcements) {
      if (!isBefore(plan, enforcement)) continue;
      const exact = sharedDebtReference(plan, enforcement);
      const amount = amountIdsForExactValue(
        enforcement,
        ["PRINCIPAL", "ORDINARY_TOTAL"],
        plan.remainingPlanPrincipalCents,
        exact.normalizedValues,
      );
      if (exact.referenceIds.length > 0 && amount.length > 0) {
        addCandidate(candidates, edge({
          source: plan,
          target: enforcement,
          relationType: "ENFORCES_REMAINING_PLAN_PRINCIPAL",
          evidenceKinds: ["EXACT_REFERENCE", "REMAINING_PLAN_PRINCIPAL", "COMPATIBLE_AMOUNT"],
          matchingReferenceIds: exact.referenceIds,
          matchingAmountIds: amount,
        }));
      }
    }
  }

  for (const enforcement of enforcements) {
    for (const seizure of seizures) {
      if (!isBefore(enforcement, seizure)) continue;
      const exact = sharedDebtReference(enforcement, seizure);
      const compatible = matchingAmounts(
        enforcement,
        ["ORDINARY_TOTAL", "PRINCIPAL"],
        seizure,
        ["SEIZURE_ROW", "ORDINARY_TOTAL"],
        exact.normalizedValues,
      );
      if (exact.referenceIds.length > 0) {
        addCandidate(candidates, edge({
          source: enforcement,
          target: seizure,
          relationType: "ENFORCES",
          evidenceKinds: [
            "EXACT_REFERENCE",
            ...(compatible.amountIds.length > 0
              ? (["COMPATIBLE_AMOUNT"] as const)
              : []),
          ],
          matchingReferenceIds: exact.referenceIds,
          matchingAmountIds: compatible.amountIds,
        }));
      }
    }
    for (const denial of denials) {
      if (!isBefore(enforcement, denial)) continue;
      const cited = denial.references.filter(
        (reference) => reference.role === "CITED_EXECUTIVE_DEBT",
      );
      const exact = sharedReference(enforcement.references, cited);
      const compatible = matchingAmounts(
        enforcement,
        ["ORDINARY_TOTAL", "PRINCIPAL"],
        denial,
        ["DENIAL_SNAPSHOT"],
        exact.normalizedValues,
      );
      if (exact.referenceIds.length > 0) {
        addCandidate(candidates, edge({
          source: enforcement,
          target: denial,
          relationType: "CITED_AS_EXISTING_EXECUTIVE_DEBT",
          evidenceKinds: [
            "EXACT_REFERENCE",
            "EXECUTIVE_DEBT_CITATION",
            ...(compatible.amountIds.length > 0
              ? (["COMPATIBLE_AMOUNT"] as const)
              : []),
          ],
          matchingReferenceIds: exact.referenceIds,
          matchingAmountIds: compatible.amountIds,
        }));
      }
    }
  }

  for (const plan of plans.filter((document) => document.modifiedPlan)) {
    for (const offset of offsets) {
      if (
        !isBefore(plan, offset) ||
        !plan.compatibleAutomaticOffsetClause ||
        offset.offsetRows < 1
      ) continue;
      const exact = sharedDebtReference(plan, offset);
      if (exact.referenceIds.length > 0) {
        addCandidate(candidates, edge({
          source: plan,
          target: offset,
          relationType: "OFFSET_APPLIES_TO_MODIFIED_PAYMENT_PLAN",
          evidenceKinds: [
            "EXACT_REFERENCE",
            "MODIFIED_PLAN_STRUCTURE",
            ...(offset.offsetRowsRecalculated
              ? (["RECALCULATED_OFFSET_ROWS"] as const)
              : []),
          ],
          matchingReferenceIds: exact.referenceIds,
          matchingAmountIds: [],
          resultClassification: "SYSTEM_CONFIRMED_EXACT_CASE_LEVEL",
          rowAssignmentReviewRequired: offset.offsetRowsRecalculated,
        }));
      }
    }
  }
}

function evaluateSeizureGroup(
  group: readonly GlobalReconciliationDocumentV8[],
  candidates: Map<string, CandidateEdgeV8>,
): void {
  const seizures = group.filter(isSeizure);
  const releases = group.filter(isRelease);
  for (const seizure of seizures) {
    for (const release of releases) {
      if (!isBefore(seizure, release)) continue;
      const exact = sharedReference(
        seizure.references.filter((reference) => reference.role === "SEIZURE_ORDER"),
        release.references.filter((reference) => reference.role === "SEIZURE_ORDER"),
      );
      if (exact.referenceIds.length > 0) {
        addCandidate(candidates, edge({
          source: seizure,
          target: release,
          relationType: "RELEASES_SEIZURE",
          evidenceKinds: ["EXACT_SEIZURE_REFERENCE"],
          matchingReferenceIds: exact.referenceIds,
          matchingAmountIds: [],
        }));
      }
    }
  }
}

function evaluateNotificationGroup(
  group: readonly GlobalReconciliationDocumentV8[],
  candidates: Map<string, CandidateEdgeV8>,
): void {
  const proofs = group.filter(isNotificationProof);
  const acts = group.filter((document) => !isNotificationProof(document));
  for (const proof of proofs) {
    for (const act of acts) {
      const targetReferences = proof.references.filter(
        (reference) => reference.role === "NOTIFICATION_TARGET",
      );
      const exact = sharedReference(targetReferences, act.references);
      if (exact.referenceIds.length === 0) continue;
      addCandidate(candidates, edge({
        source: act,
        target: proof,
        relationType: "NOTIFICATION_EVIDENCE_FOR",
        evidenceKinds: ["EXACT_REFERENCE", "NOTIFICATION_PROOF_REFERENCE"],
        matchingReferenceIds: exact.referenceIds,
        matchingAmountIds: [],
      }));
    }
  }
}

function evaluateAssetGroup(
  group: readonly GlobalReconciliationDocumentV8[],
  candidates: Map<string, CandidateEdgeV8>,
): void {
  const releases = group.filter(isRelease);
  const seizures = group.filter(isSeizure);
  for (const release of releases) {
    for (const seizure of seizures) {
      if (!isStrictlyBeforeByDocumentDate(release, seizure)) continue;
      const releaseOrderIds = new Set(
        release.references
          .filter((reference) => reference.role === "SEIZURE_ORDER")
          .map((reference) => reference.normalizedValue),
      );
      const sameOrder = seizure.references.some(
        (reference) =>
          reference.role === "SEIZURE_ORDER" &&
          releaseOrderIds.has(reference.normalizedValue),
      );
      if (sameOrder) continue;
      addCandidate(candidates, edge({
        source: release,
        target: seizure,
        relationType: "RELEASED_ASSET_LATER_RESEIZED",
        evidenceKinds: ["OWNER_SCOPED_OPAQUE_ASSET"],
        matchingReferenceIds: [],
        matchingAmountIds: [],
        resultClassification: "SYSTEM_CONFIRMED_EXACT_ASSET",
      }));
    }
  }
}

function edge(input: {
  source: GlobalReconciliationDocumentV8;
  target: GlobalReconciliationDocumentV8;
  relationType: GlobalReconciliationRelationTypeV8;
  evidenceKinds: readonly GlobalReconciliationEvidenceKindV8[];
  matchingReferenceIds: readonly string[];
  matchingAmountIds: readonly string[];
  status?: "SUGGESTED" | "SYSTEM_CONFIRMED_EXACT";
  resultClassification?: GlobalReconciliationEdgeV8["resultClassification"];
  rowAssignmentReviewRequired?: boolean;
}): CandidateEdgeV8 {
  const text = PHRASES[input.relationType];
  const status = input.status ?? "SYSTEM_CONFIRMED_EXACT";
  return deepFreeze({
    ruleVersion: GLOBAL_RECONCILIATION_RULE_VERSION_V8,
    sourceDocumentId: input.source.documentId,
    targetDocumentId: input.target.documentId,
    relationType: input.relationType,
    persistedRelationType: PERSISTED_RELATION_TYPE[input.relationType],
    status,
    resultClassification:
      input.resultClassification ??
      (status === "SUGGESTED" ? "SUGGESTED" : "SYSTEM_CONFIRMED_EXACT"),
    evidenceKinds: [...new Set(input.evidenceKinds)].sort(),
    matchingReferenceIds: [...new Set(input.matchingReferenceIds)].sort(),
    matchingAmountIds: [...new Set(input.matchingAmountIds)].sort(),
    phrase: text.phrase,
    caution: text.caution,
    rowAssignmentReviewRequired: input.rowAssignmentReviewRequired ?? false,
    requiresHumanReview: true,
    permitsAutomaticAction: false,
    confirmsPayment: false,
    confirmsRemittance: false,
    confirmsDebtExtinction: false,
    sortKey: tupleKey([
      input.source.documentId,
      input.target.documentId,
      input.relationType,
    ]),
  });
}

function addCandidate(
  target: Map<string, CandidateEdgeV8>,
  candidate: CandidateEdgeV8,
): void {
  const key = tupleKey([
    candidate.sourceDocumentId,
    candidate.targetDocumentId,
    candidate.relationType,
  ]);
  const existing = target.get(key);
  if (!existing || edgePriority(candidate) > edgePriority(existing)) {
    if (!existing && target.size >= GLOBAL_RECONCILIATION_MAX_RELATIONS_V8) {
      throw new RelationLimitExceededV8();
    }
    target.set(key, candidate);
  }
}

class RelationLimitExceededV8 extends Error {}

function hasOversizedGroup<K>(map: ReadonlyMap<K, readonly unknown[]>): boolean {
  for (const group of map.values()) {
    if (group.length > MAX_INDEX_GROUP) return true;
  }
  return false;
}

function edgePriority(edge: GlobalReconciliationEdgeV8): number {
  return edge.status === "SYSTEM_CONFIRMED_EXACT" ? 2 : 1;
}

function relationPriority(
  status: ExistingGlobalReconciliationRelationV8["status"],
): number {
  if (status === "USER_REJECTED" || status === "USER_CONFIRMED") return 3;
  return status === "SYSTEM_CONFIRMED_EXACT" ? 2 : 1;
}

function buildReferenceIndex(
  documents: readonly GlobalReconciliationDocumentV8[],
  types: readonly GlobalReconciliationReferenceTypeV8[],
): Map<string, GlobalReconciliationDocumentV8[]> {
  const allowed = new Set(types);
  const result = new Map<string, GlobalReconciliationDocumentV8[]>();
  for (const document of documents) {
    const seen = new Set<string>();
    for (const reference of document.references) {
      if (!allowed.has(reference.type)) continue;
      const key = tupleKey([
        document.ownerScope,
        document.issuer,
        reference.type,
        reference.normalizedValue,
      ]);
      if (seen.has(key)) continue;
      seen.add(key);
      pushMap(result, key, document);
    }
  }
  return result;
}

function sharedDebtReference(
  left: GlobalReconciliationDocumentV8,
  right: GlobalReconciliationDocumentV8,
): { referenceIds: string[]; normalizedValues: string[] } {
  return sharedReference(
    left.references.filter((reference) =>
      reference.type === "DEBT_KEY" || reference.type === "LIQUIDATION_KEY"),
    right.references.filter((reference) =>
      reference.type === "DEBT_KEY" || reference.type === "LIQUIDATION_KEY"),
  );
}

function sharedReference(
  left: readonly GlobalReconciliationReferenceV8[],
  right: readonly GlobalReconciliationReferenceV8[],
): { referenceIds: string[]; normalizedValues: string[] } {
  const rightByKey = new Map(
    right.map((reference) => [tupleKey([reference.type, reference.normalizedValue]), reference]),
  );
  const ids: string[] = [];
  const normalizedValues: string[] = [];
  for (const reference of left) {
    const match = rightByKey.get(tupleKey([reference.type, reference.normalizedValue]));
    if (match) {
      ids.push(reference.referenceId, match.referenceId);
      normalizedValues.push(reference.normalizedValue);
    }
  }
  return {
    referenceIds: [...new Set(ids)].sort(),
    normalizedValues: [...new Set(normalizedValues)].sort(),
  };
}

function matchingAmounts(
  left: GlobalReconciliationDocumentV8,
  leftKinds: readonly GlobalReconciliationAmountKindV8[],
  right: GlobalReconciliationDocumentV8,
  rightKinds: readonly GlobalReconciliationAmountKindV8[],
  debtKeys: readonly string[],
): { amountIds: string[] } {
  const allowedLeft = new Set(leftKinds);
  const allowedRight = new Set(rightKinds);
  const allowedDebtKeys = new Set(debtKeys);
  const rightByValue = new Map<string, GlobalReconciliationAmountV8[]>();
  for (const amount of right.amounts) {
    if (!allowedRight.has(amount.kind)) continue;
    const debtKey = resolvedAmountDebtKey(right, amount);
    if (!debtKey || !allowedDebtKeys.has(debtKey)) continue;
    pushMap(rightByValue, tupleKey([debtKey, String(amount.amountCents)]), amount);
  }
  const ids: string[] = [];
  for (const amount of left.amounts) {
    if (!allowedLeft.has(amount.kind)) continue;
    const debtKey = resolvedAmountDebtKey(left, amount);
    if (!debtKey || !allowedDebtKeys.has(debtKey)) continue;
    for (const match of
      rightByValue.get(tupleKey([debtKey, String(amount.amountCents)])) ?? []) {
      ids.push(amount.amountId, match.amountId);
    }
  }
  return { amountIds: [...new Set(ids)].sort() };
}

function amountIdsForExactValue(
  document: GlobalReconciliationDocumentV8,
  kinds: readonly GlobalReconciliationAmountKindV8[],
  value: number,
  debtKeys: readonly string[],
): string[] {
  const allowed = new Set(kinds);
  const allowedDebtKeys = new Set(debtKeys);
  return document.amounts
    .filter((amount) => {
      const debtKey = resolvedAmountDebtKey(document, amount);
      return (
        allowed.has(amount.kind) &&
        amount.amountCents === value &&
        debtKey !== null &&
        allowedDebtKeys.has(debtKey)
      );
    })
    .map((amount) => amount.amountId)
    .sort();
}

function isEnforcement(document: GlobalReconciliationDocumentV8): boolean {
  return document.familyId === "collection.enforcement_order";
}

function isPlan(document: GlobalReconciliationDocumentV8): boolean {
  return document.familyId === "collection.deferral_grant" ||
    document.familyId === "collection.deferral_modification";
}

function isOffset(document: GlobalReconciliationDocumentV8): boolean {
  return document.familyId === "collection.offset_requested" ||
    document.familyId === "collection.offset_ex_officio";
}

function isAssessment(document: GlobalReconciliationDocumentV8): boolean {
  return document.familyId === "assessment.final_provisional_assessment";
}

function isDenial(document: GlobalReconciliationDocumentV8): boolean {
  return document.familyId === "collection.deferral_denial";
}

function isSeizure(document: GlobalReconciliationDocumentV8): boolean {
  return document.familyId.startsWith("seizure.") && !isRelease(document);
}

function isRelease(document: GlobalReconciliationDocumentV8): boolean {
  return document.familyId === "seizure.release";
}

function isNotificationProof(document: GlobalReconciliationDocumentV8): boolean {
  return document.familyId === "notification.publication_or_appearance" ||
    document.familyId === "notification.delivery_attempt";
}

function isBefore(
  source: GlobalReconciliationDocumentV8,
  target: GlobalReconciliationDocumentV8,
): boolean {
  return Boolean(
    source.documentDate &&
      target.documentDate &&
      source.documentDate <= target.documentDate,
  );
}

function resolvedAmountDebtKey(
  document: GlobalReconciliationDocumentV8,
  amount: GlobalReconciliationAmountV8,
): string | null {
  if (amount.debtKey) return amount.debtKey;
  const values = [
    ...new Set(
      document.references
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

function isStrictlyBeforeByDocumentDate(
  source: GlobalReconciliationDocumentV8,
  target: GlobalReconciliationDocumentV8,
): boolean {
  return Boolean(
    source.documentDate &&
      target.documentDate &&
      source.documentDate < target.documentDate,
  );
}

function snapshotDocument(
  value: GlobalReconciliationDocumentV8,
  path: string,
): GlobalReconciliationDocumentV8 {
  assertBoundedOwnerScope(value.ownerScope, `${path}.ownerScope`);
  assertBoundedId(value.documentId, `${path}.documentId`);
  if (
    value.issuer !== "AEAT" ||
    typeof value.familyId !== "string" ||
    !FAMILY_ID.test(value.familyId) ||
    !validDate(value.documentDate) ||
    !Array.isArray(value.references) ||
    !Array.isArray(value.amounts) ||
    value.references.length > MAX_PER_DOCUMENT ||
    value.amounts.length > MAX_PER_DOCUMENT ||
    !Number.isSafeInteger(value.offsetRows) ||
    value.offsetRows < 0 ||
    value.offsetRows > MAX_PER_DOCUMENT ||
    typeof value.modifiedPlan !== "boolean" ||
    typeof value.compatibleAutomaticOffsetClause !== "boolean" ||
    typeof value.offsetRowsRecalculated !== "boolean" ||
    (value.remainingPlanPrincipalCents !== null &&
      !validCents(value.remainingPlanPrincipalCents)) ||
    (value.opaqueAssetFingerprint !== null &&
      !OPAQUE_ASSET.test(value.opaqueAssetFingerprint))
  ) {
    throw new Error(`INVALID_GLOBAL_DOCUMENT:${path}`);
  }
  const referenceIds = new Set<string>();
  const references = value.references.map((reference, index) => {
    assertBoundedId(reference.referenceId, `${path}.references[${index}].referenceId`);
    if (
      referenceIds.has(reference.referenceId) ||
      ![
        "DEBT_KEY", "LIQUIDATION_KEY", "AGREEMENT_ID", "SEIZURE_ORDER_ID",
        "NOTIFICATION_ID", "DOCUMENT_REFERENCE", "MODEL", "FISCAL_YEAR",
      ].includes(reference.type) ||
      !["GENERIC", "PAYMENT_FORM", "CITED_EXECUTIVE_DEBT", "NOTIFICATION_TARGET", "SEIZURE_ORDER"].includes(reference.role) ||
      typeof reference.normalizedValue !== "string" ||
      !REFERENCE.test(reference.normalizedValue) ||
      CONTROL_CHARACTER.test(reference.normalizedValue)
    ) throw new Error(`INVALID_GLOBAL_REFERENCE:${path}.references[${index}]`);
    referenceIds.add(reference.referenceId);
    return Object.freeze({ ...reference });
  });
  const amountIds = new Set<string>();
  const amounts = value.amounts.map((amount, index) => {
    assertBoundedId(amount.amountId, `${path}.amounts[${index}].amountId`);
    if (
      amountIds.has(amount.amountId) ||
      !["PRINCIPAL", "ORDINARY_TOTAL", "DOCUMENT_TOTAL", "SEIZURE_ROW", "DENIAL_SNAPSHOT"].includes(amount.kind) ||
      !validCents(amount.amountCents) ||
      (amount.debtKey !== null && !REFERENCE.test(amount.debtKey))
    ) throw new Error(`INVALID_GLOBAL_AMOUNT:${path}.amounts[${index}]`);
    amountIds.add(amount.amountId);
    return Object.freeze({ ...amount });
  });
  return Object.freeze({
    ...value,
    references: Object.freeze(references),
    amounts: Object.freeze(amounts),
  });
}

function validExistingRelation(
  value: ExistingGlobalReconciliationRelationV8,
  documents: ReadonlyMap<string, GlobalReconciliationDocumentV8>,
): boolean {
  return (
    value.sourceDocumentId !== value.targetDocumentId &&
    documents.has(value.sourceDocumentId) &&
    documents.has(value.targetDocumentId) &&
    ["SUGGESTED", "USER_CONFIRMED", "USER_REJECTED", "SYSTEM_CONFIRMED_EXACT"].includes(value.status) &&
    (value.ruleVersion === null || value.ruleVersion.length <= 64)
  );
}

function validCents(value: number): boolean {
  try {
    assertNonNegativeIntegerCents(value, "amountCents");
    return true;
  } catch {
    return false;
  }
}

function validDate(value: string | null): boolean {
  if (value === null) return true;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value;
}

function isIsoTimestamp(value: string): boolean {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function tupleKey(values: readonly string[]): string {
  return JSON.stringify(values);
}

function pairKey(left: string, right: string): string {
  return left.localeCompare(right) <= 0
    ? tupleKey([left, right])
    : tupleKey([right, left]);
}

function pushMap<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const entries = map.get(key) ?? [];
  entries.push(value);
  map.set(key, entries);
}

function review(
  reason: Extract<GlobalReconciliationResultV8, { status: "REVIEW_REQUIRED" }>["reason"],
): GlobalReconciliationResultV8 {
  return Object.freeze({
    status: "REVIEW_REQUIRED",
    reason,
    changes: Object.freeze([]) as readonly [],
    directEdges: Object.freeze([]) as readonly [],
  });
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
