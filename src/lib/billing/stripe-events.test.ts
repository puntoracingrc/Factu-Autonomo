import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  completeStripeScanPackEvent,
  markStripeEventFailed,
  markStripeEventProcessed,
  reserveStripeEvent,
} from "./stripe-events";

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

const TOKEN = "11111111-1111-4111-8111-111111111111";

function adminWithRpc(data: unknown, error: unknown = null) {
  const rpc = vi.fn(async () => ({ data, error }));
  vi.mocked(getSupabaseAdmin).mockReturnValue({ rpc } as never);
  return rpc;
}

describe("Stripe event leases", () => {
  beforeEach(() => vi.resetAllMocks());

  it("interpreta una reserva adquirida con token y vencimiento", async () => {
    const rpc = adminWithRpc([
      {
        result_status: "acquired",
        event_status: "processing",
        lease_token: TOKEN,
        attempt_number: 2,
        lease_until: "2026-07-13T02:05:00.000Z",
      },
    ]);

    await expect(
      reserveStripeEvent("evt_1", "checkout.session.completed"),
    ).resolves.toEqual({
      reserved: true,
      duplicate: false,
      busy: false,
      manualReview: false,
      status: "processing",
      attemptToken: TOKEN,
      attemptCount: 2,
      leaseExpiresAt: "2026-07-13T02:05:00.000Z",
    });
    expect(rpc).toHaveBeenCalledWith("reserve_stripe_event_attempt", {
      p_event_id: "evt_1",
      p_event_type: "checkout.session.completed",
      p_lease_seconds: 300,
      p_claimed_at: null,
    });
  });

  it("distingue procesado definitivo de processing ocupado", async () => {
    adminWithRpc([
      {
        result_status: "processed",
        event_status: "processed",
        lease_token: null,
        attempt_number: 1,
        lease_until: null,
      },
    ]);
    await expect(reserveStripeEvent("evt_1", "invoice.paid")).resolves.toEqual({
      reserved: false,
      duplicate: true,
      busy: false,
      manualReview: false,
      status: "processed",
      attemptCount: 1,
    });

    adminWithRpc([
      {
        result_status: "busy",
        event_status: "processing",
        lease_token: null,
        attempt_number: 3,
        lease_until: "2026-07-13T02:05:00.000Z",
      },
    ]);
    await expect(reserveStripeEvent("evt_1", "invoice.paid")).resolves.toEqual({
      reserved: false,
      duplicate: false,
      busy: true,
      manualReview: false,
      status: "processing",
      attemptCount: 3,
      leaseExpiresAt: "2026-07-13T02:05:00.000Z",
    });
  });

  it("expone los eventos legacy ambiguos como revisión manual", async () => {
    adminWithRpc([
      {
        result_status: "manual_review",
        event_status: "failed",
        lease_token: null,
        attempt_number: 0,
        lease_until: null,
      },
    ]);

    await expect(
      reserveStripeEvent("evt_legacy", "checkout.session.completed"),
    ).resolves.toEqual({
      reserved: false,
      duplicate: false,
      busy: false,
      manualReview: true,
      status: "failed",
      attemptCount: 0,
    });
  });

  it("bloquea conflicto de tipo y respuestas de lease malformadas", async () => {
    adminWithRpc([
      {
        result_status: "conflict",
        event_status: "failed",
        lease_token: null,
        attempt_number: 1,
        lease_until: null,
      },
    ]);
    await expect(reserveStripeEvent("evt_1", "invoice.paid")).rejects.toThrow(
      "Conflicto de identidad",
    );

    adminWithRpc([
      {
        result_status: "acquired",
        event_status: "processing",
        lease_token: "not-a-uuid",
        attempt_number: 1,
        lease_until: "not-a-date",
      },
    ]);
    await expect(reserveStripeEvent("evt_1", "invoice.paid")).rejects.toThrow(
      "Lease inválido",
    );
  });

  it("completa y falla únicamente el token de intento recibido", async () => {
    const completeRpc = adminWithRpc("processed");
    await expect(
      markStripeEventProcessed("evt_1", TOKEN),
    ).resolves.toBeUndefined();
    expect(completeRpc).toHaveBeenCalledWith("complete_stripe_event_attempt", {
      p_event_id: "evt_1",
      p_attempt_token: TOKEN,
      p_completed_at: null,
    });

    const failRpc = adminWithRpc("stale_attempt");
    await expect(
      markStripeEventFailed("evt_1", TOKEN, "handler_failed"),
    ).resolves.toBe("stale_attempt");
    expect(failRpc).toHaveBeenCalledWith("fail_stripe_event_attempt", {
      p_event_id: "evt_1",
      p_attempt_token: TOKEN,
      p_error_code: "handler_failed",
      p_failed_at: null,
    });
  });

  it("acepta solo resultados coherentes de la finalización atómica del pack", async () => {
    const rpc = adminWithRpc([
      { result_status: "applied", credited_scan_credits: 10 },
    ]);
    await expect(
      completeStripeScanPackEvent({
        eventId: "evt_pack",
        attemptToken: TOKEN,
        userId: "22222222-2222-4222-8222-222222222222",
        checkoutSessionId: "cs_test_pack",
        scanCredits: 10,
        paymentStatus: "paid",
        fulfillmentContract: "scan_pack_atomic_v1",
      }),
    ).resolves.toEqual({ status: "applied", creditedScanCredits: 10 });
    expect(rpc).toHaveBeenCalledWith("complete_stripe_scan_pack_event", {
      p_event_id: "evt_pack",
      p_attempt_token: TOKEN,
      p_user_id: "22222222-2222-4222-8222-222222222222",
      p_checkout_session_id: "cs_test_pack",
      p_scan_credits: 10,
      p_units_per_scan: 10,
      p_payment_status: "paid",
      p_fulfillment_contract: "scan_pack_atomic_v1",
      p_completed_at: null,
    });

    adminWithRpc([
      { result_status: "already_applied", credited_scan_credits: 0 },
    ]);
    await expect(
      completeStripeScanPackEvent({
        eventId: "evt_pack_2",
        attemptToken: TOKEN,
        userId: "22222222-2222-4222-8222-222222222222",
        checkoutSessionId: "cs_test_pack",
        scanCredits: 10,
        paymentStatus: "paid",
        fulfillmentContract: "scan_pack_atomic_v1",
      }),
    ).resolves.toEqual({
      status: "already_applied",
      creditedScanCredits: 0,
    });
  });

  it("falla cerrado ante conflicto, token obsoleto o error RPC", async () => {
    for (const status of ["effect_conflict", "stale_attempt"] as const) {
      adminWithRpc([{ result_status: status, credited_scan_credits: 0 }]);
      await expect(
        completeStripeScanPackEvent({
          eventId: "evt_pack",
          attemptToken: TOKEN,
          userId: "22222222-2222-4222-8222-222222222222",
          checkoutSessionId: "cs_test_pack",
          scanCredits: 10,
          paymentStatus: "paid",
          fulfillmentContract: "scan_pack_atomic_v1",
        }),
      ).rejects.toThrow();
    }

    adminWithRpc(null, { message: "database unavailable" });
    await expect(reserveStripeEvent("evt_1", "invoice.paid")).rejects.toThrow(
      "database unavailable",
    );
  });
});
