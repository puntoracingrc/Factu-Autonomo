import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getStripe } from "@/lib/billing/stripe";
import {
  completeStripeScanPackEvent,
  markStripeEventFailed,
  markStripeEventProcessed,
  reserveStripeEvent,
} from "@/lib/billing/stripe-events";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  findUserIdByStripeCustomer,
  receiptFromCheckoutSession,
  sendPaymentReceiptEmail,
} from "@/lib/billing/payment-receipt-email";
import { syncBillingProfileFromCustomerId } from "@/lib/billing/sync-billing-profile";
import { SCAN_PACK_ATOMIC_LEDGER_CUTOVER_UNIX } from "@/lib/billing/scan-packs";

vi.mock("@/lib/billing/stripe", () => ({
  getStripe: vi.fn(),
}));

vi.mock("@/lib/billing/stripe-events", () => ({
  reserveStripeEvent: vi.fn(),
  markStripeEventProcessed: vi.fn(),
  markStripeEventFailed: vi.fn(),
  completeStripeScanPackEvent: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/billing/payment-receipt-email", () => ({
  findUserIdByStripeCustomer: vi.fn(),
  receiptFromCheckoutSession: vi.fn(() => null),
  sendPaymentReceiptEmail: vi.fn(),
}));

vi.mock("@/lib/billing/sync-billing-profile", () => ({
  syncBillingProfileFromCheckoutSession: vi.fn(async () => null),
  syncBillingProfileFromCustomerId: vi.fn(async () => null),
}));

function stripeRequest() {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "sig" },
    body: "{}",
  });
}

function fakeStripe(event: unknown) {
  return {
    webhooks: {
      constructEvent: vi.fn(() => event),
    },
  };
}

function fakeAdmin(updateError: { message: string } | null = null) {
  const eq = vi.fn(async () => ({ error: updateError }));
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));
  return { from, update, eq };
}

const ATTEMPT_TOKEN = "11111111-1111-4111-8111-111111111111";

function acquiredReservation() {
  return {
    reserved: true,
    duplicate: false,
    busy: false,
    manualReview: false,
    status: "processing" as const,
    attemptToken: ATTEMPT_TOKEN,
    attemptCount: 1,
    leaseExpiresAt: "2026-07-13T02:05:00.000Z",
  };
}

function scanPackEvent(
  type = "checkout.session.completed",
  overrides: Record<string, unknown> = {},
) {
  return {
    id: `evt_${type.replaceAll(".", "_")}`,
    type,
    data: {
      object: {
        id: "cs_test_scan_pack_1",
        created: SCAN_PACK_ATOMIC_LEDGER_CUTOVER_UNIX,
        mode: "payment",
        payment_status: "paid",
        metadata: {
          user_id: "11111111-1111-4111-8111-111111111111",
          checkout_type: "scan_pack",
          scan_credits: "10",
          fulfillment_contract: "scan_pack_atomic_v1",
        },
        ...overrides,
      },
    },
  };
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.mocked(markStripeEventProcessed).mockResolvedValue(undefined);
    vi.mocked(markStripeEventFailed).mockResolvedValue("failed");
    vi.mocked(completeStripeScanPackEvent).mockResolvedValue({
      status: "applied",
      creditedScanCredits: 10,
    });
    vi.mocked(receiptFromCheckoutSession).mockReturnValue(null);
    vi.mocked(sendPaymentReceiptEmail).mockResolvedValue({ sent: true });
    vi.mocked(findUserIdByStripeCustomer).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("procesa un evento valido una sola vez", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = {
      id: "evt_valid",
      type: "customer.subscription.deleted",
      data: {
        object: {
          metadata: { user_id: "user_1" },
        },
      },
    };
    const admin = fakeAdmin();

    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue(acquiredReservation());

    const response = await POST(stripeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.received).toBe(true);
    expect(reserveStripeEvent).toHaveBeenCalledWith(
      "evt_valid",
      "customer.subscription.deleted",
    );
    expect(admin.from).toHaveBeenCalledWith("user_subscriptions");
    expect(markStripeEventProcessed).toHaveBeenCalledWith(
      "evt_valid",
      ATTEMPT_TOKEN,
    );
    expect(markStripeEventFailed).not.toHaveBeenCalled();
  });

  it("rechaza firma invalida sin reservar evento", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.mocked(getStripe).mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => {
          throw new Error("bad signature");
        }),
      },
    } as never);

    const response = await POST(stripeRequest());

    expect(response.status).toBe(400);
    expect(reserveStripeEvent).not.toHaveBeenCalled();
  });

  it("responde correctamente a un evento repetido sin repetir efectos", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = {
      id: "evt_duplicate",
      type: "customer.subscription.deleted",
      data: {
        object: {
          metadata: { user_id: "user_1" },
        },
      },
    };

    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue({
      reserved: false,
      duplicate: true,
      busy: false,
      manualReview: false,
      status: "processed",
      attemptCount: 1,
    });

    const response = await POST(stripeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.duplicate).toBe(true);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
    expect(markStripeEventProcessed).not.toHaveBeenCalled();
  });

  it("devuelve 503 reintentable mientras otro lease sigue activo", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = {
      id: "evt_busy",
      type: "customer.subscription.deleted",
      data: { object: { metadata: { user_id: "user_1" } } },
    };
    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue({
      reserved: false,
      duplicate: false,
      busy: true,
      manualReview: false,
      status: "processing",
      attemptCount: 1,
      leaseExpiresAt: "2026-07-13T02:05:00.000Z",
    });

    const response = await POST(stripeRequest());

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("10");
    expect(await response.json()).toMatchObject({
      received: false,
      retryable: true,
      status: "processing",
    });
    expect(markStripeEventProcessed).not.toHaveBeenCalled();
  });

  it("marca failed y devuelve 500 ante un error recuperable", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = {
      id: "evt_retry",
      type: "customer.subscription.deleted",
      data: {
        object: {
          metadata: { user_id: "user_1" },
        },
      },
    };

    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(getSupabaseAdmin).mockReturnValue(
      fakeAdmin({ message: "temporary database error" }) as never,
    );
    vi.mocked(reserveStripeEvent).mockResolvedValue(acquiredReservation());

    const response = await POST(stripeRequest());

    expect(response.status).toBe(500);
    expect(markStripeEventFailed).toHaveBeenCalledWith(
      "evt_retry",
      ATTEMPT_TOKEN,
      "handler_failed",
    );
    expect(markStripeEventProcessed).not.toHaveBeenCalled();
  });

  it("acredita un pack pagado dentro de la finalización atómica", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = scanPackEvent();
    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue(acquiredReservation());

    const response = await POST(stripeRequest());

    expect(response.status).toBe(200);
    expect(completeStripeScanPackEvent).toHaveBeenCalledWith({
      eventId: event.id,
      attemptToken: ATTEMPT_TOKEN,
      userId: "11111111-1111-4111-8111-111111111111",
      checkoutSessionId: "cs_test_scan_pack_1",
      scanCredits: 10,
      paymentStatus: "paid",
      fulfillmentContract: "scan_pack_atomic_v1",
    });
    expect(markStripeEventProcessed).not.toHaveBeenCalled();
    expect(markStripeEventFailed).not.toHaveBeenCalled();
  });

  it("no acredita checkout.session.completed mientras siga impagado", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = scanPackEvent("checkout.session.completed", {
      payment_status: "unpaid",
    });
    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue(acquiredReservation());

    const response = await POST(stripeRequest());

    expect(response.status).toBe(200);
    expect(completeStripeScanPackEvent).not.toHaveBeenCalled();
    expect(markStripeEventProcessed).toHaveBeenCalledWith(
      event.id,
      ATTEMPT_TOKEN,
    );
  });

  it("no aparca como válido un pack impagado sin propietario", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = scanPackEvent("checkout.session.completed", {
      payment_status: "unpaid",
      metadata: {
        checkout_type: "scan_pack",
        scan_credits: "10",
        fulfillment_contract: "scan_pack_atomic_v1",
      },
    });
    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue(acquiredReservation());

    const response = await POST(stripeRequest());

    expect(response.status).toBe(500);
    expect(markStripeEventFailed).toHaveBeenCalledWith(
      event.id,
      ATTEMPT_TOKEN,
      "invalid_checkout_state",
    );
    expect(markStripeEventProcessed).not.toHaveBeenCalled();
  });

  it("acredita el pago diferido al recibir async_payment_succeeded", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = scanPackEvent("checkout.session.async_payment_succeeded");
    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue(acquiredReservation());

    const response = await POST(stripeRequest());

    expect(response.status).toBe(200);
    expect(completeStripeScanPackEvent).toHaveBeenCalledOnce();
    expect(markStripeEventProcessed).not.toHaveBeenCalled();
  });

  it("bloquea metadata de créditos manipulada sin conceder el pack", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = scanPackEvent("checkout.session.completed", {
      metadata: {
        user_id: "11111111-1111-4111-8111-111111111111",
        checkout_type: "scan_pack",
        scan_credits: "1000",
        fulfillment_contract: "scan_pack_atomic_v1",
      },
    });
    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue(acquiredReservation());

    const response = await POST(stripeRequest());

    expect(response.status).toBe(500);
    expect(completeStripeScanPackEvent).not.toHaveBeenCalled();
    expect(markStripeEventFailed).toHaveBeenCalledWith(
      event.id,
      ATTEMPT_TOKEN,
      "invalid_checkout_state",
    );
  });

  it("deja un checkout legacy sin contrato en revisión manual durable", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = scanPackEvent("checkout.session.completed", {
      metadata: {
        user_id: "11111111-1111-4111-8111-111111111111",
        checkout_type: "scan_pack",
        scan_credits: "10",
      },
    });
    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue(acquiredReservation());
    vi.mocked(markStripeEventFailed).mockResolvedValue("manual_review");

    const response = await POST(stripeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      received: true,
      manualReview: true,
      status: "failed",
    });
    expect(completeStripeScanPackEvent).not.toHaveBeenCalled();
    expect(markStripeEventFailed).toHaveBeenCalledWith(
      event.id,
      ATTEMPT_TOKEN,
      "legacy_checkout_unresolved",
    );
  });

  it("aparca una sesión v1 creada antes de activar el ledger atómico", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = scanPackEvent("checkout.session.async_payment_succeeded", {
      created: SCAN_PACK_ATOMIC_LEDGER_CUTOVER_UNIX - 1,
    });
    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue(acquiredReservation());
    vi.mocked(markStripeEventFailed).mockResolvedValue("manual_review");

    const response = await POST(stripeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      received: true,
      manualReview: true,
      status: "failed",
    });
    expect(completeStripeScanPackEvent).not.toHaveBeenCalled();
    expect(markStripeEventFailed).toHaveBeenCalledWith(
      event.id,
      ATTEMPT_TOKEN,
      "legacy_checkout_unresolved",
    );
  });

  it("aparca un pack sin fecha de creación verificable", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = scanPackEvent("checkout.session.completed", {
      created: undefined,
    });
    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue(acquiredReservation());
    vi.mocked(markStripeEventFailed).mockResolvedValue("manual_review");

    const response = await POST(stripeRequest());

    expect(response.status).toBe(200);
    expect(completeStripeScanPackEvent).not.toHaveBeenCalled();
    expect(markStripeEventFailed).toHaveBeenCalledWith(
      event.id,
      ATTEMPT_TOKEN,
      "legacy_checkout_unresolved",
    );
  });

  it("reconoce una fila legacy ya aparcada sin volver a ejecutarla", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = scanPackEvent();
    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue({
      reserved: false,
      duplicate: false,
      busy: false,
      manualReview: true,
      status: "failed",
      attemptCount: 0,
    });

    const response = await POST(stripeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ manualReview: true });
    expect(completeStripeScanPackEvent).not.toHaveBeenCalled();
    expect(markStripeEventProcessed).not.toHaveBeenCalled();
  });

  it("reconcilia el recibo sin reacreditar cuando otro event ID ya aplicó el pack", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = scanPackEvent();
    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue(acquiredReservation());
    vi.mocked(completeStripeScanPackEvent).mockResolvedValue({
      status: "already_applied",
      creditedScanCredits: 0,
    });
    vi.mocked(receiptFromCheckoutSession).mockReturnValue({
      stripeEventId: event.id,
      stripeCheckoutSessionId: "cs_test_scan_pack_1",
      amountCents: 199,
      currency: "eur",
      description: "Pack",
      customerEmail: "test@example.test",
      isRenewal: false,
      paidAt: new Date("2026-07-13T00:00:00.000Z"),
    });

    const response = await POST(stripeRequest());

    expect(response.status).toBe(200);
    expect(sendPaymentReceiptEmail).toHaveBeenCalledOnce();
    expect(markStripeEventFailed).not.toHaveBeenCalled();
  });

  it("devuelve 503 tras el commit atómico si el recibo sigue pendiente", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = scanPackEvent();
    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue(acquiredReservation());
    vi.mocked(receiptFromCheckoutSession).mockReturnValue({
      stripeEventId: event.id,
      stripeCheckoutSessionId: "cs_test_scan_pack_1",
      amountCents: 199,
      currency: "eur",
      description: "Pack",
      customerEmail: "test@example.test",
    });
    vi.mocked(sendPaymentReceiptEmail).mockResolvedValue({
      sent: false,
      reason: "provider_unavailable",
      retryable: true,
    });

    const response = await POST(stripeRequest());

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(await response.json()).toMatchObject({
      retryable: true,
      receiptPending: true,
    });
    expect(completeStripeScanPackEvent).toHaveBeenCalledOnce();
    expect(markStripeEventFailed).not.toHaveBeenCalled();
  });

  it("reintenta solo el recibo de un evento de pack ya procesado", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = scanPackEvent();
    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue({
      reserved: false,
      duplicate: true,
      busy: false,
      manualReview: false,
      status: "processed",
      attemptCount: 1,
    });
    vi.mocked(receiptFromCheckoutSession).mockReturnValue({
      stripeEventId: event.id,
      stripeCheckoutSessionId: "cs_test_scan_pack_1",
      amountCents: 199,
      currency: "eur",
      description: "Pack",
      customerEmail: "test@example.test",
    });
    vi.mocked(sendPaymentReceiptEmail).mockResolvedValue({
      sent: false,
      reason: "provider_unavailable",
      retryable: true,
    });

    const response = await POST(stripeRequest());

    expect(response.status).toBe(503);
    expect(sendPaymentReceiptEmail).toHaveBeenCalledOnce();
    expect(completeStripeScanPackEvent).not.toHaveBeenCalled();
    expect(markStripeEventProcessed).not.toHaveBeenCalled();
  });

  it("no reconcilia emails de eventos processed anteriores al protocolo", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = scanPackEvent();
    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue({
      reserved: false,
      duplicate: true,
      busy: false,
      manualReview: false,
      status: "processed",
      attemptCount: 0,
    });
    vi.mocked(receiptFromCheckoutSession).mockReturnValue({
      stripeEventId: event.id,
      stripeCheckoutSessionId: "cs_test_scan_pack_1",
      amountCents: 199,
      currency: "eur",
      description: "Pack",
      customerEmail: "test@example.test",
    });

    const response = await POST(stripeRequest());

    expect(response.status).toBe(200);
    expect(sendPaymentReceiptEmail).not.toHaveBeenCalled();
  });

  it("aparca un fallo permanente de recibo sin reintentar el crédito", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = scanPackEvent();
    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue(acquiredReservation());
    vi.mocked(receiptFromCheckoutSession).mockReturnValue({
      stripeEventId: event.id,
      stripeCheckoutSessionId: "cs_test_scan_pack_1",
      amountCents: 199,
      currency: "eur",
      description: "Pack",
      customerEmail: "test@example.test",
    });
    vi.mocked(sendPaymentReceiptEmail).mockResolvedValue({
      sent: false,
      skipped: true,
      reason: "email_not_configured",
      retryable: false,
    });

    const response = await POST(stripeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      received: true,
      receiptManualReview: true,
    });
    expect(completeStripeScanPackEvent).toHaveBeenCalledOnce();
    expect(markStripeEventFailed).not.toHaveBeenCalled();
  });

  it("reintenta el recibo invoice.paid sin perderlo ni cerrar el lease", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = {
      id: "evt_invoice_paid",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_test_paid",
          billing_reason: "subscription_cycle",
          customer: "cus_test_paid",
          customer_email: "buyer@example.test",
          amount_paid: 1000,
          currency: "eur",
          created: 1_783_900_800,
          status_transitions: { paid_at: 1_783_900_800 },
          lines: { data: [{ description: "Plan Pro" }] },
          hosted_invoice_url: "https://invoice.stripe.test/in_test_paid",
        },
      },
    };
    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue(acquiredReservation());
    vi.mocked(findUserIdByStripeCustomer).mockResolvedValue(
      "11111111-1111-4111-8111-111111111111",
    );
    vi.mocked(syncBillingProfileFromCustomerId).mockResolvedValue(null);
    vi.mocked(sendPaymentReceiptEmail).mockResolvedValue({
      sent: false,
      reason: "provider unavailable",
      retryable: true,
    });

    const response = await POST(stripeRequest());

    expect(response.status).toBe(503);
    expect(sendPaymentReceiptEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeInvoiceId: "in_test_paid",
        stripeEventId: "evt_invoice_paid",
      }),
    );
    expect(markStripeEventProcessed).not.toHaveBeenCalled();
    expect(markStripeEventFailed).not.toHaveBeenCalled();
  });

  it("bloquea un checkout de pago sin tipo de efecto conocido", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = scanPackEvent("checkout.session.completed", {
      metadata: {
        user_id: "11111111-1111-4111-8111-111111111111",
      },
    });
    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue(acquiredReservation());

    const response = await POST(stripeRequest());

    expect(response.status).toBe(500);
    expect(completeStripeScanPackEvent).not.toHaveBeenCalled();
    expect(markStripeEventFailed).toHaveBeenCalledWith(
      event.id,
      ATTEMPT_TOKEN,
      "invalid_checkout_state",
    );
  });

  it("marca failed si la finalización atómica no puede cerrarse", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const event = scanPackEvent();
    vi.mocked(getStripe).mockReturnValue(fakeStripe(event) as never);
    vi.mocked(reserveStripeEvent).mockResolvedValue(acquiredReservation());
    vi.mocked(completeStripeScanPackEvent).mockRejectedValue(
      new Error("database unavailable"),
    );

    const response = await POST(stripeRequest());

    expect(response.status).toBe(500);
    expect(markStripeEventFailed).toHaveBeenCalledWith(
      event.id,
      ATTEMPT_TOKEN,
      "handler_failed",
    );
    expect(markStripeEventProcessed).not.toHaveBeenCalled();
  });
});
