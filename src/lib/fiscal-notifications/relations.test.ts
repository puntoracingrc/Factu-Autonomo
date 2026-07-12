import { describe, expect, it } from "vitest";
import { proposeWorkspaceEntityRelations } from "./relations";
import type {
  ExternalReference,
  FieldEvidence,
  FiscalNotificationsWorkspace,
} from "./types";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";

const OWNER = "guest:synthetic";
const NOW = "2026-08-01T10:00:00.000Z";

function workspaceFixture(
  count = 2,
  hashForIndex: (index: number) => string = () => "a".repeat(64),
): FiscalNotificationsWorkspace {
  return {
    schemaVersion: 1,
    workspaceId: "workspace-relations",
    ownerScope: OWNER,
    revision: 0,
    createdAt: NOW,
    updatedAt: NOW,
    packages: Array.from({ length: count }, (_, index) => ({
      id: `package-${index}`,
      ownerScope: OWNER,
      fileIds: [`file-${index}`],
      sourceChannel: "MANUAL_UPLOAD" as const,
      processingStatus: "CONFIRMED" as const,
      securityScanStatus: "PASSED" as const,
      uploadedAt: NOW,
    })),
    files: Array.from({ length: count }, (_, index) => ({
      id: `file-${index}`,
      packageId: `package-${index}`,
      ownerScope: OWNER,
      role: "PRIMARY" as const,
      originalFilename: `synthetic-${index}.pdf`,
      mimeType: "application/pdf",
      fileSize: 1,
      pageCount: 1,
      sha256: hashForIndex(index),
      contentFingerprint: (index % 10).toString().repeat(64),
      storageReference: `memory:synthetic-${index}`,
      uploadedAt: NOW,
      isImmutableOriginal: true as const,
    })),
    documents: Array.from({ length: count }, (_, index) => ({
      id: `document-${index}`,
      packageId: `package-${index}`,
      fileId: `file-${index}`,
      ownerScope: OWNER,
      documentType: "GENERIC_ADMINISTRATIVE_NOTICE" as const,
      titleRaw: "Documento sintético",
      titleNormalized: "DOCUMENTO SINTETICO",
      authorityId: "authority-aeat",
      notificationDates: {},
      status: "ACTIVE" as const,
      urgency: "REVIEW" as const,
      extractionVersion: "synthetic-v1",
      analysisStatus: "CONFIRMED" as const,
      humanReviewStatus: "CONFIRMED" as const,
      authenticityStatus: "NOT_CHECKED" as const,
      partIds: [],
      referenceIds: [],
      debtIds: [],
      caseIds: [],
      analysisSnapshotIds: [],
      createdAt: NOW,
      updatedAt: NOW,
    })),
    parts: [],
    authorities: [
      {
        id: "authority-aeat",
        ownerScope: OWNER,
        administrationType: "AEAT",
        nameRaw: "Organismo sintético",
        nameNormalized: "ORGANISMO SINTETICO",
      },
    ],
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

function addConfirmedReference(
  workspace: FiscalNotificationsWorkspace,
  documentIndex: number,
  normalizedValue: string,
  status: ExternalReference["confirmationStatus"] = "CONFIRMED",
): void {
  const documentId = `document-${documentIndex}`;
  const referenceId = `reference-${documentIndex}`;
  const evidenceId = `evidence-${documentIndex}`;
  const evidence: FieldEvidence = {
    id: evidenceId,
    ownerScope: OWNER,
    documentId,
    pageNumber: 1,
    textSnippet: "Referencia sintética",
    extractionMethod: "USER",
    confidence: "EXACT",
    assertionType: "USER_CONFIRMED",
    confirmedAt: NOW,
    confirmedBy: "user-synthetic",
  };
  workspace.evidence.push(evidence);
  workspace.references.push({
    id: referenceId,
    ownerScope: OWNER,
    referenceType: "EXPEDIENT_NUMBER",
    rawValue: `RAW-PRIVATE-MARKER-${documentIndex}`,
    normalizedValue,
    issuer: "AEAT",
    scope: "DOCUMENT",
    documentId,
    isPrimary: true,
    confidence: "EXACT",
    confirmationStatus: status,
    extractionMethod: "USER",
    occurrenceIds: [evidenceId],
    createdAt: NOW,
  });
  workspace.documents[documentIndex]!.referenceIds.push(referenceId);
}

function expectValid(workspace: FiscalNotificationsWorkspace): void {
  expect(validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER)).toEqual({
    valid: true,
    issues: [],
  });
}

function propose(
  workspace: FiscalNotificationsWorkspace,
  documentIds = workspace.documents.map((item) => item.id),
) {
  return proposeWorkspaceEntityRelations({
    ownerScope: OWNER,
    workspace,
    documentIds,
    createdAt: NOW,
  });
}

describe("fiscal notification workspace relation adapter", () => {
  it("emits immutable file-level exact identity without leaking hashes", () => {
    const workspace = workspaceFixture();
    const before = structuredClone(workspace);
    expectValid(workspace);

    const result = propose(workspace);

    expect(workspace).toEqual(before);
    expect(result).toMatchObject({
      status: "COMPLETE",
      requiresHumanReview: false,
    });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      source: { id: "file-0", entityType: "FILE" },
      target: { id: "file-1", entityType: "FILE" },
      relationType: "EXACT_FILE_DUPLICATE",
      status: "SYSTEM_CONFIRMED_EXACT",
      requiresHumanReview: false,
      provenance: {
        matchingKeys: ["FILE_SHA256"],
        entityIds: ["file-0", "file-1"],
      },
    });
    expect(JSON.stringify(result)).not.toContain("a".repeat(64));
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.candidates)).toBe(true);
    expect(workspace.relations).toEqual([]);
  });

  it("keeps confirmed explicit references suggested with ID-only provenance", () => {
    const workspace = workspaceFixture(2, (index) =>
      (index + 1).toString().repeat(64),
    );
    addConfirmedReference(workspace, 0, "SYNTHETIC-CASE-001");
    addConfirmedReference(workspace, 1, "SYNTHETIC-CASE-001");
    expectValid(workspace);

    const result = propose(workspace);

    expect(result).toMatchObject({
      status: "COMPLETE",
      requiresHumanReview: true,
    });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      source: { id: "document-0", entityType: "DOCUMENT" },
      target: { id: "document-1", entityType: "DOCUMENT" },
      relationType: "POSSIBLY_RELATED",
      status: "SUGGESTED",
      requiresHumanReview: true,
      provenance: {
        matchingKeys: ["EXPEDIENT_NUMBER"],
        entityIds: [
          "evidence-0",
          "evidence-1",
          "reference-0",
          "reference-1",
        ],
      },
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("SYNTHETIC-CASE-001");
    expect(serialized).not.toContain("RAW-PRIVATE-MARKER");
  });

  it("ignores pending references and unrelated visual or monetary coincidences", () => {
    const workspace = workspaceFixture(2, (index) =>
      (index + 1).toString().repeat(64),
    );
    addConfirmedReference(workspace, 0, "SYNTHETIC-CASE-001", "PENDING");
    addConfirmedReference(workspace, 1, "SYNTHETIC-CASE-001", "PENDING");
    workspace.documents[0]!.issueDate = "2026-07-01";
    workspace.documents[1]!.issueDate = "2026-07-01";
    expectValid(workspace);

    expect(propose(workspace)).toMatchObject({
      status: "INFORMATION_PENDING",
      requiresHumanReview: true,
      reason: "NO_SUPPORTED_CONFIRMED_SIGNAL",
      candidates: [],
    });
  });

  it("rejects empty, padded and control-character reference values", () => {
    for (const value of ["", " PADDED ", "CASE\u0000VALUE"]) {
      const workspace = workspaceFixture(2, (index) =>
        (index + 1).toString().repeat(64),
      );
      addConfirmedReference(workspace, 0, value);
      addConfirmedReference(workspace, 1, value);
      const validation = validateFiscalNotificationsWorkspaceIntegrity(
        workspace,
        OWNER,
      );
      if (validation.valid) {
        expect(propose(workspace)).toEqual({
          status: "REVIEW_REQUIRED",
          requiresHumanReview: true,
          reason: "INVALID_CONFIRMED_REFERENCE",
          candidates: [],
        });
      } else {
        expect(() => propose(workspace)).toThrow(
          "FISCAL_NOTIFICATIONS_INVALID_WORKSPACE",
        );
      }
    }
  });

  it("uses a deterministic star for three or more exact duplicates", () => {
    const workspace = workspaceFixture(3);
    const forward = propose(workspace, [
      "document-0",
      "document-1",
      "document-2",
    ]);
    const reverse = propose(workspace, [
      "document-2",
      "document-1",
      "document-0",
    ]);

    expect(forward).toEqual(reverse);
    expect(forward.candidates.map((item) => [item.source.id, item.target.id])).toEqual([
      ["file-0", "file-1"],
      ["file-0", "file-2"],
    ]);
  });

  it("returns review-required with no partial output on ambiguity or limits", () => {
    const ambiguous = workspaceFixture(3, (index) =>
      (index + 1).toString().repeat(64),
    );
    addConfirmedReference(ambiguous, 0, "SYNTHETIC-CASE-001");
    addConfirmedReference(ambiguous, 1, "SYNTHETIC-CASE-001");
    addConfirmedReference(ambiguous, 2, "SYNTHETIC-CASE-001");
    expectValid(ambiguous);
    expect(propose(ambiguous)).toEqual({
      status: "REVIEW_REQUIRED",
      requiresHumanReview: true,
      reason: "AMBIGUOUS_EXPLICIT_REFERENCE",
      candidates: [],
    });

    const overLimit = workspaceFixture(1_002);
    expectValid(overLimit);
    expect(propose(overLimit)).toEqual({
      status: "REVIEW_REQUIRED",
      requiresHumanReview: true,
      reason: "CANDIDATE_LIMIT_EXCEEDED",
      candidates: [],
    });
  });

  it("fails closed for owner mismatch and clone descriptor loss", () => {
    const workspace = workspaceFixture();
    expect(() =>
      proposeWorkspaceEntityRelations({
        ownerScope: "guest:foreign",
        workspace,
        documentIds: ["document-0"],
        createdAt: NOW,
      }),
    ).toThrow("FISCAL_NOTIFICATIONS_OWNER_SCOPE_MISMATCH");

    const descriptorLoss = workspaceFixture();
    Object.defineProperty(descriptorLoss.documents[0]!, "issueDate", {
      value: "2026-07-01",
      enumerable: false,
      configurable: true,
      writable: true,
    });
    expectValid(descriptorLoss);
    expect(() => propose(descriptorLoss)).toThrow(
      "FISCAL_NOTIFICATIONS_INVALID_RELATION_INPUT",
    );

    const backdated = workspaceFixture();
    backdated.updatedAt = "2026-08-02T10:00:00.000Z";
    expectValid(backdated);
    expect(() => propose(backdated)).toThrow(
      "FISCAL_NOTIFICATIONS_NON_MONOTONIC_RELATION_EVALUATION",
    );

    const extendedYear = workspaceFixture();
    extendedYear.updatedAt = "+010000-01-01T00:00:00.000Z";
    expectValid(extendedYear);
    expect(() => propose(extendedYear)).toThrow(
      "FISCAL_NOTIFICATIONS_NON_MONOTONIC_RELATION_EVALUATION",
    );
  });

  it("rejects unknown keys and accessors without evaluating them", () => {
    const workspace = workspaceFixture();
    expect(() =>
      proposeWorkspaceEntityRelations({
        ownerScope: OWNER,
        workspace,
        documentIds: ["document-0"],
        createdAt: NOW,
        taxId: "synthetic-marker",
      } as WorkspaceRelationProposalInputWithUnknown),
    ).toThrow("FISCAL_NOTIFICATIONS_INVALID_RELATION_INPUT");

    let getterCalls = 0;
    const hostile: Record<string, unknown> = {
      ownerScope: OWNER,
      workspace,
      createdAt: NOW,
    };
    Object.defineProperty(hostile, "documentIds", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return ["document-0"];
      },
    });
    expect(() =>
      proposeWorkspaceEntityRelations(
        hostile as unknown as Parameters<
          typeof proposeWorkspaceEntityRelations
        >[0],
      ),
    ).toThrow("FISCAL_NOTIFICATIONS_INVALID_RELATION_INPUT");
    expect(getterCalls).toBe(0);
  });
});

type WorkspaceRelationProposalInputWithUnknown = Parameters<
  typeof proposeWorkspaceEntityRelations
>[0] & { taxId: string };
