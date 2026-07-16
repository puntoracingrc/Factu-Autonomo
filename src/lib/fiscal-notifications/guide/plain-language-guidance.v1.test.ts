import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FISCAL_NOTIFICATION_PLAIN_LANGUAGE_GUIDANCE_V1,
  resolveFiscalNotificationPlainLanguageGuidanceV1,
} from "./plain-language-guidance.v1";
import { resolveFiscalNotificationOfficialSourceV4 } from "../knowledge/official-sources.v4";

describe("fiscal notification plain-language guidance v1", () => {
  it("covers the first vertical chain with reusable versioned profiles", () => {
    expect(FISCAL_NOTIFICATION_PLAIN_LANGUAGE_GUIDANCE_V1).toHaveLength(29);
    expect(
      new Set(
        FISCAL_NOTIFICATION_PLAIN_LANGUAGE_GUIDANCE_V1.map(
          (entry) => entry.familyId,
        ),
      ).size,
    ).toBe(FISCAL_NOTIFICATION_PLAIN_LANGUAGE_GUIDANCE_V1.length);

    for (const familyId of [
      "notification.dehu_envelope",
      "compliance.formal_filing_requirement",
      "assessment.allegations_and_proposal",
      "assessment.final_provisional_assessment",
      "collection.deferral_denial",
      "payment.payment_form",
      "payment.receipt",
      "collection.enforcement_order",
      "seizure.bank_account",
      "seizure.third_party_response",
      "seizure.release",
    ]) {
      expect(
        resolveFiscalNotificationPlainLanguageGuidanceV1(familyId),
      ).toMatchObject({
        familyId,
        status: "GENERAL_CONTEXT_EXPLAINED",
        profileVersion: "1.0.0",
      });
    }
  });

  it("publishes the deferral-denial guide with learned official context", () => {
    const denial = resolveFiscalNotificationPlainLanguageGuidanceV1(
      "collection.deferral_denial",
    );

    expect(denial).toMatchObject({
      profileId: "deferral-denial",
      networkPolicy: "NO_RUNTIME_NETWORK",
      deadlinePolicy: "NEVER_CALCULATE_FROM_ISSUE_OR_SCAN_DATE",
    });
    expect(denial?.inShort).toContain("no queda aplazada");
    expect(denial?.usualNextStep).toContain("carta de pago");
    expect(denial?.sourceIds).toEqual(
      expect.arrayContaining([
        "aeat.collection.deferral_management",
        "boe.tax.general.law",
        "boe.tax.collection.regulation",
      ]),
    );
  });

  it("keeps payment instructions, evidence and failure semantically separate", () => {
    const form = resolveFiscalNotificationPlainLanguageGuidanceV1(
      "payment.payment_form",
    );
    const receipt =
      resolveFiscalNotificationPlainLanguageGuidanceV1("payment.receipt");
    const failed = resolveFiscalNotificationPlainLanguageGuidanceV1(
      "payment.failed_or_reversed",
    );
    expect(form?.inShort).toContain("No es una prueba");
    expect(receipt?.inShort).toContain("evidencia");
    expect(failed?.inShort).toContain("no terminó correctamente");
    expect(
      new Set([form?.profileId, receipt?.profileId, failed?.profileId]).size,
    ).toBe(3);
  });

  it("never turns general context into a document conclusion, deadline or action", () => {
    for (const guidance of FISCAL_NOTIFICATION_PLAIN_LANGUAGE_GUIDANCE_V1) {
      expect(guidance).toMatchObject({
        documentPolicy: "DOCUMENT_IS_PRIMARY",
        networkPolicy: "NO_RUNTIME_NETWORK",
        inferencePolicy: "NO_DOCUMENT_SPECIFIC_INFERENCE",
        deadlinePolicy: "NEVER_CALCULATE_FROM_ISSUE_OR_SCAN_DATE",
        operationalPolicy: "INFORMATION_ONLY_NO_AUTOMATIC_ACTION",
        deadline: { basis: "RECEIPT_OR_DOCUMENT_ONLY" },
      });
      expect(guidance.inShort.length).toBeLessThanOrEqual(220);
      expect(guidance.usualNextStep.length).toBeLessThanOrEqual(260);
      expect(guidance.keyPoints.length).toBeGreaterThan(0);
      expect(guidance.keyPoints.length).toBeLessThanOrEqual(3);
      for (const sourceId of guidance.sourceIds) {
        expect(
          resolveFiscalNotificationOfficialSourceV4(sourceId),
        ).not.toBeNull();
      }
    }
  });

  it("preserves debtor and third-party seizure roles", () => {
    const debtor = resolveFiscalNotificationPlainLanguageGuidanceV1(
      "seizure.bank_account",
    );
    const thirdParty = resolveFiscalNotificationPlainLanguageGuidanceV1(
      "seizure.third_party_response",
    );
    expect(debtor?.profileId).toBe("seizure-order");
    expect(thirdParty?.profileId).toBe("seizure-third-party-response");
    expect(thirdParty?.inShort).toContain("tercero");
    expect(thirdParty?.keyPoints.join(" ")).toContain("roles diferentes");
  });

  it("is immutable, exact and contains no runtime side effects", () => {
    expect(
      Object.isFrozen(FISCAL_NOTIFICATION_PLAIN_LANGUAGE_GUIDANCE_V1),
    ).toBe(true);
    const entry = FISCAL_NOTIFICATION_PLAIN_LANGUAGE_GUIDANCE_V1[0];
    expect(Object.isFrozen(entry)).toBe(true);
    expect(Object.isFrozen(entry.deadline)).toBe(true);
    expect(Object.isFrozen(entry.keyPoints)).toBe(true);
    expect(Object.isFrozen(entry.searchTerms)).toBe(true);
    expect(Object.isFrozen(entry.sourceIds)).toBe(true);

    for (const invalid of [
      " notification.dehu_envelope",
      "notification.dehu_envelope ",
      "notification.unknown",
      "notification.\u0000dehu",
      "x".repeat(161),
      null,
    ]) {
      expect(
        resolveFiscalNotificationPlainLanguageGuidanceV1(invalid),
      ).toBeNull();
    }

    const source = readFileSync(
      new URL("./plain-language-guidance.v1.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|WebSocket|OpenAI|Anthropic|localStorage|sessionStorage|indexedDB|Date\.now|Math\.random|createDebt|createExpense|markAsPaid/iu,
    );
  });
});
