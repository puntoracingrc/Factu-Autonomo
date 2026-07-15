import { describe, expect, it } from "vitest";

import { TAX_MODEL_CATALOG } from "./model-catalog";
import {
  TAX_RULES,
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
});
