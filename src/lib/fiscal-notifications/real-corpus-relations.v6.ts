import {
  assertBoundedId,
  assertBoundedOwnerScope,
  assertNonNegativeIntegerCents,
} from "./input-contract";

export const REAL_CORPUS_RELATION_ENGINE_VERSION_V6 =
  "real-corpus-relations.2026-07-19.v6.1" as const;

export type RealCorpusRelationTypeV6 =
  | "CLAIMS_UNPAID_INSTALLMENT"
  | "SAME_UNDERLYING_DEBT_NOT_INSTALLMENT_MATCH"
  | "SAME_PAYMENT_PLAN_DIFFERENT_INSTALLMENTS"
  | "AGGREGATES_PRIOR_ENFORCEMENT"
  | "RESOLVES_SANCTION_PROCEEDING"
  | "POSSIBLY_PRECEDES_SANCTION"
  | "SANCTION_DECISION_ENFORCED"
  | "CLAIMS_LOST_SANCTION_REDUCTION"
  | "ENFORCES_LOST_REDUCTION"
  | "DENIAL_PRECEDES_ENFORCEMENT"
  | "INTEREST_ASSESSMENT_FROM_DENIED_DEFERRAL"
  | "ENFORCES_INTEREST_ASSESSMENT"
  | "ENFORCES"
  | "SAME_DEBT_SET_MULTIPLE_SEIZURE_ASSETS"
  | "RELEASES_SEIZURE"
  | "PAYMENT_FORM_FOR"
  | "DELIVERY_ATTEMPT_FOR";

export interface RealCorpusInstallmentRelationInputV6 {
  readonly dueDate: string;
  readonly baseCents: number;
  readonly deferralInterestCents: number;
  readonly totalCents: number;
}

export interface RealCorpusDebtRowRelationInputV6 {
  readonly debtKey: string;
  readonly amountCents: number;
}

export interface RealCorpusRelationDocumentV6 {
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
  readonly installments: readonly RealCorpusInstallmentRelationInputV6[];
  readonly agreementId: string | null;
  readonly deniedDebt: Readonly<{
    debtKey: string;
    principalCents: number;
  }> | null;
  readonly interestLiquidationKey: string | null;
  readonly interestSourceDebtKey: string | null;
  readonly interestSourcePrincipalCents: number | null;
  readonly interestCents: number | null;
  readonly sanctionReference: string | null;
  readonly sanctionDebtKey: string | null;
  readonly initialSanctionCents: number | null;
  readonly historicalReductionPercent: number | null;
  readonly reductionCents: number | null;
  readonly reducedSanctionCents: number | null;
  readonly originSanctionDebtKey: string | null;
  readonly clawbackDebtKey: string | null;
  readonly clawbackCents: number | null;
  readonly modelsPeriods: readonly string[];
  readonly exactReferenceToSanction: string | null;
  readonly seizureOrderId: string | null;
  readonly citedSeizureOrderId: string | null;
  readonly seizureRows: readonly RealCorpusDebtRowRelationInputV6[];
  readonly seizureAssetKind:
    | "NONE"
    | "COMMERCIAL_CREDITS"
    | "BANK_ACCOUNT"
    | "MOVABLE_ASSET"
    | "REAL_ESTATE";
  readonly debtSubtotalCents: number | null;
  readonly printedInterestCents: number | null;
  readonly printedCostsCents: number | null;
  readonly seizeLimitCents: number | null;
  readonly paymentFormPrintedTotalCents: number | null;
  readonly paymentFormAmountCents: number | null;
  readonly deliveryCoverPartId: string | null;
  readonly paymentFormPartIds: readonly string[];
}

export interface RealCorpusRelationV6 {
  readonly engineVersion: typeof REAL_CORPUS_RELATION_ENGINE_VERSION_V6;
  readonly relationType: RealCorpusRelationTypeV6;
  readonly status: "SYSTEM_CONFIRMED_EXACT" | "SYSTEM_SUGGESTED";
  readonly sourceDocumentId: string;
  readonly targetDocumentId: string;
  readonly exactReference: string | null;
  readonly observedAmountCents: number | null;
  readonly contributingDocumentIds: readonly string[];
  readonly phrase: string;
  readonly requiresHumanReview: true;
  readonly permitsAutomaticAction: false;
  readonly confirmsPayment: false;
  readonly confirmsDebtExtinction: false;
}

const REFERENCE = /^[A-Z0-9][A-Z0-9./:_+-]{1,199}$/u;
const PRIVATE_REFERENCE =
  /^(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]|ES\d{22}|[6789]\d{8})$/u;
const MODEL_PERIOD = /^\d{3}:(?:19|20)\d{2}:(?:0A|[1-4]T|0[1-9]|1[0-2])$/u;

function validReference(value: string | null): boolean {
  return value === null ||
    (REFERENCE.test(value) && /\d/u.test(value) && !PRIVATE_REFERENCE.test(value));
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

function validPartId(partId: string, documentId: string): boolean {
  return partId.startsWith(`part:${documentId}:`) &&
    partId.length <= 240 &&
    !/[\u0000-\u001f\u007f]/u.test(partId);
}

function validRows(rows: readonly RealCorpusDebtRowRelationInputV6[]): boolean {
  if (rows.length > 100) return false;
  const seen = new Set<string>();
  for (const row of rows) {
    if (
      !validReference(row.debtKey) ||
      !row.debtKey ||
      !validCents(row.amountCents) ||
      seen.has(row.debtKey)
    ) return false;
    seen.add(row.debtKey);
  }
  return true;
}

function validDocument(value: RealCorpusRelationDocumentV6): boolean {
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
    !validReference(value.agreementId) ||
    !validReference(value.interestLiquidationKey) ||
    !validReference(value.interestSourceDebtKey) ||
    !validReference(value.sanctionReference) ||
    !validReference(value.sanctionDebtKey) ||
    !validReference(value.originSanctionDebtKey) ||
    !validReference(value.clawbackDebtKey) ||
    !validReference(value.exactReferenceToSanction) ||
    !validReference(value.seizureOrderId) ||
    !validReference(value.citedSeizureOrderId) ||
    ![
      value.principalCents,
      value.ordinaryTotalCents,
      value.interestSourcePrincipalCents,
      value.interestCents,
      value.initialSanctionCents,
      value.reductionCents,
      value.reducedSanctionCents,
      value.clawbackCents,
      value.debtSubtotalCents,
      value.printedInterestCents,
      value.printedCostsCents,
      value.seizeLimitCents,
      value.paymentFormPrintedTotalCents,
      value.paymentFormAmountCents,
    ].every(validCents) ||
    (value.historicalReductionPercent !== null &&
      (!Number.isSafeInteger(value.historicalReductionPercent) ||
        value.historicalReductionPercent < 0 ||
        value.historicalReductionPercent > 100)) ||
    value.installments.length > 100 ||
    value.modelsPeriods.length > 100 ||
    value.paymentFormPartIds.length > 4 ||
    !validRows(value.seizureRows)
  ) return false;

  const installmentDates = new Set<string>();
  for (const item of value.installments) {
    if (
      !validDate(item.dueDate) ||
      !item.dueDate ||
      !validCents(item.baseCents) ||
      !validCents(item.deferralInterestCents) ||
      !validCents(item.totalCents) ||
      item.baseCents + item.deferralInterestCents !== item.totalCents ||
      installmentDates.has(item.dueDate)
    ) return false;
    installmentDates.add(item.dueDate);
  }
  if (
    value.deniedDebt &&
    (!validReference(value.deniedDebt.debtKey) ||
      !value.deniedDebt.debtKey ||
      !validCents(value.deniedDebt.principalCents))
  ) return false;
  if (value.modelsPeriods.some((item) => !MODEL_PERIOD.test(item))) return false;
  if (value.deliveryCoverPartId && !validPartId(value.deliveryCoverPartId, value.documentId))
    return false;
  const seenParts = new Set<string>();
  for (const partId of value.paymentFormPartIds) {
    if (!validPartId(partId, value.documentId) || seenParts.has(partId)) return false;
    seenParts.add(partId);
  }
  return true;
}

function relation(
  status: RealCorpusRelationV6["status"],
  input: Omit<
    RealCorpusRelationV6,
    | "engineVersion"
    | "status"
    | "requiresHumanReview"
    | "permitsAutomaticAction"
    | "confirmsPayment"
    | "confirmsDebtExtinction"
  >,
): RealCorpusRelationV6 {
  return Object.freeze({
    engineVersion: REAL_CORPUS_RELATION_ENGINE_VERSION_V6,
    status,
    ...input,
    contributingDocumentIds: Object.freeze([...input.contributingDocumentIds]),
    requiresHumanReview: true,
    permitsAutomaticAction: false,
    confirmsPayment: false,
    confirmsDebtExtinction: false,
  });
}

function exact(
  input: Parameters<typeof relation>[1],
): RealCorpusRelationV6 {
  return relation("SYSTEM_CONFIRMED_EXACT", input);
}

function sameOwnerAndIssuer(
  source: RealCorpusRelationDocumentV6,
  target: RealCorpusRelationDocumentV6,
): boolean {
  return source.ownerScope === target.ownerScope && source.issuer === target.issuer;
}

function notAfter(
  earlier: RealCorpusRelationDocumentV6,
  later: RealCorpusRelationDocumentV6,
): boolean {
  return !earlier.documentDate || !later.documentDate || earlier.documentDate <= later.documentDate;
}

function matchingDebtSets(
  source: RealCorpusRelationDocumentV6,
  target: RealCorpusRelationDocumentV6,
): boolean {
  if (
    source.seizureRows.length === 0 ||
    source.seizureRows.length !== target.seizureRows.length
  ) return false;
  const targetRows = new Set(target.seizureRows.map((row) => row.debtKey));
  return source.seizureRows.every((row) => targetRows.has(row.debtKey));
}

/** Exact pair relations use strong identifiers and never use amounts as identity. */
export function relateRealCorpusDocumentsV6(
  source: RealCorpusRelationDocumentV6,
  target: RealCorpusRelationDocumentV6,
): readonly RealCorpusRelationV6[] {
  if (
    !validDocument(source) ||
    !validDocument(target) ||
    source.documentId === target.documentId ||
    !sameOwnerAndIssuer(source, target)
  )
    return Object.freeze([]);

  const results: RealCorpusRelationV6[] = [];
  const grant =
    source.familyId === "collection.deferral_grant"
      ? source
      : target.familyId === "collection.deferral_grant"
        ? target
        : null;
  const enforcement =
    source.familyId === "collection.enforcement_order"
      ? source
      : target.familyId === "collection.enforcement_order"
        ? target
        : null;
  if (
    grant &&
    enforcement &&
    grant.debtKey &&
    grant.debtKey === enforcement.debtKey &&
    notAfter(grant, enforcement)
  ) {
    const installment = grant.installments.find(
      (item) =>
        item.dueDate === enforcement.voluntaryEndDate &&
        enforcement.principalCents !== null &&
        item.totalCents === enforcement.principalCents,
    );
    results.push(
      installment
        ? exact({
            relationType: "CLAIMS_UNPAID_INSTALLMENT",
            sourceDocumentId: grant.documentId,
            targetDocumentId: enforcement.documentId,
            exactReference: grant.debtKey,
            observedAmountCents: installment.totalCents,
            contributingDocumentIds: [grant.documentId, enforcement.documentId],
            phrase:
              "Esta providencia reclama una cuota concreta del fraccionamiento: coinciden la clave de deuda, el vencimiento y el importe total de la cuota.",
          })
        : relation("SYSTEM_SUGGESTED", {
            relationType: "SAME_UNDERLYING_DEBT_NOT_INSTALLMENT_MATCH",
            sourceDocumentId: grant.documentId,
            targetDocumentId: enforcement.documentId,
            exactReference: grant.debtKey,
            observedAmountCents: null,
            contributingDocumentIds: [grant.documentId, enforcement.documentId],
            phrase:
              "Comparte la clave de liquidación con el fraccionamiento, pero no coinciden a la vez el vencimiento y el importe de una cuota concreta.",
          }),
    );
  }

  if (
    source.familyId === "collection.enforcement_order" &&
    target.familyId === "collection.enforcement_order" &&
    source.debtKey &&
    source.debtKey === target.debtKey &&
    (source.voluntaryEndDate !== target.voluntaryEndDate ||
      source.paymentFormReference !== target.paymentFormReference)
  ) {
    results.push(
      exact({
        relationType: "SAME_PAYMENT_PLAN_DIFFERENT_INSTALLMENTS",
        sourceDocumentId: source.documentId,
        targetDocumentId: target.documentId,
        exactReference: source.debtKey,
        observedAmountCents: null,
        contributingDocumentIds: [source.documentId, target.documentId],
        phrase:
          "Ambas providencias comparten la clave, pero corresponden a vencimientos o cartas distintos. No son duplicados.",
      }),
    );
  }

  const initiation =
    source.familyId === "sanction.initiation_and_hearing"
      ? source
      : target.familyId === "sanction.initiation_and_hearing"
        ? target
        : null;
  const resolution =
    source.familyId === "sanction.resolution"
      ? source
      : target.familyId === "sanction.resolution"
        ? target
        : null;
  if (
    initiation &&
    resolution &&
    initiation.sanctionReference &&
    initiation.sanctionReference === resolution.sanctionReference &&
    notAfter(initiation, resolution)
  )
    results.push(
      exact({
        relationType: "RESOLVES_SANCTION_PROCEEDING",
        sourceDocumentId: initiation.documentId,
        targetDocumentId: resolution.documentId,
        exactReference: initiation.sanctionReference,
        observedAmountCents: null,
        contributingDocumentIds: [initiation.documentId, resolution.documentId],
        phrase:
          "Esta resolución decide el expediente sancionador iniciado anteriormente y fija la sanción.",
      }),
    );

  const requirement =
    source.familyId === "compliance.formal_filing_requirement"
      ? source
      : target.familyId === "compliance.formal_filing_requirement"
        ? target
        : null;
  if (
    requirement &&
    initiation &&
    requirement.exactReferenceToSanction &&
    requirement.exactReferenceToSanction === initiation.sanctionReference &&
    notAfter(requirement, initiation)
  )
    results.push(
      exact({
        relationType: "POSSIBLY_PRECEDES_SANCTION",
        sourceDocumentId: requirement.documentId,
        targetDocumentId: initiation.documentId,
        exactReference: requirement.exactReferenceToSanction,
        observedAmountCents: null,
        contributingDocumentIds: [
          requirement.documentId,
          initiation.documentId,
        ],
        phrase:
          "El requerimiento y el inicio sancionador imprimen la misma referencia de expediente.",
      }),
    );

  if (
    resolution &&
    enforcement &&
    resolution.sanctionDebtKey &&
    resolution.sanctionDebtKey === enforcement.debtKey &&
    notAfter(resolution, enforcement)
  )
    results.push(
      exact({
        relationType: "SANCTION_DECISION_ENFORCED",
        sourceDocumentId: resolution.documentId,
        targetDocumentId: enforcement.documentId,
        exactReference: resolution.sanctionDebtKey,
        observedAmountCents: null,
        contributingDocumentIds: [
          resolution.documentId,
          enforcement.documentId,
        ],
        phrase:
          "Esta providencia reclama en vía ejecutiva la sanción reducida fijada anteriormente.",
      }),
    );

  const loss =
    source.familyId === "sanction.loss_of_reduction"
      ? source
      : target.familyId === "sanction.loss_of_reduction"
        ? target
        : null;
  if (
    resolution &&
    loss &&
    resolution.sanctionDebtKey &&
    resolution.sanctionDebtKey === loss.originSanctionDebtKey &&
    notAfter(resolution, loss)
  )
    results.push(
      exact({
        relationType: "CLAIMS_LOST_SANCTION_REDUCTION",
        sourceDocumentId: resolution.documentId,
        targetDocumentId: loss.documentId,
        exactReference: resolution.sanctionDebtKey,
        observedAmountCents: null,
        contributingDocumentIds: [resolution.documentId, loss.documentId],
        phrase:
          "Este documento exige la reducción que se había aplicado a la sanción porque la AEAT considera incumplidas sus condiciones.",
      }),
    );
  if (
    loss &&
    enforcement &&
    loss.clawbackDebtKey &&
    loss.clawbackDebtKey === enforcement.debtKey &&
    notAfter(loss, enforcement)
  )
    results.push(
      exact({
        relationType: "ENFORCES_LOST_REDUCTION",
        sourceDocumentId: loss.documentId,
        targetDocumentId: enforcement.documentId,
        exactReference: loss.clawbackDebtKey,
        observedAmountCents: null,
        contributingDocumentIds: [loss.documentId, enforcement.documentId],
        phrase:
          "Esta providencia reclama en vía ejecutiva la reducción de sanción exigida anteriormente.",
      }),
    );

  const denial =
    source.familyId === "collection.deferral_denial"
      ? source
      : target.familyId === "collection.deferral_denial"
        ? target
        : null;
  if (
    denial &&
    enforcement &&
    denial.deniedDebt &&
    denial.deniedDebt.debtKey === enforcement.debtKey &&
    notAfter(denial, enforcement)
  )
    results.push(
      exact({
        relationType: "DENIAL_PRECEDES_ENFORCEMENT",
        sourceDocumentId: denial.documentId,
        targetDocumentId: enforcement.documentId,
        exactReference: denial.deniedDebt.debtKey,
        observedAmountCents: null,
        contributingDocumentIds: [denial.documentId, enforcement.documentId],
        phrase:
          "Esta providencia reclama la deuda principal cuya solicitud de aplazamiento fue denegada.",
      }),
    );

  const interest =
    source.familyId === "collection.interest_assessment"
      ? source
      : target.familyId === "collection.interest_assessment"
        ? target
        : null;
  if (
    denial &&
    interest &&
    denial.agreementId &&
    denial.agreementId === interest.agreementId &&
    denial.deniedDebt &&
    denial.deniedDebt.debtKey === interest.interestSourceDebtKey &&
    notAfter(denial, interest)
  )
    results.push(
      exact({
        relationType: "INTEREST_ASSESSMENT_FROM_DENIED_DEFERRAL",
        sourceDocumentId: denial.documentId,
        targetDocumentId: interest.documentId,
        exactReference: denial.agreementId,
        observedAmountCents: null,
        contributingDocumentIds: [denial.documentId, interest.documentId],
        phrase:
          "Esta liquidación calcula los intereses derivados de la solicitud de aplazamiento denegada. No es una nueva deuda principal.",
      }),
    );
  if (
    interest &&
    enforcement &&
    interest.interestLiquidationKey &&
    interest.interestLiquidationKey === enforcement.debtKey &&
    notAfter(interest, enforcement)
  )
    results.push(
      exact({
        relationType: "ENFORCES_INTEREST_ASSESSMENT",
        sourceDocumentId: interest.documentId,
        targetDocumentId: enforcement.documentId,
        exactReference: interest.interestLiquidationKey,
        observedAmountCents: null,
        contributingDocumentIds: [interest.documentId, enforcement.documentId],
        phrase:
          "Esta providencia reclama los intereses liquidados anteriormente, no vuelve a reclamar el principal.",
      }),
    );

  const seizure =
    source.familyId.startsWith("seizure.") &&
    source.familyId !== "seizure.release"
      ? source
      : target.familyId.startsWith("seizure.") &&
          target.familyId !== "seizure.release"
        ? target
        : null;
  if (
    enforcement &&
    seizure &&
    enforcement.debtKey &&
    seizure.seizureRows.some((row) => row.debtKey === enforcement.debtKey) &&
    notAfter(enforcement, seizure)
  )
    results.push(
      exact({
        relationType: "ENFORCES",
        sourceDocumentId: enforcement.documentId,
        targetDocumentId: seizure.documentId,
        exactReference: enforcement.debtKey,
        observedAmountCents: null,
        contributingDocumentIds: [enforcement.documentId, seizure.documentId],
        phrase:
          "Este embargo incluye la deuda reclamada en la providencia anterior.",
      }),
    );

  if (
    source.familyId.startsWith("seizure.") &&
    source.familyId !== "seizure.release" &&
    target.familyId.startsWith("seizure.") &&
    target.familyId !== "seizure.release" &&
    source.seizureOrderId &&
    target.seizureOrderId &&
    source.seizureOrderId !== target.seizureOrderId &&
    source.seizureAssetKind !== "NONE" &&
    target.seizureAssetKind !== "NONE" &&
    source.seizureAssetKind !== target.seizureAssetKind &&
    matchingDebtSets(source, target)
  )
    results.push(
      exact({
        relationType: "SAME_DEBT_SET_MULTIPLE_SEIZURE_ASSETS",
        sourceDocumentId: source.documentId,
        targetDocumentId: target.documentId,
        exactReference: null,
        observedAmountCents: null,
        contributingDocumentIds: [source.documentId, target.documentId],
        phrase:
          "Ambas diligencias persiguen el mismo conjunto de deudas mediante bienes distintos. Son dos actuaciones de embargo, no dos conjuntos de deuda.",
      }),
    );

  const release =
    source.familyId === "seizure.release"
      ? source
      : target.familyId === "seizure.release"
        ? target
        : null;
  if (
    seizure &&
    release &&
    seizure.seizureOrderId &&
    seizure.seizureOrderId === release.citedSeizureOrderId &&
    notAfter(seizure, release)
  )
    results.push(
      exact({
        relationType: "RELEASES_SEIZURE",
        sourceDocumentId: seizure.documentId,
        targetDocumentId: release.documentId,
        exactReference: seizure.seizureOrderId,
        observedAmountCents: null,
        contributingDocumentIds: [seizure.documentId, release.documentId],
        phrase:
          "Este documento posterior deja sin efecto el embargo identificado. No prueba por sí solo que las deudas hayan quedado pagadas ni afecta automáticamente a otros embargos.",
      }),
    );
  return Object.freeze(results);
}

/** One relation per distinctly identified enforcement sharing the exact debt key. */
export function relateRealCorpusDocumentSetV6(
  documents: readonly RealCorpusRelationDocumentV6[],
): readonly RealCorpusRelationV6[] {
  if (documents.length > 1_000 || documents.some((item) => !validDocument(item)))
    return Object.freeze([]);
  const groups = new Map<string, RealCorpusRelationDocumentV6[]>();
  for (const item of documents) {
    if (item.familyId !== "collection.enforcement_order" || !item.debtKey)
      continue;
    const key = `${item.ownerScope}\u0000${item.issuer}\u0000${item.debtKey}`;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  const results: RealCorpusRelationV6[] = [];
  for (const seizure of documents) {
    if (!seizure.familyId.startsWith("seizure.") || seizure.familyId === "seizure.release") continue;
    for (const row of seizure.seizureRows) {
      const key = `${seizure.ownerScope}\u0000${seizure.issuer}\u0000${row.debtKey}`;
      const candidates = (groups.get(key) ?? []).filter((item) => notAfter(item, seizure));
      if (candidates.length < 2) continue;
      const identities = candidates.map((item) =>
        item.voluntaryEndDate && item.paymentFormReference
          ? `${item.debtKey}\u0000${item.voluntaryEndDate}\u0000${item.paymentFormReference}`
          : null,
      );
      if (
        identities.some((identity) => identity === null) ||
        new Set(identities).size !== candidates.length
      ) continue;
      const contributing = Object.freeze(candidates.map((item) => item.documentId).sort());
      for (const enforcement of candidates) {
        results.push(exact({
          relationType: "AGGREGATES_PRIOR_ENFORCEMENT",
          sourceDocumentId: enforcement.documentId,
          targetDocumentId: seizure.documentId,
          exactReference: row.debtKey,
          observedAmountCents: null,
          contributingDocumentIds: contributing,
          phrase: "La fila del embargo agrupa varias actuaciones anteriores de la misma deuda.",
        }));
      }
    }
  }
  return Object.freeze(results);
}

export function internalDocumentRelationsV6(
  document: RealCorpusRelationDocumentV6,
): readonly RealCorpusRelationV6[] {
  if (!validDocument(document)) return Object.freeze([]);
  const results: RealCorpusRelationV6[] = [];
  if (document.deliveryCoverPartId) results.push(exact({
    relationType: "DELIVERY_ATTEMPT_FOR",
    sourceDocumentId: document.deliveryCoverPartId,
    targetDocumentId: document.documentId,
    exactReference: null,
    observedAmountCents: null,
    contributingDocumentIds: [document.documentId],
    phrase: "La primera página documenta un nuevo intento de entrega del acto incluido. No cambia su contenido.",
  }));
  if (document.paymentFormPartIds.length > 0) results.push(exact({
    relationType: "PAYMENT_FORM_FOR",
    sourceDocumentId: document.paymentFormPartIds[0]!,
    targetDocumentId: document.documentId,
    exactReference: document.paymentFormReference,
    observedAmountCents: null,
    contributingDocumentIds: [document.documentId],
    phrase: "La carta contiene los datos para pagar el acto relacionado. No acredita que el pago ya se haya realizado.",
  }));
  return Object.freeze(results);
}
