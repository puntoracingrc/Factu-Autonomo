import {
  assertBoundedId,
  assertBoundedOwnerScope,
  assertNonNegativeIntegerCents,
} from "./input-contract";

export const REAL_CORPUS_RELATION_ENGINE_VERSION_V7 =
  "real-corpus-relations.2026-07-17.v7" as const;

export type RealCorpusRelationTypeV7 =
  | "DUPLICATE_COPY_OF"
  | "CLAIMS_UNPAID_INSTALLMENT"
  | "ENFORCES_REMAINING_PLAN_PRINCIPAL"
  | "OFFSET_FULLY_EXTINGUISHES_ENFORCEMENT"
  | "OFFSET_PARTIALLY_EXTINGUISHES_ENFORCEMENT"
  | "ENFORCES_REMAINING_AFTER_OFFSET"
  | "SAME_DEBT_MULTIPLE_BANK_SEIZURES"
  | "MODIFIES_PAYMENT_PLAN"
  | "RESOLVES_SANCTION_PROCEEDING"
  | "POSSIBLY_PRECEDES_SANCTION";

export interface RealCorpusRelationV7 {
  readonly engineVersion: typeof REAL_CORPUS_RELATION_ENGINE_VERSION_V7;
  readonly relationType: RealCorpusRelationTypeV7;
  readonly status: "SYSTEM_CONFIRMED_EXACT" | "SYSTEM_SUGGESTED";
  readonly sourceDocumentId: string;
  readonly targetDocumentId: string;
  readonly exactReference: string | null;
  readonly observedAmountCents: number | null;
  readonly phrase: string;
  readonly requiresHumanReview: true;
  readonly permitsAutomaticAction: false;
  readonly confirmsPayment: false;
  readonly confirmsRemittance: false;
  readonly confirmsDebtExtinction: false;
}

export interface RealCorpusRelationInstallmentV7 {
  readonly dueDate: string;
  readonly baseCents: number;
  readonly deferralInterestCents: number;
  readonly totalCents: number;
}

export interface RealCorpusRelationOffsetRowV7 {
  readonly debtKey: string;
  readonly beforeCents: number;
  readonly appliedCents: number;
  readonly remainingCents: number;
}

export interface RealCorpusRelationDocumentV7 {
  readonly ownerScope: string;
  readonly documentId: string;
  readonly issuer: "AEAT";
  readonly familyId: string;
  readonly documentDate: string | null;
  readonly sourceSha256: string | null;
  readonly debtKey: string | null;
  readonly principalCents: number | null;
  readonly ordinaryTotalCents: number | null;
  readonly adjustedDueDate: string | null;
  readonly installments: readonly RealCorpusRelationInstallmentV7[];
  readonly remainingInstallmentBasesCents: readonly number[];
  readonly agreementId: string | null;
  readonly replacesAgreementId: string | null;
  readonly planPrincipalCents: number | null;
  readonly explicitlyModifiesPlan: boolean;
  readonly offsetRows: readonly RealCorpusRelationOffsetRowV7[];
  readonly seizureOrderId: string | null;
  readonly opaqueAssetOrdinal: number | null;
  readonly seizedAmountCents: number | null;
  readonly remittedAmountCents: null;
  readonly sanctionReference: string | null;
  readonly modelsPeriods: readonly string[];
}

export interface RealCorpusDeduplicationDecisionV7 {
  readonly duplicate: boolean;
  readonly shouldCreateDocument: boolean;
  readonly shouldCreateDebt: false;
  readonly shouldCreateChronologyEntry: boolean;
  readonly relation: RealCorpusRelationV7 | null;
}

export interface RealCorpusActivePlanV7 {
  readonly documentId: string;
  readonly agreementId: string;
  readonly active: boolean;
  readonly replacedByDocumentId: string | null;
}

const SHA256 = /^[a-f0-9]{64}$/u;
const REFERENCE = /^[A-Z0-9][A-Z0-9./:_+-]{1,199}$/u;
const PRIVATE_REFERENCE = /^(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]|ES\d{22}|[6789]\d{8})$/u;

function validReference(value: string | null): boolean {
  return value === null || (REFERENCE.test(value) && (/\d/u.test(value) || /^SYN-[A-Z0-9-]+$/u.test(value)) && !PRIVATE_REFERENCE.test(value));
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

function validDocument(value: RealCorpusRelationDocumentV7): boolean {
  try {
    assertBoundedOwnerScope(value.ownerScope, "relation.ownerScope");
    assertBoundedId(value.documentId, "relation.documentId");
  } catch {
    return false;
  }
  if (
    value.issuer !== "AEAT" ||
    !validDate(value.documentDate) ||
    !validDate(value.adjustedDueDate) ||
    (value.sourceSha256 !== null && !SHA256.test(value.sourceSha256)) ||
    !validReference(value.debtKey) ||
    !validReference(value.agreementId) ||
    !validReference(value.replacesAgreementId) ||
    !validReference(value.seizureOrderId) ||
    !validReference(value.sanctionReference) ||
    ![value.principalCents, value.ordinaryTotalCents, value.planPrincipalCents, value.seizedAmountCents].every(validCents) ||
    value.remittedAmountCents !== null ||
    value.installments.length > 100 ||
    value.remainingInstallmentBasesCents.length > 100 ||
    value.offsetRows.length > 100 ||
    value.modelsPeriods.length > 100 ||
    (value.opaqueAssetOrdinal !== null && (!Number.isSafeInteger(value.opaqueAssetOrdinal) || value.opaqueAssetOrdinal < 1 || value.opaqueAssetOrdinal > 100))
  ) return false;
  const dates = new Set<string>();
  for (const installment of value.installments) {
    if (!validDate(installment.dueDate) || !validCents(installment.baseCents) || !validCents(installment.deferralInterestCents) || !validCents(installment.totalCents) || installment.baseCents + installment.deferralInterestCents !== installment.totalCents || dates.has(installment.dueDate)) return false;
    dates.add(installment.dueDate);
  }
  if (value.remainingInstallmentBasesCents.some((item) => !validCents(item))) return false;
  const rows = new Set<string>();
  for (const row of value.offsetRows) {
    if (!validReference(row.debtKey) || !row.debtKey || !validCents(row.beforeCents) || !validCents(row.appliedCents) || !validCents(row.remainingCents) || row.appliedCents > row.beforeCents || row.beforeCents - row.appliedCents !== row.remainingCents || rows.has(row.debtKey)) return false;
    rows.add(row.debtKey);
  }
  return value.modelsPeriods.every((item) => /^\d{3}:(?:19|20)\d{2}:(?:0A|[1-4]T|0[1-9]|1[0-2])$/u.test(item));
}

function relation(status: RealCorpusRelationV7["status"], input: Omit<RealCorpusRelationV7, "engineVersion" | "status" | "requiresHumanReview" | "permitsAutomaticAction" | "confirmsPayment" | "confirmsRemittance" | "confirmsDebtExtinction">): RealCorpusRelationV7 {
  return Object.freeze({
    engineVersion: REAL_CORPUS_RELATION_ENGINE_VERSION_V7,
    status,
    ...input,
    requiresHumanReview: true,
    permitsAutomaticAction: false,
    confirmsPayment: false,
    confirmsRemittance: false,
    confirmsDebtExtinction: false,
  });
}

function exact(input: Parameters<typeof relation>[1]): RealCorpusRelationV7 {
  return relation("SYSTEM_CONFIRMED_EXACT", input);
}

function suggested(input: Parameters<typeof relation>[1]): RealCorpusRelationV7 {
  return relation("SYSTEM_SUGGESTED", input);
}

function sameOwner(source: RealCorpusRelationDocumentV7, target: RealCorpusRelationDocumentV7): boolean {
  return source.ownerScope === target.ownerScope && source.issuer === target.issuer;
}

function notAfter(source: RealCorpusRelationDocumentV7, target: RealCorpusRelationDocumentV7): boolean {
  return !source.documentDate || !target.documentDate || source.documentDate <= target.documentDate;
}

/** Exact SHA-256 inside one owner scope is the only automatic deduplication rule. */
export function decideRealCorpusDuplicateV7(source: RealCorpusRelationDocumentV7, existing: readonly RealCorpusRelationDocumentV7[]): RealCorpusDeduplicationDecisionV7 {
  if (!validDocument(source) || existing.length > 10_000 || existing.some((item) => !validDocument(item))) return Object.freeze({ duplicate: false, shouldCreateDocument: false, shouldCreateDebt: false, shouldCreateChronologyEntry: false, relation: null });
  const duplicate = source.sourceSha256 === null ? undefined : existing.find((item) => item.ownerScope === source.ownerScope && item.sourceSha256 === source.sourceSha256);
  if (!duplicate) return Object.freeze({ duplicate: false, shouldCreateDocument: true, shouldCreateDebt: false, shouldCreateChronologyEntry: true, relation: null });
  return Object.freeze({
    duplicate: true,
    shouldCreateDocument: false,
    shouldCreateDebt: false,
    shouldCreateChronologyEntry: false,
    relation: exact({
      relationType: "DUPLICATE_COPY_OF",
      sourceDocumentId: source.documentId,
      targetDocumentId: duplicate.documentId,
      exactReference: null,
      observedAmountCents: null,
      phrase: "Este archivo es una copia exacta de un documento ya guardado.",
    }),
  });
}

/** Deterministic pair relations. Amount or date proximity alone never confirms a relation. */
export function relateRealCorpusDocumentsV7(source: RealCorpusRelationDocumentV7, target: RealCorpusRelationDocumentV7): readonly RealCorpusRelationV7[] {
  if (!validDocument(source) || !validDocument(target) || source.documentId === target.documentId || !sameOwner(source, target)) return Object.freeze([]);
  const results: RealCorpusRelationV7[] = [];
  const grant = source.familyId === "collection.deferral_grant" ? source : target.familyId === "collection.deferral_grant" ? target : null;
  const enforcement = source.familyId === "collection.enforcement_order" ? source : target.familyId === "collection.enforcement_order" ? target : null;
  if (grant && enforcement && grant.debtKey && grant.debtKey === enforcement.debtKey && notAfter(grant, enforcement)) {
    const installment = grant.installments.find((item) => item.dueDate === enforcement.adjustedDueDate && item.totalCents === enforcement.principalCents);
    if (installment) results.push(exact({
      relationType: "CLAIMS_UNPAID_INSTALLMENT",
      sourceDocumentId: grant.documentId,
      targetDocumentId: enforcement.documentId,
      exactReference: grant.debtKey,
      observedAmountCents: installment.totalCents,
      phrase: "Esta providencia reclama una cuota concreta del fraccionamiento: principal más intereses del aplazamiento.",
    }));
    const remainingPrincipal = grant.remainingInstallmentBasesCents.reduce((sum, amount) => sum + amount, 0);
    if (grant.remainingInstallmentBasesCents.length > 1 && Number.isSafeInteger(remainingPrincipal) && remainingPrincipal === enforcement.principalCents) results.push(exact({
      relationType: "ENFORCES_REMAINING_PLAN_PRINCIPAL",
      sourceDocumentId: grant.documentId,
      targetDocumentId: enforcement.documentId,
      exactReference: grant.debtKey,
      observedAmountCents: remainingPrincipal,
      phrase: "Esta providencia reclama conjuntamente el principal de las fracciones restantes del plan. No es una cuota aislada.",
    }));
  }

  const offset = source.familyId === "collection.offset_ex_officio" || source.familyId === "collection.offset_requested" ? source : target.familyId === "collection.offset_ex_officio" || target.familyId === "collection.offset_requested" ? target : null;
  if (offset && enforcement && enforcement.debtKey && notAfter(enforcement, offset)) {
    const row = offset.offsetRows.find((item) => item.debtKey === enforcement.debtKey && item.beforeCents === enforcement.ordinaryTotalCents);
    if (row) results.push(exact({
      relationType: row.remainingCents === 0 ? "OFFSET_FULLY_EXTINGUISHES_ENFORCEMENT" : "OFFSET_PARTIALLY_EXTINGUISHES_ENFORCEMENT",
      sourceDocumentId: enforcement.documentId,
      targetDocumentId: offset.documentId,
      exactReference: row.debtKey,
      observedAmountCents: row.appliedCents,
      phrase: row.remainingCents === 0 ? "La compensación aplica el total de esta fila y deja saldo cero en esta actuación." : "La compensación reduce parcialmente esta deuda y deja un saldo pendiente concreto.",
    }));
  }

  const seizure = source.familyId === "seizure.bank_account" ? source : target.familyId === "seizure.bank_account" ? target : null;
  if (offset && seizure && seizure.debtKey && notAfter(offset, seizure)) {
    const row = offset.offsetRows.find((item) => item.debtKey === seizure.debtKey && item.remainingCents > 0 && item.remainingCents === seizure.principalCents);
    if (row) results.push(exact({
      relationType: "ENFORCES_REMAINING_AFTER_OFFSET",
      sourceDocumentId: offset.documentId,
      targetDocumentId: seizure.documentId,
      exactReference: row.debtKey,
      observedAmountCents: row.remainingCents,
      phrase: "Este embargo continúa el cobro del saldo que quedó después de la compensación parcial.",
    }));
  }
  if (source.familyId === "seizure.bank_account" && target.familyId === "seizure.bank_account" && source.debtKey && source.debtKey === target.debtKey && source.seizureOrderId && target.seizureOrderId && source.seizureOrderId !== target.seizureOrderId && source.opaqueAssetOrdinal !== null && target.opaqueAssetOrdinal !== null && source.opaqueAssetOrdinal !== target.opaqueAssetOrdinal) results.push(exact({
    relationType: "SAME_DEBT_MULTIPLE_BANK_SEIZURES",
    sourceDocumentId: source.documentId,
    targetDocumentId: target.documentId,
    exactReference: source.debtKey,
    observedAmountCents: null,
    phrase: "Son embargos sobre cuentas distintas para una sola deuda.",
  }));

  const original = source.familyId === "collection.deferral_grant" ? source : target.familyId === "collection.deferral_grant" ? target : null;
  const modification = source.familyId === "collection.deferral_modification" ? source : target.familyId === "collection.deferral_modification" ? target : null;
  if (original && modification && modification.explicitlyModifiesPlan && original.debtKey && original.debtKey === modification.debtKey && original.planPrincipalCents !== null && original.planPrincipalCents === modification.planPrincipalCents && original.agreementId && original.agreementId === modification.replacesAgreementId && notAfter(original, modification)) results.push(exact({
    relationType: "MODIFIES_PAYMENT_PLAN",
    sourceDocumentId: original.documentId,
    targetDocumentId: modification.documentId,
    exactReference: original.debtKey,
    observedAmountCents: original.planPrincipalCents,
    phrase: "El acuerdo posterior sustituye el calendario anterior para la misma deuda.",
  }));

  const initiation = source.familyId === "sanction.initiation_and_hearing" ? source : target.familyId === "sanction.initiation_and_hearing" ? target : null;
  const resolution = source.familyId === "sanction.resolution" ? source : target.familyId === "sanction.resolution" ? target : null;
  if (initiation && resolution && initiation.sanctionReference && initiation.sanctionReference === resolution.sanctionReference && notAfter(initiation, resolution)) results.push(exact({
    relationType: "RESOLVES_SANCTION_PROCEEDING",
    sourceDocumentId: initiation.documentId,
    targetDocumentId: resolution.documentId,
    exactReference: initiation.sanctionReference,
    observedAmountCents: resolution.principalCents,
    phrase: "Esta resolución decide el expediente sancionador iniciado anteriormente.",
  }));
  const requirement = source.familyId === "compliance.formal_filing_requirement" ? source : target.familyId === "compliance.formal_filing_requirement" ? target : null;
  if (requirement && initiation && !requirement.sanctionReference && requirement.modelsPeriods.length > 0 && requirement.modelsPeriods.length === initiation.modelsPeriods.length && requirement.modelsPeriods.every((item) => initiation.modelsPeriods.includes(item)) && notAfter(requirement, initiation)) results.push(suggested({
    relationType: "POSSIBLY_PRECEDES_SANCTION",
    sourceDocumentId: requirement.documentId,
    targetDocumentId: initiation.documentId,
    exactReference: null,
    observedAmountCents: null,
    phrase: "Puede existir relación por modelos y período, pero falta una referencia exacta del expediente sancionador.",
  }));
  return Object.freeze(results);
}

/** Returns one active plan per exact modification chain; earlier schedules stay historical. */
export function resolveActivePaymentPlansV7(documents: readonly RealCorpusRelationDocumentV7[]): readonly RealCorpusActivePlanV7[] {
  if (documents.length > 1_000 || documents.some((item) => !validDocument(item))) return Object.freeze([]);
  const result = new Map<string, RealCorpusActivePlanV7>();
  const originals = new Map<string, RealCorpusRelationDocumentV7>();
  for (const document of documents) {
    if ((document.familyId === "collection.deferral_grant" || document.familyId === "collection.deferral_modification") && document.agreementId) {
      originals.set(`${document.ownerScope}\u0000${document.agreementId}`, document);
      result.set(document.documentId, Object.freeze({ documentId: document.documentId, agreementId: document.agreementId, active: true, replacedByDocumentId: null }));
    }
  }
  for (const modification of documents) {
    if (modification.familyId !== "collection.deferral_modification" || !modification.explicitlyModifiesPlan || !modification.replacesAgreementId || !modification.agreementId) continue;
    const original = originals.get(`${modification.ownerScope}\u0000${modification.replacesAgreementId}`);
    if (!original || original.debtKey !== modification.debtKey || original.planPrincipalCents !== modification.planPrincipalCents || !notAfter(original, modification)) continue;
    result.set(original.documentId, Object.freeze({ documentId: original.documentId, agreementId: original.agreementId!, active: false, replacedByDocumentId: modification.documentId }));
  }
  return Object.freeze([...result.values()]);
}
