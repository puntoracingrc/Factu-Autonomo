import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadDriveBackupSettings } from "./backup";
import { getGoogleDriveClientId } from "./config";
import {
  uploadExpenseOriginalToGoogleDriveV1,
  type ExpenseOriginalFileV1,
} from "./expense-original-archive.v1";
import { runExclusiveDriveOperation } from "./operation";
import { archiveExpenseOriginalForSavedExpense } from "./expense-original-archive-client";

vi.mock("./backup", () => ({
  loadDriveBackupSettings: vi.fn(),
}));

vi.mock("./config", () => ({
  getGoogleDriveClientId: vi.fn(),
}));

vi.mock("./expense-original-archive.v1", () => ({
  uploadExpenseOriginalToGoogleDriveV1: vi.fn(),
}));

vi.mock("./operation", () => ({
  runExclusiveDriveOperation: vi.fn(async (operation: () => Promise<unknown>) => ({
    started: true,
    value: await operation(),
  })),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClientAsync: vi.fn(async () => ({
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: "session-token" } },
      })),
    },
  })),
}));

const PDF = new Blob(["%PDF-1.7\nfixture"], { type: "application/pdf" });
const HASH = "a".repeat(64);

describe("expense original Drive archive client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadDriveBackupSettings).mockReturnValue({
      enabled: true,
      frequency: "important",
      archiveExpenseOriginals: true,
    });
    vi.mocked(getGoogleDriveClientId).mockReturnValue("google-client");
    vi.mocked(uploadExpenseOriginalToGoogleDriveV1).mockResolvedValue({
      ok: true,
      fileId: "drive-file-1",
      folderId: "drive-folder-1",
      sourceSha256: HASH,
      sourceMimeType: "application/pdf",
      documentDate: "2026-07-17",
      verification: "SHA256_READBACK_MATCH",
      reusedExisting: false,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("no toca Drive si el usuario no ha activado el archivado", async () => {
    vi.mocked(loadDriveBackupSettings).mockReturnValue({
      enabled: true,
      frequency: "important",
      archiveExpenseOriginals: false,
    });

    await expect(
      archiveExpenseOriginalForSavedExpense({
        candidate: { kind: "scan", file: PDF },
        documentDate: "2026-07-17",
        supplierName: "Proveedor",
      }),
    ).resolves.toEqual({ status: "not_requested" });
    expect(uploadExpenseOriginalToGoogleDriveV1).not.toHaveBeenCalled();
  });

  it("archiva un original local antes de devolver el recibo persistible", async () => {
    const result = await archiveExpenseOriginalForSavedExpense({
      candidate: { kind: "scan", file: PDF },
      documentDate: "2026-07-17",
      supplierName: "Proveedor",
    });

    expect(result).toMatchObject({
      status: "archived",
      archive: {
        driveFileId: "drive-file-1",
        source: "scan",
        documentDate: "2026-07-17",
      },
    });
  });

  it("recupera el adjunto del buzón sin persistir nombre ni bytes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(PDF, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "X-Factu-Source-Sha256": HASH,
          },
        }),
      ),
    );

    const result = await archiveExpenseOriginalForSavedExpense({
      candidate: {
        kind: "expense_inbox",
        itemId: "inbox-1",
        expectedSha256: HASH,
      },
      documentDate: "2026-07-17",
      supplierName: "Proveedor",
    });

    expect(result.status).toBe("archived");
    expect(fetch).toHaveBeenCalledWith(
      "/api/expense-inbox/inbox-1/original",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(uploadExpenseOriginalToGoogleDriveV1).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "expense_inbox",
        expectedSha256: HASH,
      }),
      { clientId: "google-client" },
    );
  });

  it("bloquea sin subir si la huella del servidor no coincide", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(PDF, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "X-Factu-Source-Sha256": "b".repeat(64),
          },
        }),
      ),
    );

    const result = await archiveExpenseOriginalForSavedExpense({
      candidate: {
        kind: "expense_inbox",
        itemId: "inbox-1",
        expectedSha256: HASH,
      },
      documentDate: "2026-07-17",
      supplierName: "Proveedor",
    });

    expect(result.status).toBe("blocked");
    expect(uploadExpenseOriginalToGoogleDriveV1).not.toHaveBeenCalled();
  });

  it("bloquea el guardado si Drive está ocupado o rechaza el archivo", async () => {
    vi.mocked(runExclusiveDriveOperation).mockResolvedValueOnce({
      started: false,
    });
    const busy = await archiveExpenseOriginalForSavedExpense({
      candidate: { kind: "scan", file: PDF as ExpenseOriginalFileV1 },
      documentDate: "2026-07-17",
      supplierName: "Proveedor",
    });
    expect(busy.status).toBe("blocked");

    vi.mocked(runExclusiveDriveOperation).mockImplementationOnce(async (operation) => ({
      started: true,
      value: await operation(),
    }));
    vi.mocked(uploadExpenseOriginalToGoogleDriveV1).mockResolvedValueOnce({
      ok: false,
      error: "Drive no confirmó la copia.",
    });
    const rejected = await archiveExpenseOriginalForSavedExpense({
      candidate: { kind: "scan", file: PDF },
      documentDate: "2026-07-17",
      supplierName: "Proveedor",
    });
    expect(rejected).toMatchObject({ status: "blocked" });
  });
});
