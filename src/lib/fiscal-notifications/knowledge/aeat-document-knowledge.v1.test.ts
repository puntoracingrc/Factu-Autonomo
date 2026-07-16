import { describe, expect, it } from "vitest";
import rawKnowledgePackage from "./aeat-document-knowledge.v1.json";
import { FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3 } from "./document-families.v3";
import {
  AEAT_NOTIFICATIONS_CANONICAL_URL_V1,
  AEAT_DOCUMENT_CHAIN_IDS_V1,
  AEAT_DOCUMENT_CHAINS_V1,
  AEAT_DOCUMENT_KNOWLEDGE_V1,
  AEAT_DOCUMENT_OFFICIAL_SOURCE_IDS_V1,
  AEAT_DOCUMENT_OFFICIAL_SOURCES_V1,
  AEAT_DOCUMENT_PROFILES_V1,
  AEAT_DOCUMENT_PROFILE_IDS_V1,
  AEAT_DOCUMENT_RELATION_TYPE_IDS_V1,
  AEAT_DOCUMENT_RELATION_TYPES_V1,
  AeatDocumentKnowledgeValidationError,
  parseAeatDocumentKnowledgeV1,
  resolveAeatDocumentProfileV1,
} from "./aeat-document-knowledge.v1";

type MutableRecord = Record<string, unknown>;

function freshPackage(): MutableRecord {
  return structuredClone(rawKnowledgePackage) as unknown as MutableRecord;
}

function asRecord(value: unknown): MutableRecord {
  return value as MutableRecord;
}

function asArray(value: unknown): unknown[] {
  return value as unknown[];
}

function firstProfile(root: MutableRecord): MutableRecord {
  return asRecord(asArray(root.profiles)[0]);
}

function expectInvalid(
  mutate: (root: MutableRecord) => void,
  expectedPath: string,
): void {
  const candidate = freshPackage();
  mutate(candidate);
  try {
    parseAeatDocumentKnowledgeV1(candidate);
    throw new Error("expected parser to reject candidate");
  } catch (error) {
    expect(error).toBeInstanceOf(AeatDocumentKnowledgeValidationError);
    expect((error as Error).message).toContain(expectedPath);
    expect((error as Error).message).not.toContain(
      "SECRET_VALUE_NOT_FOR_ERRORS",
    );
  }
}

describe("AEAT document knowledge registry v1", () => {
  it("loads the exact canonical inventory without declaring extractors complete", () => {
    expect(AEAT_DOCUMENT_PROFILES_V1).toHaveLength(87);
    expect(Object.keys(AEAT_DOCUMENT_OFFICIAL_SOURCES_V1)).toHaveLength(50);
    expect(Object.keys(AEAT_DOCUMENT_RELATION_TYPES_V1)).toHaveLength(48);
    expect(AEAT_DOCUMENT_CHAINS_V1).toHaveLength(15);
    expect(AEAT_DOCUMENT_KNOWLEDGE_V1.meta).toMatchObject({
      profileCount: 87,
      sourceCount: 50,
      relationTypeCount: 48,
      chainCount: 15,
      containsRealPersonalData: false,
    });
    expect(
      AEAT_DOCUMENT_PROFILES_V1.every(
        (profile) => profile.extractorStatus === "NOT_IMPLEMENTED",
      ),
    ).toBe(true);
  });

  it("matches exactly the 87 family ids registered by catalog v3", () => {
    expect([...AEAT_DOCUMENT_PROFILE_IDS_V1].sort()).toEqual(
      [...FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3].sort(),
    );
    expect(new Set(AEAT_DOCUMENT_PROFILE_IDS_V1).size).toBe(87);
  });

  it("resolves only exact bounded family ids", () => {
    const id = "collection.enforcement_order";
    expect(resolveAeatDocumentProfileV1(id)).toBe(
      AEAT_DOCUMENT_PROFILES_V1.find((profile) => profile.id === id),
    );
    expect(resolveAeatDocumentProfileV1(` ${id}`)).toBeNull();
    expect(resolveAeatDocumentProfileV1(`${id}\u0000`)).toBeNull();
    expect(resolveAeatDocumentProfileV1("unknown.family")).toBeNull();
    expect(resolveAeatDocumentProfileV1(null)).toBeNull();
  });

  it("derives explicit neutral policies without inventing legal content", () => {
    const noChain = resolveAeatDocumentProfileV1(
      "identity.clave_registration_receipt",
    );
    expect(noChain?.chainRole).toEqual([]);
    expect(noChain?.relationPolicy).toBe("NO_AUTOMATIC_RELATION");

    const noConsequence = resolveAeatDocumentProfileV1(
      "information.tax_data_report",
    );
    expect(noConsequence?.plainLanguage.nonComplianceContext).toEqual([]);
    expect(noConsequence?.consequencePolicy).toBe("NOT_PROVEN_BY_DOCUMENT");

    const documented = resolveAeatDocumentProfileV1(
      "collection.enforcement_order",
    );
    expect(documented?.relationPolicy).toBe("DECLARED_CHAIN_ROLES_ONLY");
    expect(documented?.consequencePolicy).toBe("DOCUMENTED_CONTEXT_ONLY");
  });

  it("treats the document as primary and sources without purpose as official context", () => {
    expect(AEAT_DOCUMENT_OFFICIAL_SOURCES_V1.DOC_PRIMARY).toMatchObject({
      authority: "DOCUMENT",
      url: null,
      contextPolicy: "DOCUMENT_PRIMARY",
    });
    expect(AEAT_DOCUMENT_OFFICIAL_SOURCES_V1.LGT).toMatchObject({
      authority: "BOE",
      contextPolicy: "OFFICIAL_CONTEXT",
    });
    expect(AEAT_DOCUMENT_OFFICIAL_SOURCES_V1.LGT.purpose).toBeUndefined();
    expect(AEAT_DOCUMENT_OFFICIAL_SOURCES_V1.AEAT_NOTIFICATIONS.url).toBe(
      AEAT_NOTIFICATIONS_CANONICAL_URL_V1,
    );
  });

  it("returns a defensive immutable copy and never mutates parser inputs", () => {
    const input = freshPackage();
    const before = structuredClone(input);
    const parsed = parseAeatDocumentKnowledgeV1(input);
    expect(input).toEqual(before);
    expect(parsed).not.toBe(input);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.profiles)).toBe(true);
    expect(Object.isFrozen(parsed.profiles[0].plainLanguage.deadlineRule)).toBe(
      true,
    );
    expect(Object.isFrozen(parsed.officialSources.DOC_PRIMARY)).toBe(true);

    expect(() => {
      (parsed.profiles as unknown as MutableRecord[])[0].nameEs = "changed";
    }).toThrow();
    expect(
      parseAeatDocumentKnowledgeV1(freshPackage()).profiles[0].nameEs,
    ).toBe(AEAT_DOCUMENT_PROFILES_V1[0].nameEs);
  });

  it("rejects accessors and collection overrides without invoking them", () => {
    const accessor = freshPackage();
    let invoked = false;
    Object.defineProperty(asRecord(accessor.meta), "containsRealPersonalData", {
      enumerable: true,
      configurable: true,
      get() {
        invoked = true;
        return false;
      },
    });
    expect(() => parseAeatDocumentKnowledgeV1(accessor)).toThrow(
      AeatDocumentKnowledgeValidationError,
    );
    expect(invoked).toBe(false);

    const overridden = freshPackage();
    (overridden.profiles as unknown[] & { map: () => unknown[] }).map = () => [];
    expect(() => parseAeatDocumentKnowledgeV1(overridden)).toThrow(
      AeatDocumentKnowledgeValidationError,
    );
  });

  it("rejects unknown keys at every contract level", () => {
    expectInvalid((root) => {
      root.unexpected = true;
    }, "root.unexpected");
    expectInvalid((root) => {
      asRecord(root.globalPolicy).unexpected = true;
    }, "globalPolicy.unexpected");
    expectInvalid((root) => {
      asRecord(asRecord(root.globalPolicy).chronology).unexpected = true;
    }, "globalPolicy.chronology.unexpected");
    expectInvalid((root) => {
      firstProfile(root).taxId = "SECRET_VALUE_NOT_FOR_ERRORS";
    }, "profiles[0].taxId");
    expectInvalid((root) => {
      asRecord(firstProfile(root).plainLanguage).unexpected = true;
    }, "profiles[0].plainLanguage.unexpected");
    expectInvalid((root) => {
      asRecord(firstProfile(root).mustExtract).unexpected = true;
    }, "profiles[0].mustExtract.unexpected");
    expectInvalid((root) => {
      asRecord(asRecord(root.officialSources).LGT).unexpected = true;
    }, "officialSources.LGT.unexpected");
    expectInvalid((root) => {
      asRecord(asRecord(root.relationTypes).ANNEX_OF).unexpected = true;
    }, "relationTypes.ANNEX_OF.unexpected");
    expectInvalid((root) => {
      asRecord(asArray(root.documentChains)[0]).unexpected = true;
    }, "documentChains[0].unexpected");
    expectInvalid((root) => {
      const chain = asRecord(asArray(root.documentChains)[0]);
      asRecord(asArray(chain.edges)[0]).unexpected = true;
    }, "documentChains[0].edges[0].unexpected");
  });

  it("rejects inventory drift, duplicates and incomplete profiles", () => {
    expectInvalid((root) => {
      asRecord(root.meta).profileCount = 86;
    }, "meta.profileCount");
    expectInvalid((root) => {
      asArray(root.profiles).pop();
    }, "profiles");
    expectInvalid((root) => {
      firstProfile(root).id = asRecord(asArray(root.profiles)[1]).id;
    }, "profiles[1].id");
    expectInvalid((root) => {
      asRecord(firstProfile(root).plainLanguage).whatItIs = "";
    }, "profiles[0].plainLanguage.whatItIs");
    expectInvalid((root) => {
      asRecord(firstProfile(root).plainLanguage).notProvenByThisDocument = [];
    }, "profiles[0].plainLanguage.notProvenByThisDocument");
    expectInvalid((root) => {
      asRecord(firstProfile(root).mustExtract).references = [];
    }, "profiles[0].mustExtract.references");
    expectInvalid((root) => {
      asRecord(firstProfile(root).acceptanceTests).positive = [];
    }, "profiles[0].acceptanceTests.positive");
    expectInvalid((root) => {
      asRecord(firstProfile(root).acceptanceTests).negative = [];
    }, "profiles[0].acceptanceTests.negative");
  });

  it("rejects dangling source ids and malformed source URLs", () => {
    expectInvalid((root) => {
      asArray(firstProfile(root).officialSourceIds)[0] = "UNKNOWN_SOURCE";
    }, "profiles[0].officialSourceIds[0]");
    expectInvalid((root) => {
      asRecord(asRecord(root.officialSources).LGT).url = null;
    }, "officialSources.LGT.url");
    expectInvalid((root) => {
      asRecord(asRecord(root.officialSources).LGT).url = "ftp://example.test";
    }, "officialSources.LGT.url");
    expectInvalid((root) => {
      asRecord(asRecord(root.officialSources).DOC_PRIMARY).url =
        "https://example.test";
    }, "officialSources.DOC_PRIMARY.url");
    expectInvalid((root) => {
      delete asRecord(asRecord(root.officialSources).DOC_PRIMARY).purpose;
    }, "officialSources.DOC_PRIMARY.purpose");
    expectInvalid((root) => {
      asRecord(asRecord(root.officialSources).LGT).url =
        "https://evil.example/phish";
    }, "officialSources.LGT.url");
    expectInvalid((root) => {
      asRecord(asRecord(root.officialSources).LGT).url =
        "http://www.boe.es/buscar/act.php?id=BOE-A-2003-23186";
    }, "officialSources.LGT.url");
  });

  it("rejects personal identifiers in every sanitized free-text branch", () => {
    expectInvalid((root) => {
      asRecord(firstProfile(root).plainLanguage).whatItIs =
        "Documento para Ada Synthetic 00000000T";
    }, "root.profiles[0].plainLanguage.whatItIs");
    expectInvalid((root) => {
      asRecord(asArray(root.realCorpusLearningsSanitized)[0]).learning =
        "Cuenta ES00 0000 0000 0000 0000 0000";
    }, "root.realCorpusLearningsSanitized[0].learning");
  });

  it("accepts only closed relation types, chain roles and wildcards", () => {
    expectInvalid((root) => {
      asRecord(root.relationTypes).UNKNOWN_RELATION = {
        exactPhrase: "Exacta.",
        suggestedPhrase: "Sugerida.",
      };
    }, "relationTypes.UNKNOWN_RELATION");
    expectInvalid((root) => {
      const chain = asRecord(asArray(root.documentChains)[0]);
      asArray(chain.nodes)[0] = "ANY_UNREGISTERED_ACT";
    }, "documentChains[0].nodes[0]");
    expectInvalid((root) => {
      const chain = asRecord(asArray(root.documentChains)[0]);
      asRecord(asArray(chain.edges)[0]).relationType = "UNKNOWN_RELATION";
    }, "documentChains[0].edges[0].relationType");
    expectInvalid((root) => {
      const chain = asRecord(asArray(root.documentChains)[0]);
      asRecord(asArray(chain.edges)[0]).to = "payment.receipt";
    }, "documentChains[0].edges[0].to");
    expectInvalid((root) => {
      firstProfile(root).chainRole = ["SUCCESSOR_OF:ANY_UNREGISTERED_ACT"];
    }, "profiles[0].chainRole[0]");
    expectInvalid((root) => {
      firstProfile(root).chainRole = ["RELATION:UNKNOWN_RELATION"];
    }, "profiles[0].chainRole[0]");
  });

  it("rejects weakened global policies and invalid date metadata", () => {
    expectInvalid((root) => {
      asRecord(root.globalPolicy).networkAtScanTime = "ALLOWED";
    }, "globalPolicy.networkAtScanTime");
    expectInvalid((root) => {
      asRecord(root.globalPolicy).runtimeAIAtScanTime = "ALLOWED";
    }, "globalPolicy.runtimeAIAtScanTime");
    expectInvalid((root) => {
      asRecord(root.globalPolicy).humanReviewRequired = false;
    }, "globalPolicy.humanReviewRequired");
    expectInvalid((root) => {
      const chronology = asRecord(asRecord(root.globalPolicy).chronology);
      asArray(chronology.neverUseAsDocumentDate)[0] = "ISSUE_DATE";
    }, "globalPolicy.chronology.neverUseAsDocumentDate[0]");
    expectInvalid((root) => {
      const exactness = asRecord(
        asRecord(root.globalPolicy).relationshipExactness,
      );
      exactness.exactStatus = "SUGGESTED";
    }, "globalPolicy.relationshipExactness.exactStatus");
    expectInvalid((root) => {
      asRecord(root.meta).createdAt = "2026-02-31";
    }, "meta.createdAt");
  });

  it("exports fixed source and relation id registries", () => {
    expect(AEAT_DOCUMENT_OFFICIAL_SOURCE_IDS_V1).toHaveLength(50);
    expect(new Set(AEAT_DOCUMENT_OFFICIAL_SOURCE_IDS_V1).size).toBe(50);
    expect(AEAT_DOCUMENT_RELATION_TYPE_IDS_V1).toHaveLength(48);
    expect(new Set(AEAT_DOCUMENT_RELATION_TYPE_IDS_V1).size).toBe(48);
    expect(AEAT_DOCUMENT_CHAIN_IDS_V1).toHaveLength(15);
    expect(new Set(AEAT_DOCUMENT_CHAIN_IDS_V1).size).toBe(15);
  });
});
