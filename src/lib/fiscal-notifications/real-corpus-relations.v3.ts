import {
  assertBoundedId,
  assertBoundedOwnerScope,
  assertNonNegativeIntegerCents,
} from "./input-contract";

export const REAL_CORPUS_RELATION_ENGINE_VERSION_V3 =
  "real-corpus-relations.2026-07-17.v3" as const;

export type RealCorpusRelationTypeV3 =
  | "CLAIMS_UNPAID_INSTALLMENT"
  | "SAME_PAYMENT_PLAN_DIFFERENT_INSTALLMENTS"
  | "ENFORCES"
  | "RELEASES_SEIZURE"
  | "POSSIBLY_RELATED";

export interface RealCorpusInstallmentIdentityInputV3 {
  readonly ownerScope: string;
  readonly issuer: "AEAT";
  readonly debtKey: string;
  readonly installmentDueDate: string;
  readonly installmentSequence: number;
}

export interface RealCorpusRelationDocumentV3 {
  readonly ownerScope: string;
  readonly documentId: string;
  readonly issuer: "AEAT";
  readonly familyId: string;
  readonly debtKey: string | null;
  readonly installmentDueDate: string | null;
  readonly installmentSequence: number | null;
  readonly installmentTotalCents: number | null;
  readonly enforcementPrincipalCents: number | null;
  readonly enforcementOrdinaryTotalCents: number | null;
  readonly paymentFormReference: string | null;
  readonly seizureOrderId: string | null;
  readonly citedSeizureOrderId: string | null;
  readonly seizedAmountCents: number | null;
  readonly pendingDebtCents: number | null;
  readonly taxModel: string | null;
  readonly fiscalYear: string | null;
}

export interface RealCorpusRelationV3 {
  readonly engineVersion: typeof REAL_CORPUS_RELATION_ENGINE_VERSION_V3;
  readonly relationType: RealCorpusRelationTypeV3;
  readonly status:
    "SYSTEM_CONFIRMED_EXACT" | "SUGGESTED" | "UNRESOLVED_EXACT_TARGET";
  readonly sourceDocumentId: string;
  readonly targetDocumentId: string;
  readonly exactReference: string | null;
  readonly installmentIdentity: string | null;
  readonly phrase: string;
  readonly requiresHumanReview: true;
  readonly permitsAutomaticAction: false;
}

const REFERENCE = /^[A-Z0-9][A-Z0-9./:_+-]{1,199}$/u;
const PRIVATE_REFERENCE =
  /^(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]|ES\d{22}|[6789]\d{8})$/u;

function validDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
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

function validReference(value: string | null): boolean {
  return (
    value === null || (REFERENCE.test(value) && !PRIVATE_REFERENCE.test(value))
  );
}

function validCents(value: number | null): boolean {
  if (value === null) return true;
  try {
    assertNonNegativeIntegerCents(value, "relation.amountCents");
    return true;
  } catch {
    return false;
  }
}

function validDocument(value: RealCorpusRelationDocumentV3): boolean {
  try {
    assertBoundedOwnerScope(value.ownerScope, "relation.ownerScope");
    assertBoundedId(value.documentId, "relation.documentId");
  } catch {
    return false;
  }
  return (
    value.issuer === "AEAT" &&
    [
      value.debtKey,
      value.paymentFormReference,
      value.seizureOrderId,
      value.citedSeizureOrderId,
      value.taxModel,
      value.fiscalYear,
    ].every(validReference) &&
    (value.installmentDueDate === null ||
      validDate(value.installmentDueDate)) &&
    (value.installmentSequence === null ||
      (Number.isSafeInteger(value.installmentSequence) &&
        value.installmentSequence > 0 &&
        value.installmentSequence <= 999)) &&
    [
      value.installmentTotalCents,
      value.enforcementPrincipalCents,
      value.enforcementOrdinaryTotalCents,
      value.seizedAmountCents,
      value.pendingDebtCents,
    ].every(validCents)
  );
}

export function buildRealCorpusInstallmentIdentityV3(
  value: RealCorpusInstallmentIdentityInputV3,
): string {
  assertBoundedOwnerScope(value.ownerScope, "installment.ownerScope");
  if (
    value.issuer !== "AEAT" ||
    !validReference(value.debtKey) ||
    !value.debtKey ||
    !validDate(value.installmentDueDate) ||
    !Number.isSafeInteger(value.installmentSequence) ||
    value.installmentSequence < 1 ||
    value.installmentSequence > 999
  ) {
    throw new Error("INVALID_REAL_CORPUS_INSTALLMENT_IDENTITY_V3");
  }
  return [
    "aeat-installment-v3",
    encodeURIComponent(value.ownerScope),
    value.issuer,
    value.debtKey,
    value.installmentDueDate,
    String(value.installmentSequence),
  ].join(":");
}

function relation(
  input: Omit<
    RealCorpusRelationV3,
    "engineVersion" | "requiresHumanReview" | "permitsAutomaticAction"
  >,
): RealCorpusRelationV3 {
  return Object.freeze({
    engineVersion: REAL_CORPUS_RELATION_ENGINE_VERSION_V3,
    ...input,
    requiresHumanReview: true as const,
    permitsAutomaticAction: false as const,
  });
}

function enforcementAndDeferral(
  source: RealCorpusRelationDocumentV3,
  target: RealCorpusRelationDocumentV3,
): readonly RealCorpusRelationV3[] {
  const enforcement =
    source.familyId === "collection.enforcement_order" ? source : target;
  const plan =
    source.familyId === "collection.deferral_grant" ? source : target;
  if (
    enforcement.familyId !== "collection.enforcement_order" ||
    plan.familyId !== "collection.deferral_grant" ||
    !enforcement.debtKey ||
    enforcement.debtKey !== plan.debtKey ||
    !enforcement.installmentDueDate ||
    enforcement.installmentDueDate !== plan.installmentDueDate ||
    enforcement.enforcementPrincipalCents === null ||
    enforcement.enforcementPrincipalCents !== plan.installmentTotalCents ||
    plan.installmentSequence === null
  ) {
    return Object.freeze([]);
  }
  const identity = buildRealCorpusInstallmentIdentityV3({
    ownerScope: source.ownerScope,
    issuer: "AEAT",
    debtKey: plan.debtKey,
    installmentDueDate: plan.installmentDueDate,
    installmentSequence: plan.installmentSequence,
  });
  return Object.freeze([
    relation({
      relationType: "CLAIMS_UNPAID_INSTALLMENT",
      status: "SYSTEM_CONFIRMED_EXACT",
      sourceDocumentId: enforcement.documentId,
      targetDocumentId: plan.documentId,
      exactReference: plan.debtKey,
      installmentIdentity: identity,
      phrase:
        "Esta providencia reclama una cuota concreta del aplazamiento. El principal coincide con el total vencido de esa cuota, incluido su interés; el recargo ejecutivo se añade después.",
    }),
  ]);
}

function differentInstallments(
  source: RealCorpusRelationDocumentV3,
  target: RealCorpusRelationDocumentV3,
): RealCorpusRelationV3 | null {
  if (
    source.familyId !== "collection.enforcement_order" ||
    target.familyId !== "collection.enforcement_order" ||
    !source.debtKey ||
    source.debtKey !== target.debtKey ||
    !source.installmentDueDate ||
    !target.installmentDueDate ||
    (source.installmentDueDate === target.installmentDueDate &&
      source.paymentFormReference === target.paymentFormReference)
  ) {
    return null;
  }
  return relation({
    relationType: "SAME_PAYMENT_PLAN_DIFFERENT_INSTALLMENTS",
    status: "SYSTEM_CONFIRMED_EXACT",
    sourceDocumentId: source.documentId,
    targetDocumentId: target.documentId,
    exactReference: source.debtKey,
    installmentIdentity: null,
    phrase:
      "Ambos documentos pertenecen al mismo plan, pero corresponden a cuotas distintas y no son duplicados.",
  });
}

function enforcementAndSeizure(
  source: RealCorpusRelationDocumentV3,
  target: RealCorpusRelationDocumentV3,
): RealCorpusRelationV3 | null {
  const seizure = source.familyId === "seizure.bank_account" ? source : target;
  const enforcement = seizure === source ? target : source;
  if (
    seizure.familyId !== "seizure.bank_account" ||
    enforcement.familyId !== "collection.enforcement_order" ||
    !seizure.debtKey ||
    seizure.debtKey !== enforcement.debtKey ||
    seizure.pendingDebtCents === null ||
    enforcement.enforcementOrdinaryTotalCents === null ||
    seizure.pendingDebtCents !== enforcement.enforcementOrdinaryTotalCents
  ) {
    return null;
  }
  return relation({
    relationType: "ENFORCES",
    status: "SYSTEM_CONFIRMED_EXACT",
    sourceDocumentId: seizure.documentId,
    targetDocumentId: enforcement.documentId,
    exactReference: seizure.debtKey,
    installmentIdentity: null,
    phrase:
      "Esta diligencia continúa el cobro ejecutivo iniciado por la providencia anterior y afecta saldos bancarios hasta el importe pendiente. No acredita que el dinero ya haya sido ingresado en el Tesoro.",
  });
}

function releaseRelation(
  source: RealCorpusRelationDocumentV3,
  target: RealCorpusRelationDocumentV3,
): RealCorpusRelationV3 | null {
  const release = source.familyId === "seizure.release" ? source : target;
  const seizure = release === source ? target : source;
  if (
    release.familyId !== "seizure.release" ||
    !release.citedSeizureOrderId ||
    release.citedSeizureOrderId !== seizure.seizureOrderId
  ) {
    return null;
  }
  return relation({
    relationType: "RELEASES_SEIZURE",
    status: "SYSTEM_CONFIRMED_EXACT",
    sourceDocumentId: release.documentId,
    targetDocumentId: seizure.documentId,
    exactReference: release.citedSeizureOrderId,
    installmentIdentity: null,
    phrase:
      "Este documento levanta el embargo identificado en la diligencia anterior en el alcance impreso. No demuestra por sí solo que la deuda se haya pagado o extinguido.",
  });
}

/** Exact links require owner, issuer and the complete family-specific tuple. */
export function relateRealCorpusDocumentsV3(
  source: RealCorpusRelationDocumentV3,
  target: RealCorpusRelationDocumentV3,
): readonly RealCorpusRelationV3[] {
  if (
    !validDocument(source) ||
    !validDocument(target) ||
    source.documentId === target.documentId ||
    source.ownerScope !== target.ownerScope ||
    source.issuer !== target.issuer
  ) {
    return Object.freeze([]);
  }
  const exact = [
    ...enforcementAndDeferral(source, target),
    differentInstallments(source, target),
    enforcementAndSeizure(source, target),
    releaseRelation(source, target),
  ].filter((item): item is RealCorpusRelationV3 => item !== null);
  if (exact.length > 0) return Object.freeze(exact);
  if (
    source.taxModel !== null &&
    source.taxModel === target.taxModel &&
    source.fiscalYear !== null &&
    source.fiscalYear === target.fiscalYear
  ) {
    return Object.freeze([
      relation({
        relationType: "POSSIBLY_RELATED",
        status: "SUGGESTED",
        sourceDocumentId: source.documentId,
        targetDocumentId: target.documentId,
        exactReference: null,
        installmentIdentity: null,
        phrase:
          "Puede estar relacionado con otro documento por el modelo y ejercicio coincidentes. Revísalo antes de confirmar la conexión.",
      }),
    ]);
  }
  return Object.freeze([]);
}
