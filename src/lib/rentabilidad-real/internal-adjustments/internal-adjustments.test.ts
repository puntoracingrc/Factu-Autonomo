import { describe, expect, it } from "vitest";
import {
  createInternalProfitabilityAdjustment,
  summarizeInternalAdjustments,
  validateInternalProfitabilityAdjustment,
} from "./internal-adjustments";

describe("internal profitability adjustments", () => {
  it("crea ajuste válido", () => {
    const adjustment = createInternalProfitabilityAdjustment({
      id: "adj_1",
      sourceDocumentId: "doc_1",
      sourceType: "invoice",
      amount: 100,
      label: "Ajuste interno",
      category: "non_deductible_extra_cost",
      createdAt: "2026-07-05T10:00:00.000Z",
    });

    expect(adjustment).toMatchObject({
      id: "adj_1",
      amount: 100,
      fiscalTreatment: "non_deductible",
      vatTreatment: "no_vat_deduction",
      includeInTaxBooks: false,
      includeInVat: false,
      includeInIrpf: false,
    });
  });

  it("rechaza amount <= 0", () => {
    const validation = validateInternalProfitabilityAdjustment({
      sourceDocumentId: "doc_1",
      sourceType: "invoice",
      amount: 0,
      label: "Ajuste",
      category: "other_internal_adjustment",
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("amount debe ser positivo");
  });

  it("siempre fuerza tratamiento no fiscal", () => {
    const adjustment = createInternalProfitabilityAdjustment({
      sourceDocumentId: "doc_1",
      sourceType: "quote",
      amount: 50,
      label: "Ajuste",
      category: "waste_or_loss",
    });

    expect(adjustment.fiscalTreatment).toBe("non_deductible");
    expect(adjustment.vatTreatment).toBe("no_vat_deduction");
    expect(adjustment.includeInTaxBooks).toBe(false);
    expect(adjustment.includeInVat).toBe(false);
    expect(adjustment.includeInIrpf).toBe(false);
  });

  it("summarizeInternalAdjustments suma correctamente y no muta input", () => {
    const adjustments = [
      createInternalProfitabilityAdjustment({
        id: "a1",
        sourceDocumentId: "doc_1",
        sourceType: "invoice",
        amount: 25,
        label: "Ajuste 1",
        category: "other_internal_adjustment",
      }),
      createInternalProfitabilityAdjustment({
        id: "a2",
        sourceDocumentId: "doc_1",
        sourceType: "invoice",
        amount: 35,
        label: "Ajuste 2",
        category: "waste_or_loss",
      }),
    ];
    const before = JSON.parse(JSON.stringify(adjustments));

    const summary = summarizeInternalAdjustments(adjustments);

    expect(summary.totalInternalAdjustments).toBe(60);
    expect(adjustments).toEqual(before);
  });

  it("genera warnings correctos", () => {
    const validation = validateInternalProfitabilityAdjustment({
      sourceDocumentId: "doc_1",
      sourceType: "invoice",
      amount: 10,
      label: "Ajuste",
      category: "undocumented_help",
    });

    expect(validation.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining([
        "internal_profitability_only",
        "not_fiscal_expense",
        "no_irpf_reduction",
        "no_deductible_vat",
        "not_exported_tax_books",
        "advisor_review_for_work_help",
      ]),
    );
  });
});
