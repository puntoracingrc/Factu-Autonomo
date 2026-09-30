import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExpenseScanPayload } from "./expense-scan/schema";
import { consumeExpenseScan } from "@/lib/billing/scan-usage-server";
import { hasUnlimitedAiAccessForCompany } from "@/lib/billing/unlimited-ai-access";
import { resolveCompanyBillingFromDataOwner } from "@/lib/companies/server";

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
    inboxRows.splice(0, inboxRows.length);
    vi.clearAllMocks();
    vi.mocked(hasUnlimitedAiAccessForCompany).mockResolvedValue(false);
  });

  it("acumula adjuntos de emails distintos y cierra solo la entrada indicada", async () => {
    const {
      ingestExpenseInboxEmail,
      listExpenseInboxItems,
      updateExpenseInboxItemStatus,
    } = await import("./expense-inbox-server");

    const first = await ingestExpenseInboxEmail({
      To: "gastos-pa-inbox01@mail.facturacion-autonomos.app",
      From: "Proveedor uno <uno@example.test>",
      Subject: "Factura 1",
      Attachments: [
        {
          Name: "factura-uno.pdf",
          ContentType: "application/pdf",
          Content: Buffer.from("factura uno").toString("base64"),
        },
      ],
    });
    const second = await ingestExpenseInboxEmail({
      To: "gastos-pa-inbox01@mail.facturacion-autonomos.app",
      From: "Proveedor dos <dos@example.test>",
      Subject: "Factura 2",
      Attachments: [
        {
          Name: "factura-dos.pdf",
          ContentType: "application/pdf",
          Content: Buffer.from("factura dos").toString("base64"),
        },
      ],
    });

    expect(first).toMatchObject({ accepted: 1, pending: 1, duplicates: 0 });
    expect(second).toMatchObject({ accepted: 1, pending: 1, duplicates: 0 });

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
      To: "gastos-pa-inbox01@mail.facturacion-autonomos.app",
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
