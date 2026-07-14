import { describe, expect, it } from "vitest";
import { FISCAL_NOTIFICATION_INPUT_LIMITS } from "./input-contract";
import { createEmptyAdministrativeDomainProjection } from "./administrative-domain";
import type { FiscalNotificationsWorkspace } from "./types";
import {
  assertFiscalNotificationsWorkspaceIntegrity,
  validateFiscalNotificationsWorkspaceIntegrity,
} from "./workspace-integrity";

const OWNER = "guest:synthetic";
const NOW = "2026-07-12T10:00:00.000Z";

function empty(): FiscalNotificationsWorkspace {
  return {
    schemaVersion: 1,
    workspaceId: "workspace-synthetic",
    ownerScope: OWNER,
    revision: 0,
    createdAt: NOW,
    updatedAt: NOW,
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

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

describe("fiscal notifications workspace integrity", () => {
  it("accepts a legacy empty workspace without adding fields or mutating it", () => {
    const workspace = empty() as unknown as Record<string, unknown>;
    delete workspace.debtObservations;
    const before = structuredClone(workspace);

    expect(validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER)).toEqual({
      valid: true,
      issues: [],
    });
    expect(workspace).toEqual(before);
    deepFreeze(workspace);
    expect(() =>
      assertFiscalNotificationsWorkspaceIntegrity(workspace, OWNER),
    ).toThrowError();
    expect(workspace).toEqual(before);

    const complete = deepFreeze(empty());
    expect(() =>
      assertFiscalNotificationsWorkspaceIntegrity(complete, OWNER),
    ).not.toThrow();
  });

  it("fails closed for revoked roots and refuses to narrow mutable workspaces", () => {
    const mutable = empty();
    expect(validateFiscalNotificationsWorkspaceIntegrity(mutable, OWNER)).toEqual({
      valid: true,
      issues: [],
    });
    expect(() =>
      assertFiscalNotificationsWorkspaceIntegrity(mutable, OWNER),
    ).toThrowError();

    const revoked = Proxy.revocable(empty(), {});
    revoked.revoke();
    expect(() =>
      validateFiscalNotificationsWorkspaceIntegrity(revoked.proxy, OWNER),
    ).not.toThrow();
    expect(
      validateFiscalNotificationsWorkspaceIntegrity(revoked.proxy, OWNER),
    ).toEqual({
      valid: false,
      issues: [{ code: "INVALID_WORKSPACE", path: "workspace" }],
    });
  });

  it("accepts source identity without retaining filename, path or original PDF", () => {
    const workspace = empty();
    workspace.packages.push({
      id: "package-not-retained",
      ownerScope: OWNER,
      fileIds: ["file-not-retained"],
      sourceChannel: "MANUAL_UPLOAD",
      processingStatus: "NEEDS_REVIEW",
      securityScanStatus: "NOT_AVAILABLE",
      uploadedAt: NOW,
    });
    workspace.files.push({
      id: "file-not-retained",
      packageId: "package-not-retained",
      ownerScope: OWNER,
      role: "PRIMARY",
      mimeType: "application/pdf",
      fileSize: 512,
      pageCount: 2,
      sha256: "a".repeat(64),
      contentFingerprint: "a".repeat(64),
      sourceContentRetention: "NOT_RETAINED",
      uploadedAt: NOW,
    });

    const before = structuredClone(workspace);
    expect(validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER)).toEqual({
      valid: true,
      issues: [],
    });
    expect(workspace).toEqual(before);
    expect(JSON.stringify(workspace.files[0])).not.toMatch(
      /originalFilename|storageReference|isImmutableOriginal/,
    );
  });

  it.each([
    ["originalFilename", "private-document.pdf"],
    ["storageReference", "private/storage/path"],
    ["isImmutableOriginal", true],
  ])("rejects %s on a non-retained source", (field, value) => {
    const workspace = empty();
    workspace.packages.push({
      id: "package-not-retained",
      ownerScope: OWNER,
      fileIds: ["file-not-retained"],
      sourceChannel: "MANUAL_UPLOAD",
      processingStatus: "NEEDS_REVIEW",
      securityScanStatus: "NOT_AVAILABLE",
      uploadedAt: NOW,
    });
    const file: Record<string, unknown> = {
      id: "file-not-retained",
      packageId: "package-not-retained",
      ownerScope: OWNER,
      role: "PRIMARY",
      mimeType: "application/pdf",
      fileSize: 512,
      pageCount: 2,
      sha256: "a".repeat(64),
      contentFingerprint: "a".repeat(64),
      sourceContentRetention: "NOT_RETAINED",
      uploadedAt: NOW,
      [field]: value,
    };
    workspace.files.push(
      file as unknown as FiscalNotificationsWorkspace["files"][number],
    );

    expect(
      validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER),
    ).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([
        { code: "INVALID_WORKSPACE", path: `workspace.files[0].${field}` },
      ]),
    });
  });

  it("rejects a foreign owner, duplicate ids and dangling references", () => {
    const foreign = empty();
    foreign.documents.push({
      id: "document-1",
      packageId: "missing-package",
      fileId: "missing-file",
      ownerScope: "guest:other",
      documentType: "UNKNOWN",
      titleRaw: "Synthetic",
      titleNormalized: "SYNTHETIC",
      authorityId: "missing-authority",
      notificationDates: {},
      status: "DRAFT",
      urgency: "REVIEW",
      extractionVersion: "synthetic-v1",
      analysisStatus: "NEEDS_REVIEW",
      humanReviewStatus: "PENDING",
      authenticityStatus: "NOT_CHECKED",
      partIds: [],
      referenceIds: [],
      debtIds: [],
      caseIds: [],
      analysisSnapshotIds: [],
      createdAt: NOW,
      updatedAt: NOW,
    });
    // The owner preflight rejects the foreign item before deeper checks.
    expect(validateFiscalNotificationsWorkspaceIntegrity(foreign, OWNER)).toMatchObject({
      valid: false,
    });

    const duplicate = empty();
    duplicate.packages.push(
      {
        id: "package-1",
        ownerScope: OWNER,
        fileIds: [],
        sourceChannel: "MANUAL_UPLOAD",
        processingStatus: "PENDING",
        securityScanStatus: "NOT_AVAILABLE",
        uploadedAt: NOW,
      },
      {
        id: "package-1",
        ownerScope: OWNER,
        fileIds: ["missing-file"],
        sourceChannel: "MANUAL_UPLOAD",
        processingStatus: "PENDING",
        securityScanStatus: "NOT_AVAILABLE",
        uploadedAt: NOW,
      },
    );
    const result = validateFiscalNotificationsWorkspaceIntegrity(duplicate, OWNER);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["DUPLICATE_ID", "DANGLING_REFERENCE"]),
    );
  });

  it("rejects invalid cents without changing the workspace", () => {
    const workspace = empty();
    workspace.debts.push({
      id: "debt-1",
      ownerScope: OWNER,
      authorityId: "missing-authority",
      originalPrincipalCents: -1,
      collectionStage: "UNKNOWN",
      currentStatus: "PENDING_CONFIRMATION",
      referenceIds: [],
      documentIds: [],
    });
    const before = structuredClone(workspace);
    const result = validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_AMOUNT" }),
        expect.objectContaining({ code: "DANGLING_REFERENCE" }),
      ]),
    );
    expect(workspace).toEqual(before);
  });

  it("cuts off over-budget collections before walking their entries", () => {
    const workspace = empty() as unknown as Record<string, unknown>;
    workspace.packages = new Array(
      FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems + 1,
    );

    expect(validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER)).toEqual({
      valid: false,
      issues: [
        {
          code: "COLLECTION_LIMIT_EXCEEDED",
          path: "workspace.packages",
        },
      ],
    });
  });

  it("snapshots a hostile top-level array length only once", () => {
    const workspace = empty() as unknown as Record<string, unknown>;
    const packages = new Array(
      FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems + 1,
    );
    packages[0] = {
      id: "package-hostile-length",
      ownerScope: OWNER,
      fileIds: [],
      sourceChannel: "MANUAL_UPLOAD",
      processingStatus: "PENDING",
      securityScanStatus: "NOT_AVAILABLE",
      uploadedAt: NOW,
    };
    let lengthReads = 0;
    workspace.packages = new Proxy(packages, {
      getOwnPropertyDescriptor(target, property) {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
        if (property === "length" && descriptor) {
          lengthReads += 1;
          return {
            ...descriptor,
            value: lengthReads === 1 ? 0 : descriptor.value,
          };
        }
        return descriptor;
      },
    });

    const result = validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: "INVALID_WORKSPACE",
      path: "workspace.packages",
    });
    expect(lengthReads).toBe(1);
  });

  it("enforces the aggregate budget before entity validation", () => {
    const workspace = empty() as unknown as Record<string, unknown>;
    for (const collection of [
      "packages",
      "files",
      "documents",
      "parts",
      "authorities",
      "references",
    ]) {
      workspace[collection] = new Array(9_000);
    }

    expect(validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER)).toEqual({
      valid: false,
      issues: [
        {
          code: "COLLECTION_LIMIT_EXCEEDED",
          path: "workspace.collections",
        },
      ],
    });
  });

  it("fails closed for malformed nested collections instead of throwing", () => {
    const workspace = empty() as unknown as Record<string, unknown>;
    workspace.packages = [
      {
        id: "package-malformed",
        ownerScope: OWNER,
        fileIds: null,
        sourceChannel: "MANUAL_UPLOAD",
        processingStatus: "PENDING",
        securityScanStatus: "NOT_AVAILABLE",
        uploadedAt: NOW,
      },
    ];

    expect(() =>
      validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER),
    ).not.toThrow();
    expect(validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER)).toEqual({
      valid: false,
      issues: [
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.packages[0].fileIds",
        },
      ],
    });
  });

  it("rejects unknown, symbolic and accessor-backed data without leaking it", () => {
    const marker = "SYNTHETIC_PRIVATE_VALUE";
    const root = empty() as unknown as Record<PropertyKey, unknown>;
    root[Symbol("private")] = marker;
    const rootResult = validateFiscalNotificationsWorkspaceIntegrity(root, OWNER);
    expect(rootResult).toMatchObject({ valid: false });
    expect(JSON.stringify(rootResult)).not.toContain(marker);

    const entity = empty();
    entity.authorities.push({
      id: "authority-unknown-key",
      ownerScope: OWNER,
      administrationType: "AEAT",
      nameRaw: "Organismo sintético",
      nameNormalized: "ORGANISMO SINTETICO",
      taxId: marker,
    } as never);
    const entityResult = validateFiscalNotificationsWorkspaceIntegrity(
      entity,
      OWNER,
    );
    expect(entityResult.issues).toContainEqual({
      code: "INVALID_WORKSPACE",
      path: "workspace.authorities[0].$unknown",
    });
    expect(JSON.stringify(entityResult)).not.toContain(marker);

    const accessor = empty();
    const hostileAuthority = {
      id: "authority-accessor",
      ownerScope: OWNER,
      administrationType: "AEAT",
      nameRaw: "Organismo sintético",
      nameNormalized: "ORGANISMO SINTETICO",
    };
    Object.defineProperty(hostileAuthority, "nameRaw", {
      enumerable: true,
      get() {
        throw new Error(marker);
      },
    });
    accessor.authorities.push(hostileAuthority as never);
    expect(() =>
      validateFiscalNotificationsWorkspaceIntegrity(accessor, OWNER),
    ).not.toThrow();
    expect(
      validateFiscalNotificationsWorkspaceIntegrity(accessor, OWNER).issues,
    ).toContainEqual({
      code: "INVALID_WORKSPACE",
      path: "workspace.authorities[0]",
    });
  });

  it("cuts off nested per-array and aggregate budgets before reading entries", () => {
    const overLimit = empty() as unknown as Record<string, unknown>;
    const hostileIds = new Proxy(
      new Array(FISCAL_NOTIFICATION_INPUT_LIMITS.maxCollectionItems + 1),
      {
        ownKeys() {
          throw new Error("entries must not be inspected");
        },
      },
    );
    overLimit.packages = [
      {
        id: "package-over-limit",
        ownerScope: OWNER,
        fileIds: hostileIds,
        sourceChannel: "MANUAL_UPLOAD",
        processingStatus: "PENDING",
        securityScanStatus: "NOT_AVAILABLE",
        uploadedAt: NOW,
      },
    ];
    expect(validateFiscalNotificationsWorkspaceIntegrity(overLimit, OWNER)).toEqual({
      valid: false,
      issues: [
        {
          code: "COLLECTION_LIMIT_EXCEEDED",
          path: "workspace.packages[0].fileIds",
        },
      ],
    });

    const aggregate = empty() as unknown as Record<string, unknown>;
    aggregate.packages = Array.from({ length: 6 }, (_, packageIndex) => ({
      id: `package-${packageIndex}`,
      ownerScope: OWNER,
      fileIds: Array.from(
        { length: 9_000 },
        (_, fileIndex) => `file-${packageIndex}-${fileIndex}`,
      ),
      sourceChannel: "MANUAL_UPLOAD",
      processingStatus: "PENDING",
      securityScanStatus: "NOT_AVAILABLE",
      uploadedAt: NOW,
    }));
    expect(
      validateFiscalNotificationsWorkspaceIntegrity(aggregate, OWNER).issues,
    ).toContainEqual({
      code: "COLLECTION_LIMIT_EXCEEDED",
      path: "workspace.nestedItems",
    });
  });

  it("counts projection lineage ids against the aggregate nested budget", () => {
    const workspace = empty();
    workspace.packages.push({
      id: "package-lineage-budget",
      ownerScope: OWNER,
      fileIds: ["file-lineage-budget"],
      sourceChannel: "MANUAL_UPLOAD",
      processingStatus: "PENDING",
      securityScanStatus: "NOT_AVAILABLE",
      uploadedAt: NOW,
    });
    workspace.files.push({
      id: "file-lineage-budget",
      packageId: "package-lineage-budget",
      ownerScope: OWNER,
      role: "PRIMARY",
      originalFilename: "synthetic.pdf",
      mimeType: "application/pdf",
      fileSize: 100,
      pageCount: 1,
      sha256: "a".repeat(64),
      contentFingerprint: "b".repeat(64),
      storageReference: "synthetic-file",
      uploadedAt: NOW,
      isImmutableOriginal: true,
    });
    workspace.authorities.push({
      id: "authority-lineage-budget",
      ownerScope: OWNER,
      administrationType: "AEAT",
      nameRaw: "Organismo sintético",
      nameNormalized: "ORGANISMO SINTETICO",
    });
    workspace.documents.push({
      id: "document-lineage-budget",
      packageId: "package-lineage-budget",
      fileId: "file-lineage-budget",
      ownerScope: OWNER,
      documentType: "UNKNOWN",
      titleRaw: "Documento sintético",
      titleNormalized: "DOCUMENTO SINTETICO",
      authorityId: "authority-lineage-budget",
      notificationDates: {},
      status: "DRAFT",
      urgency: "REVIEW",
      extractionVersion: "synthetic-v1",
      analysisStatus: "NEEDS_REVIEW",
      humanReviewStatus: "PENDING",
      authenticityStatus: "NOT_CHECKED",
      partIds: [],
      referenceIds: [],
      debtIds: [],
      caseIds: [],
      analysisSnapshotIds: ["snapshot-lineage-budget"],
      createdAt: NOW,
      updatedAt: NOW,
    });
    workspace.cases.push(
      ...Array.from({ length: 6 }, (_, index) => ({
        id: `case-lineage-budget-${index}`,
        ownerScope: OWNER,
        authorityId: "authority-lineage-budget",
        caseType: "SYNTHETIC",
        title: "Expediente sintético",
        status: "DRAFT" as const,
        openedAt: NOW,
        referenceIds: [],
        documentIds: [],
        debtIds: [],
        obligationIds: [],
        paymentPlanIds: [],
        timelineEventIds: [],
        notes: Array.from({ length: 8_000 }, () => "n"),
      })),
    );
    const parentIds = Array.from({ length: 32 }, (_, index) => `fact-${index}`);
    const projection = {
      ...createEmptyAdministrativeDomainProjection({
        ownerScope: OWNER,
        documentId: "document-lineage-budget",
        extractorId: "synthetic-extractor",
        extractorVersion: "v1",
        createdAt: NOW,
      }),
      moneyFacts: Array.from({ length: 100 }, (_, index) => ({
        id: `fact-${index}`,
        ownerScope: OWNER,
        documentId: "document-lineage-budget",
        kind: "ORIGINAL_TAX_PRINCIPAL" as const,
        amountCents: 0,
        currency: "EUR" as const,
        assertionType: "EXPLICIT_IN_DOCUMENT" as const,
        evidenceIds: [],
        lineageParentIds: index < parentIds.length ? [] : parentIds,
        status: "UNKNOWN" as const,
        createdAt: NOW,
      })),
    };
    workspace.analysisSnapshots.push({
      id: "snapshot-lineage-budget",
      ownerScope: OWNER,
      documentId: "document-lineage-budget",
      version: 1,
      extractorVersion: "synthetic-v1",
      rulesVersion: "synthetic-v1",
      structuredData: {
        schemaVersion: 1,
        documentType: "UNKNOWN",
        administrativeDomain: projection,
        paymentOptionIds: [],
        unknownFields: [],
        validationCodes: [],
        factSummary: [],
        calculatedSummary: [],
        inferenceSummary: [],
        userConfirmedSummary: [],
        documentFields: { title: "Documento sintético" },
      },
      plainLanguageExplanation: [],
      validationWarnings: [],
      evidenceIds: [],
      confidenceBand: "LOW",
      requiresHumanReview: true,
      createdAt: NOW,
      createdBySystem: true,
    });

    expect(
      validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER).issues,
    ).toContainEqual({
      code: "COLLECTION_LIMIT_EXCEEDED",
      path: "workspace.nestedItems",
    });
  });

  it("requires safe integer cents for mandatory and component amounts", () => {
    const workspace = empty();
    (workspace.interestCalculations as unknown[]).push({
      id: "interest-invalid",
      ownerScope: OWNER,
      installmentId: "installment-missing",
      periodFrom: "2026-01-01",
      periodTo: "2026-01-02",
      days: 1,
      ratePartsPerMillion: 1,
      amountCents: 1.5,
      evidenceIds: [],
    });
    (workspace.paymentOptions as unknown[]).push({
      id: "payment-option-invalid",
      ownerScope: OWNER,
      documentId: "document-missing",
      title: "Opción sintética",
      eligibilityCondition: "Revisión humana",
      components: [
        {
          type: "PRINCIPAL",
          amountCents: Number.MAX_SAFE_INTEGER + 1,
          assertionType: "EXPLICIT_IN_DOCUMENT",
          evidenceIds: [],
        },
      ],
      deadlineStatus: "UNKNOWN",
      evidenceIds: [],
    });
    (workspace.accountingDrafts as unknown[]).push({
      id: "accounting-invalid",
      ownerScope: OWNER,
      documentId: "document-missing",
      status: "PENDING_CLASSIFICATION",
      components: [
        {
          componentType: "PRINCIPAL",
          amountCents: -1,
          treatmentStatus: "NEEDS_REVIEW",
        },
      ],
      requiresUserConfirmation: true,
      createsExpense: false,
      createsJournalEntry: false,
      createdAt: NOW,
    });

    const result = validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        {
          code: "INVALID_AMOUNT",
          path: "workspace.interestCalculations[0].calculationBaseCents",
        },
        {
          code: "INVALID_AMOUNT",
          path: "workspace.interestCalculations[0].amountCents",
        },
        {
          code: "INVALID_AMOUNT",
          path: "workspace.paymentOptions[0].components[0].amountCents",
        },
        {
          code: "INVALID_AMOUNT",
          path: "workspace.accountingDrafts[0].totalCents",
        },
        {
          code: "INVALID_AMOUNT",
          path: "workspace.accountingDrafts[0].components[0].amountCents",
        },
      ]),
    );
  });

  it("rejects malformed fiscal scalars, operational dates and immutable hashes", () => {
    const workspace = empty();
    workspace.packages.push({
      id: "package-invalid-hash",
      ownerScope: OWNER,
      fileIds: ["file-invalid-hash"],
      sourceChannel: "MANUAL_UPLOAD",
      processingStatus: "PENDING",
      securityScanStatus: "NOT_AVAILABLE",
      uploadedAt: NOW,
    });
    workspace.files.push({
      id: "file-invalid-hash",
      packageId: "package-invalid-hash",
      ownerScope: OWNER,
      role: "PRIMARY",
      originalFilename: "synthetic.pdf",
      mimeType: "application/pdf",
      fileSize: 100,
      pageCount: 1,
      sha256: "a",
      contentFingerprint: "b",
      storageReference: "synthetic-file",
      uploadedAt: NOW,
      isImmutableOriginal: true,
    });
    (workspace.interestCalculations as unknown[]).push({
      id: "interest-invalid-scalars",
      ownerScope: OWNER,
      installmentId: "installment-missing",
      calculationBaseCents: 100,
      periodFrom: "2026-02-30",
      periodTo: "not-a-date",
      days: "1",
      ratePartsPerMillion: -1,
      amountCents: 1,
      evidenceIds: [],
    });
    (workspace.deadlineRules as unknown[]).push({
      id: "deadline-invalid-scalars",
      ownerScope: OWNER,
      documentId: "document-missing",
      triggerDateType: "DOCUMENT_DATE",
      durationValue: "10",
      durationUnit: "CALENDAR_DAYS",
      startsNextDay: true,
      moveToNextBusinessDay: false,
      calendarJurisdiction: "ES-COMMON",
      sourceDocumentText: "Texto sintético",
      ruleId: "synthetic-rule",
      ruleVersion: 1,
      officialSourceIds: [],
      deterministicTrace: [],
      legalReviewStatus: "PENDING",
      calculatedDeadline: "tomorrow",
      provisional: true,
      evidenceIds: [],
    });
    (workspace.paymentOptions as unknown[]).push({
      id: "payment-option-invalid-date",
      ownerScope: OWNER,
      documentId: "document-missing",
      title: "Opción sintética",
      eligibilityCondition: "Revisión humana",
      components: [],
      deadline: "soon",
      deadlineStatus: "UNKNOWN",
      evidenceIds: [],
    });

    const result = validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.files[0].sha256",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.files[0].contentFingerprint",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.interestCalculations[0].days",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.interestCalculations[0].ratePartsPerMillion",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.interestCalculations[0].periodFrom",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.interestCalculations[0].periodTo",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.deadlineRules[0].durationValue",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.deadlineRules[0].calculatedDeadline",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.paymentOptions[0].deadline",
        },
      ]),
    );
  });

  it("rejects non-string scalar arrays and non-canonical legal source ids", () => {
    const marker = "SYNTHETIC_PRIVATE_TOKEN";
    const workspace = empty();
    (workspace.cases as unknown[]).push({
      id: "case-invalid-notes",
      ownerScope: OWNER,
      authorityId: "authority-missing",
      caseType: "SYNTHETIC",
      title: "Expediente sintético",
      status: "DRAFT",
      openedAt: NOW,
      referenceIds: [],
      documentIds: [],
      debtIds: [],
      obligationIds: [],
      paymentPlanIds: [],
      timelineEventIds: [],
      notes: [{ nif: marker }],
    });
    (workspace.deadlineRules as unknown[]).push({
      id: "deadline-invalid-arrays",
      ownerScope: OWNER,
      documentId: "document-missing",
      triggerDateType: "DOCUMENT_DATE",
      startsNextDay: true,
      moveToNextBusinessDay: false,
      calendarJurisdiction: "ES-COMMON",
      sourceDocumentText: "Texto sintético",
      ruleId: "x".repeat(161),
      ruleVersion: 1,
      officialSourceIds: ["source-1", "source-1", { nif: marker }],
      deterministicTrace: [{ raw: marker }],
      legalReviewStatus: "PENDING",
      provisional: true,
      evidenceIds: [],
    });
    (workspace.analysisSnapshots as unknown[]).push({
      id: "snapshot-invalid-summary",
      ownerScope: OWNER,
      documentId: "document-missing",
      version: 1,
      extractorVersion: "synthetic-v1",
      rulesVersion: "synthetic-v1",
      structuredData: {
        schemaVersion: 1,
        documentType: "UNKNOWN",
        paymentOptionIds: [],
        unknownFields: [],
        validationCodes: [],
        factSummary: [{ raw: marker }],
        calculatedSummary: [],
        inferenceSummary: [],
        userConfirmedSummary: [],
        documentFields: { title: "Documento sintético" },
      },
      plainLanguageExplanation: [],
      validationWarnings: [],
      evidenceIds: [],
      confidenceBand: "LOW",
      requiresHumanReview: true,
      createdAt: NOW,
      createdBySystem: true,
    });

    const result = validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.cases[0].notes[0]",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.deadlineRules[0].ruleId",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.deadlineRules[0].officialSourceIds[1]",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.deadlineRules[0].officialSourceIds[2]",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.deadlineRules[0].deterministicTrace[0]",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.analysisSnapshots[0].structuredData.factSummary[0]",
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain(marker);
  });

  it("enforces physical PDF page bounds for files, parts and evidence", () => {
    const pageWorkspace = () => {
      const workspace = empty();
      workspace.packages.push({
        id: "package-pages",
        ownerScope: OWNER,
        fileIds: ["file-pages"],
        sourceChannel: "MANUAL_UPLOAD",
        processingStatus: "PENDING",
        securityScanStatus: "NOT_AVAILABLE",
        uploadedAt: NOW,
      });
      workspace.files.push({
        id: "file-pages",
        packageId: "package-pages",
        ownerScope: OWNER,
        role: "PRIMARY",
        originalFilename: "synthetic.pdf",
        mimeType: "application/pdf",
        fileSize: 100,
        pageCount: 1,
        sha256: "a".repeat(64),
        contentFingerprint: "b".repeat(64),
        storageReference: "synthetic-file",
        uploadedAt: NOW,
        isImmutableOriginal: true,
      });
      workspace.authorities.push({
        id: "authority-pages",
        ownerScope: OWNER,
        administrationType: "AEAT",
        nameRaw: "Organismo sintético",
        nameNormalized: "ORGANISMO SINTETICO",
      });
      workspace.documents.push({
        id: "document-pages",
        packageId: "package-pages",
        fileId: "file-pages",
        ownerScope: OWNER,
        documentType: "UNKNOWN",
        titleRaw: "Documento sintético",
        titleNormalized: "DOCUMENTO SINTETICO",
        authorityId: "authority-pages",
        notificationDates: {},
        status: "DRAFT",
        urgency: "REVIEW",
        extractionVersion: "synthetic-v1",
        analysisStatus: "NEEDS_REVIEW",
        humanReviewStatus: "PENDING",
        authenticityStatus: "NOT_CHECKED",
        partIds: ["part-pages"],
        referenceIds: [],
        debtIds: [],
        caseIds: [],
        analysisSnapshotIds: [],
        createdAt: NOW,
        updatedAt: NOW,
      });
      workspace.parts.push({
        id: "part-pages",
        ownerScope: OWNER,
        documentId: "document-pages",
        type: "MAIN_ACT",
        pageStart: 1,
        pageEnd: 2,
        contentFingerprint: "c".repeat(64),
        textNormalized: "Texto sintético",
        isCanonical: true,
        evidenceIds: ["evidence-pages"],
      });
      workspace.evidence.push({
        id: "evidence-pages",
        ownerScope: OWNER,
        documentId: "document-pages",
        partId: "part-pages",
        pageNumber: 2,
        textSnippet: "Dato sintético",
        extractionMethod: "RULE",
        confidence: "HIGH",
        assertionType: "EXPLICIT_IN_DOCUMENT",
      });
      return workspace;
    };

    const outsideFile = validateFiscalNotificationsWorkspaceIntegrity(
      pageWorkspace(),
      OWNER,
    );
    expect(outsideFile.issues).toEqual(
      expect.arrayContaining([
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.parts[0].pageEnd",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.evidence[0].pageNumber",
        },
      ]),
    );

    const inverted = pageWorkspace();
    inverted.parts[0]!.pageStart = 2;
    inverted.parts[0]!.pageEnd = 1;
    expect(
      validateFiscalNotificationsWorkspaceIntegrity(inverted, OWNER).issues,
    ).toEqual(
      expect.arrayContaining([
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.parts[0].pageStart",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.parts[0].pageEnd",
        },
      ]),
    );

    const oversized = pageWorkspace();
    oversized.files[0]!.pageCount =
      FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages + 1;
    expect(
      validateFiscalNotificationsWorkspaceIntegrity(oversized, OWNER).issues,
    ).toContainEqual({
      code: "INVALID_WORKSPACE",
      path: "workspace.files[0].pageCount",
    });
  });

  it("rejects open enums and incomplete nested money records", () => {
    const workspace = empty();
    workspace.authorities.push({
      id: "authority-invalid-enum",
      ownerScope: OWNER,
      administrationType: "AUTOMATIC_AUTHORITY",
      nameRaw: "Organismo sintético",
      nameNormalized: "ORGANISMO SINTETICO",
    } as never);
    const enumResult = validateFiscalNotificationsWorkspaceIntegrity(
      workspace,
      OWNER,
    );
    expect(enumResult.issues).toContainEqual({
      code: "INVALID_WORKSPACE",
      path: "workspace.authorities[0].administrationType",
    });

    const nested = empty();
    (nested.paymentOptions as unknown[]).push({
      id: "payment-option-incomplete-component",
      ownerScope: OWNER,
      documentId: "document-missing",
      title: "Opción sintética",
      eligibilityCondition: "Revisión humana",
      components: [{ amountCents: 100, evidenceIds: [] }],
      deadlineStatus: "UNKNOWN",
      evidenceIds: [],
    });

    const result = validateFiscalNotificationsWorkspaceIntegrity(nested, OWNER);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.paymentOptions[0].components[0].type",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.paymentOptions[0].components[0].assertionType",
        },
      ]),
    );
  });

  it("requires explicit human provenance for confirmed evidence and relations", () => {
    const workspace = empty();
    workspace.evidence.push({
      id: "evidence-human-without-provenance",
      ownerScope: OWNER,
      documentId: "document-missing",
      pageNumber: 1,
      textSnippet: "Dato sintético",
      extractionMethod: "AI",
      confidence: "HIGH",
      assertionType: "USER_CONFIRMED",
    });
    workspace.relations.push(
      {
        id: "relation-human-without-provenance",
        ownerScope: OWNER,
        sourceDocumentId: "document-missing-a",
        targetDocumentId: "document-missing-b",
        relationType: "POSSIBLY_RELATED",
        confidenceBand: "LOW",
        score: 0,
        evidence: {
          matchingReferenceTypes: [],
          matchingAmountTypes: [],
          matchingDates: [],
          differences: [],
        },
        algorithmVersion: "synthetic-v1",
        status: "USER_CONFIRMED",
        createdAt: NOW,
      },
      {
        id: "relation-system-with-human-provenance",
        ownerScope: OWNER,
        sourceDocumentId: "document-missing-a",
        targetDocumentId: "document-missing-b",
        relationType: "POSSIBLY_RELATED",
        confidenceBand: "LOW",
        score: 0,
        evidence: {
          matchingReferenceTypes: [],
          matchingAmountTypes: [],
          matchingDates: [],
          differences: [],
        },
        algorithmVersion: "synthetic-v1",
        status: "SUGGESTED",
        createdAt: NOW,
        confirmedAt: NOW,
        confirmedBy: "actor:synthetic",
      },
    );

    const result = validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        { code: "INVALID_WORKSPACE", path: "workspace.evidence[0].confirmedAt" },
        { code: "INVALID_WORKSPACE", path: "workspace.evidence[0].confirmedBy" },
        { code: "INVALID_WORKSPACE", path: "workspace.relations[0].confirmedAt" },
        { code: "INVALID_WORKSPACE", path: "workspace.relations[0].confirmedBy" },
        { code: "INVALID_WORKSPACE", path: "workspace.relations[1].confirmedAt" },
        { code: "INVALID_WORKSPACE", path: "workspace.relations[1].confirmedBy" },
      ]),
    );
  });

  it("bounds individual and aggregate workspace text before entity validation", () => {
    const individual = empty();
    individual.authorities.push({
      id: "authority-text-too-large",
      ownerScope: OWNER,
      administrationType: "AEAT",
      nameRaw: "Organismo sintético",
      nameNormalized: "ORGANISMO SINTETICO",
      address: "x".repeat(FISCAL_NOTIFICATION_INPUT_LIMITS.maxTextChars + 1),
    });
    expect(
      validateFiscalNotificationsWorkspaceIntegrity(individual, OWNER).issues,
    ).toContainEqual({
      code: "TEXT_LIMIT_EXCEEDED",
      path: "workspace.authorities[0].address",
    });

    const aggregate = empty();
    aggregate.authorities.push(
      ...Array.from({ length: 12 }, (_, index) => ({
        id: `authority-text-${index}`,
        ownerScope: OWNER,
        administrationType: "AEAT" as const,
        nameRaw: `Organismo ${index}`,
        nameNormalized: `ORGANISMO ${index}`,
        address: "x".repeat(450_000),
      })),
    );
    expect(
      validateFiscalNotificationsWorkspaceIntegrity(aggregate, OWNER).issues,
    ).toContainEqual({
      code: "TEXT_LIMIT_EXCEEDED",
      path: "workspace.text",
    });
  });

  it("rejects unknown keys inside structured extracted fields without leakage", () => {
    const marker = "SYNTHETIC_PRIVATE_VALUE";
    const workspace = empty();
    (workspace.analysisSnapshots as unknown[]).push({
      id: "snapshot-unknown-field",
      ownerScope: OWNER,
      documentId: "document-missing",
      version: 1,
      extractorVersion: "synthetic-v1",
      rulesVersion: "synthetic-v1",
      structuredData: {
        schemaVersion: 1,
        documentType: "UNKNOWN",
        paymentOptionIds: [],
        unknownFields: [
          {
            labelRaw: "Campo sintético",
            valueRaw: "Valor sintético",
            page: 1,
            confidence: "LOW",
            nif: marker,
          },
        ],
        validationCodes: [],
        factSummary: [],
        calculatedSummary: [],
        inferenceSummary: [],
        userConfirmedSummary: [],
        documentFields: { title: "Documento sintético" },
      },
      plainLanguageExplanation: [],
      validationWarnings: [],
      evidenceIds: [],
      confidenceBand: "LOW",
      requiresHumanReview: true,
      createdAt: NOW,
      createdBySystem: true,
    });

    const result = validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER);
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: "INVALID_WORKSPACE",
      path: "workspace.analysisSnapshots[0].structuredData.unknownFields[0]",
    });
    expect(JSON.stringify(result)).not.toContain(marker);
  });

  it("validates event metadata schemas and extracted document dates", () => {
    const audit = empty();
    audit.packages.push({
      id: "package-audit",
      ownerScope: OWNER,
      fileIds: [],
      sourceChannel: "MANUAL_UPLOAD",
      processingStatus: "PENDING",
      securityScanStatus: "NOT_AVAILABLE",
      uploadedAt: NOW,
    });
    audit.auditEvents.push({
      id: "audit-invalid-metadata",
      ownerScope: OWNER,
      eventType: "PACKAGE_UPLOADED",
      entityType: "PACKAGE",
      entityId: "package-audit",
      actorScope: "LOCAL_USER",
      occurredAt: NOW,
      safeMetadata: { fileCount: "SYNTHETIC_PRIVATE_TOKEN" },
    });
    expect(
      validateFiscalNotificationsWorkspaceIntegrity(audit, OWNER).issues,
    ).toContainEqual({
      code: "INVALID_WORKSPACE",
      path: "workspace.auditEvents[0].safeMetadata.fileCount",
    });

    const extractedDate = empty();
    (extractedDate.analysisSnapshots as unknown[]).push({
      id: "snapshot-invalid-extracted-date",
      ownerScope: OWNER,
      documentId: "document-missing",
      version: 1,
      extractorVersion: "synthetic-v1",
      rulesVersion: "synthetic-v1",
      structuredData: {
        schemaVersion: 1,
        documentType: "UNKNOWN",
        paymentOptionIds: [],
        unknownFields: [],
        validationCodes: [],
        factSummary: [],
        calculatedSummary: [],
        inferenceSummary: [],
        userConfirmedSummary: [],
        documentFields: {
          title: "Documento sintético",
          issueDate: 20260712,
        },
      },
      plainLanguageExplanation: [],
      validationWarnings: [],
      evidenceIds: [],
      confidenceBand: "LOW",
      requiresHumanReview: true,
      createdAt: NOW,
      createdBySystem: true,
    });
    expect(
      validateFiscalNotificationsWorkspaceIntegrity(extractedDate, OWNER).issues,
    ).toContainEqual({
      code: "INVALID_WORKSPACE",
      path: "workspace.analysisSnapshots[0].structuredData.documentFields.issueDate",
    });
  });

  it("rejects PII-like audit string prefixes without exposing their values", () => {
    const workspace = empty();
    const marker = "iban:SYNTHETIC_PRIVATE_TOKEN";
    workspace.packages.push({
      id: marker,
      ownerScope: OWNER,
      fileIds: [],
      sourceChannel: "MANUAL_UPLOAD",
      processingStatus: "PENDING",
      securityScanStatus: "NOT_AVAILABLE",
      uploadedAt: NOW,
    });
    workspace.auditEvents.push({
      id: "audit-sensitive-prefix",
      ownerScope: OWNER,
      eventType: "PACKAGE_UPLOADED",
      entityType: "PACKAGE",
      entityId: marker,
      actorScope: "LOCAL_USER",
      occurredAt: NOW,
      safeMetadata: { fileCount: 0 },
    });

    const result = validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: "INVALID_WORKSPACE",
      path: "workspace.auditEvents[0].entityId",
    });
    expect(JSON.stringify(result)).not.toContain(marker);
  });

  it("uses defensive component snapshots and verifies parent-child provenance", () => {
    const workspace = empty();
    workspace.packages.push(
      {
        id: "package-listed",
        ownerScope: OWNER,
        fileIds: ["file-crossed"],
        sourceChannel: "MANUAL_UPLOAD",
        processingStatus: "PENDING",
        securityScanStatus: "NOT_AVAILABLE",
        uploadedAt: NOW,
      },
      {
        id: "package-actual",
        ownerScope: OWNER,
        fileIds: [],
        sourceChannel: "MANUAL_UPLOAD",
        processingStatus: "PENDING",
        securityScanStatus: "NOT_AVAILABLE",
        uploadedAt: NOW,
      },
    );
    workspace.files.push({
      id: "file-crossed",
      packageId: "package-actual",
      ownerScope: OWNER,
      role: "PRIMARY",
      originalFilename: "synthetic.pdf",
      mimeType: "application/pdf",
      fileSize: 100,
      pageCount: 1,
      sha256: "a".repeat(64),
      contentFingerprint: "b".repeat(64),
      storageReference: "synthetic-file",
      uploadedAt: NOW,
      isImmutableOriginal: true,
    });
    const component = new Proxy(
      {
        type: "PRINCIPAL",
        amountCents: 100,
        assertionType: "EXPLICIT_IN_DOCUMENT",
        evidenceIds: [],
      },
      {
        get(target, property, receiver) {
          if (property === "amountCents") return -1;
          return Reflect.get(target, property, receiver);
        },
      },
    );
    (workspace.paymentOptions as unknown[]).push({
      id: "payment-option-proxy",
      ownerScope: OWNER,
      documentId: "document-missing",
      title: "Opción sintética",
      eligibilityCondition: "Revisión humana",
      components: [component],
      deadlineStatus: "UNKNOWN",
      evidenceIds: [],
    });

    const result = validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER);
    expect(result.issues).toContainEqual({
      code: "DANGLING_REFERENCE",
      path: "workspace.packages[0].fileIds[0]",
    });
    expect(result.issues).not.toContainEqual({
      code: "INVALID_AMOUNT",
      path: "workspace.paymentOptions[0].components[0].amountCents",
    });
  });

  it("rejects reverse membership gaps and crossed document provenance", () => {
    const workspace = empty();
    workspace.packages.push(
      {
        id: "package-document",
        ownerScope: OWNER,
        fileIds: [],
        sourceChannel: "MANUAL_UPLOAD",
        processingStatus: "PENDING",
        securityScanStatus: "NOT_AVAILABLE",
        uploadedAt: NOW,
      },
      {
        id: "package-file",
        ownerScope: OWNER,
        fileIds: ["file-cross-package"],
        sourceChannel: "MANUAL_UPLOAD",
        processingStatus: "PENDING",
        securityScanStatus: "NOT_AVAILABLE",
        uploadedAt: NOW,
      },
    );
    workspace.files.push({
      id: "file-cross-package",
      packageId: "package-file",
      ownerScope: OWNER,
      role: "PRIMARY",
      originalFilename: "synthetic.pdf",
      mimeType: "application/pdf",
      fileSize: 100,
      pageCount: 1,
      sha256: "a".repeat(64),
      contentFingerprint: "b".repeat(64),
      storageReference: "synthetic-file",
      uploadedAt: NOW,
      isImmutableOriginal: true,
    });
    workspace.authorities.push({
      id: "authority-provenance",
      ownerScope: OWNER,
      administrationType: "AEAT",
      nameRaw: "Organismo sintético",
      nameNormalized: "ORGANISMO SINTETICO",
    });
    workspace.authorities.push({
      id: "authority-other",
      ownerScope: OWNER,
      administrationType: "AEAT",
      nameRaw: "Otro organismo sintético",
      nameNormalized: "OTRO ORGANISMO SINTETICO",
    });
    workspace.documents.push({
      id: "document-provenance",
      packageId: "package-document",
      fileId: "file-cross-package",
      ownerScope: OWNER,
      documentType: "UNKNOWN",
      titleRaw: "Documento sintético",
      titleNormalized: "DOCUMENTO SINTETICO",
      authorityId: "authority-provenance",
      notificationDates: {},
      status: "DRAFT",
      urgency: "REVIEW",
      extractionVersion: "synthetic-v1",
      analysisStatus: "NEEDS_REVIEW",
      humanReviewStatus: "PENDING",
      authenticityStatus: "NOT_CHECKED",
      partIds: [],
      referenceIds: [],
      debtIds: [],
      caseIds: [],
      analysisSnapshotIds: [],
      createdAt: NOW,
      updatedAt: NOW,
    });
    workspace.debts.push({
      id: "debt-observation",
      ownerScope: OWNER,
      authorityId: "authority-provenance",
      collectionStage: "UNKNOWN",
      currentStatus: "PENDING_CONFIRMATION",
      referenceIds: [],
      documentIds: [],
    });
    workspace.debtObservations.push({
      id: "observation-crossed",
      ownerScope: OWNER,
      debtId: "debt-observation",
      documentId: "document-provenance",
      authorityId: "authority-other",
      observedCollectionStage: "UNKNOWN",
      observedStatus: "PENDING_CONFIRMATION",
      referenceIds: [],
      evidenceIds: [],
      observedAt: NOW,
    });
    workspace.parts.push({
      id: "part-omitted-by-document",
      ownerScope: OWNER,
      documentId: "document-provenance",
      type: "MAIN_ACT",
      pageStart: 1,
      pageEnd: 1,
      contentFingerprint: "c".repeat(64),
      textNormalized: "Texto sintético",
      isCanonical: true,
      evidenceIds: [],
    });
    workspace.paymentPlans.push({
      id: "plan-omits-installment",
      ownerScope: OWNER,
      sourceDocumentId: "document-provenance",
      caseId: "case-other",
      authorityId: "authority-provenance",
      grantStatus: "PROPOSED",
      status: "PENDING_CONFIRMATION",
      debtIds: [],
      installmentIds: [],
    });
    workspace.installments.push({
      id: "installment-omitted-by-plan",
      ownerScope: OWNER,
      paymentPlanId: "plan-omits-installment",
      sequence: 1,
      components: [],
      status: "PENDING_CONFIRMATION",
      evidenceIds: [],
      userConfirmed: false,
    });
    workspace.cases.push({
      id: "case-omits-timeline",
      ownerScope: OWNER,
      authorityId: "authority-provenance",
      caseType: "SYNTHETIC",
      title: "Expediente sintético",
      status: "DRAFT",
      openedAt: NOW,
      referenceIds: [],
      documentIds: [],
      debtIds: [],
      obligationIds: ["obligation-crossed"],
      paymentPlanIds: ["plan-omits-installment"],
      timelineEventIds: [],
      notes: [],
    });
    workspace.cases.push({
      id: "case-other",
      ownerScope: OWNER,
      authorityId: "authority-provenance",
      caseType: "SYNTHETIC",
      title: "Otro expediente sintético",
      status: "DRAFT",
      openedAt: NOW,
      referenceIds: [],
      documentIds: [],
      debtIds: [],
      obligationIds: [],
      paymentPlanIds: [],
      timelineEventIds: [],
      notes: [],
    });
    workspace.obligations.push({
      id: "obligation-crossed",
      ownerScope: OWNER,
      sourceDocumentId: "document-provenance",
      caseId: "case-other",
      type: "OTHER",
      title: "Obligación sintética",
      description: "Revisión sintética",
      components: [],
      dueDateStatus: "UNKNOWN",
      status: "DRAFT",
      evidenceIds: [],
      userConfirmed: false,
    });
    workspace.timeline.push({
      id: "timeline-omitted-by-case",
      ownerScope: OWNER,
      caseId: "case-omits-timeline",
      occurredAt: NOW,
      eventType: "DOCUMENT_RECEIVED",
      summary: "Evento sintético",
      evidenceIds: [],
    });

    const result = validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        {
          code: "DANGLING_REFERENCE",
          path: "workspace.documents[0].fileId",
        },
        {
          code: "DANGLING_REFERENCE",
          path: "workspace.parts[0].documentId",
        },
        {
          code: "DANGLING_REFERENCE",
          path: "workspace.debtObservations[0].documentId",
        },
        {
          code: "DANGLING_REFERENCE",
          path: "workspace.debtObservations[0].debtId",
        },
        {
          code: "DANGLING_REFERENCE",
          path: "workspace.debtObservations[0].authorityId",
        },
        {
          code: "DANGLING_REFERENCE",
          path: "workspace.cases[0].obligationIds[0]",
        },
        {
          code: "DANGLING_REFERENCE",
          path: "workspace.cases[0].paymentPlanIds[0]",
        },
        {
          code: "DANGLING_REFERENCE",
          path: "workspace.paymentPlans[0].caseId",
        },
        {
          code: "DANGLING_REFERENCE",
          path: "workspace.installments[0].paymentPlanId",
        },
        {
          code: "DANGLING_REFERENCE",
          path: "workspace.obligations[0].caseId",
        },
        {
          code: "DANGLING_REFERENCE",
          path: "workspace.timeline[0].caseId",
        },
      ]),
    );
  });

  it("rejects crossed operational and reference provenance", () => {
    const workspace = empty();
    workspace.packages.push({
      id: "package-operational",
      ownerScope: OWNER,
      fileIds: ["file-operational"],
      sourceChannel: "MANUAL_UPLOAD",
      processingStatus: "PENDING",
      securityScanStatus: "NOT_AVAILABLE",
      uploadedAt: NOW,
    });
    workspace.files.push({
      id: "file-operational",
      packageId: "package-operational",
      ownerScope: OWNER,
      role: "PRIMARY",
      originalFilename: "synthetic.pdf",
      mimeType: "application/pdf",
      fileSize: 100,
      pageCount: 1,
      sha256: "a".repeat(64),
      contentFingerprint: "b".repeat(64),
      storageReference: "synthetic-file",
      uploadedAt: NOW,
      isImmutableOriginal: true,
    });
    workspace.authorities.push(
      {
        id: "authority-a",
        ownerScope: OWNER,
        administrationType: "AEAT",
        nameRaw: "Organismo A",
        nameNormalized: "ORGANISMO A",
      },
      {
        id: "authority-b",
        ownerScope: OWNER,
        administrationType: "AEAT",
        nameRaw: "Organismo B",
        nameNormalized: "ORGANISMO B",
      },
    );
    const document = (
      id: string,
      authorityId: string,
      debtIds: string[],
      caseIds: string[],
      referenceIds: string[],
    ) => ({
      id,
      packageId: "package-operational",
      fileId: "file-operational",
      ownerScope: OWNER,
      documentType: "UNKNOWN" as const,
      titleRaw: "Documento sintético",
      titleNormalized: "DOCUMENTO SINTETICO",
      authorityId,
      notificationDates: {},
      status: "DRAFT" as const,
      urgency: "REVIEW" as const,
      extractionVersion: "synthetic-v1",
      analysisStatus: "NEEDS_REVIEW" as const,
      humanReviewStatus: "PENDING" as const,
      authenticityStatus: "NOT_CHECKED" as const,
      partIds: [],
      referenceIds,
      debtIds,
      caseIds,
      analysisSnapshotIds: [],
      createdAt: NOW,
      updatedAt: NOW,
    });
    workspace.documents.push(
      document(
        "document-a",
        "authority-a",
        ["debt-a"],
        ["case-a"],
        ["reference-missing-target"],
      ),
      document(
        "document-b",
        "authority-b",
        ["debt-disjoint"],
        [],
        ["reference-debt-cross", "reference-case-cross"],
      ),
    );
    workspace.debts.push(
      {
        id: "debt-a",
        ownerScope: OWNER,
        authorityId: "authority-a",
        collectionStage: "UNKNOWN",
        currentStatus: "PENDING_CONFIRMATION",
        referenceIds: ["reference-debt-cross"],
        documentIds: ["document-a"],
      },
      {
        id: "debt-disjoint",
        ownerScope: OWNER,
        authorityId: "authority-b",
        collectionStage: "UNKNOWN",
        currentStatus: "PENDING_CONFIRMATION",
        referenceIds: [],
        documentIds: ["document-b"],
      },
    );
    workspace.cases.push({
      id: "case-a",
      ownerScope: OWNER,
      authorityId: "authority-a",
      caseType: "SYNTHETIC",
      title: "Expediente A",
      status: "DRAFT",
      openedAt: NOW,
      referenceIds: ["reference-case-cross"],
      documentIds: ["document-a"],
      debtIds: ["debt-a", "debt-disjoint"],
      obligationIds: ["obligation-cross"],
      paymentPlanIds: ["plan-cross"],
      timelineEventIds: ["timeline-cross", "timeline-disjoint"],
      notes: [],
    });
    workspace.references.push(
      {
        id: "reference-debt-cross",
        ownerScope: OWNER,
        referenceType: "LIQUIDATION_KEY",
        rawValue: "REF-DEBT",
        normalizedValue: "REF-DEBT",
        issuer: "SYNTHETIC",
        scope: "DEBT",
        documentId: "document-b",
        debtId: "debt-a",
        isPrimary: false,
        confidence: "HIGH",
        confirmationStatus: "PENDING",
        extractionMethod: "RULE",
        occurrenceIds: [],
        createdAt: NOW,
      },
      {
        id: "reference-case-cross",
        ownerScope: OWNER,
        referenceType: "EXPEDIENT_NUMBER",
        rawValue: "REF-CASE",
        normalizedValue: "REF-CASE",
        issuer: "SYNTHETIC",
        scope: "CASE",
        documentId: "document-b",
        caseId: "case-a",
        isPrimary: false,
        confidence: "HIGH",
        confirmationStatus: "PENDING",
        extractionMethod: "RULE",
        occurrenceIds: [],
        createdAt: NOW,
      },
      {
        id: "reference-missing-target",
        ownerScope: OWNER,
        referenceType: "EXPEDIENT_NUMBER",
        rawValue: "REF-MISSING",
        normalizedValue: "REF-MISSING",
        issuer: "SYNTHETIC",
        scope: "CASE",
        documentId: "document-a",
        isPrimary: false,
        confidence: "HIGH",
        confirmationStatus: "PENDING",
        extractionMethod: "RULE",
        occurrenceIds: [],
        createdAt: NOW,
      },
    );
    workspace.debtObservations.push({
      id: "observation-reference-cross",
      ownerScope: OWNER,
      debtId: "debt-a",
      documentId: "document-a",
      authorityId: "authority-a",
      observedCollectionStage: "UNKNOWN",
      observedStatus: "PENDING_CONFIRMATION",
      referenceIds: ["reference-debt-cross"],
      evidenceIds: [],
      observedAt: NOW,
    });
    workspace.paymentPlans.push({
      id: "plan-cross",
      ownerScope: OWNER,
      sourceDocumentId: "document-b",
      caseId: "case-a",
      authorityId: "authority-b",
      grantStatus: "PROPOSED",
      status: "PENDING_CONFIRMATION",
      debtIds: ["debt-a"],
      installmentIds: ["installment-cross"],
    });
    workspace.installments.push({
      id: "installment-cross",
      ownerScope: OWNER,
      paymentPlanId: "plan-cross",
      sequence: 1,
      components: [],
      status: "PENDING_CONFIRMATION",
      evidenceIds: [],
      userConfirmed: false,
    });
    workspace.obligations.push({
      id: "obligation-cross",
      ownerScope: OWNER,
      sourceDocumentId: "document-a",
      caseId: "case-a",
      debtId: "debt-a",
      paymentPlanId: "plan-cross",
      installmentId: "installment-cross",
      type: "PAY",
      title: "Obligación sintética",
      description: "Revisión sintética",
      components: [],
      dueDateStatus: "UNKNOWN",
      status: "DRAFT",
      evidenceIds: [],
      userConfirmed: false,
    });
    workspace.deadlineRules.push({
      id: "deadline-cross",
      ownerScope: OWNER,
      documentId: "document-b",
      obligationId: "obligation-cross",
      triggerDateType: "DOCUMENT_DATE",
      startsNextDay: true,
      moveToNextBusinessDay: false,
      calendarJurisdiction: "ES-COMMON",
      sourceDocumentText: "Texto sintético",
      ruleId: "synthetic.deadline.rule",
      ruleVersion: 1,
      officialSourceIds: ["source.synthetic.official"],
      deterministicTrace: ["SYNTHETIC"],
      legalReviewStatus: "PENDING",
      provisional: true,
      evidenceIds: [],
    });
    workspace.evidence.push({
      id: "evidence-document-b",
      ownerScope: OWNER,
      documentId: "document-b",
      pageNumber: 1,
      textSnippet: "Dato sintético",
      extractionMethod: "RULE",
      confidence: "HIGH",
      assertionType: "EXPLICIT_IN_DOCUMENT",
    });
    workspace.timeline.push(
      {
        id: "timeline-cross",
        ownerScope: OWNER,
        caseId: "case-a",
        occurredAt: NOW,
        eventType: "OBLIGATION_CREATED",
        debtId: "debt-a",
        summary: "Evento sintético",
        evidenceIds: ["evidence-document-b"],
      },
      {
        id: "timeline-disjoint",
        ownerScope: OWNER,
        caseId: "case-a",
        occurredAt: NOW,
        eventType: "OBLIGATION_CREATED",
        debtId: "debt-disjoint",
        summary: "Evento sintético disjunto",
        evidenceIds: ["evidence-document-b"],
      },
    );
    workspace.accountingDrafts.push({
      id: "draft-cross",
      ownerScope: OWNER,
      documentId: "document-a",
      caseId: "case-a",
      debtId: "debt-a",
      installmentId: "installment-cross",
      status: "PENDING_CLASSIFICATION",
      components: [],
      totalCents: 0,
      requiresUserConfirmation: true,
      createsExpense: false,
      createsJournalEntry: false,
      createdAt: NOW,
    });

    const result = validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        { code: "DANGLING_REFERENCE", path: "workspace.references[0].debtId" },
        { code: "DANGLING_REFERENCE", path: "workspace.references[1].caseId" },
        { code: "INVALID_WORKSPACE", path: "workspace.references[2].caseId" },
        {
          code: "DANGLING_REFERENCE",
          path: "workspace.debtObservations[0].referenceIds[0]",
        },
        { code: "DANGLING_REFERENCE", path: "workspace.paymentPlans[0].debtIds[0]" },
        { code: "DANGLING_REFERENCE", path: "workspace.obligations[0].paymentPlanId" },
        { code: "DANGLING_REFERENCE", path: "workspace.obligations[0].installmentId" },
        { code: "DANGLING_REFERENCE", path: "workspace.deadlineRules[0].obligationId" },
        { code: "DANGLING_REFERENCE", path: "workspace.timeline[0].evidenceIds[0]" },
        { code: "DANGLING_REFERENCE", path: "workspace.timeline[1].evidenceIds[0]" },
        { code: "DANGLING_REFERENCE", path: "workspace.accountingDrafts[0].installmentId" },
      ]),
    );
  });

  it("rejects self, cyclic and non-monotonic analysis supersession", () => {
    const workspace = empty();
    workspace.packages.push({
      id: "package-lineage",
      ownerScope: OWNER,
      fileIds: ["file-lineage"],
      sourceChannel: "MANUAL_UPLOAD",
      processingStatus: "PENDING",
      securityScanStatus: "NOT_AVAILABLE",
      uploadedAt: NOW,
    });
    workspace.files.push({
      id: "file-lineage",
      packageId: "package-lineage",
      ownerScope: OWNER,
      role: "PRIMARY",
      originalFilename: "synthetic.pdf",
      mimeType: "application/pdf",
      fileSize: 100,
      pageCount: 1,
      sha256: "a".repeat(64),
      contentFingerprint: "b".repeat(64),
      storageReference: "synthetic-file",
      uploadedAt: NOW,
      isImmutableOriginal: true,
    });
    workspace.authorities.push({
      id: "authority-lineage",
      ownerScope: OWNER,
      administrationType: "AEAT",
      nameRaw: "Organismo sintético",
      nameNormalized: "ORGANISMO SINTETICO",
    });
    workspace.documents.push({
      id: "document-lineage",
      packageId: "package-lineage",
      fileId: "file-lineage",
      ownerScope: OWNER,
      documentType: "UNKNOWN",
      titleRaw: "Documento sintético",
      titleNormalized: "DOCUMENTO SINTETICO",
      authorityId: "authority-lineage",
      notificationDates: {},
      status: "DRAFT",
      urgency: "REVIEW",
      extractionVersion: "synthetic-v1",
      analysisStatus: "NEEDS_REVIEW",
      humanReviewStatus: "PENDING",
      authenticityStatus: "NOT_CHECKED",
      partIds: [],
      referenceIds: [],
      debtIds: [],
      caseIds: [],
      analysisSnapshotIds: ["snapshot-self", "snapshot-a", "snapshot-b"],
      createdAt: NOW,
      updatedAt: NOW,
    });
    const snapshot = (
      id: string,
      version: number,
      supersedesAnalysisId: string,
    ) => ({
      id,
      ownerScope: OWNER,
      documentId: "document-lineage",
      version,
      extractorVersion: "synthetic-v1",
      rulesVersion: "synthetic-v1",
      structuredData: {
        schemaVersion: 1 as const,
        documentType: "UNKNOWN" as const,
        paymentOptionIds: [],
        unknownFields: [],
        validationCodes: [],
        factSummary: [],
        calculatedSummary: [],
        inferenceSummary: [],
        userConfirmedSummary: [],
        documentFields: { title: "Documento sintético" },
      },
      plainLanguageExplanation: [],
      validationWarnings: [],
      evidenceIds: [],
      confidenceBand: "LOW" as const,
      requiresHumanReview: true,
      createdAt: NOW,
      createdBySystem: true,
      supersedesAnalysisId,
    });
    workspace.analysisSnapshots.push(
      snapshot("snapshot-self", 1, "snapshot-self"),
      snapshot("snapshot-a", 2, "snapshot-b"),
      snapshot("snapshot-b", 3, "snapshot-a"),
    );

    const result = validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.analysisSnapshots[0].supersedesAnalysisId",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.analysisSnapshots[1].supersedesAnalysisId",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.analysisSnapshots[2].supersedesAnalysisId",
        },
      ]),
    );
  });

  it("requires a canonical snapshot chain and exact audit entity semantics", () => {
    const workspace = empty();
    workspace.documents.push({
      id: "document-history",
      packageId: "package-missing",
      fileId: "file-missing",
      ownerScope: OWNER,
      documentType: "UNKNOWN",
      titleRaw: "Documento sintético",
      titleNormalized: "DOCUMENTO SINTETICO",
      authorityId: "authority-missing",
      notificationDates: {},
      status: "DRAFT",
      urgency: "REVIEW",
      extractionVersion: "synthetic-v1",
      analysisStatus: "NEEDS_REVIEW",
      humanReviewStatus: "PENDING",
      authenticityStatus: "NOT_CHECKED",
      partIds: [],
      referenceIds: [],
      debtIds: [],
      caseIds: [],
      analysisSnapshotIds: ["snapshot-2a", "snapshot-1", "snapshot-2b"],
      createdAt: NOW,
      updatedAt: NOW,
    });
    const snapshot = (
      id: string,
      version: number,
      supersedesAnalysisId?: string,
    ) => ({
      id,
      ownerScope: OWNER,
      documentId: "document-history",
      version,
      extractorVersion: "synthetic-v1",
      rulesVersion: "synthetic-v1",
      structuredData: {
        schemaVersion: 1 as const,
        documentType: "UNKNOWN" as const,
        paymentOptionIds: [],
        unknownFields: [],
        validationCodes: [],
        factSummary: [],
        calculatedSummary: [],
        inferenceSummary: [],
        userConfirmedSummary: [],
        documentFields: { title: "Documento sintético" },
      },
      plainLanguageExplanation: [],
      validationWarnings: [],
      evidenceIds: [],
      confidenceBand: "LOW" as const,
      requiresHumanReview: true,
      createdAt: NOW,
      createdBySystem: true,
      ...(supersedesAnalysisId ? { supersedesAnalysisId } : {}),
    });
    workspace.analysisSnapshots.push(
      snapshot("snapshot-1", 1),
      snapshot("snapshot-2a", 2, "snapshot-1"),
      snapshot("snapshot-2b", 2, "snapshot-1"),
    );
    workspace.auditEvents.push({
      id: "audit-semantic-mismatch",
      ownerScope: OWNER,
      eventType: "PAYMENT_CONFIRMED",
      entityType: "DOCUMENT",
      entityId: "document-history",
      actorScope: "SYSTEM",
      occurredAt: NOW,
      safeMetadata: { sequence: 1 },
    });

    const result = validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.documents[0].analysisSnapshotIds[0]",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.documents[0].analysisSnapshotIds[1]",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.documents[0].analysisSnapshotIds[2]",
        },
        {
          code: "INVALID_WORKSPACE",
          path: "workspace.auditEvents[0].entityType",
        },
      ]),
    );
  });

  it("keeps validation linear, issue-bounded and output-isolated", () => {
    const highBound = empty();
    highBound.authorities.push(
      ...Array.from({ length: 1_000 }, (_, index) => ({
        id: `authority-${index}`,
        ownerScope: OWNER,
        administrationType: "AEAT" as const,
        nameRaw: `Organismo sintético ${index}`,
        nameNormalized: `ORGANISMO SINTETICO ${index}`,
      })),
    );
    expect(
      validateFiscalNotificationsWorkspaceIntegrity(highBound, OWNER),
    ).toEqual({ valid: true, issues: [] });

    const issueHeavy = empty();
    (issueHeavy.authorities as unknown[]).push(
      ...Array.from({ length: 600 }, (_, index) => ({
        id: `invalid-authority-${index}`,
        ownerScope: OWNER,
      })),
    );
    const bounded = validateFiscalNotificationsWorkspaceIntegrity(
      issueHeavy,
      OWNER,
    );
    expect(bounded.valid).toBe(false);
    expect(bounded.issues).toHaveLength(512);

    const first = validateFiscalNotificationsWorkspaceIntegrity(empty(), OWNER);
    const second = validateFiscalNotificationsWorkspaceIntegrity(empty(), OWNER);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.issues)).toBe(true);
    expect(first).not.toBe(second);
    expect(first.issues).not.toBe(second.issues);
  });

  it("requires projection evidence to belong to the same document", () => {
    const workspace = empty();
    workspace.packages.push({
      id: "package-1",
      ownerScope: OWNER,
      fileIds: ["file-1"],
      sourceChannel: "MANUAL_UPLOAD",
      processingStatus: "CONFIRMED",
      securityScanStatus: "NOT_AVAILABLE",
      uploadedAt: NOW,
    });
    workspace.files.push({
      id: "file-1",
      packageId: "package-1",
      ownerScope: OWNER,
      role: "PRIMARY",
      originalFilename: "synthetic.pdf",
      mimeType: "application/pdf",
      fileSize: 100,
      pageCount: 1,
      sha256: "a".repeat(64),
      contentFingerprint: "b".repeat(64),
      storageReference: "synthetic-file",
      uploadedAt: NOW,
      isImmutableOriginal: true,
    });
    workspace.authorities.push({
      id: "authority-1",
      ownerScope: OWNER,
      administrationType: "AEAT",
      nameRaw: "Organismo sintético",
      nameNormalized: "ORGANISMO SINTETICO",
    });
    const document = (id: string, snapshots: string[]) => ({
      id,
      packageId: "package-1",
      fileId: "file-1",
      ownerScope: OWNER,
      documentType: "UNKNOWN" as const,
      titleRaw: "Documento sintético",
      titleNormalized: "DOCUMENTO SINTETICO",
      authorityId: "authority-1",
      notificationDates: {},
      status: "DRAFT" as const,
      urgency: "REVIEW" as const,
      extractionVersion: "synthetic-v1",
      analysisStatus: "NEEDS_REVIEW" as const,
      humanReviewStatus: "PENDING" as const,
      authenticityStatus: "NOT_CHECKED" as const,
      partIds: [],
      referenceIds: [],
      debtIds: [],
      caseIds: [],
      analysisSnapshotIds: snapshots,
      createdAt: NOW,
      updatedAt: NOW,
    });
    workspace.documents.push(document("document-1", ["snapshot-1"]));
    workspace.documents.push(document("document-2", []));
    workspace.evidence.push({
      id: "evidence-other-document",
      ownerScope: OWNER,
      documentId: "document-2",
      pageNumber: 1,
      textSnippet: "Dato sintético",
      extractionMethod: "RULE",
      confidence: "HIGH",
      assertionType: "EXPLICIT_IN_DOCUMENT",
    });
    const baseProjection = createEmptyAdministrativeDomainProjection({
      ownerScope: OWNER,
      documentId: "document-1",
      extractorId: "synthetic-extractor",
      extractorVersion: "v1",
      createdAt: NOW,
    });
    workspace.analysisSnapshots.push({
      id: "snapshot-1",
      ownerScope: OWNER,
      documentId: "document-1",
      version: 1,
      extractorVersion: "synthetic-extractor-v1",
      rulesVersion: "synthetic-rules-v1",
      structuredData: {
        schemaVersion: 1,
        documentType: "UNKNOWN",
        paymentOptionIds: [],
        unknownFields: [
          {
            labelRaw: "Campo sintético",
            valueRaw: "Valor sintético",
            page: 1,
            evidenceId: "evidence-other-document",
            confidence: "HIGH",
          },
        ],
        validationCodes: [],
        factSummary: [],
        calculatedSummary: [],
        inferenceSummary: [],
        userConfirmedSummary: [],
        documentFields: { title: "Documento sintético" },
        administrativeDomain: {
          ...baseProjection,
          roleAssertions: [
            {
              id: "role-1",
              ownerScope: OWNER,
              documentId: "document-1",
              partyRefId: "party-owner",
              role: "TAX_DEBTOR",
              assertionType: "EXPLICIT_IN_DOCUMENT",
              confidence: 0.8,
              evidenceIds: ["evidence-other-document"],
              createdAt: NOW,
            },
          ],
        },
      },
      plainLanguageExplanation: [],
      validationWarnings: [],
      evidenceIds: [],
      confidenceBand: "LOW",
      requiresHumanReview: true,
      createdAt: NOW,
      createdBySystem: true,
    });

    const result = validateFiscalNotificationsWorkspaceIntegrity(workspace, OWNER);
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DANGLING_REFERENCE" }),
        {
          code: "DANGLING_REFERENCE",
          path: "workspace.analysisSnapshots[0].structuredData.unknownFields[0].evidenceId",
        },
      ]),
    );
  });

  it("counts nested ids globally and rejects over-key records before copying", () => {
    const nestedIds = empty();
    const sourceIds = ["a", "b", "c", "d"].map((prefix) =>
      prefix.padEnd(FISCAL_NOTIFICATION_INPUT_LIMITS.maxIdChars, prefix),
    );
    (nestedIds.paymentOptions as unknown[]).push({
      id: "payment-option-text-budget",
      ownerScope: OWNER,
      documentId: "document-missing",
      title: "Opción sintética",
      eligibilityCondition: "Revisión humana",
      components: Array.from({ length: 8_000 }, () => ({
        type: "PRINCIPAL",
        amountCents: 100,
        assertionType: "EXPLICIT_IN_DOCUMENT",
        evidenceIds: [],
        deterministicTrace: {
          ruleId: "synthetic-rule",
          ruleVersion: 1,
          officialSourceIds: sourceIds,
          inputEvidenceIds: [],
        },
      })),
      deadlineStatus: "UNKNOWN",
      evidenceIds: [],
    });
    expect(
      validateFiscalNotificationsWorkspaceIntegrity(nestedIds, OWNER).issues,
    ).toContainEqual({
      code: "TEXT_LIMIT_EXCEEDED",
      path: "workspace.text",
    });

    const tooManyKeys = empty();
    const target = Object.fromEntries(
      Array.from(
        { length: FISCAL_NOTIFICATION_INPUT_LIMITS.maxRelationKeys + 1 },
        (_, index) => [`synthetic-${index}`, index],
      ),
    );
    const hostileRecord = new Proxy(target, {
      getOwnPropertyDescriptor() {
        throw new Error("record values must not be copied over the key cap");
      },
    });
    (tooManyKeys.authorities as unknown[]).push(hostileRecord);
    expect(() =>
      validateFiscalNotificationsWorkspaceIntegrity(tooManyKeys, OWNER),
    ).not.toThrow();
    expect(
      validateFiscalNotificationsWorkspaceIntegrity(tooManyKeys, OWNER).issues,
    ).toContainEqual({
      code: "INVALID_WORKSPACE",
      path: "workspace.authorities[0]",
    });
  });
});
