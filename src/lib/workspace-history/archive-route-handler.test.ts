import { beforeEach, describe, expect, it, vi } from "vitest";

import { normalizeLoadedData } from "@/lib/storage";
import { EMPTY_DATA, type Document } from "@/lib/types";

import { buildHistoricalWorkspaceArchive } from "./archive";
import {
  CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_ROUTE,
  createHistoricalWorkspaceArchiveRouteHandler,
  type HistoricalWorkspaceArchiveRouteDependencies,
} from "./archive-route-handler";

const ARCHIVE_ID = "11111111-1111-4111-8111-111111111111";

function invoice(): Document {
  return normalizeLoadedData({
    ...EMPTY_DATA,
    snapshotIntegrityVersion: 1,
    documents: [
      {
        id: "invoice-1",
        type: "factura",
        number: "F-2025-0001",
        date: "2025-01-01",
        client: { name: "Cliente" },
        items: [
          {
            id: "line-1",
            description: "Servicio",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
        status: "borrador",
        createdAt: "2025-01-01T10:00:00.000Z",
        updatedAt: "2025-01-01T10:00:00.000Z",
      },
    ],
  }).documents[0]!;
}

function dependencies() {
  const status = {
    archiveId: ARCHIVE_ID,
    status: "ready" as const,
    expectedDocumentCount: 1,
    storedDocumentCount: 1,
    manifestHash: `sha256:${"a".repeat(64)}`,
    completedAt: "2026-09-08T12:00:00.000Z",
  };
  return {
    authenticate: vi
      .fn<HistoricalWorkspaceArchiveRouteDependencies["authenticate"]>()
      .mockResolvedValue({ userId: "user-1", sessionId: "session-1" }),
    rateLimit: vi
      .fn<HistoricalWorkspaceArchiveRouteDependencies["rateLimit"]>()
      .mockResolvedValue({ allowed: true }),
    verifyDevice: vi
      .fn<HistoricalWorkspaceArchiveRouteDependencies["verifyDevice"]>()
      .mockResolvedValue({ allowed: true, deviceId: "device-1" }),
    readStatus: vi
      .fn<HistoricalWorkspaceArchiveRouteDependencies["readStatus"]>()
      .mockResolvedValue(status),
    readPage: vi
      .fn<HistoricalWorkspaceArchiveRouteDependencies["readPage"]>()
      .mockResolvedValue([]),
    begin: vi
      .fn<HistoricalWorkspaceArchiveRouteDependencies["begin"]>()
      .mockResolvedValue(status),
    append: vi
      .fn<HistoricalWorkspaceArchiveRouteDependencies["append"]>()
      .mockResolvedValue({ archiveId: ARCHIVE_ID, storedDocumentCount: 1 }),
    finalize: vi
      .fn<HistoricalWorkspaceArchiveRouteDependencies["finalize"]>()
      .mockResolvedValue(status),
  } satisfies HistoricalWorkspaceArchiveRouteDependencies;
}

describe("historical workspace archive route handler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated confirmed session", async () => {
    const deps = dependencies();
    deps.authenticate.mockResolvedValueOnce(null);
    const handler = createHistoricalWorkspaceArchiveRouteHandler(deps);

    const response = await handler.handle({
      method: "GET",
      headers: new Headers(),
      url: "https://example.test/api/workspace-history/archive",
    });

    expect(response.status).toBe(401);
    expect(deps.readStatus).not.toHaveBeenCalled();
    expect(response.headers["Cache-Control"]).toContain("no-store");
  });

  it("returns the tenant archive status without payloads", async () => {
    const deps = dependencies();
    const handler = createHistoricalWorkspaceArchiveRouteHandler(deps);

    const response = await handler.handle({
      method: "GET",
      headers: new Headers({
        Authorization: "Bearer token",
        "X-Factu-Device-Token": "device-token",
      }),
      url: "https://example.test/api/workspace-history/archive?action=status",
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      schema: CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_ROUTE,
      archive: { archiveId: ARCHIVE_ID, status: "ready" },
    });
    expect(deps.readStatus).toHaveBeenCalledWith("user-1");
  });

  it("rejects a ready archive that is incomplete or lacks final confirmation", async () => {
    for (const invalidStatus of [
      {
        archiveId: ARCHIVE_ID,
        status: "ready" as const,
        expectedDocumentCount: 2,
        storedDocumentCount: 1,
        manifestHash: `sha256:${"a".repeat(64)}`,
        completedAt: "2026-09-08T12:00:00.000Z",
      },
      {
        archiveId: ARCHIVE_ID,
        status: "ready" as const,
        expectedDocumentCount: 1,
        storedDocumentCount: 1,
        manifestHash: `sha256:${"a".repeat(64)}`,
        completedAt: null,
      },
    ]) {
      const deps = dependencies();
      deps.readStatus.mockResolvedValueOnce(invalidStatus);
      const handler = createHistoricalWorkspaceArchiveRouteHandler(deps);

      const response = await handler.handle({
        method: "GET",
        headers: new Headers({
          Authorization: "Bearer token",
          "X-Factu-Device-Token": "device-token",
        }),
        url: "https://example.test/api/workspace-history/archive?action=status",
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        ok: false,
        error: { code: "INVALID_STORAGE" },
      });
    }
  });

  it("checks every document hash before appending", async () => {
    const deps = dependencies();
    const manifest = buildHistoricalWorkspaceArchive([invoice()], ARCHIVE_ID);
    const handler = createHistoricalWorkspaceArchiveRouteHandler(deps);
    const changed = {
      ...manifest.documents[0]!,
      payload: { ...manifest.documents[0]!.payload, notes: "Manipulado" },
    };

    const response = await handler.handle({
      method: "POST",
      headers: new Headers({
        Authorization: "Bearer token",
        "X-Factu-Device-Token": "device-token",
      }),
      readBody: async () =>
        JSON.stringify({
          action: "append",
          archiveId: ARCHIVE_ID,
          documents: [changed],
        }),
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: "INVALID_DOCUMENT" },
    });
    expect(deps.append).not.toHaveBeenCalled();
  });

  it("serves a ready archive through a bounded keyset page", async () => {
    const deps = dependencies();
    const manifest = buildHistoricalWorkspaceArchive([invoice()], ARCHIVE_ID);
    deps.readStatus.mockResolvedValueOnce({
      archiveId: ARCHIVE_ID,
      status: "ready",
      expectedDocumentCount: 1,
      storedDocumentCount: 1,
      manifestHash: manifest.manifestHash,
      completedAt: "2026-09-08T12:00:00.000Z",
    });
    deps.readPage.mockResolvedValueOnce(manifest.documents);
    const handler = createHistoricalWorkspaceArchiveRouteHandler(deps);

    const response = await handler.handle({
      method: "GET",
      headers: new Headers({
        Authorization: "Bearer token",
        "X-Factu-Device-Token": "device-token",
      }),
      url: "https://example.test/api/workspace-history/archive?action=pull&limit=50",
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      documents: [{ localDocumentId: "invoice-1" }],
      hasMore: false,
      nextAfter: "invoice-1",
    });
    expect(deps.readPage).toHaveBeenCalledWith({
      userId: "user-1",
      archiveId: ARCHIVE_ID,
      after: "",
      limit: 50,
    });
  });
});
