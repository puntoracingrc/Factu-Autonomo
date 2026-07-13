import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V1 } from "./official-sources.v1";
import {
  FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2,
  resolveFiscalNotificationOfficialSourceV2,
} from "./official-sources.v2";

describe("fiscal notification official source catalog v2", () => {
  it("extends v1 with unique AEAT and BOE primary sources", () => {
    const ids = FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2.map(
      (source) => source.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
    for (const source of FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V1) {
      expect(ids).toContain(source.id);
    }
    expect(ids).toEqual(
      expect.arrayContaining([
        "aeat.compliance.omitted_return",
        "aeat.census.rectification",
        "aeat.assessment.value_check",
        "aeat.collection.payment_and_receipts",
        "aeat.payment.nrc_receipt",
        "aeat.collection.seizure_types",
        "aeat.seizure.bank_accounts",
        "aeat.seizure.wages",
        "aeat.seizure.securities",
        "aeat.seizure.credits",
        "aeat.collection.external_debt",
        "aeat.compliance.individual_information",
        "aeat.collection.suspension",
        "aeat.census.tax_domicile",
        "aeat.census.nif_revocation",
        "aeat.census.nif_rehabilitation",
        "aeat.assessment.interest",
        "aeat.irpf.spouse_refund_suspension",
        "boe.tax.general.law",
        "boe.tax.management_inspection.regulation",
        "boe.tax.collection.regulation",
        "boe.tax.sanction.regulation",
        "boe.tax.review.regulation",
      ]),
    );
    expect(resolveFiscalNotificationOfficialSourceV2(
      "aeat.collection.late_filing_surcharge",
    )?.canonicalUrl).toBe(
      "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ71.shtml",
    );
  });

  it("accepts only official AEAT and BOE URLs with an honest source kind", () => {
    for (const source of FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2) {
      const url = new URL(source.canonicalUrl);
      expect(url.protocol).toBe("https:");
      if (source.authority === "AEAT") {
        expect(url.hostname).toBe("sede.agenciatributaria.gob.es");
        expect(source.sourceKind).toBe("PROCEDURE_INFORMATION");
      } else {
        expect(url.hostname).toBe("www.boe.es");
        expect(url.pathname).toBe("/buscar/act.php");
        expect(url.searchParams.get("id")).toMatch(/^BOE-A-\d{4}-\d+$/u);
        expect(source.sourceKind).toBe("LEGAL_TEXT");
      }
      expect(source.authorityLevel).toBe("OFFICIAL_PRIMARY");
      expect(Object.isFrozen(source)).toBe(true);
    }
    expect(Object.isFrozen(FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2)).toBe(true);
  });

  it("keeps every source context-only and unable to activate rules or templates", () => {
    for (const source of FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2) {
      expect(source).toMatchObject({
        verificationStatus: "OFFICIAL_URL_VERIFIED",
        contentSha256: null,
        legalReviewStatus: "LEGAL_REVIEW_PENDING",
        usagePolicy: "CONTEXT_ONLY",
        permitsLegalRuleActivation: false,
        permitsTemplateActivation: false,
        retainedSourceContent: "NONE",
      });
    }
  });

  it("resolves only exact registered IDs without coercion", () => {
    expect(resolveFiscalNotificationOfficialSourceV2("boe.tax.general.law"))
      .toMatchObject({ authority: "BOE", sourceKind: "LEGAL_TEXT" });
    expect(resolveFiscalNotificationOfficialSourceV2(
      "aeat.collection.payment_and_receipts",
    )).toMatchObject({ authority: "AEAT" });
    for (const invalid of [
      " boe.tax.general.law",
      "BOE.TAX.GENERAL.LAW",
      "boe.tax.\u0000general",
      "x".repeat(1_000_000),
      "__proto__",
      1,
      null,
      {},
    ]) {
      expect(resolveFiscalNotificationOfficialSourceV2(invalid)).toBeNull();
    }
  });

  it("contains no runtime network, AI, persistence, PII or retained legal text", () => {
    const source = readFileSync(
      new URL("./official-sources.v2.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|WebSocket|OpenAI|Anthropic|localStorage|sessionStorage|indexedDB|Date\.now|new Date|Math\.random|ownerScope|documentId|taxId|\bCSV\b|\bIBAN\b|tax-engine/iu,
    );
  });
});
