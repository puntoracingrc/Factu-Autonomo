import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "@/lib/email/send";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  sendPaymentReceiptEmail,
  type PaymentReceiptRecordInput,
} from "./payment-receipt-email";

vi.mock("@/lib/email/send", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

const baseInput: PaymentReceiptRecordInput = {
  userId: "11111111-1111-4111-8111-111111111111",
  stripeEventId: "evt_pack_1",
  stripeCheckoutSessionId: "cs_test_pack_1",
  amountCents: 199,
  currency: "eur",
  description: "Pack de 10 escaneos extra",
  customerEmail: "buyer@example.test",
  paidAt: new Date("2026-07-13T00:00:00.000Z"),
};

function fakeReceiptStore(options: {
  queryRows?: Array<{ id: string; emailed_at: string | null } | null>;
  insertError?: { message: string } | null;
  updateError?: { message: string } | null;
} = {}) {
  const rows = [...(options.queryRows ?? [])];
  const maybeSingle = vi.fn(async () => ({
    data: rows.length ? rows.shift() : null,
    error: null,
  }));
  const limit = vi.fn(() => ({ maybeSingle }));
  const order = vi.fn(() => ({ limit }));
  const queryEq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq: queryEq }));
  const insert = vi.fn(async () => ({ error: options.insertError ?? null }));
  const updateEq = vi.fn(async () => ({ error: options.updateError ?? null }));
  const update = vi.fn(() => ({ eq: updateEq }));
  const from = vi.fn(() => ({ select, insert, update }));
  vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);
  return { from, insert, update, updateEq, maybeSingle };
}

describe("sendPaymentReceiptEmail", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(sendEmail).mockResolvedValue({ ok: true, id: "email_1" });
  });

  it("usa una clave de proveedor estable por Checkout Session y persiste el envío", async () => {
    const store = fakeReceiptStore();

    await expect(sendPaymentReceiptEmail(baseInput)).resolves.toEqual({
      sent: true,
    });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: expect.stringMatching(
          /^payment-receipt-v1\/[a-f0-9]{64}$/,
        ),
      }),
    );
    expect(store.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_event_id: "evt_pack_1",
        stripe_checkout_session_id: "cs_test_pack_1",
        emailed_at: expect.any(String),
      }),
    );
  });

  it("mantiene la misma clave al reconciliar otro event ID de la misma sesión", async () => {
    fakeReceiptStore();
    await sendPaymentReceiptEmail(baseInput);
    const firstKey = vi.mocked(sendEmail).mock.calls[0]?.[0].idempotencyKey;

    fakeReceiptStore();
    await sendPaymentReceiptEmail({
      ...baseInput,
      stripeEventId: "evt_pack_2",
    });
    const secondKey = vi.mocked(sendEmail).mock.calls[1]?.[0].idempotencyKey;

    expect(firstKey).toBe(secondKey);
  });

  it("no vuelve a llamar al proveedor si la sesión ya consta enviada", async () => {
    fakeReceiptStore({
      queryRows: [
        null,
        { id: "receipt_1", emailed_at: "2026-07-13T00:00:05.000Z" },
      ],
    });

    await expect(
      sendPaymentReceiptEmail({ ...baseInput, stripeEventId: "evt_pack_2" }),
    ).resolves.toEqual({
      sent: false,
      skipped: true,
      reason: "already_sent",
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("conserva un recibo pendiente y propaga el reintento del proveedor", async () => {
    const store = fakeReceiptStore();
    vi.mocked(sendEmail).mockResolvedValue({
      ok: false,
      error: "provider unavailable",
      failureKind: "ambiguous",
      retryable: true,
    });

    await expect(sendPaymentReceiptEmail(baseInput)).resolves.toEqual({
      sent: false,
      reason: "provider unavailable",
      retryable: true,
    });
    expect(store.insert).toHaveBeenCalledWith(
      expect.objectContaining({ emailed_at: null }),
    );
  });

  it("reintenta con la misma fila pendiente y falla cerrado si no puede persistir", async () => {
    const store = fakeReceiptStore({
      queryRows: [{ id: "receipt_pending", emailed_at: null }],
      updateError: { message: "storage unavailable" },
    });

    await expect(sendPaymentReceiptEmail(baseInput)).resolves.toEqual({
      sent: false,
      reason: "receipt_persistence_failed",
      retryable: true,
    });
    expect(store.update).toHaveBeenCalledWith({
      emailed_at: expect.any(String),
    });
    expect(store.updateEq).toHaveBeenCalledWith("id", "receipt_pending");
  });
});
