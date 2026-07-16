import { describe, expect, it } from "vitest";
import {
  FISCAL_NOTIFICATIONS_WORKSPACE_MAX_COLLECTION_ITEMS_V2,
  parseFiscalNotificationsWorkspaceForPersistenceV2,
  type FiscalNotificationsPersistedWorkspaceV2,
} from "./persisted-workspace.v2";

const OWNER = "user:00000000-0000-4000-8000-000000000061";
const OTHER_OWNER = "user:00000000-0000-4000-8000-000000000062";
const NOW = "2026-07-16T08:00:00.000Z";

function workspace(): FiscalNotificationsPersistedWorkspaceV2 {
  return {
    schemaVersion: 2,
    workspaceId: "workspace:v2:synthetic",
    ownerScope: OWNER,
    revision: 1,
    createdAt: NOW,
    updatedAt: NOW,
    accountHolder: {
      ownerScope: OWNER,
      role: "ACCOUNT_HOLDER",
      identityMatchStatus: "MATCH",
      identityMatchMethod: "TAX_ID",
    },
    documents: [
      {
        id: "document:synthetic:1",
        ownerScope: OWNER,
        familyId: "collection.offset_requested",
        legacyDocumentType: "AEAT_OFFSET_AGREEMENT",
        recognitionStatus: "EXACT_FAMILY",
        issuerCode: "AEAT",
        reviewStatus: "CONFIRMED",
        chronologyDate: "2026-06-30",
        chronologyBasis: "ISSUE_DATE",
        dateFactIds: ["date:synthetic:1"],
        referenceIds: ["reference:synthetic:1"],
        amountFactIds: ["amount:synthetic:1"],
        factIds: ["fact:synthetic:1"],
        evidenceIds: ["evidence:synthetic:1"],
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    references: [
      {
        id: "reference:synthetic:1",
        ownerScope: OWNER,
        documentId: "document:synthetic:1",
        referenceType: "LIQUIDATION_KEY",
        issuerCode: "AEAT",
        value: {
          storage: "NORMALIZED_REFERENCE",
          normalizedValue: "A0000SYNTHETIC",
        },
        assertionType: "EXPLICIT_IN_DOCUMENT",
        evidenceIds: ["evidence:synthetic:1"],
      },
    ],
    dates: [
      {
        id: "date:synthetic:1",
        ownerScope: OWNER,
        documentId: "document:synthetic:1",
        fieldId: "ISSUE_DATE",
        kind: "ISSUE_DATE",
        value: "2026-06-30",
        assertionType: "EXPLICIT_IN_DOCUMENT",
        evidenceIds: ["evidence:synthetic:1"],
      },
    ],
    amounts: [
      {
        id: "amount:synthetic:1",
        ownerScope: OWNER,
        documentId: "document:synthetic:1",
        fieldId: "TOTAL_AMOUNT",
        componentType: "TOTAL_DEBT",
        amountCents: 163_295,
        currency: "EUR",
        assertionType: "EXPLICIT_IN_DOCUMENT",
        evidenceIds: ["evidence:synthetic:1"],
      },
    ],
    facts: [
      {
        id: "fact:synthetic:1",
        ownerScope: OWNER,
        documentId: "document:synthetic:1",
        fieldId: "DEBT_STATE",
        valueType: "STATE",
        stateValue: "EXTINGUISHED",
        assertionType: "EXPLICIT_IN_DOCUMENT",
        evidenceIds: ["evidence:synthetic:1"],
      },
    ],
    evidence: [
      {
        id: "evidence:synthetic:1",
        ownerScope: OWNER,
        documentId: "document:synthetic:1",
        fieldId: "TOTAL_AMOUNT",
        page: 1,
        locator: { kind: "PAGE" },
        extractionMethod: "RULE",
        confidence: "EXACT",
        rule: { id: "AEAT_OFFSET_TOTAL", version: "2.0.0" },
        assertionType: "EXPLICIT_IN_DOCUMENT",
      },
    ],
    thirdParties: [
      {
        id: "third-party:synthetic:1",
        ownerScope: OWNER,
        documentId: "document:synthetic:1",
        kind: "PUBLIC_BODY",
        role: "PAYER",
        ordinal: 1,
        obligationDirection: "IS_OWED",
        amountCents: 163_295,
        relevantDate: "2026-06-30",
        state: "COMPLETED",
        consequence: "RELEASE_RECORDED",
        evidenceIds: ["evidence:synthetic:1"],
      },
    ],
    relations: [],
    driveArchives: [
      {
        id: "drive-archive:synthetic:1",
        ownerScope: OWNER,
        documentIds: ["document:synthetic:1"],
        sourceSha256: "b".repeat(64),
        driveFileId: "drive_file_synthetic_1",
        driveFolderId: "drive_folder_synthetic_1",
        documentDate: "2026-06-30",
        archiveStatus: "ARCHIVED_VERIFIED",
        reviewStatus: "USER_CONFIRMED",
        verificationMethod: "SHA256_READBACK_MATCH",
        archivedAt: NOW,
      },
    ],
  };
}

function workspaceWithExactRelation(
  relationType: string,
): FiscalNotificationsPersistedWorkspaceV2 {
  const value = workspace();
  value.documents.push({
    ...value.documents[0]!,
    id: "document:synthetic:2",
    chronologyDate: null,
    chronologyBasis: null,
    dateFactIds: [],
    referenceIds: ["reference:synthetic:2"],
    amountFactIds: [],
    factIds: [],
    evidenceIds: [],
  });
  value.references.push({
    ...value.references[0]!,
    id: "reference:synthetic:2",
    documentId: "document:synthetic:2",
    evidenceIds: [],
  });
  value.relations.push({
    id: "relation:synthetic:1",
    ownerScope: OWNER,
    sourceDocumentId: "document:synthetic:1",
    targetDocumentId: "document:synthetic:2",
    relationType,
    status: "SYSTEM_CONFIRMED_EXACT",
    exactReferenceIds: [
      "reference:synthetic:1",
      "reference:synthetic:2",
    ],
    contextualDateFactIds: [],
    contextualAmountFactIds: [],
    algorithmVersion: "synthetic-v2",
    createdAt: NOW,
  });
  return value;
}

describe("persisted fiscal notifications workspace v2", () => {
  it("accepts canonical UUIDv7 and synthetic opaque owner scopes", () => {
    for (const ownerScope of [
      "user:019f7e00-0000-7000-8000-000000000001",
      "user:synthetic-owner",
    ]) {
      const candidate = JSON.parse(
        JSON.stringify(workspace()).replaceAll(OWNER, ownerScope),
      ) as FiscalNotificationsPersistedWorkspaceV2;
      expect(
        parseFiscalNotificationsWorkspaceForPersistenceV2(
          candidate,
          ownerScope,
        ),
      ).not.toBeNull();
    }
  });

  it("rejects false exactness for every legacy-only relation at the direct boundary", () => {
    expect(
      parseFiscalNotificationsWorkspaceForPersistenceV2(
        workspaceWithExactRelation("RESOLVES"),
        OWNER,
      ),
    ).not.toBeNull();
    for (const relationType of [
      "BELONGS_TO_CASE",
      "DUPLICATE_COPY_OF",
      "RELATED_TO_PAYMENT_PLAN",
      "RELATED_TO_INSTALLMENT",
      "POSSIBLY_RELATED",
    ]) {
      expect(
        parseFiscalNotificationsWorkspaceForPersistenceV2(
          workspaceWithExactRelation(relationType),
          OWNER,
        ),
      ).toBeNull();
    }
  });

  it("returns a deeply frozen defensive copy with no free-text/PII fields", () => {
    const input = workspace();
    const before = structuredClone(input);
    const parsed = parseFiscalNotificationsWorkspaceForPersistenceV2(
      input,
      OWNER,
    );

    expect(parsed).toEqual(before);
    expect(parsed).not.toBe(input);
    expect(parsed?.documents).not.toBe(input.documents);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed?.documents)).toBe(true);
    expect(Object.isFrozen(parsed?.documents[0])).toBe(true);
    expect(input).toEqual(before);
    expect(JSON.stringify(parsed)).not.toMatch(
      /displayName|taxId|nif|address|iban|rawValue|textSnippet|valueRaw|titleRaw|textNormalized|plainLanguage|originalFilename/iu,
    );
  });

  it.each([
    [
      "root",
      (candidate: Record<string, unknown>) => (candidate.rawText = "private"),
    ],
    [
      "document",
      (candidate: Record<string, unknown>) =>
        ((candidate.documents as Record<string, unknown>[])[0]!.titleRaw =
          "private"),
    ],
    [
      "evidence",
      (candidate: Record<string, unknown>) =>
        ((candidate.evidence as Record<string, unknown>[])[0]!.textSnippet =
          "private"),
    ],
    [
      "reference",
      (candidate: Record<string, unknown>) =>
        ((
          (candidate.references as Record<string, unknown>[])[0]!
            .value as Record<string, unknown>
        ).rawValue = "private"),
    ],
    [
      "third party",
      (candidate: Record<string, unknown>) =>
        ((candidate.thirdParties as Record<string, unknown>[])[0]!.nif =
          "00000000T"),
    ],
  ])("rejects unknown or PII-like keys at %s level", (_label, mutate) => {
    const candidate = structuredClone(workspace()) as unknown as Record<
      string,
      unknown
    >;
    mutate(candidate);
    expect(
      parseFiscalNotificationsWorkspaceForPersistenceV2(candidate, OWNER),
    ).toBeNull();
  });

  it("rejects cross-owner, unsafe cents and dangling/cross-document links", () => {
    const crossOwner = workspace();
    crossOwner.references[0]!.ownerScope = OTHER_OWNER;
    expect(
      parseFiscalNotificationsWorkspaceForPersistenceV2(crossOwner, OWNER),
    ).toBeNull();

    const unsafe = workspace();
    unsafe.amounts[0]!.amountCents = Number.MAX_SAFE_INTEGER + 1;
    expect(
      parseFiscalNotificationsWorkspaceForPersistenceV2(unsafe, OWNER),
    ).toBeNull();

    const dangling = workspace();
    dangling.documents[0]!.referenceIds = ["reference:missing"];
    expect(
      parseFiscalNotificationsWorkspaceForPersistenceV2(dangling, OWNER),
    ).toBeNull();

    const hiddenReference = workspace();
    hiddenReference.documents[0]!.referenceIds = [];
    expect(
      parseFiscalNotificationsWorkspaceForPersistenceV2(hiddenReference, OWNER),
    ).toBeNull();

    for (const piiOwner of [
      "user:00000000T",
      "user:ES0000000000000000000000",
    ]) {
      expect(
        parseFiscalNotificationsWorkspaceForPersistenceV2(
          workspace(),
          piiOwner,
        ),
      ).toBeNull();
    }

    const badChronology = workspace();
    badChronology.documents[0]!.chronologyDate = "2026-07-01";
    expect(
      parseFiscalNotificationsWorkspaceForPersistenceV2(badChronology, OWNER),
    ).toBeNull();

    const impossibleDate = workspace();
    impossibleDate.dates[0]!.value = "2026-02-31";
    impossibleDate.documents[0]!.chronologyDate = "2026-02-31";
    expect(
      parseFiscalNotificationsWorkspaceForPersistenceV2(impossibleDate, OWNER),
    ).toBeNull();

    const piiInTechnicalField = workspace() as unknown as Record<
      string,
      unknown
    >;
    (piiInTechnicalField.documents as Record<string, unknown>[])[0]!.familyId =
      "00000000T";
    expect(
      parseFiscalNotificationsWorkspaceForPersistenceV2(
        piiInTechnicalField,
        OWNER,
      ),
    ).toBeNull();

    const piiInOpaqueId = workspace();
    piiInOpaqueId.documents[0]!.id = "document:00000000T";
    expect(
      parseFiscalNotificationsWorkspaceForPersistenceV2(piiInOpaqueId, OWNER),
    ).toBeNull();
  });

  it("rejects oversized collections before traversing their entries", () => {
    const candidate = workspace() as unknown as Record<string, unknown>;
    candidate.documents = new Array(
      FISCAL_NOTIFICATIONS_WORKSPACE_MAX_COLLECTION_ITEMS_V2 + 1,
    ).fill(null);
    expect(
      parseFiscalNotificationsWorkspaceForPersistenceV2(candidate, OWNER),
    ).toBeNull();
  });

  it("rejects accessors without invoking them or exposing their values", () => {
    const candidate = workspace() as unknown as Record<string, unknown>;
    let invoked = false;
    Object.defineProperty(candidate, "rawText", {
      enumerable: true,
      get() {
        invoked = true;
        return "private";
      },
    });
    expect(
      parseFiscalNotificationsWorkspaceForPersistenceV2(candidate, OWNER),
    ).toBeNull();
    expect(invoked).toBe(false);
  });

  it("rejects hostile collection methods and element accessors before traversal", () => {
    const ownMap = workspace() as unknown as Record<string, unknown>;
    (ownMap.documents as unknown[] & { map: () => unknown[] }).map = () => [];
    expect(
      parseFiscalNotificationsWorkspaceForPersistenceV2(ownMap, OWNER),
    ).toBeNull();

    const elementAccessor = workspace() as unknown as Record<string, unknown>;
    const documents = elementAccessor.documents as unknown[];
    let invoked = false;
    Object.defineProperty(documents, "0", {
      enumerable: true,
      configurable: true,
      get() {
        invoked = true;
        return workspace().documents[0];
      },
    });
    expect(
      parseFiscalNotificationsWorkspaceForPersistenceV2(
        elementAccessor,
        OWNER,
      ),
    ).toBeNull();
    expect(invoked).toBe(false);
  });
});
