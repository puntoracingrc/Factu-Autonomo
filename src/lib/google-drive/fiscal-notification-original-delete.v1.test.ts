import { afterEach, describe, expect, it, vi } from "vitest";
import {
  restoreFiscalNotificationOriginalWithAccessTokenV1,
  trashFiscalNotificationOriginalWithAccessTokenV1,
} from "./fiscal-notification-original-delete.v1";

const REQUEST = Object.freeze({
  driveFileId: "drive_original_1",
  expectedSha256: "a".repeat(64),
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("explicit fiscal notification original deletion in user Drive", () => {
  it("moves only the exact Factu-managed PDF to trash and verifies readback", async () => {
    let trashed = false;
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, init?: RequestInit) => {
        if (init?.method === "PATCH") {
          expect(init.body).toBe(JSON.stringify({ trashed: true }));
          trashed = true;
          return json({ id: REQUEST.driveFileId, trashed: true });
        }
        return json(metadata(trashed));
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      trashFiscalNotificationOriginalWithAccessTokenV1(
        REQUEST,
        "synthetic-access-token",
      ),
    ).resolves.toEqual({
      ok: true,
      changedByOperation: true,
      disposition: "MOVED_TO_TRASH",
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("is idempotent when the exact managed original is already in trash", async () => {
    const fetchMock = vi.fn(async () => json(metadata(true)));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      trashFiscalNotificationOriginalWithAccessTokenV1(
        REQUEST,
        "synthetic-access-token",
      ),
    ).resolves.toEqual({
      ok: true,
      changedByOperation: false,
      disposition: "ALREADY_IN_TRASH",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails closed for another file, policy or SHA without patching it", async () => {
    for (const candidate of [
      { ...metadata(false), id: "another_file" },
      {
        ...metadata(false),
        appProperties: {
          ...metadata(false).appProperties,
          factuManaged: "another-policy",
        },
      },
      {
        ...metadata(false),
        appProperties: {
          ...metadata(false).appProperties,
          factuSourceSha256: "b".repeat(64),
        },
      },
    ]) {
      const fetchMock = vi.fn(async () => json(candidate));
      vi.stubGlobal("fetch", fetchMock);
      await expect(
        trashFiscalNotificationOriginalWithAccessTokenV1(
          REQUEST,
          "synthetic-access-token",
        ),
      ).resolves.toEqual({
        ok: false,
        error:
          "El archivo de Drive no coincide con el original verificado por Factu.",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      vi.unstubAllGlobals();
    }
  });

  it("restores the managed original after a later local failure", async () => {
    let trashed = true;
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, init?: RequestInit) => {
        if (init?.method === "PATCH") {
          expect(init.body).toBe(JSON.stringify({ trashed: false }));
          trashed = false;
          return json({ id: REQUEST.driveFileId, trashed: false });
        }
        return json(metadata(trashed));
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      restoreFiscalNotificationOriginalWithAccessTokenV1(
        REQUEST,
        "synthetic-access-token",
      ),
    ).resolves.toEqual({ ok: true, disposition: "RESTORED" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("rejects malformed identifiers and hashes before network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      trashFiscalNotificationOriginalWithAccessTokenV1(
        { driveFileId: "bad/id", expectedSha256: "a".repeat(64) },
        "synthetic-access-token",
      ),
    ).resolves.toEqual({
      ok: false,
      error: "El enlace verificado con Google Drive no es válido.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function metadata(trashed: boolean) {
  return {
    id: REQUEST.driveFileId,
    mimeType: "application/pdf",
    trashed,
    appProperties: {
      factuManaged: "fiscal-notification-original-v1",
      factuSourceSha256: REQUEST.expectedSha256,
    },
  };
}

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
