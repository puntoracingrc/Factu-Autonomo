import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EXPENSE_DRIVE_ARCHIVE_POLICY_V1,
  EXPENSE_DRIVE_ARCHIVE_ROOT_FOLDER_V1,
  buildExpenseDriveArchiveFileNameV1,
  buildExpenseDriveArchiveFolderPathV1,
  uploadExpenseOriginalToGoogleDriveWithAccessTokenV1,
  type ExpenseOriginalMimeTypeV1,
} from "./expense-original-archive.v1";

const PDF_BYTES = new TextEncoder().encode("%PDF-1.7\nsynthetic\n%%EOF");
const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4,
]);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("expense originals in user Google Drive", () => {
  it("organizes exclusively by expense year and month", () => {
    expect(buildExpenseDriveArchiveFolderPathV1("2026-07-17")).toEqual([
      EXPENSE_DRIVE_ARCHIVE_ROOT_FOLDER_V1,
      "2026",
      "07",
    ]);
    expect(() => buildExpenseDriveArchiveFolderPathV1("2026-02-31")).toThrow(
      "EXPENSE_DRIVE_ARCHIVE_INVALID_DATE",
    );
  });

  it("builds safe generated names without retaining the local filename", () => {
    expect(
      buildExpenseDriveArchiveFileNameV1({
        documentDate: "2026-07-17",
        supplierName: "Proveedor / material: Barcelona",
        sha256: "a".repeat(64),
        mimeType: "image/jpeg",
      }),
    ).toBe(
      "2026-07-17 - Proveedor material Barcelona - aaaaaaaaaa.jpg",
    );
  });

  it("uploads a PDF under AAAA/MM and confirms exact readback", async () => {
    const sha256 = await hash(PDF_BYTES);
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    let folderIndex = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        requests.push({ url, init });
        if (url.includes("appProperties")) return json({ files: [] });
        if (url.includes("/drive/v3/files?") && init?.method !== "POST") {
          return json({ files: [] });
        }
        if (
          url.endsWith("/drive/v3/files?fields=id") &&
          init?.method === "POST"
        ) {
          folderIndex += 1;
          return json({ id: `expense_folder_${folderIndex}` });
        }
        if (url.includes("/upload/drive/v3/files")) {
          return json({
            id: "expense_file_1",
            name: "expense.pdf",
            parents: ["expense_folder_3"],
          });
        }
        if (url.includes("expense_file_1?alt=media")) {
          return binary(PDF_BYTES, "application/pdf");
        }
        throw new Error(`unexpected fetch ${url}`);
      }),
    );

    const result =
      await uploadExpenseOriginalToGoogleDriveWithAccessTokenV1(
        {
          file: syntheticFile(PDF_BYTES, "application/pdf"),
          documentDate: "2026-07-17",
          supplierName: "Proveedor sintético",
          source: "scan",
          expectedSha256: sha256,
        },
        "synthetic-access-token",
      );

    expect(result).toEqual({
      ok: true,
      fileId: "expense_file_1",
      folderId: "expense_folder_3",
      sourceSha256: sha256,
      sourceMimeType: "application/pdf",
      documentDate: "2026-07-17",
      verification: "SHA256_READBACK_MATCH",
      reusedExisting: false,
    });
    expect(folderIndex).toBe(3);
    const upload = requests.find((request) => request.url.includes("/upload/"));
    const uploadText = await (upload?.init?.body as Blob).text();
    expect(uploadText).toContain(
      `"factuManaged":"${EXPENSE_DRIVE_ARCHIVE_POLICY_V1}"`,
    );
    expect(uploadText).toContain(`"factuSourceSha256":"${sha256}"`);
    expect(uploadText).toContain('"factuOriginalSource":"scan"');
    expect(uploadText).not.toContain("factura-del-proveedor.pdf");
  });

  it("accepts a strict image and keeps its real MIME type", async () => {
    const sha256 = await hash(PNG_BYTES);
    stubSuccessfulUpload(PNG_BYTES, "image/png");

    await expect(
      uploadExpenseOriginalToGoogleDriveWithAccessTokenV1(
        {
          file: syntheticFile(PNG_BYTES, "image/png"),
          documentDate: "2025-12-31",
          supplierName: "Proveedor imagen",
          source: "expense_inbox",
          expectedSha256: sha256,
        },
        "synthetic-access-token",
      ),
    ).resolves.toMatchObject({
      ok: true,
      sourceSha256: sha256,
      sourceMimeType: "image/png",
      documentDate: "2025-12-31",
    });
  });

  it("archives the original camera image even when OCR used a compressed copy", async () => {
    const cameraBytes = new Uint8Array(4 * 1024 * 1024 + 1);
    cameraBytes.set(PNG_BYTES.slice(0, 8));
    const sha256 = await hash(cameraBytes);
    stubSuccessfulUpload(cameraBytes, "image/png");

    await expect(
      uploadExpenseOriginalToGoogleDriveWithAccessTokenV1(
        {
          file: syntheticFile(cameraBytes, "image/png"),
          documentDate: "2026-07-17",
          supplierName: "Proveedor cámara",
          source: "scan",
          expectedSha256: sha256,
        },
        "synthetic-access-token",
      ),
    ).resolves.toMatchObject({
      ok: true,
      sourceSha256: sha256,
      sourceMimeType: "image/png",
    });
  });

  it("fails before Drive when bytes do not match the inbox hash", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      uploadExpenseOriginalToGoogleDriveWithAccessTokenV1(
        {
          file: syntheticFile(PDF_BYTES, "application/pdf"),
          documentDate: "2026-07-17",
          supplierName: "Proveedor sintético",
          source: "expense_inbox",
          expectedSha256: "0".repeat(64),
        },
        "synthetic-access-token",
      ),
    ).resolves.toEqual({
      ok: false,
      error: "El original ya no coincide con el documento escaneado.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects MIME spoofing before any upload", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      uploadExpenseOriginalToGoogleDriveWithAccessTokenV1(
        {
          file: syntheticFile(PDF_BYTES, "image/png"),
          documentDate: "2026-07-17",
          supplierName: "Proveedor sintético",
          source: "scan",
        },
        "synthetic-access-token",
      ),
    ).resolves.toEqual({
      ok: false,
      error: "El original ya no coincide con el documento escaneado.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("trashes a newly uploaded artifact when readback differs", async () => {
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
        if (
          url.endsWith("/drive/v3/files?fields=id") &&
          init?.method === "POST"
        ) {
          folderIndex += 1;
          return json({ id: `folder_${folderIndex}` });
        }
        if (url.includes("/upload/drive/v3/files")) {
          return json({ id: "mismatch_file", parents: ["folder_3"] });
        }
        if (url.includes("mismatch_file?alt=media")) {
          return binary(different, "application/pdf");
        }
        if (url.includes("mismatch_file?fields=id,trashed")) {
          trashed = true;
          return json({ id: "mismatch_file", trashed: true });
        }
        throw new Error(`unexpected fetch ${url}`);
      }),
    );

    await expect(
      uploadExpenseOriginalToGoogleDriveWithAccessTokenV1(
        {
          file: syntheticFile(PDF_BYTES, "application/pdf"),
          documentDate: "2026-07-17",
          supplierName: "Proveedor sintético",
          source: "scan",
          expectedSha256: sha256,
        },
        "synthetic-access-token",
      ),
    ).resolves.toEqual({
      ok: false,
      error:
        "Drive recibió el archivo, pero no devolvió bytes idénticos. No se ha marcado como archivado.",
    });
    expect(trashed).toBe(true);
  });
});

function stubSuccessfulUpload(
  bytes: Uint8Array<ArrayBuffer>,
  mimeType: ExpenseOriginalMimeTypeV1,
): void {
  let folderIndex = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("appProperties")) return json({ files: [] });
      if (url.includes("/drive/v3/files?") && init?.method !== "POST") {
        return json({ files: [] });
      }
      if (
        url.endsWith("/drive/v3/files?fields=id") &&
        init?.method === "POST"
      ) {
        folderIndex += 1;
        return json({ id: `folder_${folderIndex}` });
      }
      if (url.includes("/upload/drive/v3/files")) {
        return json({ id: "image_file", parents: ["folder_3"] });
      }
      if (url.includes("image_file?alt=media")) {
        return binary(bytes, mimeType);
      }
      throw new Error(`unexpected fetch ${url}`);
    }),
  );
}

function syntheticFile(
  bytes: Uint8Array<ArrayBuffer>,
  type: ExpenseOriginalMimeTypeV1,
) {
  return {
    name: "factura-del-proveedor.pdf",
    size: bytes.byteLength,
    type,
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

function binary(
  bytes: Uint8Array<ArrayBuffer>,
  contentType: ExpenseOriginalMimeTypeV1,
): Response {
  return new Response(bytes.slice(), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.byteLength),
    },
  });
}
