import { describe, expect, it } from "vitest";
import {
  FISCAL_NOTIFICATION_KNOWLEDGE_GUIDANCE_PROJECTIONS_V2,
  resolveFiscalNotificationKnowledgeGuidanceV2,
} from "./knowledge-guidance-adapter.v2";
import { AEAT_DOCUMENT_PROFILES_V1 } from "../knowledge/aeat-document-knowledge.v1";

describe("fiscal notification knowledge guidance adapter v2", () => {
  it("projects an individual explanation for every canonical family", () => {
    expect(FISCAL_NOTIFICATION_KNOWLEDGE_GUIDANCE_PROJECTIONS_V2).toHaveLength(
      87,
    );
    expect(
      FISCAL_NOTIFICATION_KNOWLEDGE_GUIDANCE_PROJECTIONS_V2.map(
        (projection) => projection.familyId,
      ),
    ).toEqual(AEAT_DOCUMENT_PROFILES_V1.map((profile) => profile.id));

    for (const profile of AEAT_DOCUMENT_PROFILES_V1) {
      const projection = resolveFiscalNotificationKnowledgeGuidanceV2(
        profile.id,
      );
      expect(projection.guidance).toMatchObject({
        familyId: profile.id,
        profileId: profile.id,
        inShort: profile.plainLanguage.whatItIs,
        whyItUsuallyArrives: profile.plainLanguage.whyReceived,
        usualNextStep: profile.plainLanguage.nextStepRule,
        networkPolicy: "NO_RUNTIME_NETWORK",
        deadlinePolicy: "NEVER_CALCULATE_FROM_ISSUE_OR_SCAN_DATE",
      });
      expect(projection.guidance.keyPoints).toContain(
        profile.plainLanguage.resultRule,
      );
      expect(projection.guidance.inShort).not.toMatch(
        /catálogo registra|ficha en preparación|contexto genérico/iu,
      );
      expect(projection.sources.length).toBeGreaterThan(0);
    }
  });

  it("reports all 87 executable profile-driven recognizers without turning review into confirmation", () => {
    const automatic =
      FISCAL_NOTIFICATION_KNOWLEDGE_GUIDANCE_PROJECTIONS_V2.filter(
        (projection) =>
          projection.recognitionMode === "AUTOMATIC_REVIEW_ONLY",
      );
    const manual =
      FISCAL_NOTIFICATION_KNOWLEDGE_GUIDANCE_PROJECTIONS_V2.filter(
        (projection) => projection.recognitionMode === "MANUAL_REVIEW_ONLY",
      );
    expect(automatic).toHaveLength(87);
    expect(manual).toHaveLength(0);
    expect(
      resolveFiscalNotificationKnowledgeGuidanceV2(
        "collection.enforcement_order",
      ).recognitionStatus,
    ).toBe("SPECIALIZED_RECOGNITION_IMPLEMENTED_REVIEW_ONLY");
    expect(
      resolveFiscalNotificationKnowledgeGuidanceV2(
        "sanction.resolution",
      ).recognitionStatus,
    ).toBe("SPECIALIZED_RECOGNITION_IMPLEMENTED_REVIEW_ONLY");
  });

  it("uses only verified official links and keeps the runtime scan offline", () => {
    const notification = resolveFiscalNotificationKnowledgeGuidanceV2(
      "notification.delivery_attempt",
    );
    expect(
      notification.sources.find(
        (source) => source.sourceId === "AEAT_NOTIFICATIONS",
      ),
    ).toMatchObject({
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/ZN01.shtml",
      verificationStatus: "OFFICIAL_URL_VERIFIED",
    });
    for (const projection of FISCAL_NOTIFICATION_KNOWLEDGE_GUIDANCE_PROJECTIONS_V2) {
      expect(projection.guidance.networkPolicy).toBe("NO_RUNTIME_NETWORK");
      for (const source of projection.sources) {
        expect(source.canonicalUrl).toMatch(
          /^https:\/\/(?:www\.boe\.es|sede\.agenciatributaria\.gob\.es|clave\.gob\.es)\//u,
        );
      }
    }
  });
});
