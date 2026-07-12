import {
  normalizeComparableText,
  normalizeConcept,
  tokenSet,
} from "./normalizers";
import type {
  ExpenseInput,
  RuleDefinition,
  RuleMatchCandidate,
  RuleMatchResult,
  TaxContext,
} from "./types";

export const MATCH_SCORES = {
  MANUAL_CATEGORY: 100,
  EXACT: 100,
  ALIAS: 95,
  TOKEN_BASE: 70,
  TOKEN_MAX: 89,
} as const;

export const AMBIGUITY_SCORE_DELTA = 5;

export function isRuleEffective(
  rule: RuleDefinition,
  expenseDate: string,
): boolean {
  return (
    rule.legalReviewStatus !== "DRAFT" &&
    rule.legalReviewStatus !== "RETIRED" &&
    expenseDate >= rule.effectiveFrom &&
    (!rule.effectiveTo || expenseDate <= rule.effectiveTo)
  );
}

function tokenCandidate(
  conceptTokens: ReadonlySet<string>,
  phrase: string,
): { coverage: number; phrase: string } | null {
  const phraseTokens = tokenSet(phrase);
  if (phraseTokens.size === 0) return null;
  for (const token of phraseTokens) {
    if (!conceptTokens.has(token)) return null;
  }
  const union = new Set([...conceptTokens, ...phraseTokens]);
  const coverage = phraseTokens.size / union.size;
  return coverage >= 0.5 ? { coverage, phrase } : null;
}

function candidateForRule(
  input: ExpenseInput,
  rule: RuleDefinition,
): RuleMatchCandidate | null {
  if (input.manualCategory === rule.category) {
    return {
      rule,
      matchedBy: "MANUAL_CATEGORY",
      score: MATCH_SCORES.MANUAL_CATEGORY,
      reason: "Categoría seleccionada manualmente por el usuario.",
    };
  }

  const normalized = normalizeConcept(input.concept);
  const canonical = normalizeComparableText(rule.canonicalConcept);
  if (normalized.comparable === canonical) {
    return {
      rule,
      matchedBy: "EXACT",
      score: MATCH_SCORES.EXACT,
      reason: `Coincidencia exacta con «${rule.canonicalConcept}».`,
    };
  }

  const exactAlias = rule.aliases.find(
    (alias) => normalizeComparableText(alias) === normalized.comparable,
  );
  if (exactAlias) {
    return {
      rule,
      matchedBy: "ALIAS",
      score: MATCH_SCORES.ALIAS,
      reason: `Coincidencia exacta con el alias «${exactAlias}».`,
    };
  }

  const conceptTokens = new Set(normalized.tokens);
  const tokenMatches = [rule.canonicalConcept, ...rule.aliases]
    .map((phrase) => tokenCandidate(conceptTokens, phrase))
    .filter((value): value is { coverage: number; phrase: string } =>
      Boolean(value),
    )
    .sort((left, right) =>
      right.coverage === left.coverage
        ? left.phrase.localeCompare(right.phrase, "es")
        : right.coverage - left.coverage,
    );
  const best = tokenMatches[0];
  if (!best) return null;
  const score = Math.min(
    MATCH_SCORES.TOKEN_MAX,
    MATCH_SCORES.TOKEN_BASE + Math.floor(best.coverage * 19),
  );
  return {
    rule,
    matchedBy: "TOKEN",
    score,
    reason: `Coincidencia por palabras completas con «${best.phrase}».`,
  };
}

export function matchExpenseRule(
  input: ExpenseInput,
  context: TaxContext,
  rules: readonly RuleDefinition[],
): RuleMatchResult {
  const candidates = rules
    .filter(
      (rule) =>
        isRuleEffective(rule, input.expenseDate) &&
        rule.supportedJurisdictions.includes(context.jurisdiction) &&
        rule.supportedTaxpayerTypes.includes(context.taxpayerType),
    )
    .map((rule) => candidateForRule(input, rule))
    .filter((candidate): candidate is RuleMatchCandidate => Boolean(candidate))
    .sort((left, right) =>
      right.score === left.score
        ? left.rule.id.localeCompare(right.rule.id)
        : right.score - left.score,
    );

  const selected = candidates[0] ?? null;
  if (!selected) return { status: "NO_MATCH", selected: null, candidates: [] };

  const competing = candidates.filter(
    (candidate) => selected.score - candidate.score <= AMBIGUITY_SCORE_DELTA,
  );
  if (competing.length > 1) {
    return { status: "AMBIGUOUS", selected: null, candidates: competing };
  }
  return { status: "MATCH", selected, candidates };
}
