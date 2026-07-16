import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AEAT_DOCUMENT_COMPLETION_GATE_V2,
  AEAT_DOCUMENT_COMPLETION_MANIFEST_V2,
  AEAT_DOCUMENT_EXECUTABLE_TEST_EVIDENCE_V2,
  AEAT_DOCUMENT_EXECUTABLE_TEST_REGISTRY_ID_V2,
  AEAT_DOCUMENT_SPECIALIZED_EXTRACTOR_TEST_EVIDENCE_V2,
  evaluateAeatDocumentCompletionGateV2,
  type AeatDocumentCompletionManifestV2,
} from "./completion-gate.v2";
import {
  FISCAL_NOTIFICATION_FAMILY_EXTRACTOR_BINDINGS_V1,
} from "../extractor-core/family-extractor-registry.v1";

type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
    : T;
type MutableManifest = Mutable<AeatDocumentCompletionManifestV2>;

function completeManifest(): AeatDocumentCompletionManifestV2 {
  return structuredClone(AEAT_DOCUMENT_COMPLETION_MANIFEST_V2);
}

function cloneManifest(): MutableManifest {
  return structuredClone(completeManifest()) as MutableManifest;
}

describe("AEAT document intelligence completion gate v2", () => {
  it("closes all 87 guides only with rule-backed executable recognition evidence", () => {
    const result = evaluateAeatDocumentCompletionGateV2(completeManifest());

    expect(result.status).toBe("GUIDES_EXPLAINED");
    expect(AEAT_DOCUMENT_COMPLETION_MANIFEST_V2.profiles).toHaveLength(87);
    expect(AEAT_DOCUMENT_COMPLETION_GATE_V2).toEqual(result);
    expect(result.guidesComplete).toBe(true);
    expect(result.recognitionComplete).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.implementationCounts).toEqual({
      automaticRecognition: 87,
      manualExactSelection: 0,
    });
    expect(result.counts).toEqual({
      profiles: 87,
      officialSources: 50,
      relationTypes: 48,
      documentChains: 15,
    });
    expect(result.profiles).toHaveLength(87);
    expect(
      new Set(result.profiles.map((profile) => profile.familyId)).size,
    ).toBe(87);
    expect(
      result.profiles.every(
        (profile) =>
          profile.guideStatus === "EXPLAINED" &&
          profile.explanationStatus === "FAMILY_EXPLANATION_IMPLEMENTED" &&
          Object.values(profile.testCoverage).every(
            (coverage) => coverage === "COVERED",
          ),
      ),
    ).toBe(true);
    const bindingCounts = Object.fromEntries(
      [
        "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY",
        "ADAPTER_REQUIRED",
        "CONTRACT_ONLY",
      ].map((status) => [
        status,
        FISCAL_NOTIFICATION_FAMILY_EXTRACTOR_BINDINGS_V1.filter(
          (binding) => binding.implementationStatus === status,
        ).length,
      ]),
    );
    expect(bindingCounts).toEqual({
      EXTRACTOR_IMPLEMENTED_REVIEW_ONLY: 87,
      ADAPTER_REQUIRED: 0,
      CONTRACT_ONLY: 0,
    });
    expect(
      result.profiles.filter(
        (profile) =>
          profile.extractionStatus === "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY",
      ),
    ).toHaveLength(87);
    expect(
      result.profiles.filter(
        (profile) =>
          profile.extractionStatus ===
          "MANUAL_EXACT_SELECTION_ADAPTER_REVIEW_ONLY",
      ),
    ).toHaveLength(0);
    expect(
      result.profiles.filter(
        (profile) =>
          profile.recognitionStatus ===
          "SPECIALIZED_RECOGNITION_IMPLEMENTED_REVIEW_ONLY",
      ),
    ).toHaveLength(87);
    expect(
      result.profiles.filter(
        (profile) =>
          profile.recognitionStatus === "MANUAL_EXACT_SELECTION_ONLY",
      ),
    ).toHaveLength(0);
    expect(JSON.stringify(result)).not.toMatch(/GENERIC_FALLBACK|PREPARATION/u);
  });

  it("accepts only the explicit no-relation policy for the profile that has no chain", () => {
    const result = evaluateAeatDocumentCompletionGateV2(completeManifest());
    const noRelation = result.profiles.filter(
      (profile) => profile.relationsStatus === "NO_AUTOMATIC_RELATION",
    );
    expect(noRelation).toHaveLength(1);
    expect(noRelation[0]?.guideStatus).toBe("EXPLAINED");
  });

  it.each([
    [
      "extractor",
      (manifest: MutableManifest) => {
        const profile = manifest.profiles[0]!;
        profile.extraction.status = "MISSING";
        profile.extraction.implementationId = null;
        profile.extraction.implementationVersion = null;
      },
      "EXTRACTION_MISSING",
    ],
    [
      "family explanation",
      (manifest: MutableManifest) => {
        manifest.profiles[0]!.explanation.status = "GENERIC_FALLBACK";
      },
      "EXPLANATION_GENERIC_OR_MISSING",
    ],
    [
      "official source",
      (manifest: MutableManifest) => {
        manifest.profiles[0]!.sources.sourceIds = [];
      },
      "SOURCES_MISSING_OR_INVALID",
    ],
    [
      "relation",
      (manifest: MutableManifest) => {
        const profile = manifest.profiles.find(
          (entry) => entry.relations.policy === "DECLARED_RELATIONS",
        )!;
        profile.relations.relationTypeIds = [];
      },
      "RELATIONS_MISSING_OR_INVALID",
    ],
  ] as const)(
    "fails closed when %s evidence is missing",
    (_label, mutate, code) => {
      const manifest = cloneManifest();
      mutate(manifest);
      const result = evaluateAeatDocumentCompletionGateV2(manifest);
      expect(result.status).toBe("INCOMPLETE");
      expect(result.guidesComplete).toBe(false);
      expect(result.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ code })]),
      );
      expect(
        result.profiles.some(
          (profile) => profile.guideStatus === "PREPARATION",
        ),
      ).toBe(true);
    },
  );

  it.each([
    "positiveTestIds",
    "negativeTestIds",
    "ambiguousTestIds",
    "incompleteTestIds",
  ] as const)("requires the %s matrix case", (key) => {
    const manifest = cloneManifest();
    manifest.profiles[0]!.testCoverage[key] = [];
    const result = evaluateAeatDocumentCompletionGateV2(manifest);
    expect(result.status).toBe("INCOMPLETE");
    expect(result.profiles[0]?.testCoverage).toMatchObject({
      [key.replace("TestIds", "")]: "MISSING",
    });
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "TEST_CASE_MISSING" }),
      ]),
    );
  });

  it("rejects a manifest that downgrades a rule-backed recognizer to manual selection", () => {
    const manifest = cloneManifest();
    manifest.profiles[0]!.recognition.claimedStatus =
      "MANUAL_EXACT_SELECTION_ONLY";
    const result = evaluateAeatDocumentCompletionGateV2(manifest);
    expect(result.profiles[0]).toMatchObject({
      recognitionStatus: "SPECIALIZED_RECOGNITION_IMPLEMENTED_REVIEW_ONLY",
      extractionStatus: "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY",
      guideStatus: "EXPLAINED",
    });
    expect(result.status).toBe("INCOMPLETE");
    expect(result.guidesComplete).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "RECOGNITION_CLAIM_NOT_SUPPORTED",
        }),
      ]),
    );
  });

  it("rejects an adapter claim for a profile-driven extractor", () => {
    const manifest = cloneManifest();
    const extractorBinding =
      FISCAL_NOTIFICATION_FAMILY_EXTRACTOR_BINDINGS_V1.find(
        (binding) =>
          binding.implementationStatus === "EXTRACTOR_IMPLEMENTED_REVIEW_ONLY",
      )!;
    const extractorProfile = manifest.profiles.find(
      (profile) => profile.familyId === extractorBinding.familyId,
    )!;
    extractorProfile.extraction = {
      status: "MANUAL_EXACT_SELECTION_ADAPTER_REVIEW_ONLY",
      implementationId: "profile-field-adapter:wrong-for-extractor",
      implementationVersion: "2.0.0",
    };

    const result = evaluateAeatDocumentCompletionGateV2(manifest);
    expect(
      result.profiles.find(
        (profile) => profile.familyId === extractorBinding.familyId,
      ),
    ).toMatchObject({
      recognitionStatus: "SPECIALIZED_RECOGNITION_IMPLEMENTED_REVIEW_ONLY",
      extractionStatus: "MISSING",
      guideStatus: "PREPARATION",
    });
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "EXTRACTION_MISSING" }),
      ]),
    );
  });

  it("requires the concrete recognition registry without changing the real binding status", () => {
    const manifest = cloneManifest();
    manifest.profiles[0]!.recognition.registryEvidenceId =
      "unrelated-registry.1.0.0";
    const result = evaluateAeatDocumentCompletionGateV2(manifest);
    expect(result.status).toBe("INCOMPLETE");
    expect(result.profiles[0]?.recognitionStatus).toBe(
      "SPECIALIZED_RECOGNITION_IMPLEMENTED_REVIEW_ONLY",
    );
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "RECOGNITION_REGISTRY_INVALID" }),
      ]),
    );
  });

  it("binds every accepted evidence id to a real executable suite and named case", () => {
    expect(AEAT_DOCUMENT_EXECUTABLE_TEST_EVIDENCE_V2).toHaveLength(33);
    expect(
      new Set(
        AEAT_DOCUMENT_EXECUTABLE_TEST_EVIDENCE_V2.map(
          (evidence) => evidence.evidenceId,
        ),
      ).size,
    ).toBe(AEAT_DOCUMENT_EXECUTABLE_TEST_EVIDENCE_V2.length);
    expect(
      Object.keys(AEAT_DOCUMENT_SPECIALIZED_EXTRACTOR_TEST_EVIDENCE_V2),
    ).toHaveLength(87);
    expect(
      new Set(
        Object.values(
          AEAT_DOCUMENT_SPECIALIZED_EXTRACTOR_TEST_EVIDENCE_V2,
        ).map((evidence) => evidence.evidenceId),
      ),
    ).toEqual(
      new Set(["test.profile-driven-extractor.v2.matrix.87-positive"]),
    );
    for (const evidence of AEAT_DOCUMENT_EXECUTABLE_TEST_EVIDENCE_V2) {
      expect(Object.isFrozen(evidence)).toBe(true);
      const suite = readFileSync(evidence.suitePath, "utf8");
      expect(suite, evidence.evidenceId).toContain(evidence.caseName);
    }
    expect(Object.isFrozen(AEAT_DOCUMENT_EXECUTABLE_TEST_EVIDENCE_V2)).toBe(
      true,
    );
    expect(() => {
      (
        AEAT_DOCUMENT_EXECUTABLE_TEST_EVIDENCE_V2[0] as {
          evidenceId: string;
        }
      ).evidenceId = "forged";
    }).toThrow();
  });

  it("rejects a self-generated acceptance manifest even when its ids look systematic", () => {
    const manifest = cloneManifest();
    const profile = manifest.profiles[0]!;
    profile.testCoverage.matrixId =
      `aeat-document-profile-tests:${profile.familyId}`;
    profile.testCoverage.positiveTestIds = [
      `knowledge:${profile.familyId}:positive:1`,
    ];
    profile.testCoverage.negativeTestIds = [
      `knowledge:${profile.familyId}:negative:1`,
    ];
    profile.testCoverage.ambiguousTestIds = [
      `profile-field-adapter:${profile.familyId}:ambiguous`,
    ];
    profile.testCoverage.incompleteTestIds = [
      `profile-field-adapter:${profile.familyId}:incomplete`,
    ];

    const result = evaluateAeatDocumentCompletionGateV2(manifest);
    expect(result.status).toBe("INCOMPLETE");
    expect(result.profiles[0]?.testCoverage).toEqual({
      positive: "MISSING",
      negative: "MISSING",
      ambiguous: "MISSING",
      incomplete: "MISSING",
    });
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "TEST_CASE_MISSING" }),
      ]),
    );
  });

  it("rejects adapter evidence substituted for the executable 87-family matrix", () => {
    const manifest = cloneManifest();
    const adapterEvidence = AEAT_DOCUMENT_EXECUTABLE_TEST_EVIDENCE_V2.find(
      (evidence) => evidence.scope === "EVERY_PROFILE_ADAPTER",
    )!;
    manifest.profiles[0]!.recognition.registryEvidenceId =
      adapterEvidence.evidenceId;
    manifest.profiles[0]!.testCoverage.positiveTestIds = [
      adapterEvidence.evidenceId,
    ];

    const result = evaluateAeatDocumentCompletionGateV2(manifest);
    expect(result.status).toBe("INCOMPLETE");
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "RECOGNITION_REGISTRY_INVALID" }),
        expect.objectContaining({ code: "TEST_CASE_MISSING" }),
      ]),
    );
  });

  it("uses one independent matrix id rather than a profile-generated one", () => {
    expect(
      AEAT_DOCUMENT_COMPLETION_MANIFEST_V2.profiles.every(
        (profile) =>
          profile.testCoverage.matrixId ===
          AEAT_DOCUMENT_EXECUTABLE_TEST_REGISTRY_ID_V2,
      ),
    ).toBe(true);
  });

  it("fails for missing/duplicate profiles and malformed count claims", () => {
    const missing = cloneManifest();
    missing.profiles = missing.profiles.slice(1);
    const missingResult = evaluateAeatDocumentCompletionGateV2(missing);
    expect(missingResult.status).toBe("INCOMPLETE");
    expect(missingResult.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MISSING_FAMILY" }),
      ]),
    );

    const duplicate = cloneManifest();
    duplicate.profiles = [
      ...duplicate.profiles.slice(0, -1),
      structuredClone(duplicate.profiles[0]!),
    ];
    const duplicateResult = evaluateAeatDocumentCompletionGateV2(duplicate);
    expect(duplicateResult.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DUPLICATE_FAMILY" }),
        expect.objectContaining({ code: "MISSING_FAMILY" }),
      ]),
    );

    const invalidCounts = cloneManifest() as unknown as Record<string, unknown>;
    (invalidCounts.expectedCounts as Record<string, unknown>).profiles = 86;
    expect(evaluateAeatDocumentCompletionGateV2(invalidCounts)).toMatchObject({
      status: "INCOMPLETE",
      profiles: [],
      issues: [{ code: "INVALID_MANIFEST", path: "manifest" }],
    });
  });

  it("rejects unknown keys/accessors and returns an immutable defensive graph", () => {
    const unknown = cloneManifest() as unknown as Record<string, unknown>;
    unknown.plainLanguage = "mere presence must not complete the gate";
    expect(evaluateAeatDocumentCompletionGateV2(unknown).status).toBe(
      "INCOMPLETE",
    );

    const accessor = cloneManifest() as unknown as Record<string, unknown>;
    let invoked = false;
    Object.defineProperty(accessor, "rawText", {
      enumerable: true,
      get() {
        invoked = true;
        return "private";
      },
    });
    expect(evaluateAeatDocumentCompletionGateV2(accessor).status).toBe(
      "INCOMPLETE",
    );
    expect(invoked).toBe(false);

    const nestedAccessor = cloneManifest() as unknown as Record<
      string,
      unknown
    >;
    const profiles = nestedAccessor.profiles as unknown[];
    let nestedInvoked = false;
    Object.defineProperty(profiles, "0", {
      enumerable: true,
      configurable: true,
      get() {
        nestedInvoked = true;
        return {};
      },
    });
    expect(evaluateAeatDocumentCompletionGateV2(nestedAccessor).status).toBe(
      "INCOMPLETE",
    );
    expect(nestedInvoked).toBe(false);

    const result = evaluateAeatDocumentCompletionGateV2(completeManifest());
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.profiles)).toBe(true);
    expect(Object.isFrozen(result.profiles[0])).toBe(true);
    expect(() => {
      (result.profiles as unknown as unknown[]).push({});
    }).toThrow();
    expect(evaluateAeatDocumentCompletionGateV2(completeManifest())).toEqual(
      result,
    );
  });
});
