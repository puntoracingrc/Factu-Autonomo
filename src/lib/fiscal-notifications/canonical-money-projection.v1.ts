import type { FiscalNotificationMathematicalIntegrityV11 } from "./mathematical-integrity-contract.v11";
import { sha256Hex } from "../document-integrity/snapshot-hash";

export interface FiscalNotificationCanonicalMoneyInputV1 {
  readonly kind: string;
  readonly amountCents: number;
  readonly evidenceIds?: readonly string[];
}

export function selectCanonicalFiscalNotificationMoneyV1<
  T extends FiscalNotificationCanonicalMoneyInputV1,
>(input: {
  readonly familyId: string | null;
  readonly money: readonly T[];
  readonly mathematicalIntegrity: FiscalNotificationMathematicalIntegrityV11 | null;
}): readonly T[] {
  if (!hasSemanticLabelConflict(input.familyId, input.mathematicalIntegrity)) {
    return input.money;
  }
  const rejected = detectFinalAssessmentRejectedInterestCandidates(
    input.money,
    input.mathematicalIntegrity,
  );
  if (
    rejected.evidenceIds.size === 0 &&
    rejected.ambiguousFallbackAmounts.size === 0
  ) {
    return input.money;
  }
  return Object.freeze(
    input.money.filter((money) =>
      money.kind === "LATE_PAYMENT_INTEREST"
        ? !isRejectedMoneyCandidate(money, rejected)
        : true,
    ),
  );
}

export function isRejectedFiscalNotificationSemanticMoneyCandidateV1(input: {
  readonly familyId: string | null;
  readonly kind: string;
  readonly amountCents: number | null;
  readonly evidenceIds?: readonly string[];
  readonly allMoney: readonly FiscalNotificationCanonicalMoneyInputV1[];
  readonly mathematicalIntegrity: FiscalNotificationMathematicalIntegrityV11 | null;
}): boolean {
  if (
    input.amountCents === null ||
    !hasSemanticLabelConflict(input.familyId, input.mathematicalIntegrity) ||
    input.kind !== "LATE_PAYMENT_INTEREST"
  ) {
    return false;
  }
  return isRejectedMoneyCandidate(
    {
      kind: input.kind,
      amountCents: input.amountCents,
      evidenceIds: input.evidenceIds,
    },
    detectFinalAssessmentRejectedInterestCandidates(
      input.allMoney,
      input.mathematicalIntegrity,
    ),
  );
}

export function fiscalNotificationV11FieldEvidenceIdV1(fieldId: string): string {
  const fingerprint = sha256Hex(`factu:mathematical-integrity:v11:${fieldId}`);
  return `math-v11:${fingerprint.slice(0, 32)}`;
}

function hasSemanticLabelConflict(
  familyId: string | null,
  mathematicalIntegrity: FiscalNotificationMathematicalIntegrityV11 | null,
): boolean {
  return (
    familyId === "assessment.final_provisional_assessment" &&
    mathematicalIntegrity?.checks.some(
      (check) =>
        check.checkKind === "STRUCTURAL" &&
        check.status === "SEMANTIC_LABEL_INCONSISTENT",
    ) === true
  );
}

interface RejectedMoneyCandidatesV1 {
  readonly evidenceIds: ReadonlySet<string>;
  readonly ambiguousFallbackAmounts: ReadonlySet<number>;
}

function detectFinalAssessmentRejectedInterestCandidates(
  money: readonly FiscalNotificationCanonicalMoneyInputV1[],
  mathematicalIntegrity: FiscalNotificationMathematicalIntegrityV11 | null,
): RejectedMoneyCandidatesV1 {
  const evidenceIds = detectRejectedInterestEvidenceIds(mathematicalIntegrity);
  if (evidenceIds.size > 0) {
    return Object.freeze({
      evidenceIds,
      ambiguousFallbackAmounts: new Set<number>(),
    });
  }
  return Object.freeze({
    evidenceIds,
    ambiguousFallbackAmounts: detectFallbackFalseInterestAmounts(money),
  });
}

function detectRejectedInterestEvidenceIds(
  mathematicalIntegrity: FiscalNotificationMathematicalIntegrityV11 | null,
): ReadonlySet<string> {
  const structuralOperandIds = new Set(
    mathematicalIntegrity?.checks
      .filter(
        (check) =>
          check.checkKind === "STRUCTURAL" &&
          check.status === "SEMANTIC_LABEL_INCONSISTENT",
      )
      .flatMap((check) => check.operands.map((operand) => operand.evidenceId)) ??
      [],
  );
  if (structuralOperandIds.size === 0) return new Set<string>();
  const evidence =
    mathematicalIntegrity?.normalizedEvidence.filter(
      (item) =>
        item.semantic === "MONEY" &&
        item.amountCents !== null &&
        structuralOperandIds.has(item.evidenceId),
    ) ?? [];
  const quotas = evidence.filter(
    (item) =>
      item.canonicalType === "FINAL_QUOTA" ||
      item.canonicalType === "PROPOSED_QUOTA",
  );
  const interests = evidence.filter(
    (item) => item.canonicalType === "LATE_PAYMENT_INTEREST",
  );
  const totals = evidence.filter((item) => item.canonicalType === "DOCUMENT_TOTAL");
  const rejected = new Set<string>();
  for (const quota of quotas) {
    for (const total of totals) {
      for (const validInterest of interests) {
        if (
          validInterest.amountCents !== quota.amountCents &&
          validInterest.amountCents !== null &&
          quota.amountCents !== null &&
          total.amountCents !== null &&
          Math.abs(
            quota.amountCents + validInterest.amountCents - total.amountCents,
          ) <= 1
        ) {
          for (const interest of interests) {
            if (interest.amountCents === quota.amountCents) {
              rejected.add(interest.evidenceId);
            }
          }
        }
      }
    }
  }
  return rejected;
}

function detectFallbackFalseInterestAmounts(
  money: readonly FiscalNotificationCanonicalMoneyInputV1[],
): ReadonlySet<number> {
  const quotas = money.filter(
    (fact) => fact.kind === "FINAL_QUOTA" || fact.kind === "PROPOSED_QUOTA",
  );
  const interests = money.filter(
    (fact) => fact.kind === "LATE_PAYMENT_INTEREST",
  );
  const totals = money.filter((fact) => fact.kind === "DOCUMENT_TOTAL");
  const interestAmounts = new Set(interests.map((fact) => fact.amountCents));
  if (quotas.length === 0 || interests.length < 2 || totals.length === 0) {
    return new Set<number>();
  }
  const falseInterestAmounts = new Set<number>();
  for (const quota of quotas) {
    for (const total of totals) {
      for (const interest of interests) {
        const exactTotal =
          Math.abs(
            quota.amountCents + interest.amountCents - total.amountCents,
          ) <= 1;
        if (
          interest.amountCents !== quota.amountCents &&
          exactTotal &&
          interestAmounts.has(quota.amountCents)
        ) {
          falseInterestAmounts.add(quota.amountCents);
        }
      }
    }
  }
  for (const amount of [...falseInterestAmounts]) {
    if (
      interests.filter((interest) => interest.amountCents === amount).length !==
      1
    ) {
      falseInterestAmounts.delete(amount);
    }
  }
  return falseInterestAmounts;
}

function isRejectedMoneyCandidate(
  money: FiscalNotificationCanonicalMoneyInputV1,
  rejected: RejectedMoneyCandidatesV1,
): boolean {
  if (
    money.evidenceIds?.some((evidenceId) =>
      rejected.evidenceIds.has(evidenceId),
    )
  ) {
    return true;
  }
  if (money.evidenceIds && money.evidenceIds.length > 0) return false;
  return rejected.ambiguousFallbackAmounts.has(money.amountCents);
}
