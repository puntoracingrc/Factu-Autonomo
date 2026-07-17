import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExpenseOriginalArchiveV1 } from "@/lib/types";
import { downloadExpenseOriginalFromGoogleDriveWithAccessTokenV1 } from "./expense-original-download.v1";

const PDF_BYTES = new TextEncoder().encode("%PDF-1.7\nsynthetic\n%%EOF");
const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4,
]);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("expense original Drive readback", () => {
  it("downloads only the exact managed file and verifies its SHA-256", async () => {
    const archive = await archiveFor(PDF_BYTES);
    const requests: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        requests.push(url);
        if (url.includes("fields=id")) {
          return json({
            id: archive.driveFileId,
            mimeType: archive.sourceMimeType,
            size: String(PDF_BYTES.byteLength),
            parents: [archive.driveFolderId],
            trashed: false,
            appProperties: {
              factuManaged: "expense-original-v1",
              factuSourceSha256: archive.sourceSha256,
              factuDocumentDate: archive.documentDate,
              factuOriginalSource: archive.source,
            },
          });
        }
        if (url.includes("alt=media")) {
          return binary(PDF_BYTES, "application/pdf");
        }
        throw new Error(`unexpected fetch ${url}`);
      }),
    );

    await expect(
      downloadExpenseOriginalFromGoogleDriveWithAccessTokenV1(
        archive,
        "access-token",
      ),
    ).resolves.toEqual({
      bytes: PDF_BYTES,
      mimeType: "application/pdf",
      extension: ".pdf",
    });
    expect(requests).toHaveLength(2);
  });

  it("blocks before downloading when metadata no longer matches", async () => {
    const archive = await archiveFor(PDF_BYTES);
    const fetchMock = vi.fn(async () =>
      json({
        id: archive.driveFileId,
        mimeType: "application/pdf",
        size: String(PDF_BYTES.byteLength),
        parents: ["different-folder"],
        trashed: false,
        appProperties: {
          factuManaged: "expense-original-v1",
          factuSourceSha256: archive.sourceSha256,
          factuDocumentDate: archive.documentDate,
          factuOriginalSource: archive.source,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      downloadExpenseOriginalFromGoogleDriveWithAccessTokenV1(
        archive,
        "access-token",
      ),
    ).rejects.toThrow("no coincide con la referencia verificada");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("blocks a byte mismatch without returning a partial original", async () => {
    const archive = await archiveFor(PDF_BYTES);
    const changed = new TextEncoder().encode("%PDF-1.7\nchanged\n%%EOF");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        return url.includes("fields=id")
          ? json({
              id: archive.driveFileId,
              mimeType: archive.sourceMimeType,
              size: String(changed.byteLength),
              parents: [archive.driveFolderId],
              trashed: false,
              appProperties: {
                factuManaged: "expense-original-v1",
                factuSourceSha256: archive.sourceSha256,
                factuDocumentDate: archive.documentDate,
                factuOriginalSource: archive.source,
              },
            })
          : binary(changed, "application/pdf");
      }),
    );

    await expect(
      downloadExpenseOriginalFromGoogleDriveWithAccessTokenV1(
        archive,
        "access-token",
      ),
    ).rejects.toThrow("ya no coincide con la huella");
  });

  it("preserves an inbox image as the verified original MIME", async () => {
    const archive: ExpenseOriginalArchiveV1 = {
      ...(await archiveFor(PNG_BYTES)),
      source: "expense_inbox",
      sourceMimeType: "image/png",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        return url.includes("fields=id")
          ? json({
              id: archive.driveFileId,
              mimeType: archive.sourceMimeType,
              size: String(PNG_BYTES.byteLength),
              parents: [archive.driveFolderId],
              trashed: false,
              appProperties: {
                factuManaged: "expense-original-v1",
                factuSourceSha256: archive.sourceSha256,
                factuDocumentDate: archive.documentDate,
                factuOriginalSource: archive.source,
              },
            })
          : binary(PNG_BYTES, "image/png");
      }),
    );

    await expect(
      downloadExpenseOriginalFromGoogleDriveWithAccessTokenV1(
        archive,
        "access-token",
      ),
    ).resolves.toEqual({
      bytes: PNG_BYTES,
      mimeType: "image/png",
      extension: ".png",
    });
  });
});

async function archiveFor(
  bytes: Uint8Array,
): Promise<ExpenseOriginalArchiveV1> {
  return {
    schemaVersion: 1,
    status: "archived_verified",
    source: "scan",
    sourceSha256: await hash(bytes),
    sourceMimeType: "application/pdf",
    driveFileId: "expense-file-1",
    driveFolderId: "expense-folder-1",
    documentDate: "2026-07-17",
    verification: "SHA256_READBACK_MATCH",
    archivedAt: "2026-07-17T08:00:00.000Z",
  };
}

async function hash(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new Uint8Array(Array.from(bytes)).buffer,
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function json(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function binary(bytes: Uint8Array, mimeType: string): Response {
  return new Response(new Uint8Array(Array.from(bytes)).buffer, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(bytes.byteLength),
    },
  });
}
