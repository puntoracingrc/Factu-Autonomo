import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PROFILE, type Expense } from "@/lib/types";
import { readAdvisorExpenseOriginals } from "./advisor-package-client";

const state = vi.hoisted(() => ({ scope: "company-a" }));
const mocks = vi.hoisted(() => ({
  statuses: vi.fn(),
  download: vi.fn(),
  drive: vi.fn(),
  token: vi.fn(),
}));
vi.mock("@/lib/workspace-owner-runtime", () => ({
  getActiveWorkspaceOwnerScope: () => state.scope,
  isActiveWorkspaceOwnerScope: (scope: string) => scope === state.scope,
}));
vi.mock("@/lib/expense-originals/client", () => ({
  expenseOriginalStatuses: mocks.statuses,
  downloadExpenseOriginal: mocks.download,
}));
vi.mock("@/lib/google-drive/config", () => ({
  getGoogleDriveClientId: () => "synthetic-client",
}));
vi.mock("@/lib/google-drive/backup", () => ({
  requestDriveAccessToken: mocks.token,
}));
vi.mock("@/lib/google-drive/operation", () => ({
  runExclusiveDriveOperation: async (work: () => Promise<unknown>) => ({
    started: true,
    value: await work(),
  }),
}));
vi.mock("@/lib/google-drive/expense-original-download.v1", () => ({
  downloadExpenseOriginalFromGoogleDriveWithAccessTokenV1: mocks.drive,
}));
const expense = (id: string): Expense => ({
  id,
  date: "2026-04-02",
  supplierName: "Proveedor",
  description: "Compra",
  amount: 10,
  ivaPercent: 21,
  category: "Materiales",
  paymentMethod: "Tarjeta",
  createdAt: "2026-04-02",
});
const archive = {
  schemaVersion: 1,
  status: "archived_verified",
  source: "scan",
  sourceSha256: "a".repeat(64),
  sourceMimeType: "application/pdf",
  driveFileId: "file",
  driveFolderId: "folder",
  documentDate: "2026-04-02",
  verification: "SHA256_READBACK_MATCH",
  archivedAt: "2026-04-02T10:00:00.000Z",
} as const;
describe("advisor export original reader", () => {
  beforeEach(() => {
    state.scope = "company-a";
    vi.clearAllMocks();
    mocks.statuses.mockResolvedValue({ cloud: "archived" });
    mocks.download.mockResolvedValue({
      bytes: new Uint8Array([1, 2]),
      fileName: "a.pdf",
      mimeType: "application/pdf",
    });
    mocks.drive.mockResolvedValue({
      bytes: new Uint8Array([3, 4]),
      extension: ".pdf",
      mimeType: "application/pdf",
    });
    mocks.token.mockResolvedValue("temporary-token");
  });
  it("prefers the private Factu file, falls back only to the exact saved Drive archive, and leaves missing originals absent", async () => {
    const expenses = [
      { ...expense("cloud"), originalArchive: archive },
      { ...expense("drive"), originalArchive: archive },
      expense("missing"),
    ];
    const before = JSON.stringify(expenses);
    const originals = await readAdvisorExpenseOriginals(expenses, "company-a");
    expect(mocks.statuses).toHaveBeenCalledWith(
      ["cloud", "drive", "missing"],
      "company-a",
    );
    expect(mocks.download).toHaveBeenCalledExactlyOnceWith(
      "cloud",
      "company-a",
    );
    expect(mocks.drive).toHaveBeenCalledExactlyOnceWith(
      archive,
      "temporary-token",
    );
    expect(originals.get("cloud")?.source).toBe("Factu");
    expect(originals.get("drive")?.source).toBe("Drive");
    expect(originals.has("missing")).toBe(false);
    expect(JSON.stringify(expenses)).toBe(before);
  });
  it("does not request Drive permissions when all available originals are in Factu", async () => {
    await readAdvisorExpenseOriginals([expense("cloud")], "company-a");
    expect(mocks.token).not.toHaveBeenCalled();
  });
  it("does not interpret a read failure as a missing file", async () => {
    mocks.download.mockRejectedValue(new Error("SHA mismatch"));
    await expect(
      readAdvisorExpenseOriginals([expense("cloud")], "company-a"),
    ).rejects.toThrow(/SHA/);
  });
  it("rejects a company switch during the metadata read before downloading any files", async () => {
    mocks.statuses.mockImplementationOnce(async () => {
      state.scope = "company-b";
      return { cloud: "archived" };
    });
    await expect(
      readAdvisorExpenseOriginals([expense("cloud")], "company-a"),
    ).rejects.toThrow(/empresa cambió/);
    expect(mocks.download).not.toHaveBeenCalled();
  });
  it("preserves the private archive contract without requiring an advisor to download", () => {
    expect(DEFAULT_PROFILE.advisorContact).toBeUndefined();
  });
});
