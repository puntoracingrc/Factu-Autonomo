import {
  assertBoundedId,
  assertBoundedOwnerScope,
  assertNonNegativeIntegerCents,
} from "./input-contract";

export const REAL_CORPUS_RELATION_ENGINE_VERSION_V5 =
  "real-corpus-relations.2026-07-19.v5.1" as const;

export type RealCorpusRelationTypeV5 =
  | "CLAIMS_UNPAID_INSTALLMENT"
  | "SAME_UNDERLYING_DEBT_NOT_INSTALLMENT_MATCH"
  | "SAME_PAYMENT_PLAN_DIFFERENT_INSTALLMENTS"
  | "AGGREGATES_PRIOR_ENFORCEMENT"
  | "CITED_AS_EXISTING_EXECUTIVE_DEBT"
  | "DENIAL_PRECEDES_ENFORCEMENT"
  | "ENFORCES"
  | "SAME_DEBT_MULTIPLE_SEIZURE_ASSETS"
  | "ORDERS_THIRD_PARTY_WITHHOLDING"
  | "PAYMENT_FORM_FOR"
  | "DELIVERY_ATTEMPT_FOR";

export interface RealCorpusInstallmentRelationInputV5 {
  readonly dueDate: string;
  readonly baseCents: number;
  readonly deferralInterestCents: number;
  readonly totalCents: number;
}

export interface RealCorpusDeniedDebtRelationInputV5 {
  readonly debtKey: string;
  readonly principalCents: number;
}

export interface RealCorpusExistingExecutiveDebtRelationInputV5 {
  readonly debtKey: string;
  readonly snapshotAmountCents: number;
}

export interface RealCorpusSeizureRowRelationInputV5 {
  readonly debtKey: string;
  readonly amountCents: number;
}

export interface RealCorpusRelationDocumentV5 {
  readonly ownerScope: string;
  readonly documentId: string;
  readonly issuer: "AEAT";
  readonly familyId: string;
  readonly documentDate: string | null;
  readonly debtKey: string | null;
  readonly voluntaryEndDate: string | null;
  readonly principalCents: number | null;
  readonly ordinaryTotalCents: number | null;
  readonly paymentFormReference: string | null;
  readonly installments: readonly RealCorpusInstallmentRelationInputV5[];
  readonly deniedDebt: RealCorpusDeniedDebtRelationInputV5 | null;
  readonly existingExecutiveDebtsCitedAsReason:
    readonly RealCorpusExistingExecutiveDebtRelationInputV5[];
  readonly seizureRows: readonly RealCorpusSeizureRowRelationInputV5[];
  readonly seizureAssetKind:
    | "NONE"
    | "COMMERCIAL_CREDITS"
    | "BANK_ACCOUNT"
    | "MOVABLE_ASSET";
  readonly recipientRole: "NONE" | "PRIMARY_DEBTOR";
  readonly thirdPartyRole:
    | "NONE"
    | "GARNISHED_THIRD_PARTY_WITHOUT_IDENTITY";
  readonly deliveryCoverPartId: string | null;
  readonly paymentFormPartIds: readonly string[];
}

export interface RealCorpusEnforcementIdentityInputV5 {
  readonly ownerScope: string;
  readonly issuer: "AEAT";
  readonly debtKey: string;
  readonly voluntaryEndDate: string;
  readonly paymentFormReference: string;
}

export interface RealCorpusRelationV5 {
  readonly engineVersion: typeof REAL_CORPUS_RELATION_ENGINE_VERSION_V5;
  readonly relationType: RealCorpusRelationTypeV5;
  readonly status: "SYSTEM_CONFIRMED_EXACT";
  readonly sourceDocumentId: string;
  readonly targetDocumentId: string;
  readonly exactReference: string | null;
  readonly enforcementIdentity: string | null;
  readonly observedAmountCents: number | null;
  readonly contributingDocumentIds: readonly string[];
  readonly phrase: string;
  readonly requiresHumanReview: true;
  readonly permitsAutomaticAction: false;
}

const REFERENCE = /^[A-Z0-9][A-Z0-9./:_+-]{1,199}$/u;
const PRIVATE_REFERENCE =
  /^(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]|ES\d{22}|[6789]\d{8})$/u;

function validReference(value: string | null): boolean {
  return value === null ||
    (REFERENCE.test(value) && /\d/u.test(value) && !PRIVATE_REFERENCE.test(value));
}

function validDate(value: string | null): boolean {
  if (value === null) return true;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return false;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
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

function validPartId(partId: string, documentId: string): boolean {
  return (
    partId.startsWith(`part:${documentId}:`) &&
    partId.length <= 240 &&
    !/[\u0000-\u001f\u007f]/u.test(partId)
  );
}

function validDocument(value: RealCorpusRelationDocumentV5): boolean {
  try {
    assertBoundedOwnerScope(value.ownerScope, "relation.ownerScope");
    assertBoundedId(value.documentId, "relation.documentId");
  } catch {
    return false;
  }
  if (
    value.issuer !== "AEAT" ||
    !validDate(value.documentDate) ||
    !validDate(value.voluntaryEndDate) ||
    !validReference(value.debtKey) ||
    !validReference(value.paymentFormReference) ||
    !validCents(value.principalCents) ||
    !validCents(value.ordinaryTotalCents) ||
    value.installments.length > 100 ||
    value.existingExecutiveDebtsCitedAsReason.length > 100 ||
    value.seizureRows.length > 100 ||
    value.paymentFormPartIds.length > 4 ||
    (value.deliveryCoverPartId !== null &&
      !validPartId(value.deliveryCoverPartId, value.documentId))
  ) {
    return false;
  }
  const installmentDates = new Set<string>();
  for (const installment of value.installments) {
    if (
      !validDate(installment.dueDate) ||
      !installment.dueDate ||
      !validCents(installment.baseCents) ||
      !validCents(installment.deferralInterestCents) ||
      !validCents(installment.totalCents) ||
      installment.baseCents + installment.deferralInterestCents !==
        installment.totalCents ||
      installmentDates.has(installment.dueDate)
    ) {
      return false;
    }
    installmentDates.add(installment.dueDate);
  }
  if (
    value.deniedDebt !== null &&
    (!validReference(value.deniedDebt.debtKey) ||
      !value.deniedDebt.debtKey ||
      !validCents(value.deniedDebt.principalCents))
  ) {
    return false;
  }
  for (const collection of [
    value.existingExecutiveDebtsCitedAsReason.map((item) => ({
      debtKey: item.debtKey,
      amountCents: item.snapshotAmountCents,
    })),
    value.seizureRows,
  ]) {
    const seen = new Set<string>();
    for (const item of collection) {
      if (
        !validReference(item.debtKey) ||
        !item.debtKey ||
        !validCents(item.amountCents) ||
        seen.has(item.debtKey)
      ) {
        return false;
      }
      seen.add(item.debtKey);
    }
  }
  const seenParts = new Set<string>();
  for (const partId of value.paymentFormPartIds) {
    if (
      !validPartId(partId, value.documentId) ||
      seenParts.has(partId)
    ) {
      return false;
    }
    seenParts.add(partId);
  }
  return true;
}

export function buildRealCorpusEnforcementIdentityV5(
  value: RealCorpusEnforcementIdentityInputV5,
): string {
  assertBoundedOwnerScope(value.ownerScope, "enforcementIdentity.ownerScope");
  if (
    value.issuer !== "AEAT" ||
    !validReference(value.debtKey) ||
    !value.debtKey ||
    !validDate(value.voluntaryEndDate) ||
    !value.voluntaryEndDate ||
    !validReference(value.paymentFormReference) ||
    !value.paymentFormReference
  ) {
    throw new Error("INVALID_REAL_CORPUS_ENFORCEMENT_IDENTITY_V5");
  }
  return [
    "aeat-enforcement-v5",
    encodeURIComponent(value.ownerScope),
    value.issuer,
    value.debtKey,
    value.voluntaryEndDate,
    value.paymentFormReference,
  ].join(":");
}

function exact(
  input: Omit<
    RealCorpusRelationV5,
    | "engineVersion"
    | "status"
    | "requiresHumanReview"
    | "permitsAutomaticAction"
  >,
): RealCorpusRelationV5 {
  return Object.freeze({
    engineVersion: REAL_CORPUS_RELATION_ENGINE_VERSION_V5,
    status: "SYSTEM_CONFIRMED_EXACT",
    ...input,
    contributingDocumentIds: Object.freeze([
      ...input.contributingDocumentIds,
    ]),
    requiresHumanReview: true,
    permitsAutomaticAction: false,
  });
}

function enforcementIdentity(
  enforcement: RealCorpusRelationDocumentV5,
): string | null {
  if (
    !enforcement.debtKey ||
    !enforcement.voluntaryEndDate ||
    !enforcement.paymentFormReference
  ) {
    return null;
  }
  return buildRealCorpusEnforcementIdentityV5({
    ownerScope: enforcement.ownerScope,
    issuer: enforcement.issuer,
    debtKey: enforcement.debtKey,
    voluntaryEndDate: enforcement.voluntaryEndDate,
    paymentFormReference: enforcement.paymentFormReference,
  });
}

function sameOwnerAndIssuer(
  source: RealCorpusRelationDocumentV5,
  target: RealCorpusRelationDocumentV5,
): boolean {
  return (
    source.ownerScope === target.ownerScope && source.issuer === target.issuer
  );
}

function notAfter(
  earlier: RealCorpusRelationDocumentV5,
  later: RealCorpusRelationDocumentV5,
): boolean {
  return (
    earlier.documentDate === null ||
    later.documentDate === null ||
    earlier.documentDate <= later.documentDate
  );
}

/** Exact pair relations use strong identifiers and never use amounts as identity. */
export function relateRealCorpusDocumentsV5(
  source: RealCorpusRelationDocumentV5,
  target: RealCorpusRelationDocumentV5,
): readonly RealCorpusRelationV5[] {
  if (
    !validDocument(source) ||
    !validDocument(target) ||
    source.documentId === target.documentId ||
    !sameOwnerAndIssuer(source, target)
  ) {
    return Object.freeze([]);
  }
  const results: RealCorpusRelationV5[] = [];
  const enforcement =
    source.familyId === "collection.enforcement_order"
      ? source
      : target.familyId === "collection.enforcement_order"
        ? target
        : null;
  const grant =
    source.familyId === "collection.deferral_grant"
      ? source
      : target.familyId === "collection.deferral_grant"
        ? target
        : null;
  if (
    enforcement &&
    grant &&
    enforcement.debtKey &&
    enforcement.debtKey === grant.debtKey &&
    notAfter(grant, enforcement)
  ) {
    const identity = enforcementIdentity(enforcement);
    const matchingInstallment = grant.installments.find(
      (item) => item.dueDate === enforcement.voluntaryEndDate,
    );
    if (matchingInstallment && identity) {
      results.push(
        exact({
          relationType: "CLAIMS_UNPAID_INSTALLMENT",
          sourceDocumentId: enforcement.documentId,
          targetDocumentId: grant.documentId,
          exactReference: enforcement.debtKey,
          enforcementIdentity: identity,
          observedAmountCents: null,
          contributingDocumentIds: Object.freeze([enforcement.documentId]),
          phrase:
            "Esta providencia reclama la cuota del fraccionamiento identificada por la misma deuda y fecha de vencimiento.",
        }),
      );
    } else {
      results.push(
        exact({
          relationType: "SAME_UNDERLYING_DEBT_NOT_INSTALLMENT_MATCH",
          sourceDocumentId: enforcement.documentId,
          targetDocumentId: grant.documentId,
          exactReference: enforcement.debtKey,
          enforcementIdentity: identity,
          observedAmountCents: null,
          contributingDocumentIds: Object.freeze([enforcement.documentId]),
          phrase:
            "Comparte la clave con el fraccionamiento, pero no coincide con ninguna cuota del calendario. No debe asignarse automáticamente a una cuota.",
        }),
      );
    }
  }

  if (
    source.familyId === "collection.enforcement_order" &&
    target.familyId === "collection.enforcement_order" &&
    source.debtKey &&
    source.debtKey === target.debtKey
  ) {
    const sourceIdentity = enforcementIdentity(source);
    const targetIdentity = enforcementIdentity(target);
    if (sourceIdentity && targetIdentity && sourceIdentity !== targetIdentity) {
      results.push(
        exact({
          relationType: "SAME_PAYMENT_PLAN_DIFFERENT_INSTALLMENTS",
          sourceDocumentId: source.documentId,
          targetDocumentId: target.documentId,
          exactReference: source.debtKey,
          enforcementIdentity: sourceIdentity,
          observedAmountCents: null,
          contributingDocumentIds: Object.freeze([
            source.documentId,
            target.documentId,
          ]),
          phrase:
            "Ambas providencias comparten la clave, pero corresponden a vencimientos o cartas de pago distintos. No son duplicados.",
        }),
      );
    }
  }

  const denial =
    source.familyId === "collection.deferral_denial"
      ? source
      : target.familyId === "collection.deferral_denial"
        ? target
        : null;
  if (denial && enforcement && denial.deniedDebt) {
    if (
      denial.deniedDebt.debtKey === enforcement.debtKey &&
      notAfter(denial, enforcement)
    ) {
      results.push(
        exact({
          relationType: "DENIAL_PRECEDES_ENFORCEMENT",
          sourceDocumentId: enforcement.documentId,
          targetDocumentId: denial.documentId,
          exactReference: denial.deniedDebt.debtKey,
          enforcementIdentity: enforcementIdentity(enforcement),
          observedAmountCents: null,
          contributingDocumentIds: Object.freeze([enforcement.documentId]),
          phrase:
            "Esta providencia reclama la deuda identificada en la solicitud de aplazamiento denegada.",
        }),
      );
    }
  }
  if (denial && enforcement && enforcement.debtKey) {
    const cited = denial.existingExecutiveDebtsCitedAsReason.find(
      (item) => item.debtKey === enforcement.debtKey,
    );
    if (cited && notAfter(enforcement, denial)) {
      results.push(
        exact({
          relationType: "CITED_AS_EXISTING_EXECUTIVE_DEBT",
          sourceDocumentId: denial.documentId,
          targetDocumentId: enforcement.documentId,
          exactReference: cited.debtKey,
          enforcementIdentity: enforcementIdentity(enforcement),
          observedAmountCents: null,
          contributingDocumentIds: Object.freeze([enforcement.documentId]),
          phrase:
            "La denegación cita esta deuda como ya pendiente en vía ejecutiva y la utiliza como parte de su motivación. No la crea ni la incorpora al importe cuya solicitud se deniega.",
        }),
      );
    }
  }

  const seizure =
    source.familyId.startsWith("seizure.") ? source : target.familyId.startsWith("seizure.") ? target : null;
  if (seizure && enforcement && enforcement.debtKey) {
    const row = seizure.seizureRows.find(
      (item) => item.debtKey === enforcement.debtKey,
    );
    if (row && notAfter(enforcement, seizure)) {
      results.push(
        exact({
          relationType: "ENFORCES",
          sourceDocumentId: seizure.documentId,
          targetDocumentId: enforcement.documentId,
          exactReference: row.debtKey,
          enforcementIdentity: enforcementIdentity(enforcement),
          observedAmountCents: null,
          contributingDocumentIds: Object.freeze([enforcement.documentId]),
          phrase:
            "Este embargo continúa el cobro de la deuda identificada por la misma clave en la providencia anterior.",
        }),
      );
    }
  }

  if (
    source.familyId.startsWith("seizure.") &&
    target.familyId.startsWith("seizure.") &&
    source.seizureAssetKind !== "NONE" &&
    target.seizureAssetKind !== "NONE" &&
    source.seizureAssetKind !== target.seizureAssetKind
  ) {
    const targetRows = new Set(
      target.seizureRows.map((item) => item.debtKey),
    );
    const common = source.seizureRows.find(
      (item) => targetRows.has(item.debtKey),
    );
    if (common) {
      results.push(
        exact({
          relationType: "SAME_DEBT_MULTIPLE_SEIZURE_ASSETS",
          sourceDocumentId: source.documentId,
          targetDocumentId: target.documentId,
          exactReference: common.debtKey,
          enforcementIdentity: null,
          observedAmountCents: null,
          contributingDocumentIds: Object.freeze([
            source.documentId,
            target.documentId,
          ]),
          phrase:
            "La misma deuda aparece en dos diligencias sobre bienes distintos. Son actuaciones de cobro sobre una sola deuda, no dos deudas nuevas.",
        }),
      );
    }
  }
  return Object.freeze(results);
}

/**
 * Creates one relation per distinctly identified prior enforcement sharing the
 * exact owner, issuer and debt key printed in a later seizure row.
 */
export function relateRealCorpusDocumentSetV5(
  documents: readonly RealCorpusRelationDocumentV5[],
): readonly RealCorpusRelationV5[] {
  if (documents.length > 1_000 || documents.some((item) => !validDocument(item))) {
    return Object.freeze([]);
  }
  const enforcementGroups = new Map<string, RealCorpusRelationDocumentV5[]>();
  for (const document of documents) {
    if (
      document.familyId !== "collection.enforcement_order" ||
      !document.debtKey
    ) {
      continue;
    }
    const key = `${document.ownerScope}\u0000${document.issuer}\u0000${document.debtKey}`;
    const group = enforcementGroups.get(key) ?? [];
    group.push(document);
    enforcementGroups.set(key, group);
  }
  const relations: RealCorpusRelationV5[] = [];
  for (const seizure of documents) {
    if (!seizure.familyId.startsWith("seizure.")) continue;
    for (const row of seizure.seizureRows) {
      const key = `${seizure.ownerScope}\u0000${seizure.issuer}\u0000${row.debtKey}`;
      const candidates = (enforcementGroups.get(key) ?? []).filter(
        (item) =>
          !seizure.documentDate ||
          !item.documentDate ||
          item.documentDate <= seizure.documentDate,
      );
      if (candidates.length < 2) continue;
      const identities = candidates.map(enforcementIdentity);
      if (
        identities.some((identity) => identity === null) ||
        new Set(identities).size !== candidates.length
      ) continue;
      const contributingDocumentIds = Object.freeze(
        candidates.map((item) => item.documentId).sort(),
      );
      for (const enforcement of candidates) {
        relations.push(
          exact({
            relationType: "AGGREGATES_PRIOR_ENFORCEMENT",
            sourceDocumentId: seizure.documentId,
            targetDocumentId: enforcement.documentId,
            exactReference: row.debtKey,
            enforcementIdentity: enforcementIdentity(enforcement),
            observedAmountCents: null,
            contributingDocumentIds,
            phrase:
              "La fila del embargo agrupa varios vencimientos anteriores identificados para la misma deuda.",
          }),
        );
      }
    }
  }
  return Object.freeze(relations);
}

export function internalDocumentRelationsV5(
  document: RealCorpusRelationDocumentV5,
): readonly RealCorpusRelationV5[] {
  if (!validDocument(document)) return Object.freeze([]);
  const results: RealCorpusRelationV5[] = [];
  if (document.deliveryCoverPartId) {
    results.push(
      exact({
        relationType: "DELIVERY_ATTEMPT_FOR",
        sourceDocumentId: document.deliveryCoverPartId,
        targetDocumentId: document.documentId,
        exactReference: null,
        enforcementIdentity: null,
        observedAmountCents: null,
        contributingDocumentIds: Object.freeze([document.documentId]),
        phrase:
          "La primera página documenta un nuevo intento de entrega del acto incluido. No cambia su contenido ni acredita por sí sola la fecha efectiva de recepción.",
      }),
    );
  }
  if (document.paymentFormPartIds.length > 0) {
    results.push(
      exact({
        relationType: "PAYMENT_FORM_FOR",
        sourceDocumentId: document.paymentFormPartIds[0]!,
        targetDocumentId: document.documentId,
        exactReference: document.paymentFormReference,
        enforcementIdentity: null,
        observedAmountCents: null,
        contributingDocumentIds: Object.freeze([document.documentId]),
        phrase:
          "La carta contiene los datos para pagar el acto relacionado. No acredita que el pago ya se haya realizado; sus copias representan una sola operación.",
      }),
    );
  }
  if (
    document.familyId === "seizure.commercial_credits" &&
    document.recipientRole === "PRIMARY_DEBTOR" &&
    document.thirdPartyRole === "GARNISHED_THIRD_PARTY_WITHOUT_IDENTITY"
  ) {
    results.push(
      exact({
        relationType: "ORDERS_THIRD_PARTY_WITHHOLDING",
        sourceDocumentId: document.documentId,
        targetDocumentId: `role:${document.documentId}:garnished-third-party`,
        exactReference: null,
        enforcementIdentity: null,
        observedAmountCents: null,
        contributingDocumentIds: Object.freeze([document.documentId]),
        phrase:
          "Hacienda ha ordenado a un tercero que retenga los pagos que te deba, hasta el límite indicado. Tú recibes la copia como deudor; el anexo de respuesta corresponde al tercero.",
      }),
    );
  }
  return Object.freeze(results);
}
