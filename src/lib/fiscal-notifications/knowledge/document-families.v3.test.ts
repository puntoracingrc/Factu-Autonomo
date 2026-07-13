import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2 } from "./document-families.v2";
import {
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_RELEASE_ID_V3,
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_SCHEMA_VERSION_V3,
  FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V3,
  FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3,
  resolveFiscalNotificationDocumentFamilyV3,
} from "./document-families.v3";
import {
  FISCAL_NOTIFICATION_ROI_OFFICIAL_SOURCE_IDS_V3,
  resolveFiscalNotificationOfficialSourceV3,
} from "./official-sources.v3";

const ROI_FAMILY_ID = "registry.tax_registration_resolution" as const;

describe("fiscal notification document family catalog v3", () => {
  it("preserves the complete v2 family inventory and release semantics", () => {
    expect(FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V3).toHaveLength(
      FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.length,
    );
    expect(FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3).toEqual(
      FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.map((family) => family.id),
    );
    for (const [
      index,
      familyV2,
    ] of FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.entries()) {
      const familyV3 = FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V3[index];
      const sourceIds =
        familyV2.id === ROI_FAMILY_ID
          ? [
              ...familyV2.sourceIds,
              ...FISCAL_NOTIFICATION_ROI_OFFICIAL_SOURCE_IDS_V3,
            ]
          : familyV2.sourceIds;
      expect(familyV3).toEqual({
        ...familyV2,
        schemaVersion: FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_SCHEMA_VERSION_V3,
        releaseId: FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_RELEASE_ID_V3,
        sourceIds,
        currentRoiStatusInferencePolicy: "PROHIBITED",
        viesStatusInferencePolicy: "PROHIBITED",
        agreementInterpretationPolicy:
          "DOCUMENT_EVIDENCE_AND_HUMAN_REVIEW_REQUIRED",
      });
    }
  });

  it("adds the ROI context sources only to the tax registration resolution", () => {
    for (const familyV2 of FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2) {
      const familyV3 = resolveFiscalNotificationDocumentFamilyV3(familyV2.id);
      const expectedSourceIds =
        familyV2.id === ROI_FAMILY_ID
          ? [
              ...familyV2.sourceIds,
              ...FISCAL_NOTIFICATION_ROI_OFFICIAL_SOURCE_IDS_V3,
            ]
          : familyV2.sourceIds;
      expect(familyV3?.sourceIds).toEqual(expectedSourceIds);
    }

    const roiFamily = resolveFiscalNotificationDocumentFamilyV3(ROI_FAMILY_ID);
    expect(roiFamily?.sourceIds).toEqual(
      expect.arrayContaining([
        "aeat.census.rectification",
        "boe.tax.general.law",
        "boe.tax.management_inspection.regulation",
        ...FISCAL_NOTIFICATION_ROI_OFFICIAL_SOURCE_IDS_V3,
      ]),
    );
    expect(
      roiFamily?.sourceIds.filter(
        (sourceId) => sourceId === "boe.tax.management_inspection.regulation",
      ),
    ).toHaveLength(1);
    for (const sourceId of FISCAL_NOTIFICATION_ROI_OFFICIAL_SOURCE_IDS_V3) {
      expect(resolveFiscalNotificationOfficialSourceV3(sourceId)).toMatchObject(
        {
          id: sourceId,
          usagePolicy: "CONTEXT_ONLY",
          legalReviewStatus: "LEGAL_REVIEW_PENDING",
        },
      );
      expect(
        FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V3.filter((family) =>
          family.sourceIds.includes(sourceId),
        ).map((family) => family.id),
      ).toEqual([ROI_FAMILY_ID]);
    }
  });

  it("prohibits status inference, agreement interpretation and activation", () => {
    for (const family of FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V3) {
      expect(family).toMatchObject({
        knowledgeUsage: "CONTEXT_ONLY",
        legalReviewStatus: "LEGAL_REVIEW_PENDING",
        templateVariantStatus: "NOT_REGISTERED",
        currentRoiStatusInferencePolicy: "PROHIBITED",
        viesStatusInferencePolicy: "PROHIBITED",
        agreementInterpretationPolicy:
          "DOCUMENT_EVIDENCE_AND_HUMAN_REVIEW_REQUIRED",
        operationalPolicy: "PROHIBITED_UNTIL_HUMAN_REVIEW",
        requiresHumanReview: true,
        permitsDebtCreation: false,
        permitsDeadlineCreation: false,
        permitsPaymentAction: false,
        permitsAccountingAction: false,
        permitsAutomaticRelationConfirmation: false,
      });
      expect(Object.isFrozen(family)).toBe(true);
      expect(Object.isFrozen(family.sourceIds)).toBe(true);
    }
  });

  it("does not mutate v2 and exposes immutable defensive source arrays", () => {
    const originalV2 = FISCAL_NOTIFICATION_DOCUMENT_FAMILIES_V2.find(
      (family) => family.id === ROI_FAMILY_ID,
    );
    const v3 = resolveFiscalNotificationDocumentFamilyV3(ROI_FAMILY_ID);
    expect(originalV2?.sourceIds).not.toEqual(v3?.sourceIds);
    expect(originalV2?.sourceIds).not.toEqual(
      expect.arrayContaining([
        ...FISCAL_NOTIFICATION_ROI_OFFICIAL_SOURCE_IDS_V3,
      ]),
    );
    expect(Reflect.set(v3?.sourceIds ?? [], "0", "private.mutation")).toBe(
      false,
    );
    expect(
      resolveFiscalNotificationDocumentFamilyV3(ROI_FAMILY_ID)?.sourceIds,
    ).toEqual(v3?.sourceIds);
  });

  it("resolves exact IDs and fails closed for unknown or malformed input", () => {
    expect(
      resolveFiscalNotificationDocumentFamilyV3(ROI_FAMILY_ID),
    ).toMatchObject({ id: ROI_FAMILY_ID });
    for (const invalid of [
      ` ${ROI_FAMILY_ID}`,
      ROI_FAMILY_ID.toUpperCase(),
      "registry.tax_\u0000registration_resolution",
      "registry.roi_status",
      "x".repeat(1_000_000),
      "__proto__",
      1,
      null,
      {},
    ]) {
      expect(resolveFiscalNotificationDocumentFamilyV3(invalid)).toBeNull();
    }
  });

  it("contains no runtime network, AI, persistence, PII or materializer", () => {
    const source = readFileSync(
      new URL("./document-families.v3.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|WebSocket|OpenAI|Anthropic|localStorage|sessionStorage|indexedDB|Date\.now|new Date|Math\.random|ownerScope|documentId|taxId|\bCSV\b|\bIBAN\b|create.*(?:Debt|Deadline|Payment|Entry)|prepareAccountingDraft|reportInstallmentPayment/iu,
    );
  });
});
