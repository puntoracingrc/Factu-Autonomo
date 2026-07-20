import { describe, expect, it, vi } from "vitest";
import type { FiscalNotificationsWorkspace } from "./types";
import {
  FISCAL_NOTIFICATION_BATCH_MAX_FILES_V1,
  fingerprintFiscalNotificationBatchFileV1,
  readPersistedFiscalNotificationHashesV1,
} from "./batch-intake.v1";

const OWNER = "user:batch-intake";
const HASH = "a".repeat(64);

describe("fiscal notification batch intake v1", () => {
  it("fingerprints a bounded PDF without retaining its bytes", async () => {
    const bytes = pdfBytes();
    const digestSha256 = vi.fn(
      async () => new Uint8Array(32).fill(0xab).buffer,
    );

    const result = await fingerprintFiscalNotificationBatchFileV1(
      file("notificacion.pdf", bytes),
      undefined,
      { digestSha256 },
    );

    expect(FISCAL_NOTIFICATION_BATCH_MAX_FILES_V1).toBe(50);
    expect(result).toEqual({
      byteLength: bytes.byteLength,
      displayName: "notificacion.pdf",
      mimeType: "application/pdf",
      sha256: "ab".repeat(32),
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(digestSha256).toHaveBeenCalledOnce();
    expect(JSON.stringify(result)).not.toContain("%PDF");
  });

  it.each([
    [file("notificacion.png", pdfBytes(), "image/png"), "UNSUPPORTED_FILE"],
    [file("notificacion.pdf", new Uint8Array()), "EMPTY_FILE"],
    [
      file("notificacion.pdf", new TextEncoder().encode("not a pdf")),
      "INVALID_PDF",
    ],
    [file(" notificacion.pdf", pdfBytes()), "INVALID_FILE_NAME"],
    [file("notificacion\u0000.pdf", pdfBytes()), "INVALID_FILE_NAME"],
    [
      {
        ...file("notificacion.pdf", pdfBytes()),
        size: 4 * 1024 * 1024 + 1,
      },
      "FILE_TOO_LARGE",
    ],
  ] as const)(
    "rejects an invalid candidate without coercion",
    async (candidate, code) => {
      await expect(
        fingerprintFiscalNotificationBatchFileV1(candidate, undefined, {
          digestSha256: async () => new Uint8Array(32).buffer,
        }),
      ).rejects.toMatchObject({ code });
    },
  );

  it("aborts before reading and rejects malformed digests", async () => {
    const controller = new AbortController();
    controller.abort();
    const arrayBuffer = vi.fn(async () => pdfBytes().buffer);
    await expect(
      fingerprintFiscalNotificationBatchFileV1(
        {
          name: "notificacion.pdf",
          size: pdfBytes().byteLength,
          type: "application/pdf",
          arrayBuffer,
        },
        controller.signal,
      ),
    ).rejects.toMatchObject({ code: "ABORTED" });
    expect(arrayBuffer).not.toHaveBeenCalled();

    await expect(
      fingerprintFiscalNotificationBatchFileV1(
        file("notificacion.pdf", pdfBytes()),
        undefined,
        {
          digestSha256: async () => new Uint8Array(8).buffer,
        },
      ),
    ).rejects.toMatchObject({ code: "HASH_UNAVAILABLE" });
  });

  it("copies only active document hashes from a validated workspace of the same owner", () => {
    const workspace = emptyWorkspace();
    appendSource(workspace);
    appendSavedDocument(workspace);

    const result = readPersistedFiscalNotificationHashesV1(workspace, OWNER);
    expect(result).toEqual({ status: "READY", sha256: [HASH] });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.sha256)).toBe(true);

    workspace.files[0]!.sha256 = "b".repeat(64);
    expect(result.sha256).toEqual([HASH]);
  });

  it("does not block re-import with a legacy source no longer linked to a saved document", () => {
    const workspace = emptyWorkspace();
    appendSource(workspace);

    expect(readPersistedFiscalNotificationHashesV1(workspace, OWNER)).toEqual({
      status: "READY",
      sha256: [],
    });
  });

  it("fails closed for a foreign or invalid workspace", () => {
    expect(
      readPersistedFiscalNotificationHashesV1(emptyWorkspace(), OWNER),
    ).toEqual({
      status: "READY",
      sha256: [],
    });
    expect(
      readPersistedFiscalNotificationHashesV1(emptyWorkspace(), "user:other"),
    ).toEqual({ status: "BLOCKED", sha256: [] });
    expect(readPersistedFiscalNotificationHashesV1({}, OWNER)).toEqual({
      status: "BLOCKED",
      sha256: [],
    });
  });

  it("admits the first PDF only when the workspace is genuinely absent", () => {
    expect(readPersistedFiscalNotificationHashesV1(undefined, OWNER)).toEqual({
      status: "BLOCKED",
      sha256: [],
    });
    expect(
      readPersistedFiscalNotificationHashesV1(undefined, OWNER, {
        allowAbsentWorkspace: true,
      }),
    ).toEqual({ status: "READY", sha256: [] });
    expect(
      readPersistedFiscalNotificationHashesV1(null, OWNER, {
        allowAbsentWorkspace: true,
      }),
    ).toEqual({ status: "READY", sha256: [] });

    expect(
      readPersistedFiscalNotificationHashesV1({}, OWNER, {
        allowAbsentWorkspace: true,
      }),
    ).toEqual({ status: "BLOCKED", sha256: [] });
    expect(
      readPersistedFiscalNotificationHashesV1(undefined, " user:batch-intake", {
        allowAbsentWorkspace: true,
      }),
    ).toEqual({ status: "BLOCKED", sha256: [] });
  });
});

function pdfBytes(): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(
    "%PDF-1.7\nsynthetic",
  ) as Uint8Array<ArrayBuffer>;
}

function file(
  name: string,
  bytes: Uint8Array<ArrayBuffer>,
  type = "application/pdf",
) {
  return {
    name,
    size: bytes.byteLength,
    type,
    arrayBuffer: async () => bytes.slice().buffer,
  };
}

function emptyWorkspace(): FiscalNotificationsWorkspace {
  return {
    schemaVersion: 1,
    workspaceId: "workspace-batch-intake",
    ownerScope: OWNER,
    revision: 0,
    createdAt: "2026-07-15T06:00:00.000Z",
    updatedAt: "2026-07-15T06:00:00.000Z",
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

function appendSource(workspace: FiscalNotificationsWorkspace): void {
  workspace.files.push({
    id: "file-1",
    packageId: "package-1",
    ownerScope: OWNER,
    role: "PRIMARY",
    mimeType: "application/pdf",
    fileSize: 50,
    pageCount: 1,
    sha256: HASH,
    contentFingerprint: HASH,
    uploadedAt: "2026-07-15T06:00:00.000Z",
    sourceContentRetention: "NOT_RETAINED",
  });
  workspace.packages.push({
    id: "package-1",
    ownerScope: OWNER,
    sourceChannel: "MANUAL_UPLOAD",
    fileIds: ["file-1"],
    processingStatus: "NEEDS_REVIEW",
    securityScanStatus: "NOT_AVAILABLE",
    uploadedAt: "2026-07-15T06:00:00.000Z",
  });
}

function appendSavedDocument(workspace: FiscalNotificationsWorkspace): void {
  workspace.authorities.push({
    id: "authority-1",
    ownerScope: OWNER,
    administrationType: "AEAT",
    nameRaw: "Agencia Tributaria",
    nameNormalized: "AGENCIA TRIBUTARIA",
  });
  workspace.documents.push({
    id: "document-1",
    packageId: "package-1",
    fileId: "file-1",
    ownerScope: OWNER,
    documentType: "GENERIC_ADMINISTRATIVE_NOTICE",
    titleRaw: "Documento sintético",
    titleNormalized: "DOCUMENTO SINTETICO",
    authorityId: "authority-1",
    notificationDates: {},
    status: "UNKNOWN",
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
    createdAt: "2026-07-15T06:00:00.000Z",
    updatedAt: "2026-07-15T06:00:00.000Z",
  });
}
