import { describe, expect, it } from "vitest";
import type { FiscalNotificationsWorkspace } from "./types";
import {
  FISCAL_NOTIFICATIONS_WORKSPACE_MAX_SERIALIZED_BYTES_V1,
  compareFiscalNotificationsWorkspacesV1,
  fiscalNotificationsOwnerScopeForUserIdV1,
  mergeFiscalNotificationsWorkspacesV1,
  parseFiscalNotificationsWorkspaceForPersistenceV1,
} from "./workspace-persistence.v1";

const OWNER = "user:00000000-0000-4000-8000-000000000001";
const OTHER_OWNER = "user:00000000-0000-4000-8000-000000000002";
const CREATED_AT = "2026-07-14T09:00:00.000Z";

function workspace(): FiscalNotificationsWorkspace {
  return {
    schemaVersion: 1,
    workspaceId: "fiscal-notifications-workspace-v1",
    ownerScope: OWNER,
    revision: 0,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    packages: [],
    files: [],
    documents: [],
    parts: [],
    authorities: [],
    references: [],
    evidence: [],
    debts: [],
    debtObservations: [],
    cases: [],
    relations: [],
    analysisSnapshots: [],
    paymentOptions: [],
    paymentPlans: [],
    installments: [],
    interestCalculations: [],
    deadlineRules: [],
    obligations: [],
    timeline: [],
    accountingDrafts: [],
    auditEvents: [],
  };
}

function advancedWorkspace(): FiscalNotificationsWorkspace {
  return {
    ...workspace(),
    revision: 1,
    updatedAt: "2026-07-14T09:01:00.000Z",
    packages: [
      {
        id: "package-synthetic",
        ownerScope: OWNER,
        fileIds: [],
        sourceChannel: "MANUAL_UPLOAD",
        processingStatus: "NEEDS_REVIEW",
        securityScanStatus: "NOT_AVAILABLE",
        uploadedAt: CREATED_AT,
      },
    ],
  };
}

describe("fiscal notifications workspace persistence v1", () => {
  it("uses the same canonical owner contract for UUIDv7 and synthetic tests", () => {
    const uuidV7 = "019f7e00-0000-7000-8000-000000000001";
    expect(fiscalNotificationsOwnerScopeForUserIdV1(uuidV7)).toBe(
      `user:${uuidV7}`,
    );
    expect(fiscalNotificationsOwnerScopeForUserIdV1("synthetic-owner")).toBe(
      "user:synthetic-owner",
    );
    expect(fiscalNotificationsOwnerScopeForUserIdV1(uuidV7.toUpperCase())).toBeNull();
    expect(fiscalNotificationsOwnerScopeForUserIdV1("00000000T")).toBeNull();

    const candidate = workspace();
    candidate.ownerScope = `user:${uuidV7}`;
    expect(
      parseFiscalNotificationsWorkspaceForPersistenceV1(
        candidate,
        `user:${uuidV7}`,
      ),
    ).not.toBeNull();
  });

  it("returns a validated defensive copy without mutating the input", () => {
    const input = advancedWorkspace();
    const before = structuredClone(input);
    const parsed = parseFiscalNotificationsWorkspaceForPersistenceV1(
      input,
      OWNER,
    );

    expect(parsed).toEqual(before);
    expect(parsed).not.toBe(input);
    expect(parsed?.packages).not.toBe(input.packages);
    expect(input).toEqual(before);
    parsed!.packages.push({
      ...parsed!.packages[0]!,
      id: "package-output-only",
    });
    expect(input.packages).toHaveLength(1);
  });

  it("rejects cross-owner, unknown and source-content-bearing payloads", () => {
    const crossOwner = advancedWorkspace();
    crossOwner.ownerScope = OTHER_OWNER;
    expect(
      parseFiscalNotificationsWorkspaceForPersistenceV1(crossOwner, OWNER),
    ).toBeNull();

    const unknown = advancedWorkspace() as unknown as Record<string, unknown>;
    unknown.rawPdfText = "sensitive raw content";
    expect(
      parseFiscalNotificationsWorkspaceForPersistenceV1(unknown, OWNER),
    ).toBeNull();

    const retained = advancedWorkspace();
    retained.files.push({
      id: "file-invalid",
      packageId: "package-synthetic",
      ownerScope: OWNER,
      role: "PRIMARY",
      mimeType: "application/pdf",
      fileSize: 100,
      pageCount: 1,
      sha256: "a".repeat(64),
      contentFingerprint: "a".repeat(64),
      sourceContentRetention: "NOT_RETAINED",
      uploadedAt: CREATED_AT,
      originalFilename: "private.pdf",
    } as never);
    retained.packages[0]!.fileIds.push("file-invalid");
    expect(
      parseFiscalNotificationsWorkspaceForPersistenceV1(retained, OWNER),
    ).toBeNull();

    const rawPart = advancedWorkspace();
    rawPart.parts.push({
      id: "part-raw",
      ownerScope: OWNER,
      documentId: "document-missing",
      type: "MAIN_ACT",
      pageStart: 1,
      pageEnd: 1,
      contentFingerprint: "b".repeat(64),
      textNormalized: "raw page text",
      isCanonical: true,
      evidenceIds: [],
    });
    expect(
      parseFiscalNotificationsWorkspaceForPersistenceV1(rawPart, OWNER),
    ).toBeNull();
  });

  it("classifies only immutable append-only advances as monotonic", () => {
    const current = workspace();
    const advanced = advancedWorkspace();
    expect(
      compareFiscalNotificationsWorkspacesV1(current, advanced, OWNER),
    ).toBe("INCOMING_ADVANCES");
    expect(
      compareFiscalNotificationsWorkspacesV1(advanced, current, OWNER),
    ).toBe("CURRENT_ADVANCES");
    expect(
      compareFiscalNotificationsWorkspacesV1(advanced, advanced, OWNER),
    ).toBe("EQUAL");

    const changedHistory = advancedWorkspace();
    changedHistory.packages[0]!.processingStatus = "CONFIRMED";
    expect(
      compareFiscalNotificationsWorkspacesV1(
        advanced,
        changedHistory,
        OWNER,
      ),
    ).toBe("DIVERGED");
  });

  it("keeps the newest monotonic workspace and refuses divergent merges", () => {
    const current = workspace();
    const advanced = advancedWorkspace();
    expect(mergeFiscalNotificationsWorkspacesV1(current, advanced, OWNER)).toEqual(
      advanced,
    );
    expect(mergeFiscalNotificationsWorkspacesV1(advanced, current, OWNER)).toEqual(
      advanced,
    );

    const divergent = advancedWorkspace();
    divergent.packages[0]!.id = "different-package";
    expect(
      mergeFiscalNotificationsWorkspacesV1(advanced, divergent, OWNER),
    ).toBeNull();
  });

  it("rejects oversized payloads before they can enter local or cloud storage", () => {
    const oversized = advancedWorkspace();
    const text = "x".repeat(400_000);
    oversized.authorities = Array.from({ length: 6 }, (_, index) => ({
      id: `authority-${index}`,
      ownerScope: OWNER,
      administrationType: "AEAT" as const,
      nameRaw: text,
      nameNormalized: text,
    }));
    expect(new TextEncoder().encode(JSON.stringify(oversized)).byteLength).toBeGreaterThan(
      FISCAL_NOTIFICATIONS_WORKSPACE_MAX_SERIALIZED_BYTES_V1,
    );
    expect(
      parseFiscalNotificationsWorkspaceForPersistenceV1(oversized, OWNER),
    ).toBeNull();
  });

  it("derives the opaque account scope without accepting invalid identifiers", () => {
    expect(
      fiscalNotificationsOwnerScopeForUserIdV1(
        "00000000-0000-4000-8000-000000000001",
      ),
    ).toBe(OWNER);
    expect(fiscalNotificationsOwnerScopeForUserIdV1(" bad-id")).toBeNull();
  });
});
