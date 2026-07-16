import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1 } from "./document-families.v1";
import {
  FISCAL_NOTIFICATION_FAMILY_COVERAGE_V1,
  FISCAL_NOTIFICATION_KNOWLEDGE_COVERAGE_SUMMARY_V1,
  resolveFiscalNotificationFamilyCoverageV1,
} from "./coverage.v1";

describe("fiscal notification knowledge coverage v1", () => {
  it("publishes an honest incomplete snapshot with zero active rules or actions", () => {
    expect(FISCAL_NOTIFICATION_KNOWLEDGE_COVERAGE_SUMMARY_V1).toMatchObject({
      familyCount: 41,
      sourceCount: 17,
      urlVerifiedSourceCount: 17,
      contentHashVerifiedSourceCount: 0,
      legallyReviewedSourceCount: 0,
      observedCorpusFamilyCount: 31,
      officialOnlyFamilyCount: 9,
      officialSourcePendingRegistrationFamilyCount: 1,
      familiesWithOfficialContext: 21,
      familiesMissingOfficialContext: 20,
      candidateHandlerCount: 2,
      explicitFactExtractorCount: 1,
      syntheticTestCaseCount: 2,
      registeredTemplateVariantCount: 0,
      activeLegalRuleCount: 0,
      activeOperationalActionCount: 0,
      partialReviewOnlyFamilyCount: 2,
      missingFamilyCount: 39,
      completeFamilyCount: 0,
      overallStatus: "REVIEW_ONLY_INCOMPLETE",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
    expect(Object.isFrozen(FISCAL_NOTIFICATION_KNOWLEDGE_COVERAGE_SUMMARY_V1))
      .toBe(true);
  });

  it("covers every family exactly once and preserves its blockers", () => {
    expect(FISCAL_NOTIFICATION_FAMILY_COVERAGE_V1).toHaveLength(41);
    expect(FISCAL_NOTIFICATION_FAMILY_COVERAGE_V1.map((entry) => entry.familyId))
      .toEqual(FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V1.map((entry) => entry.id));
    expect(new Set(FISCAL_NOTIFICATION_FAMILY_COVERAGE_V1.map(
      (entry) => entry.familyId,
    )).size).toBe(41);
    for (const entry of FISCAL_NOTIFICATION_FAMILY_COVERAGE_V1) {
      expect(entry.legalRuleActive).toBe(false);
      expect(entry.operationalActionActive).toBe(false);
      expect(entry.templateVariantRegistered).toBe(false);
      expect(entry.blockers).toContain("SOURCE_CONTENT_HASH_MISSING");
      expect(entry.blockers).toContain("TEMPLATE_VARIANT_NOT_REGISTERED");
      expect(entry.blockers).toContain("LEGAL_REVIEW_PENDING");
      expect(entry.blockers).toContain("OPERATIONAL_ACTIVATION_PROHIBITED");
      expect(Object.isFrozen(entry)).toBe(true);
      expect(Object.isFrozen(entry.blockers)).toBe(true);
    }
    expect(Object.isFrozen(FISCAL_NOTIFICATION_FAMILY_COVERAGE_V1)).toBe(true);
  });

  it("distinguishes the current review-only extractors from missing families", () => {
    expect(resolveFiscalNotificationFamilyCoverageV1("collection.enforcement_order"))
      .toMatchObject({
        status: "PARTIAL_REVIEW_ONLY",
        candidateHandlerImplemented: true,
        explicitFactExtractorImplemented: true,
        legalRuleActive: false,
        operationalActionActive: false,
      });
    expect(resolveFiscalNotificationFamilyCoverageV1("collection.deferral_grant"))
      .toMatchObject({
        status: "PARTIAL_REVIEW_ONLY",
        candidateHandlerImplemented: true,
        explicitFactExtractorImplemented: false,
      });
    expect(resolveFiscalNotificationFamilyCoverageV1("seizure.bank_account"))
      .toMatchObject({
        status: "MISSING",
        candidateHandlerImplemented: false,
        explicitFactExtractorImplemented: false,
      });
    expect(resolveFiscalNotificationFamilyCoverageV1("notification.dehu_envelope"))
      .toMatchObject({
        status: "MISSING",
        blockers: expect.arrayContaining([
          "OFFICIAL_CONTEXT_SOURCE_MISSING",
          "OFFICIAL_SOURCE_REGISTRATION_PENDING",
        ]),
      });
    expect(resolveFiscalNotificationFamilyCoverageV1("unknown")).toBeNull();
    expect(resolveFiscalNotificationFamilyCoverageV1("collection.\u0000unknown"))
      .toBeNull();
    expect(resolveFiscalNotificationFamilyCoverageV1("x".repeat(1_000_000)))
      .toBeNull();
    expect(resolveFiscalNotificationFamilyCoverageV1(1)).toBeNull();
  });

  it("keeps the Consultor manual aligned with every structured printed field", () => {
    const manual = readFileSync(
      new URL("../../manual/sections/consultor-fiscal.ts", import.meta.url),
      "utf8",
    );
    expect(manual).toContain(
      "muestra el nombre o razón social, el NIF y la condición de **obligado al pago**",
    );
    expect(manual).toContain(
      "también puede mostrar importes, valores exactos de referencias y fechas bajo etiquetas cerradas",
    );
    expect(manual).toContain(
      "Esos campos permanecen solo en memoria hasta que el usuario pulsa el botón de guardado",
    );
    expect(manual).toContain("Factu nunca custodia el PDF");
    expect(manual).toContain("**Relaciones entre documentos**");
    expect(manual).toContain("**Relación detectada · revisar**");
    expect(manual).toContain(
      "no inventa cuál causó a cuál, no confirma un pago y no cierra el expediente",
    );
    expect(manual).toContain(
      "Una fecha impresa no se interpreta como fecha de notificación ni como vencimiento",
    );
    expect(manual).toContain(
      "**Vto.** se mantiene como referencia opaca, nunca como fecha o cuota",
    );
    expect(manual).not.toContain("El analizador no extrae ni guarda importes");
    expect(manual).not.toContain("Todavía no extrae fechas");
    expect(manual).not.toContain("El sistema no determina obligado");
  });

  it("contains no runtime network, AI, persistence, clocks or materialization", () => {
    const source = readFileSync(
      new URL("./coverage.v1.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|WebSocket|OpenAI|Anthropic|localStorage|sessionStorage|indexedDB|Date\.now|new Date|Math\.random|ownerScope|documentId|taxId|NIF|CSV|IBAN|create.*(?:Debt|Deadline|Payment|Entry)|prepareAccountingDraft/iu,
    );
  });
});
