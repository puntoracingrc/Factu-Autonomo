import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExpenseScanPayload } from "./expense-scan/schema";
import { consumeExpenseScan } from "@/lib/billing/scan-usage-server";
import { hasUnlimitedAiAccessForCompany } from "@/lib/billing/unlimited-ai-access";
import { resolveCompanyBillingFromDataOwner } from "@/lib/companies/server";
import { archiveInboxOriginalIfCloud } from "@/lib/expense-originals/server";
import { extractExpenseFromImage } from "@/lib/expense-scan/openai";
import {
  downloadResendAttachment,
  listRecentResendReceivedEmails,
} from "@/lib/expense-inbox-download";

const COMPANY_ID = "ebf7802a-d38c-4fb0-9dd1-fb387f7fa092";
const DATA_OWNER_ID = "ebf7802a-d38c-4fb0-9dd1-fb387f7fa092";
const BILLING_OWNER_ID = "31fd96e3-5eda-4d35-ba6f-79719e1d4d8c";

const aliasRows: Array<Record<string, unknown>> = [
  {
    user_id: DATA_OWNER_ID,
    alias_token: "pa-inbox01",
    active: true,
  },
];
const inboxRows: Array<Record<string, unknown>> = [];

vi.mock("@/lib/expense-originals/server", () => ({
  archiveInboxOriginalIfCloud: vi.fn(async () => undefined),
}));

vi.mock("@/lib/expense-inbox-download", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/expense-inbox-download")>();
  return {
    ...actual,
    downloadResendAttachment: vi.fn(),
    listRecentResendReceivedEmails: vi.fn(),
  };
});

vi.mock("@/lib/billing/config", () => ({
  isBillingEnforced: () => false,
}));

vi.mock("@/lib/billing/scan-usage-server", () => ({
  consumeExpenseScan: vi.fn(async () => ({ allowed: true })),
}));

vi.mock("@/lib/billing/unlimited-ai-access", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/billing/unlimited-ai-access")>();
  return {
    ...actual,
    hasUnlimitedAiAccessForCompany: vi.fn(async () => false),
    unlimitedAiUsageResult: vi.fn(actual.unlimitedAiUsageResult),
  };
});

vi.mock("@/lib/companies/server", () => ({
  resolveCompanyBillingFromDataOwner: vi.fn(async () => ({
    companyId: COMPANY_ID,
    billingUserId: BILLING_OWNER_ID,
  })),
}));

vi.mock("@/lib/expense-scan/openai", () => ({
  extractExpenseFromImage: vi.fn(async (): Promise<{ data: ExpenseScanPayload }> => ({
    data: {
      supplier: { name: "Proveedor sintetico" },
      expense: {
        date: "2026-07-28",
        description: "Factura sintetica",
        amount: 121,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Transferencia",
      },
      confidence: 0.98,
      warnings: [],
    },
  })),
}));

vi.mock("@/lib/email/send", () => ({
  getEmailDeliveryStatus: vi.fn(async () => ({ state: "delivered" })),
  sendEmail: vi.fn(async () => ({ ok: true, id: "email-copy" })),
}));

function rowValue(row: Record<string, unknown>, column: string): unknown {
  return row[column];
}

class FakeQuery {
  private readonly filters: Array<(row: Record<string, unknown>) => boolean> = [];
  private statuses: string[] | null = null;
  private limitValue: number | null = null;

  constructor(private readonly table: string) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => rowValue(row, column) === value);
    return this;
  }

  in(column: string, values: unknown[]) {
    if (column === "status") this.statuses = values.map(String);
    this.filters.push((row) => values.includes(rowValue(row, column)));
    return this;
  }

  order() {
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  filter(column: string, operator: string, value: unknown) {
    if (operator === "eq" && column === "payload->>attachmentHash") {
      this.filters.push(
        (row) =>
          (row.payload as { attachmentHash?: unknown } | undefined)
            ?.attachmentHash === value,
      );
    }
    return this;
  }

  async maybeSingle() {
    return { data: this.rows()[0] ?? null, error: null };
  }

  update(patch: Record<string, unknown>) {
    return new FakeMutation(this.table, patch, this.filters);
  }

  async insert(row: Record<string, unknown>) {
    if (this.table === "expense_inbox_items") {
      inboxRows.push({
        id: `inbox-${inboxRows.length + 1}`,
        created_at: row.received_at,
        ...row,
      });
    }
    return { error: null };
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: Record<string, unknown>[]; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve({ data: this.rows(), error: null }).then(
      onfulfilled,
      onrejected,
    );
  }

  private rows(): Record<string, unknown>[] {
    let rows =
      this.table === "expense_inbox_aliases"
        ? aliasRows
        : this.table === "expense_inbox_items"
          ? inboxRows
          : [];
    for (const filter of this.filters) rows = rows.filter(filter);
    if (this.statuses) {
      rows = rows.filter((row) => this.statuses!.includes(String(row.status)));
    }
    rows = [...rows].sort((a, b) =>
      String(b.received_at ?? b.updated_at ?? "").localeCompare(
        String(a.received_at ?? a.updated_at ?? ""),
      ),
    );
    return typeof this.limitValue === "number"
      ? rows.slice(0, this.limitValue)
      : rows;
  }
}

class FakeMutation {
  private readonly filters: Array<(row: Record<string, unknown>) => boolean>;

  constructor(
    private readonly table: string,
    private readonly patch: Record<string, unknown>,
    filters: readonly ((row: Record<string, unknown>) => boolean)[],
  ) {
    this.filters = [...filters];
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => rowValue(row, column) === value);
    return this;
  }

  select() {
    return this;
  }

  async maybeSingle() {
    if (this.table !== "expense_inbox_items") {
      return { data: null, error: null };
    }
    const row = inboxRows.find((candidate) =>
      this.filters.every((filter) => filter(candidate)),
    );
    if (!row) return { data: null, error: null };
    Object.assign(row, this.patch);
    return { data: { id: row.id }, error: null };
  }
}

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => new FakeQuery(table),
  }),
}));

describe("expense inbox server", () => {
  beforeEach(() => {
    aliasRows.splice(0, aliasRows.length, {
      user_id: DATA_OWNER_ID,
      alias_token: "pa-inbox01",
      active: true,
    });
    inboxRows.splice(0, inboxRows.length);
    vi.clearAllMocks();
    vi.stubEnv("EXPENSE_INBOX_DOMAIN", "mail.facturacion-autonomos.app");
    vi.mocked(hasUnlimitedAiAccessForCompany).mockResolvedValue(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function syntheticEmail(to: string | string[]) {
    return {
      To: to,
      From: "synthetic@example.test",
      Subject: "Prueba sintética de dirección",
      Attachments: [{
        Name: "synthetic.pdf",
        ContentType: "application/pdf",
        Content: Buffer.from("%PDF-1.7\nshort address fixture").toString("base64"),
      }],
    };
  }

  it.each(["gastos-pa-inbox01", "gastos+pa-inbox01"])("rechaza %s y solo recibe por la dirección final corta", async (oldLocalPart) => {
    const { ingestExpenseInboxEmail } = await import("./expense-inbox-server");
    const aliasBefore = structuredClone(aliasRows);
    expect(await ingestExpenseInboxEmail(syntheticEmail(`${oldLocalPart}@mail.facturacion-autonomos.app`)))
      .toMatchObject({ accepted: 0, ignored: 1, errors: 0 });
    expect(inboxRows).toHaveLength(0);
    expect(extractExpenseFromImage).not.toHaveBeenCalled();
    expect(await ingestExpenseInboxEmail(syntheticEmail("pa-inbox01@mail.facturacion-autonomos.app")))
      .toMatchObject({ accepted: 1, pending: 1, errors: 0 });
    expect(await ingestExpenseInboxEmail(syntheticEmail("pa-inbox01@mail.facturacion-autonomos.app")))
      .toMatchObject({ accepted: 0, duplicates: 1, errors: 0 });
    expect(aliasRows).toEqual(aliasBefore);
    expect(inboxRows).toHaveLength(1);
    expect(inboxRows[0]).toMatchObject({ user_id: DATA_OWNER_ID, alias_token: "pa-inbox01" });
    expect(extractExpenseFromImage).toHaveBeenCalledTimes(1);
    expect(consumeExpenseScan).toHaveBeenCalledTimes(1);
  });

  it("deduplica destinatarios cortos y antiguos del mismo alias", async () => {
    const { ingestExpenseInboxEmail } = await import("./expense-inbox-server");
    expect(await ingestExpenseInboxEmail(syntheticEmail([
      "pa-inbox01@mail.facturacion-autonomos.app",
      "gastos-pa-inbox01@mail.facturacion-autonomos.app",
    ]))).toMatchObject({ accepted: 1, pending: 1, errors: 0 });
    expect(inboxRows).toHaveLength(1);
    expect(extractExpenseFromImage).toHaveBeenCalledTimes(1);
  });

  it.each([
    "pa-inbox01@otro.example",
    "gastos-pa-inbox01@otro.example",
    "pa-inbox01@mail.facturacion-autonomos.app.otro.example",
    "pa-inbox01@@mail.facturacion-autonomos.app",
    "pa-desconocido@mail.facturacion-autonomos.app",
  ])("ignora el destinatario ajeno, inválido o desconocido %s", async (to) => {
    const { ingestExpenseInboxEmail } = await import("./expense-inbox-server");
    expect(await ingestExpenseInboxEmail(syntheticEmail(to)))
      .toMatchObject({ accepted: 0, ignored: 1, errors: 0 });
    expect(inboxRows).toHaveLength(0);
    expect(resolveCompanyBillingFromDataOwner).not.toHaveBeenCalled();
    expect(archiveInboxOriginalIfCloud).not.toHaveBeenCalled();
    expect(extractExpenseFromImage).not.toHaveBeenCalled();
  });

  it.each(["pa-inbox01", "gastos-pa-inbox01", "gastos+pa-inbox01"])(
    "no reactiva un alias retirado con la grafía %s", async (localPart) => {
      aliasRows[0]!.active = false;
      const { ingestExpenseInboxEmail } = await import("./expense-inbox-server");
      expect(await ingestExpenseInboxEmail(syntheticEmail(`${localPart}@mail.facturacion-autonomos.app`)))
        .toMatchObject({ accepted: 0, ignored: 1, errors: 0 });
      expect(inboxRows).toHaveLength(0);
      expect(archiveInboxOriginalIfCloud).not.toHaveBeenCalled();
      expect(extractExpenseFromImage).not.toHaveBeenCalled();
    },
  );

  it.each([false, true])("rechaza la ambigüedad entre empresas sin elegir por orden (%s)", async (reverse) => {
    aliasRows.push({
      user_id: "00000000-0000-4000-8000-000000000002",
      alias_token: "zz-other01",
      active: true,
    });
    if (reverse) aliasRows.reverse();
    const { ingestExpenseInboxEmail } = await import("./expense-inbox-server");
    expect(await ingestExpenseInboxEmail(syntheticEmail([
      "pa-inbox01@mail.facturacion-autonomos.app",
      "zz-other01@mail.facturacion-autonomos.app",
    ])))
      .toMatchObject({ accepted: 0, ignored: 1, errors: 0 });
    expect(inboxRows).toHaveLength(0);
    expect(resolveCompanyBillingFromDataOwner).not.toHaveBeenCalled();
    expect(archiveInboxOriginalIfCloud).not.toHaveBeenCalled();
    expect(extractExpenseFromImage).not.toHaveBeenCalled();
  });

  it.each(["pa-inbox01", "gastos-pa-inbox01", "gastos+pa-inbox01"])(
    "recupera el original exacto de un correo antiguo dirigido a %s", async (localPart) => {
      vi.stubEnv("RESEND_API_KEY", "synthetic-test-key");
      const bytes = Buffer.from("%PDF-1.7\noriginal address fixture");
      const hash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
      inboxRows.push({
        id: "inbox-original",
        user_id: DATA_OWNER_ID,
        alias_token: "pa-inbox01",
        from_email: "synthetic@example.test",
        subject: "Original sintético",
        attachment_filename: "synthetic.pdf",
        attachment_content_type: "application/pdf",
        attachment_size: bytes.length,
        attachment_hash: hash,
        status: "pending",
      });
      vi.mocked(listRecentResendReceivedEmails).mockResolvedValue([{
        id: "synthetic-email",
        to: [`${localPart}@mail.facturacion-autonomos.app`],
        from: "synthetic@example.test",
        subject: "Original sintético",
        createdAt: "2026-10-28T00:00:00Z",
        attachments: [{ id: "synthetic-attachment", filename: "synthetic.pdf", size: bytes.length }],
      }]);
      vi.mocked(downloadResendAttachment).mockResolvedValue({
        buffer: bytes,
        filename: "synthetic.pdf",
        contentType: "application/pdf",
      });
      const { getExpenseInboxOriginalAttachment } = await import("./expense-inbox-server");
      expect(await getExpenseInboxOriginalAttachment({ userId: DATA_OWNER_ID, itemId: "inbox-original" }))
        .toEqual({ buffer: bytes, contentType: "application/pdf", sourceSha256: hash });
      vi.mocked(downloadResendAttachment).mockResolvedValue({ buffer: Buffer.from("otro adjunto") });
      await expect(getExpenseInboxOriginalAttachment({ userId: DATA_OWNER_ID, itemId: "inbox-original" }))
        .rejects.toThrow("No he podido recuperar ese adjunto");
      expect(extractExpenseFromImage).not.toHaveBeenCalled();
    },
  );

  it("keeps a failed original archive retryable and never analyzes a replay twice",async()=>{
    const {ingestExpenseInboxEmail}=await import("./expense-inbox-server");
    const email={To:"pa-inbox01@mail.facturacion-autonomos.app",From:"sintetico@example.test",Subject:"Original sintético",Attachments:[{Name:"synthetic.pdf",ContentType:"application/pdf",Content:Buffer.from("%PDF-1.7\noriginal retry fixture").toString("base64")}]};
    vi.mocked(archiveInboxOriginalIfCloud).mockRejectedValueOnce(new Error("Storage temporarily unavailable"));
    await expect(ingestExpenseInboxEmail(email)).rejects.toThrow("Storage temporarily unavailable");
    expect(inboxRows).toHaveLength(0);
    expect(await ingestExpenseInboxEmail(email)).toMatchObject({accepted:1,pending:1,duplicates:0});
    expect(await ingestExpenseInboxEmail(email)).toMatchObject({accepted:0,pending:0,duplicates:1});
    expect(inboxRows).toHaveLength(1);
    expect(consumeExpenseScan).toHaveBeenCalledTimes(1);
    expect(archiveInboxOriginalIfCloud).toHaveBeenCalledTimes(3);
  });

  it("acumula adjuntos de emails distintos y cierra solo la entrada indicada", async () => {
    const {
      ingestExpenseInboxEmail,
      listExpenseInboxItems,
      updateExpenseInboxItemStatus,
    } = await import("./expense-inbox-server");

    const first = await ingestExpenseInboxEmail({
      To: "pa-inbox01@mail.facturacion-autonomos.app",
      From: "Proveedor uno <uno@example.test>",
      Subject: "Factura 1",
      Attachments: [
        {
          Name: "factura-uno.pdf",
          ContentType: "application/pdf",
          Content: Buffer.from("%PDF-1.7\nfactura uno").toString("base64"),
        },
      ],
    });
    const second = await ingestExpenseInboxEmail({
      To: "pa-inbox01@mail.facturacion-autonomos.app",
      From: "Proveedor dos <dos@example.test>",
      Subject: "Factura 2",
      Attachments: [
        {
          Name: "factura-dos.pdf",
          ContentType: "application/pdf",
          Content: Buffer.from("%PDF-1.7\nfactura dos").toString("base64"),
        },
      ],
    });

    expect(first).toMatchObject({ accepted: 1, pending: 1, duplicates: 0 });
    expect(second).toMatchObject({ accepted: 1, pending: 1, duplicates: 0 });
    expect(archiveInboxOriginalIfCloud).toHaveBeenCalledTimes(2);
    expect(archiveInboxOriginalIfCloud).toHaveBeenCalledWith(expect.objectContaining({userId:DATA_OWNER_ID,billingUserId:BILLING_OWNER_ID,bytes:Buffer.from("%PDF-1.7\nfactura uno")}));

    const items = await listExpenseInboxItems(DATA_OWNER_ID);

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.attachmentFilename).sort()).toEqual([
      "factura-dos.pdf",
      "factura-uno.pdf",
    ]);
    expect(new Set(items.map((item) => item.id)).size).toBe(2);

    await updateExpenseInboxItemStatus({
      userId: DATA_OWNER_ID,
      itemId: items[0]!.id,
      status: "processed",
    });

    const remaining = await listExpenseInboxItems(DATA_OWNER_ID);

    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.id).toBe(items[1]!.id);
    expect(remaining[0]!.status).toBe("pending");
    expect(resolveCompanyBillingFromDataOwner).toHaveBeenCalledWith(
      DATA_OWNER_ID,
    );
    expect(consumeExpenseScan).toHaveBeenCalledTimes(2);
    expect(consumeExpenseScan).toHaveBeenNthCalledWith(1, BILLING_OWNER_ID);
    expect(consumeExpenseScan).toHaveBeenNthCalledWith(2, BILLING_OWNER_ID);
  });

  it("mantiene el buzon separado pero no consume cuota si la empresa tiene IA ilimitada", async () => {
    vi.mocked(hasUnlimitedAiAccessForCompany).mockResolvedValue(true);
    const { ingestExpenseInboxEmail, listExpenseInboxItems } = await import(
      "./expense-inbox-server"
    );

    const result = await ingestExpenseInboxEmail({
      To: "pa-inbox01@mail.facturacion-autonomos.app",
      From: "Proveedor tres <tres@example.test>",
      Subject: "Factura ilimitada",
      Attachments: [
        {
          Name: "factura-ilimitada.pdf",
          ContentType: "application/pdf",
          Content: Buffer.from("factura ilimitada").toString("base64"),
        },
      ],
    });

    expect(result).toMatchObject({ accepted: 1, pending: 1, errors: 0 });
    expect(await listExpenseInboxItems(DATA_OWNER_ID)).toHaveLength(1);
    expect(hasUnlimitedAiAccessForCompany).toHaveBeenCalledWith({
      companyId: COMPANY_ID,
    });
    expect(consumeExpenseScan).not.toHaveBeenCalled();
  });
});
