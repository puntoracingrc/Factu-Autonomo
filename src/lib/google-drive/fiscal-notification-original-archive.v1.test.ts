import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FISCAL_NOTIFICATION_DRIVE_ARCHIVE_PENDING_FOLDER_V1,
  FISCAL_NOTIFICATION_DRIVE_ARCHIVE_ROOT_FOLDER_V1,
  buildFiscalNotificationDriveArchiveFileNameV1,
  buildFiscalNotificationDriveArchiveFolderPathV1,
  uploadFiscalNotificationOriginalToGoogleDriveWithAccessTokenV1,
} from "./fiscal-notification-original-archive.v1";

const PDF_BYTES = new TextEncoder().encode("%PDF-1.7\nsynthetic\n%%EOF");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fiscal notification original archive in user Drive", () => {
  it("organizes by exact document year/month and never by scan time", () => {
    expect(buildFiscalNotificationDriveArchiveFolderPathV1("2026-07-15")).toEqual([
      FISCAL_NOTIFICATION_DRIVE_ARCHIVE_ROOT_FOLDER_V1,
      "2026",
      "07",
    ]);
    expect(buildFiscalNotificationDriveArchiveFolderPathV1(null)).toEqual([
      FISCAL_NOTIFICATION_DRIVE_ARCHIVE_ROOT_FOLDER_V1,
      FISCAL_NOTIFICATION_DRIVE_ARCHIVE_PENDING_FOLDER_V1,
    ]);
    expect(() =>
      buildFiscalNotificationDriveArchiveFolderPathV1("2026-02-31"),
    ).toThrow("FISCAL_NOTIFICATION_DRIVE_INVALID_DATE");
  });

  it("builds a safe, useful Drive name without using the local filename", () => {
    expect(
      buildFiscalNotificationDriveArchiveFileNameV1({
        documentDate: "2026-07-15",
        documentTitle: "Diligencia / de embargo: valores",
        sha256: "a".repeat(64),
      }),
    ).toBe("2026-07-15 - Diligencia de embargo valores - aaaaaaaaaa.pdf");
  });

  it("creates the hierarchy, uploads only after the call and verifies exact readback", async () => {
    const sha256 = await hash(PDF_BYTES);
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    let folderIndex = 0;
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, init });
      if (url.includes("appProperties")) return json({ files: [] });
      if (url.includes("/drive/v3/files?") && init?.method !== "POST") {
        return json({ files: [] });
      }
      if (url.endsWith("/drive/v3/files?fields=id") && init?.method === "POST") {
        folderIndex += 1;
        return json({ id: `folder_${folderIndex}` });
      }
      if (url.includes("/upload/drive/v3/files")) {
        return json({
          id: "drive_file_1",
          name: "archivo.pdf",
          parents: ["folder_3"],
          webViewLink: "https://drive.google.com/file/d/drive_file_1/view",
        });
      }
      if (url.includes("drive_file_1?alt=media")) {
        return binary(PDF_BYTES);
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadFiscalNotificationOriginalToGoogleDriveWithAccessTokenV1(
      {
        file: syntheticFile(PDF_BYTES),
        expectedSha256: sha256,
        documentDate: "2026-07-15",
        documentTitle: "Diligencia de embargo de valores",
      },
      "synthetic-access-token",
    );

    expect(result).toEqual({
      ok: true,
      fileId: "drive_file_1",
      folderId: "folder_3",
      sourceSha256: sha256,
      documentDate: "2026-07-15",
      verification: "SHA256_READBACK_MATCH",
      reusedExisting: false,
      webViewLink: "https://drive.google.com/file/d/drive_file_1/view",
    });
    expect(folderIndex).toBe(3);
    const folderCreates = requests.filter(
      (request) =>
        request.url.endsWith("/drive/v3/files?fields=id") &&
        request.init?.method === "POST",
    );
    expect(folderCreates).toHaveLength(3);
    for (const request of folderCreates) {
      expect(String(request.init?.body)).toContain(
        '"factuManagedFolder":"fiscal-notification-original-v1"',
      );
    }
    const upload = requests.find((request) => request.url.includes("/upload/"));
    expect(upload?.init?.method).toBe("POST");
    expect(await (upload?.init?.body as Blob).text()).toContain(
      '"factuSourceSha256":"' + sha256 + '"',
    );
    expect(await (upload?.init?.body as Blob).text()).not.toContain(
      "original-local-name.pdf",
    );
  });

  it("reuses an app-created file with the same hash after exact readback", async () => {
    const sha256 = await hash(PDF_BYTES);
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("appProperties")) {
        return json({
          files: [
            {
              id: "existing_file",
              name: "existing.pdf",
              parents: ["existing_folder"],
            },
          ],
        });
      }
      if (url.includes("existing_file?alt=media")) return binary(PDF_BYTES);
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      uploadFiscalNotificationOriginalToGoogleDriveWithAccessTokenV1(
        {
          file: syntheticFile(PDF_BYTES),
          expectedSha256: sha256,
          documentDate: null,
          documentTitle: "Documento oficial",
        },
        "synthetic-access-token",
      ),
    ).resolves.toMatchObject({
      ok: true,
      fileId: "existing_file",
      folderId: "existing_folder",
      reusedExisting: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails closed before network when the reselected PDF does not match", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      uploadFiscalNotificationOriginalToGoogleDriveWithAccessTokenV1(
        {
          file: syntheticFile(PDF_BYTES),
          expectedSha256: "0".repeat(64),
          documentDate: null,
          documentTitle: "Documento oficial",
        },
        "synthetic-access-token",
      ),
    ).resolves.toEqual({
      ok: false,
      error: "El PDF seleccionado ya no coincide con la ficha registrada.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks an ambiguous set of managed originals with the same hash", async () => {
    const sha256 = await hash(PDF_BYTES);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("appProperties")) {
          return json({
            files: [
              { id: "duplicate_a", parents: ["folder_a"] },
              { id: "duplicate_b", parents: ["folder_b"] },
            ],
          });
        }
        throw new Error(`unexpected fetch ${url}`);
      }),
    );

    await expect(
      uploadFiscalNotificationOriginalToGoogleDriveWithAccessTokenV1(
        {
          file: syntheticFile(PDF_BYTES),
          expectedSha256: sha256,
          documentDate: null,
          documentTitle: "Documento oficial",
        },
        "synthetic-access-token",
      ),
    ).resolves.toEqual({
      ok: false,
      error:
        "Drive contiene más de un original administrado con la misma huella.",
    });
  });

  it("does not confirm a mismatched Drive readback and trashes only the new artifact", async () => {
    const sha256 = await hash(PDF_BYTES);
    const different = new TextEncoder().encode("%PDF-1.7\ndifferent\n%%EOF");
    let folderIndex = 0;
    let trashed = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("appProperties")) return json({ files: [] });
        if (url.includes("/drive/v3/files?") && init?.method !== "POST") {
          return json({ files: [] });
        }
        if (url.endsWith("/drive/v3/files?fields=id") && init?.method === "POST") {
          folderIndex += 1;
          return json({ id: `folder_${folderIndex}` });
        }
        if (url.includes("/upload/drive/v3/files")) {
          return json({ id: "mismatched_file", parents: ["folder_2"] });
        }
        if (url.includes("mismatched_file?alt=media")) return binary(different);
        if (url.includes("mismatched_file?fields=id,trashed")) {
          trashed = true;
          return json({ id: "mismatched_file", trashed: true });
        }
        throw new Error(`unexpected fetch ${url}`);
      }),
    );

    await expect(
      uploadFiscalNotificationOriginalToGoogleDriveWithAccessTokenV1(
        {
          file: syntheticFile(PDF_BYTES),
          expectedSha256: sha256,
          documentDate: null,
          documentTitle: "Documento oficial",
        },
        "synthetic-access-token",
      ),
    ).resolves.toEqual({
      ok: false,
      error:
        "Drive recibió el PDF, pero no devolvió bytes idénticos. No se ha marcado como archivado.",
    });
    expect(trashed).toBe(true);
  });
});

function syntheticFile(bytes: Uint8Array<ArrayBuffer>) {
  return {
    name: "original-local-name.pdf",
    size: bytes.byteLength,
    type: "application/pdf",
    async arrayBuffer() {
      return bytes.slice().buffer;
    },
  };
}

async function hash(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function binary(bytes: Uint8Array<ArrayBuffer>): Response {
  return new Response(bytes.slice(), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.byteLength),
    },
  });
}
