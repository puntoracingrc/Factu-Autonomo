import {
  assertBoundedId,
  assertBoundedOwnerScope,
  assertNonNegativeIntegerCents,
} from "./input-contract";

export const REAL_CORPUS_RELATION_ENGINE_VERSION_V4 =
  "real-corpus-relations.2026-07-19.v4.1" as const;

export type RealCorpusRelationTypeV4 =
  | "RESOLVES"
  | "POSSIBLY_RELATED"
  | "CLAIMS_UNPAID_INSTALLMENT"
  | "ENFORCES"
  | "REITERATED_BY"
  | "RELEASES_SEIZURE"
  | "CLOSES_AFTER_REITERATION"
  | "INCLUDED_IN_SEIZURE"
  | "SAME_PAYMENT_PLAN_DIFFERENT_INSTALLMENTS"
  | "NOTIFICATION_EVIDENCE_FOR";

export interface RealCorpusDebtObservationInputV4 {
  readonly debtKey: string;
  readonly outstandingAmountCents: number | null;
}

export interface RealCorpusRelationDocumentV4 {
  readonly ownerScope: string;
  readonly documentId: string;
  readonly issuer: "AEAT";
  readonly familyId: string;
  readonly procedureId: string | null;
  readonly debtKey: string | null;
  readonly dueDate: string | null;
  readonly principalCents: number | null;
  readonly paymentFormReference: string | null;
  readonly installmentTotalCents: number | null;
  readonly enforcementOrdinaryTotalCents: number | null;
  readonly seizureOrderId: string | null;
  readonly citedSeizureOrderId: string | null;
  readonly seizedAmountCents: number | null;
  readonly debtObservations: readonly RealCorpusDebtObservationInputV4[];
  readonly taxModel: string | null;
  readonly fiscalYear: string | null;
  readonly citedNotificationDate: string | null;
  readonly deliveryCoverPartId: string | null;
}

export interface RealCorpusInstallmentIdentityInputV4 {
  readonly ownerScope: string;
  readonly issuer: "AEAT";
  readonly debtKey: string;
  readonly dueDate: string;
  readonly paymentFormReference: string;
}

export interface RealCorpusRelationV4 {
  readonly engineVersion: typeof REAL_CORPUS_RELATION_ENGINE_VERSION_V4;
  readonly relationType: RealCorpusRelationTypeV4;
  readonly status: "SYSTEM_CONFIRMED_EXACT" | "SUGGESTED";
  readonly sourceDocumentId: string;
  readonly targetDocumentId: string;
  readonly exactReference: string | null;
  readonly installmentIdentity: string | null;
  readonly observedAmountCents: number | null;
  readonly phrase: string;
  readonly requiresHumanReview: true;
  readonly permitsAutomaticAction: false;
}

const REFERENCE = /^[A-Z0-9][A-Z0-9./:_+-]{1,199}$/u;
const PRIVATE_REFERENCE =
  /^(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]|ES\d{22}|[6789]\d{8})$/u;
const FORBIDDEN_SUGGESTED_ASSERTIONS = /\b(?:PAGA|RESUELVE|CANCELA|LEVANTA|EXTINGUE)\b/iu;

function validReference(value: string | null): boolean {
  return value === null || (REFERENCE.test(value) && !PRIVATE_REFERENCE.test(value));
}

function validDate(value: string | null): boolean {
  if (value === null) return true;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value;
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

function validDocument(value: RealCorpusRelationDocumentV4): boolean {
  try {
    assertBoundedOwnerScope(value.ownerScope, "relation.ownerScope");
    assertBoundedId(value.documentId, "relation.documentId");
  } catch {
    return false;
  }
  if (
    value.issuer !== "AEAT" ||
    ![value.procedureId, value.debtKey, value.paymentFormReference, value.seizureOrderId, value.citedSeizureOrderId, value.taxModel, value.fiscalYear].every(validReference) ||
    !validDate(value.dueDate) ||
    !validDate(value.citedNotificationDate) ||
    ![value.principalCents, value.installmentTotalCents, value.enforcementOrdinaryTotalCents, value.seizedAmountCents].every(validCents) ||
    value.debtObservations.length > 50
  ) return false;
  const seen = new Set<string>();
  for (const observation of value.debtObservations) {
    if (!validReference(observation.debtKey) || seen.has(observation.debtKey) || !validCents(observation.outstandingAmountCents)) return false;
    seen.add(observation.debtKey);
  }
  return value.deliveryCoverPartId === null || value.deliveryCoverPartId === `part:${value.documentId}:delivery-cover`;
}

export function buildRealCorpusInstallmentIdentityV4(value: RealCorpusInstallmentIdentityInputV4): string {
  assertBoundedOwnerScope(value.ownerScope, "installment.ownerScope");
  if (
    value.issuer !== "AEAT" ||
    !validReference(value.debtKey) || !value.debtKey ||
    !validDate(value.dueDate) || !value.dueDate ||
    !validReference(value.paymentFormReference) || !value.paymentFormReference
  ) throw new Error("INVALID_REAL_CORPUS_INSTALLMENT_IDENTITY_V4");
  return ["aeat-installment-v4", encodeURIComponent(value.ownerScope), value.issuer, value.debtKey, value.dueDate, value.paymentFormReference].join(":");
}

function relation(input: Omit<RealCorpusRelationV4, "engineVersion" | "requiresHumanReview" | "permitsAutomaticAction">): RealCorpusRelationV4 {
  if (input.status === "SUGGESTED" && FORBIDDEN_SUGGESTED_ASSERTIONS.test(input.phrase)) {
    throw new Error("UNSAFE_SUGGESTED_RELATION_PHRASE_V4");
  }
  return Object.freeze({ engineVersion: REAL_CORPUS_RELATION_ENGINE_VERSION_V4, ...input, requiresHumanReview: true, permitsAutomaticAction: false });
}

function exact(input: Omit<RealCorpusRelationV4, "engineVersion" | "status" | "requiresHumanReview" | "permitsAutomaticAction">): RealCorpusRelationV4 {
  return relation({ ...input, status: "SYSTEM_CONFIRMED_EXACT" });
}

/** Exact relations require owner, issuer and strong family-specific identifiers. */
export function relateRealCorpusDocumentsV4(source: RealCorpusRelationDocumentV4, target: RealCorpusRelationDocumentV4): readonly RealCorpusRelationV4[] {
  if (!validDocument(source) || !validDocument(target) || source.documentId === target.documentId || source.ownerScope !== target.ownerScope || source.issuer !== target.issuer) return Object.freeze([]);
  const results: RealCorpusRelationV4[] = [];
  const proposal = source.familyId === "assessment.allegations_and_proposal" ? source : target.familyId === "assessment.allegations_and_proposal" ? target : null;
  const assessment = source.familyId === "assessment.final_provisional_assessment" ? source : target.familyId === "assessment.final_provisional_assessment" ? target : null;
  if (proposal && assessment && proposal.procedureId && proposal.procedureId === assessment.procedureId) {
    results.push(exact({ relationType: "RESOLVES", sourceDocumentId: assessment.documentId, targetDocumentId: proposal.documentId, exactReference: proposal.procedureId, installmentIdentity: null, observedAmountCents: null, phrase: "Esta resolución decide la propuesta anterior y fija el resultado final de la comprobación limitada." }));
  }
  const enforcement = source.familyId === "collection.enforcement_order" ? source : target.familyId === "collection.enforcement_order" ? target : null;
  const deferral = source.familyId === "collection.deferral_grant" ? source : target.familyId === "collection.deferral_grant" ? target : null;
  if (enforcement && deferral && enforcement.debtKey && enforcement.debtKey === deferral.debtKey && enforcement.dueDate && enforcement.dueDate === deferral.dueDate && enforcement.paymentFormReference) {
    results.push(exact({ relationType: "CLAIMS_UNPAID_INSTALLMENT", sourceDocumentId: enforcement.documentId, targetDocumentId: deferral.documentId, exactReference: enforcement.debtKey, installmentIdentity: buildRealCorpusInstallmentIdentityV4({ ownerScope: source.ownerScope, issuer: "AEAT", debtKey: enforcement.debtKey, dueDate: enforcement.dueDate, paymentFormReference: enforcement.paymentFormReference }), observedAmountCents: null, phrase: "Esta providencia reclama la cuota del fraccionamiento identificada por la misma deuda y fecha de vencimiento." }));
  }
  const bank = source.familyId === "seizure.bank_account" ? source : target.familyId === "seizure.bank_account" ? target : null;
  if (enforcement && bank && enforcement.debtKey && enforcement.debtKey === bank.debtKey) {
    results.push(exact({ relationType: "ENFORCES", sourceDocumentId: bank.documentId, targetDocumentId: enforcement.documentId, exactReference: enforcement.debtKey, installmentIdentity: null, observedAmountCents: null, phrase: "Este embargo bancario continúa la providencia anterior identificada por la misma deuda." }));
  }
  const credit = source.familyId === "seizure.commercial_credits" ? source : target.familyId === "seizure.commercial_credits" ? target : null;
  const reiteration = source.familyId === "seizure.compliance_reiteration" ? source : target.familyId === "seizure.compliance_reiteration" ? target : null;
  const release = source.familyId === "seizure.release" ? source : target.familyId === "seizure.release" ? target : null;
  if (credit && reiteration && credit.seizureOrderId && credit.seizureOrderId === reiteration.citedSeizureOrderId) {
    results.push(exact({ relationType: "REITERATED_BY", sourceDocumentId: reiteration.documentId, targetDocumentId: credit.documentId, exactReference: credit.seizureOrderId, installmentIdentity: null, observedAmountCents: null, phrase: "Este segundo requerimiento repite la obligación de contestar la diligencia anterior porque la AEAT indica que no recibió el anexo." }));
  }
  const seizure = source.familyId.startsWith("seizure.") && source.familyId !== "seizure.release" && source.familyId !== "seizure.compliance_reiteration" ? source : target.familyId.startsWith("seizure.") && target.familyId !== "seizure.release" && target.familyId !== "seizure.compliance_reiteration" ? target : null;
  if (release && seizure && release.citedSeizureOrderId && release.citedSeizureOrderId === seizure.seizureOrderId) {
    results.push(exact({ relationType: "RELEASES_SEIZURE", sourceDocumentId: release.documentId, targetDocumentId: seizure.documentId, exactReference: release.citedSeizureOrderId, installmentIdentity: null, observedAmountCents: null, phrase: seizure.familyId === "seizure.commercial_credits" ? "Este acuerdo deja sin efecto la orden anterior de retener e ingresar créditos." : "El documento posterior levanta este embargo y ordena cancelar la anotación del bien." }));
  }
  if (release && reiteration && release.citedSeizureOrderId && release.citedSeizureOrderId === reiteration.citedSeizureOrderId) {
    results.push(exact({ relationType: "CLOSES_AFTER_REITERATION", sourceDocumentId: release.documentId, targetDocumentId: reiteration.documentId, exactReference: release.citedSeizureOrderId, installmentIdentity: null, observedAmountCents: null, phrase: "Tras la reiteración, este documento comunica que la obligación de retener e ingresar queda levantada para esa diligencia." }));
  }
  if (enforcement && credit && enforcement.debtKey) {
    const observation = credit.debtObservations.find((item) => item.debtKey === enforcement.debtKey);
    if (observation) results.push(exact({ relationType: "INCLUDED_IN_SEIZURE", sourceDocumentId: credit.documentId, targetDocumentId: enforcement.documentId, exactReference: enforcement.debtKey, installmentIdentity: null, observedAmountCents: null, phrase: "La deuda identificada en esta providencia aparece entre las incluidas en el embargo de créditos posterior." }));
  }
  if (source.familyId === "collection.enforcement_order" && target.familyId === "collection.enforcement_order" && source.debtKey && source.debtKey === target.debtKey && source.dueDate && target.dueDate && (source.dueDate !== target.dueDate || (source.paymentFormReference !== null && target.paymentFormReference !== null && source.paymentFormReference !== target.paymentFormReference))) {
    results.push(exact({ relationType: "SAME_PAYMENT_PLAN_DIFFERENT_INSTALLMENTS", sourceDocumentId: source.documentId, targetDocumentId: target.documentId, exactReference: source.debtKey, installmentIdentity: null, observedAmountCents: null, phrase: "Ambas providencias corresponden a vencimientos distintos de la misma liquidación; no son duplicados." }));
  }
  if (results.length > 0) return Object.freeze(results);
  return Object.freeze([]);
}

/** The cover is evidence of delivery only; it never replaces the enclosed act. */
export function notificationEvidenceForDocumentV4(document: RealCorpusRelationDocumentV4): RealCorpusRelationV4 | null {
  if (!validDocument(document) || !document.deliveryCoverPartId) return null;
  return exact({ relationType: "NOTIFICATION_EVIDENCE_FOR", sourceDocumentId: document.deliveryCoverPartId, targetDocumentId: document.documentId, exactReference: null, installmentIdentity: null, observedAmountCents: null, phrase: "La primera página documenta un nuevo intento de entrega del acto incluido; no cambia su contenido." });
}
