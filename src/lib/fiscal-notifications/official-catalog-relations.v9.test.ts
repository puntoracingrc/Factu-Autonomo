import { describe, expect, it } from "vitest";
import {
  AEAT_OFFICIAL_CATALOG_CHAINS_V9,
  reconcileAeatOfficialCatalogRelationsV9,
  type AeatOfficialCatalogRelationDocumentV9,
} from "./official-catalog-relations.v9";

const REF_A = "a".repeat(64);
const CONTEXT_B = "b".repeat(64);

function document(input: Partial<AeatOfficialCatalogRelationDocumentV9> & Pick<AeatOfficialCatalogRelationDocumentV9, "documentId" | "familyId">): AeatOfficialCatalogRelationDocumentV9 {
  return Object.freeze({
    ownerScope: "owner-v9",
    referenceFingerprints: Object.freeze({}),
    contextFingerprints: Object.freeze({}),
    ...input,
  });
}

describe("AEAT official catalog relations v9", () => {
  it("registers the 11 declared direct chains without inventing transitive edges", () => {
    expect(AEAT_OFFICIAL_CATALOG_CHAINS_V9).toHaveLength(11);
    expect(new Set(AEAT_OFFICIAL_CATALOG_CHAINS_V9.map((item) => item.id)).size).toBe(11);
    const relations = reconcileAeatOfficialCatalogRelationsV9([
      document({
        documentId: "request",
        familyId: "assessment.rectification_request",
        referenceFingerprints: { PROCEDURE_ID: REF_A },
      }),
      document({
        documentId: "requirement",
        familyId: "assessment.rectification_requirement",
        referenceFingerprints: { PROCEDURE_ID: REF_A },
      }),
      document({
        documentId: "proposal",
        familyId: "assessment.rectification_proposal",
        referenceFingerprints: { PROCEDURE_ID: REF_A },
      }),
    ]);
    expect(relations.map((item) => `${item.fromDocumentId}->${item.toDocumentId}`)).toEqual([
      "request->requirement",
      "requirement->proposal",
    ]);
    expect(relations.every((item) => item.status === "SYSTEM_CONFIRMED_EXACT")).toBe(true);
    expect(relations.every((item) => item.autoMaterialization === false)).toBe(true);
  });

  it("uses exact compatible reference fingerprints for exact links", () => {
    const relations = reconcileAeatOfficialCatalogRelationsV9([
      document({
        documentId: "extension-request",
        familyId: "procedure.deadline_extension_request",
        referenceFingerprints: { PROCEDURE_ID: REF_A },
      }),
      document({
        documentId: "extension-decision",
        familyId: "procedure.deadline_extension_decision",
        referenceFingerprints: { PROCEDURE_ID: REF_A },
      }),
    ]);
    expect(relations).toHaveLength(1);
    expect(relations[0]).toMatchObject({
      chainId: "V9-C03",
      status: "SYSTEM_CONFIRMED_EXACT",
      matchingReferenceFieldIds: ["PROCEDURE_ID"],
    });
  });

  it("keeps model, period, date and amount matches suggested only", () => {
    const relations = reconcileAeatOfficialCatalogRelationsV9([
      document({
        documentId: "certificate",
        familyId: "certificate.specialized",
        contextFingerprints: { DOCUMENT_DATE: CONTEXT_B },
      }),
      document({
        documentId: "certificate-correction",
        familyId: "certificate.correction_or_disagreement",
        contextFingerprints: { DOCUMENT_DATE: CONTEXT_B },
      }),
    ]);
    expect(relations).toHaveLength(1);
    expect(relations[0]?.status).toBe("SUGGESTED");
    expect(relations[0]?.matchingReferenceFieldIds).toEqual([]);
    expect(relations[0]?.requiresHumanReview).toBe(true);
  });

  it("does not suggest by family adjacency alone or across owners", () => {
    const noContext = reconcileAeatOfficialCatalogRelationsV9([
      document({ documentId: "power", familyId: "representation.power_registration" }),
      document({ documentId: "change", familyId: "representation.power_change" }),
    ]);
    expect(noContext).toEqual([]);

    const crossOwner = reconcileAeatOfficialCatalogRelationsV9([
      document({
        documentId: "power",
        familyId: "representation.power_registration",
        referenceFingerprints: { REGISTRY_ID: REF_A },
      }),
      document({
        documentId: "change",
        ownerScope: "different-owner",
        familyId: "representation.power_change",
        referenceFingerprints: { REGISTRY_ID: REF_A },
      }),
    ]);
    expect(crossOwner).toEqual([]);
  });

  it("is idempotent and never returns protected reference values", () => {
    const input = [
      document({
        documentId: "auction",
        familyId: "collection.auction_announcement",
        referenceFingerprints: { AUCTION_ID: REF_A },
      }),
      document({
        documentId: "release",
        familyId: "collection.auction_suspension_or_release",
        referenceFingerprints: { AUCTION_ID: REF_A },
      }),
    ];
    const first = reconcileAeatOfficialCatalogRelationsV9(input);
    const replay = reconcileAeatOfficialCatalogRelationsV9(input);
    expect(replay).toEqual(first);
    expect(JSON.stringify(first)).not.toContain(REF_A);
  });

  it("rejects raw references and unsupported suggestion fields", () => {
    expect(() => reconcileAeatOfficialCatalogRelationsV9([
      document({
        documentId: "unsafe",
        familyId: "certificate.specialized",
        referenceFingerprints: { CERTIFICATE_ID: "REAL-REFERENCE" },
      }),
    ])).toThrow("AEAT_OFFICIAL_CATALOG_RELATION_V9_INVALID");
    expect(() => reconcileAeatOfficialCatalogRelationsV9([
      document({
        documentId: "unsafe-context",
        familyId: "certificate.specialized",
        contextFingerprints: { PERSON_NAME: CONTEXT_B },
      }),
    ])).toThrow("AEAT_OFFICIAL_CATALOG_RELATION_V9_INVALID");
  });

  it("rejects unknown keys and accessors without reading them", () => {
    expect(() => reconcileAeatOfficialCatalogRelationsV9([
      { ...document({ documentId: "extra", familyId: "certificate.specialized" }), hidden: true },
    ] as unknown as readonly AeatOfficialCatalogRelationDocumentV9[])).toThrow(
      "AEAT_OFFICIAL_CATALOG_RELATION_V9_INVALID",
    );
    let reads = 0;
    const unsafe = {
      ...document({ documentId: "getter", familyId: "certificate.specialized" }),
    } as unknown as Record<string, unknown>;
    Object.defineProperty(unsafe, "ownerScope", {
      enumerable: true,
      configurable: true,
      get() {
        reads += 1;
        return "owner-v9";
      },
    });
    expect(() => reconcileAeatOfficialCatalogRelationsV9([
      unsafe as unknown as AeatOfficialCatalogRelationDocumentV9,
    ])).toThrow("AEAT_OFFICIAL_CATALOG_RELATION_V9_INVALID");
    expect(reads).toBe(0);
  });
});
