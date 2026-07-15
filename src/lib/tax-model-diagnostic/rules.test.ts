import { describe, expect, it } from "vitest";

import { authorizeRuleExclusion } from "@/lib/tax-obligations";

import { TAX_MODEL_CATALOG } from "./model-catalog";
import {
  TAX_RULES,
  taxRuleSetAuthorizationMetadata,
  taxRuleSetReviewState,
  validateTaxRuleRegistry,
} from "./rules";

describe("tax rule registry", () => {
  it("cubre todos los modelos en ambos ejercicios sin errores", () => {
    expect(TAX_RULES).toHaveLength(TAX_MODEL_CATALOG.length * 2);
    expect(validateTaxRuleRegistry()).toEqual([]);
    expect(new Set(TAX_RULES.map((rule) => rule.ruleId)).size).toBe(
      TAX_RULES.length,
    );
  });

  it("exige trazabilidad y los seis casos mínimos por regla", () => {
    for (const rule of TAX_RULES) {
      expect(rule.officialSourceIds.length).toBeGreaterThan(0);
      expect(rule.lastVerifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(rule.tests).toEqual(
        expect.arrayContaining([
          `${rule.modelNumber}.${rule.fiscalYear}.positive`,
          `${rule.modelNumber}.${rule.fiscalYear}.negative`,
          `${rule.modelNumber}.${rule.fiscalYear}.exception`,
          `${rule.modelNumber}.${rule.fiscalYear}.incomplete`,
          `${rule.modelNumber}.${rule.fiscalYear}.census-mismatch`,
          `${rule.modelNumber}.${rule.fiscalYear}.year-boundary`,
        ]),
      );
    }
  });

  it("detecta reglas rotas antes de publicarlas", () => {
    const original = TAX_RULES[0];
    const broken = {
      ...original,
      officialSourceIds: ["fuente-inexistente"],
      tests: ["solo-un-test"],
    };

    expect(validateTaxRuleRegistry([broken])).toEqual(
      expect.arrayContaining([
        expect.stringContaining("casos de prueba insuficientes"),
        expect.stringContaining("fuente desconocida"),
      ]),
    );
  });

  it("mantiene el ruleset cerrado mientras falte la aprobación nominal", () => {
    expect(taxRuleSetReviewState(2025)).toBe("PENDING_FISCAL_REVIEW");
    expect(taxRuleSetReviewState(2026)).toBe("PENDING_FISCAL_REVIEW");
  });

  it("mantiene las 54 reglas en el estado fiscal inicial seguro", () => {
    expect(TAX_RULES).toHaveLength(54);
    for (const fiscalYear of [2025, 2026] as const) {
      const rules = TAX_RULES.filter(
        (rule) => rule.fiscalYear === fiscalYear,
      );
      expect(rules).toHaveLength(27);
      expect(taxRuleSetAuthorizationMetadata(fiscalYear)).toMatchObject({
        reviewStatus: "PENDING_FISCAL_REVIEW",
        resolutionStatus: "OPEN",
      });
    }
    for (const rule of TAX_RULES) {
      expect(rule.territory).toBe("ES_COMMON");
      expect(rule.fiscalMetadata.review).toMatchObject({
        reviewStatus: "PENDING_FISCAL_REVIEW",
        resolutionStatus: "OPEN",
        testsStatus: "NOT_IMPLEMENTED",
        sourceStatus: "UNVERIFIED",
        primaryFiscalReviewer: null,
        secondFiscalReviewer: null,
        approvedRuleHash: null,
        approvalEvidenceId: null,
        approvalEvidenceVerified: false,
      });
      expect(rule.fiscalMetadata.ruleHash).toMatch(
        /^fiscal-rule-v1:[a-f0-9]{64}$/u,
      );
      expect(
        rule.fiscalMetadata.sourceSnapshots.every(
          (snapshot) =>
            snapshot.status === "UNVERIFIED" &&
            snapshot.snapshotHash === null,
        ),
      ).toBe(true);
      expect(
        rule.fiscalMetadata.exclusionCandidates.every(
          (candidate) =>
            candidate.effectType === "ADVISORY_EXCLUSION_CANDIDATE" &&
            candidate.reviewStatus === "PENDING_FISCAL_REVIEW" &&
            candidate.resolutionStatus === "OPEN",
        ),
      ).toBe(true);
    }
  });

  it("autoriza cero exclusiones para todas las reglas fiscales reales", () => {
    const authorized = TAX_RULES.flatMap((rule) =>
      rule.fiscalMetadata.exclusionCandidates.filter((candidate) =>
        authorizeRuleExclusion({
          ruleset: taxRuleSetAuthorizationMetadata(rule.fiscalYear),
          rule,
          exclusionCandidate: candidate,
          targetFiscalYear: rule.fiscalYear,
          targetTerritory: rule.territory,
          ruleHash: rule.fiscalMetadata.ruleHash,
          approvalEvidence: null,
          issues: rule.fiscalMetadata.review.issueIds.map((issueId) => ({
            issueId,
            status: "OPEN",
          })),
          issueRegistryComplete: true,
          facts: {
            hasUnknownRequiredFacts: false,
            hasContradictoryFacts: false,
          },
          internalOverrideRequested: false,
          evaluatedAt: "2026-07-15T15:00:00.000Z",
        }).authorized,
      ),
    );

    expect(authorized).toEqual([]);
  });
});
