import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Expense } from "@/lib/types";
import { getExpenseInboxOriginalAttachment } from "@/lib/expense-inbox-server";
import {
  archiveOriginal,
  originalDigest,
  readOriginal,
  type OriginalRecord,
} from "./storage";
import {
  attachExpenseOriginal,
  getExpenseOriginal,
  listExpenseOriginalStatuses,
  archiveInboxOriginalIfCloud,
} from "./server";
import {
  EXPENSE_ORIGINAL_MAX_BYTES,
  originalFileError,
  originalFileName,
  originalSignatureMatches,
} from "./types";

const fixture = vi.hoisted(() => ({
  rows: new Map<string, Record<string, unknown>[]>(),
  files: new Map<string, Blob>(),
  uploads: [] as Array<{ path: string; upsert: boolean }>,
  failDownload: false,
  failMetadata: false,
  corrupt: false,
  billing: false,
}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => admin }));
vi.mock("@/lib/billing/config", () => ({
  isBillingEnforced: () => fixture.billing,
}));
vi.mock("@/lib/expense-inbox-server", () => ({
  getExpenseInboxOriginalAttachment: vi.fn(async () => null),
}));
class Query {
  filters: Array<(row: Record<string, unknown>) => boolean> = [];
  constructor(readonly table: string) {}
  select() {
    return this;
  }
  eq(key: string, value: unknown) {
    this.filters.push((row) => row[key] === value);
    return this;
  }
  in(key: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[key]));
    return this;
  }
  result() {
    return {
      data: (fixture.rows.get(this.table) ?? []).filter((row) =>
        this.filters.every((filter) => filter(row)),
      ),
      error: null,
    };
  }
  async maybeSingle() {
    return { ...this.result(), data: this.result().data[0] ?? null };
  }
  async insert(row: Record<string, unknown>) {
    if (fixture.failMetadata) return { error: { code: "unavailable" } };
    fixture.rows.set(this.table, [
      ...(fixture.rows.get(this.table) ?? []),
      row,
    ]);
    return { error: null };
  }
  then<TResult1 = ReturnType<Query["result"]>, TResult2 = never>(
    resolve?:
      | ((
          value: ReturnType<Query["result"]>,
        ) => TResult1 | PromiseLike<TResult1>)
      | null,
    reject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.result()).then(resolve, reject);
  }
}
const admin = {
  from: (table: string) => new Query(table),
  storage: {
    from: () => ({
      upload: async (
        path: string,
        bytes: Uint8Array,
        options: { contentType: string; upsert: boolean },
      ) => {
        fixture.uploads.push({ path, upsert: options.upsert });
        if (fixture.files.has(path)) return { error: { code: "409" } };
        fixture.files.set(
          path,
          new Blob([new Uint8Array(bytes)], { type: options.contentType }),
        );
        return { error: null };
      },
      download: async (path: string) => ({
        data: fixture.failDownload
          ? null
          : fixture.corrupt
            ? new Blob(["invalid"], { type: "application/pdf" })
            : (fixture.files.get(path) ?? null),
        error: fixture.failDownload ? { code: "503" } : null,
      }),
    }),
  },
};
const company = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
const bytes = new TextEncoder().encode(
  "%PDF-1.7\nExact synthetic original\n%%EOF",
);
const input = {
  userId: company,
  kind: "expense" as const,
  bindingId: "expense-1",
  bytes,
  fileName: "factura.pdf",
};
const savedExpense: Expense = {
  id: "expense-1",
  supplierName: "Proveedor sintético",
  description: "Compra",
  date: "2026-10-20",
  amount: 121,
  ivaPercent: 21,
  category: "Material",
  paymentMethod: "Transferencia",
  createdAt: "2026-10-20T10:00:00Z",
};
function centralExpense(overrides: Partial<Expense> = {}) {
  fixture.rows.set("central_business_entities", [
    {
      user_id: company,
      entity_type: "expense",
      entity_id: savedExpense.id,
      deleted: false,
      current_payload: { ...savedExpense, ...overrides },
    },
  ]);
}

describe("private expense originals: exact immutable bytes", () => {
  beforeEach(() => {
    fixture.rows.clear();
    fixture.files.clear();
    fixture.uploads = [];
    fixture.failDownload = false;
    fixture.failMetadata = false;
    fixture.corrupt = false;
    fixture.billing = false;
  });
  it("uploads once without upsert and verifies actual stored bytes before confirming", async () => {
    const record = await archiveOriginal(input);
    expect(record.sha256).toBe(originalDigest(bytes));
    expect(await readOriginal(record)).toEqual(bytes);
    expect(fixture.uploads).toEqual([
      { path: `${company}/${originalDigest(bytes)}`, upsert: false },
    ]);
    expect(await archiveOriginal(input)).toEqual(record);
    expect(fixture.uploads).toHaveLength(1);
  });
  it("never replaces an original, even when the user retries another file", async () => {
    await archiveOriginal(input);
    await expect(
      archiveOriginal({
        ...input,
        bytes: new TextEncoder().encode("%PDF-1.7\ndifferent"),
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(fixture.uploads).toHaveLength(1);
  });
  it("uses different paths and metadata for the same bytes in different companies", async () => {
    await archiveOriginal(input);
    await archiveOriginal({ ...input, userId: other });
    expect(fixture.files.size).toBe(2);
    expect(fixture.uploads.map((item) => item.path.split("/")[0])).toEqual([
      company,
      other,
    ]);
  });
  it("does not confirm a failed readback; an exact retry reuses the uploaded bytes", async () => {
    fixture.failDownload = true;
    await expect(archiveOriginal(input)).rejects.toMatchObject({ status: 502 });
    expect(fixture.rows.get("expense_original_files")).toBeUndefined();
    fixture.failDownload = false;
    expect((await archiveOriginal(input)).sha256).toBe(originalDigest(bytes));
    expect(fixture.files.size).toBe(1);
  });
  it("preserves the file if metadata confirmation fails, and retries without overwriting", async () => {
    fixture.failMetadata = true;
    await expect(archiveOriginal(input)).rejects.toMatchObject({ status: 503 });
    fixture.failMetadata = false;
    await archiveOriginal(input);
    expect(fixture.files.size).toBe(1);
  });
  it("rejects corrupt downloads", async () => {
    const record = await archiveOriginal(input);
    fixture.corrupt = true;
    await expect(readOriginal(record)).rejects.toMatchObject({ status: 502 });
    fixture.corrupt = false;
    fixture.files.set(
      `${company}/${record.sha256}`,
      new Blob(
        [
          new Uint8Array(
            bytes.map((x, i) => (i === bytes.length - 1 ? x + 1 : x)),
          ),
        ],
        { type: record.mime_type },
      ),
    );
    await expect(readOriginal(record)).rejects.toMatchObject({ status: 502 });
  });
  it("requires the real canonical expense, not an arbitrary invoice or another company's ID", async () => {
    centralExpense();
    await expect(
      attachExpenseOriginal(other, savedExpense.id, bytes, "factura.pdf"),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      attachExpenseOriginal(company, "unknown", bytes, "factura.pdf"),
    ).rejects.toMatchObject({ status: 404 });
    await attachExpenseOriginal(company, savedExpense.id, bytes, "factura.pdf");
    expect((await getExpenseOriginal(company, savedExpense.id)).bytes).toEqual(
      bytes,
    );
    expect(await listExpenseOriginalStatuses(other, [savedExpense.id])).toEqual(
      {},
    );
    expect(
      await listExpenseOriginalStatuses(company, [savedExpense.id, "unknown"]),
    ).toEqual({ [savedExpense.id]: "archived" });
    expect(
      fixture.rows.get("central_business_entities")?.[0].current_payload,
    ).toEqual(savedExpense);
  });
  it.each(["sha256:", ""])(
    "links email originals using the actual inbox hash format (%s)",
    async (prefix) => {
      centralExpense({ sourceInboxItemId: "inbox-1" });
      fixture.rows.set("expense_inbox_items", [
        {
          user_id: company,
          id: "inbox-1",
          status: "processed",
          attachment_hash: `${prefix}${originalDigest(bytes)}`,
          attachment_filename: "email.pdf",
        },
      ]);
      expect(
        await listExpenseOriginalStatuses(company, [savedExpense.id]),
      ).toEqual({ [savedExpense.id]: "inbox" });
      await archiveInboxOriginalIfCloud({
        userId: company,
        billingUserId: company,
        bytes,
        fileName: "email",
        mimeType: "application/pdf",
      });
      expect(
        (await getExpenseOriginal(company, savedExpense.id)).bytes,
      ).toEqual(bytes);
      expect(
        await listExpenseOriginalStatuses(company, [savedExpense.id]),
      ).toEqual({ [savedExpense.id]: "archived" });
      expect(fixture.rows.get("expense_original_files")?.[0]).toMatchObject({
        binding_kind: "inbox",
        binding_id: originalDigest(bytes),
        file_name: "email.pdf",
      });
    },
  );
  it("recovers a legacy provider original into a hex-only binding without rewriting the tagged inbox fingerprint", async () => {
    centralExpense({ sourceInboxItemId: "legacy-inbox" });
    const taggedHash = `sha256:${originalDigest(bytes)}`;
    fixture.rows.set("expense_inbox_items", [
      {
        user_id: company,
        id: "legacy-inbox",
        status: "processed",
        attachment_hash: taggedHash,
        attachment_filename: "legacy.pdf",
      },
    ]);
    vi.mocked(getExpenseInboxOriginalAttachment).mockResolvedValueOnce({
      buffer: Buffer.from(bytes),
      contentType: "application/pdf",
      sourceSha256: taggedHash,
    });
    expect((await getExpenseOriginal(company, savedExpense.id)).bytes).toEqual(
      bytes,
    );
    expect(fixture.rows.get("expense_original_files")?.[0]).toMatchObject({
      binding_kind: "inbox",
      binding_id: originalDigest(bytes),
      sha256: originalDigest(bytes),
    });
    expect(fixture.rows.get("expense_inbox_items")?.[0].attachment_hash).toBe(
      taggedHash,
    );
  });
  it("does not fabricate a missing historical original", async () => {
    centralExpense({ sourceInboxItemId: "old-inbox" });
    fixture.rows.set("expense_inbox_items", [
      {
        user_id: company,
        id: "old-inbox",
        status: "processed",
        attachment_hash: originalDigest(bytes),
      },
    ]);
    await expect(
      getExpenseOriginal(company, savedExpense.id),
    ).rejects.toMatchObject({ status: 404 });
    expect(fixture.files.size).toBe(0);
  });
  it("retains files on deletion but prevents opening through a deleted expense", async () => {
    centralExpense();
    const record = await attachExpenseOriginal(
      company,
      savedExpense.id,
      bytes,
      "factura.pdf",
    );
    fixture.rows.get("central_business_entities")![0].deleted = true;
    await expect(
      getExpenseOriginal(company, savedExpense.id),
    ).rejects.toMatchObject({ status: 404 });
    expect(await readOriginal(record as OriginalRecord)).toEqual(bytes);
  });
  it("does not archive inbox bytes for a free subscription", async () => {
    fixture.billing = true;
    await archiveInboxOriginalIfCloud({
      userId: company,
      billingUserId: company,
      bytes,
      fileName: "email.pdf",
      mimeType: "application/pdf",
    });
    expect(fixture.files.size).toBe(0);
  });
  it("validates size, extension and signature without executing documents", async () => {
    for (const name of ["test.svg", "test.html", "test.exe", "test.pdf.exe"])
      expect(originalFileError({ name, size: 10 })).not.toBeNull();
    expect(
      originalFileError({
        name: "factura.PDF",
        size: EXPENSE_ORIGINAL_MAX_BYTES,
      }),
    ).toBeNull();
    expect(
      originalFileError({
        name: "f.pdf",
        size: EXPENSE_ORIGINAL_MAX_BYTES + 1,
      }),
    ).not.toBeNull();
    expect(originalFileError({ name: "f.pdf", size: 0 })).not.toBeNull();
    await expect(
      archiveOriginal({
        ...input,
        bytes: new TextEncoder().encode("<script>hi</script>"),
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(
      originalSignatureMatches(
        Uint8Array.from([80, 75, 3, 4]),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe(true);
    expect(originalFileName(" ../fac\n\u202etura.pdf ")).toBe(
      ".._fac__tura.pdf",
    );
  });
});
