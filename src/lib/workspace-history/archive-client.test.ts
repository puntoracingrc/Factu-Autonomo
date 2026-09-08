import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setActiveWorkspaceOwnerScope } from "@/lib/workspace-owner-runtime";
import type { Document } from "@/lib/types";

import { buildHistoricalWorkspaceArchive } from "./archive";
import {
  getHistoricalWorkspaceArchiveStatusFromBrowser,
  pullHistoricalWorkspaceArchiveFromBrowser,
  uploadHistoricalWorkspaceArchiveFromBrowser,
} from "./archive-client";

const OWNER = "historical-archive-owner";
const ARCHIVE_ID = "11111111-1111-4111-8111-111111111111";
const ROUTE_SCHEMA = "CENTRAL_WORKSPACE_HISTORICAL_ARCHIVE_ROUTE_V1";

function invoice(index: number): Document {
  const sequence = String(index).padStart(4, "0");
  return {
    id: `historical-${sequence}`,
    type: "factura",
    number: `F-2025-${sequence}`,
    date: "2025-05-01",
    client: { name: `Cliente ${index}` },
    items: [
      {
        id: `line-${sequence}`,
        description: "Servicio",
        quantity: 1,
        unitPrice: index,
        ivaPercent: 21,
      },
    ],
    status: "borrador",
    createdAt: "2025-05-01T10:00:00.000Z",
    updatedAt: "2025-05-01T10:00:00.000Z",
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return Response.json(body, { status });
}

function statusFor(
  manifest: ReturnType<typeof buildHistoricalWorkspaceArchive>,
  status: "uploading" | "ready",
  storedDocumentCount: number,
) {
  return {
    archiveId: manifest.archiveId,
    status,
    expectedDocumentCount: manifest.documentCount,
    storedDocumentCount,
    manifestHash: manifest.manifestHash,
    completedAt: status === "ready" ? "2026-09-08T12:00:00.000Z" : null,
  };
}

describe("historical workspace archive client", () => {
  beforeEach(() => setActiveWorkspaceOwnerScope(OWNER));
  afterEach(() => setActiveWorkspaceOwnerScope(null));

  it("does not contact the archive route without both credentials", async () => {
    const fetchImpl = vi.fn();
    const result = await getHistoricalWorkspaceArchiveStatusFromBrowser({
      expectedOwnerScope: OWNER,
      fetchImpl,
      getAccessToken: async () => null,
      getDeviceToken: () => "device-token",
    });

    expect(result).toMatchObject({
      ok: false,
      code: "HISTORICAL_ARCHIVE_SESSION_REQUIRED",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a ready status until every document is stored and finalized", async () => {
    for (const archive of [
      {
        archiveId: ARCHIVE_ID,
        status: "ready",
        expectedDocumentCount: 2,
        storedDocumentCount: 1,
        manifestHash: `sha256:${"a".repeat(64)}`,
        completedAt: "2026-09-08T12:00:00.000Z",
      },
      {
        archiveId: ARCHIVE_ID,
        status: "ready",
        expectedDocumentCount: 1,
        storedDocumentCount: 1,
        manifestHash: `sha256:${"a".repeat(64)}`,
        completedAt: null,
      },
    ]) {
      const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(
        jsonResponse(200, {
          ok: true,
          schema: ROUTE_SCHEMA,
          archive,
        }),
      );

      await expect(
        getHistoricalWorkspaceArchiveStatusFromBrowser({
          expectedOwnerScope: OWNER,
          fetchImpl,
          getAccessToken: async () => "access-token",
          getDeviceToken: () => "device-token",
        }),
      ).resolves.toMatchObject({
        ok: false,
        status: 502,
        code: "HISTORICAL_ARCHIVE_INVALID_RESPONSE",
      });
    }
  });

  it("uploads, verifies and finalizes an archive with tenant credentials", async () => {
    const documents = [invoice(1), invoice(2)];
    let manifest: ReturnType<typeof buildHistoricalWorkspaceArchive> | null = null;
    const actions: string[] = [];
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      actions.push(String(body.action));
      if (body.action === "begin") {
        manifest = buildHistoricalWorkspaceArchive(
          documents,
          String(body.archiveId),
        );
        return jsonResponse(200, {
          ok: true,
          schema: ROUTE_SCHEMA,
          archive: statusFor(manifest, "uploading", 0),
        });
      }
      if (!manifest) throw new Error("manifest missing");
      if (body.action === "append") {
        return jsonResponse(200, {
          ok: true,
          schema: ROUTE_SCHEMA,
          progress: {
            archiveId: manifest.archiveId,
            storedDocumentCount: manifest.documentCount,
          },
        });
      }
      return jsonResponse(200, {
        ok: true,
        schema: ROUTE_SCHEMA,
        archive: statusFor(manifest, "ready", manifest.documentCount),
      });
    });

    const result = await uploadHistoricalWorkspaceArchiveFromBrowser(documents, {
      dependencies: {
        expectedOwnerScope: OWNER,
        fetchImpl,
        getAccessToken: async () => "access-token",
        getDeviceToken: () => "device-token",
      },
    });

    expect(result).toMatchObject({
      ok: true,
      value: { archive: { status: "ready", storedDocumentCount: 2 } },
    });
    expect(actions).toEqual(["begin", "append", "finalize"]);
    for (const [, init] of fetchImpl.mock.calls) {
      expect(init).toMatchObject({
        method: "POST",
        cache: "no-store",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
          "X-Factu-Device-Token": "device-token",
        }),
      });
    }
  });

  it("downloads a ready archive and rejects altered payloads", async () => {
    const manifest = buildHistoricalWorkspaceArchive(
      [invoice(1), invoice(2)],
      ARCHIVE_ID,
    );
    const ready = statusFor(manifest, "ready", manifest.documentCount);
    const validFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          ok: true,
          schema: ROUTE_SCHEMA,
          archive: ready,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          ok: true,
          schema: ROUTE_SCHEMA,
          archive: ready,
          documents: manifest.documents,
          nextAfter: manifest.documents.at(-1)!.localDocumentId,
          hasMore: false,
        }),
      );

    await expect(
      pullHistoricalWorkspaceArchiveFromBrowser({
        expectedOwnerScope: OWNER,
        fetchImpl: validFetch,
        getAccessToken: async () => "access-token",
        getDeviceToken: () => "device-token",
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        archiveId: ARCHIVE_ID,
        documentCount: 2,
        manifestHash: manifest.manifestHash,
      },
    });

    const altered = manifest.documents.map((entry, index) =>
      index === 0
        ? { ...entry, payload: { ...entry.payload, notes: "altered" } }
        : entry,
    );
    const alteredFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          ok: true,
          schema: ROUTE_SCHEMA,
          archive: ready,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          ok: true,
          schema: ROUTE_SCHEMA,
          archive: ready,
          documents: altered,
          nextAfter: altered.at(-1)!.localDocumentId,
          hasMore: false,
        }),
      );

    await expect(
      pullHistoricalWorkspaceArchiveFromBrowser({
        expectedOwnerScope: OWNER,
        fetchImpl: alteredFetch,
        getAccessToken: async () => "access-token",
        getDeviceToken: () => "device-token",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "DOCUMENT_HASH_MISMATCH",
    });
  });
});
