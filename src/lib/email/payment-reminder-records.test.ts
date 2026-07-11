import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buildDocumentPdfSnapshot,
  buildDocumentSnapshot,
} from "@/lib/document-integrity";
import { buildPdfViewModelForDocument } from "@/lib/document-integrity/pdf-source";
import { paymentReminderSubject } from "@/lib/payment-reminder";
import { DEFAULT_PROFILE, type Document } from "@/lib/types";
import {
  lookupPaymentReminderEntity,
  paymentReminderRecipientRateLimitSubject,
  resolvePaymentReminderRecords,
  type PaymentReminderEntityLookup,
} from "./payment-reminder-records";

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

const pendingInvoice: Document = {
  id: "invoice-1",
  type: "factura",
  number: "F-2026-0001",
  date: "2026-07-01",
  dueDate: "2026-07-10",
  client: { name: "Cliente", email: "cliente@example.com" },
  items: [
    {
      id: "line-1",
      description: "Servicio",
      quantity: 1,
      unitPrice: 100,
      ivaPercent: 21,
    },
  ],
  status: "enviado",
  createdAt: "2026-07-01T10:00:00.000Z",
  updatedAt: "2026-07-01T10:00:00.000Z",
};

const profile = {
  ...DEFAULT_PROFILE,
  name: "Emisor legítimo",
  nif: "12345678Z",
  address: "Calle Uno 1",
  city: "Madrid",
  postalCode: "28001",
  phone: "600000000",
  email: "emisor@example.com",
};

function lookupWithRows(
  rows: Record<string, { entityId: string; payload: unknown; deleted: boolean }>,
  calls: string[] = [],
): PaymentReminderEntityLookup {
  return async (userId, entityType, entityId) => {
    calls.push(`${userId}:${entityType}:${entityId}`);
    return {
      ok: true,
      row: rows[`${userId}:${entityType}:${entityId}`] ?? null,
    };
  };
}

describe("payment reminder records", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("consulta sync_entities acotando por usuario, tipo e identificador", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        entity_id: "invoice-1",
        payload: pendingInvoice,
        deleted: false,
      },
      error: null,
    });
    const builder = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle,
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    const from = vi.fn().mockReturnValue(builder);
    vi.mocked(getSupabaseAdmin).mockReturnValue({ from } as never);

    const result = await lookupPaymentReminderEntity(
      "owner-user",
      "document",
      "invoice-1",
    );

    expect(result).toMatchObject({ ok: true });
    expect(from).toHaveBeenCalledWith("sync_entities");
    expect(builder.eq.mock.calls).toEqual([
      ["user_id", "owner-user"],
      ["entity_type", "document"],
      ["entity_id", "invoice-1"],
    ]);
  });

  it("resuelve factura y perfil exclusivamente del mismo propietario", async () => {
    const calls: string[] = [];
    const lookup = lookupWithRows(
      {
        "owner-user:document:invoice-1": {
          entityId: "invoice-1",
          payload: pendingInvoice,
          deleted: false,
        },
        "owner-user:profile:profile": {
          entityId: "profile",
          payload: profile,
          deleted: false,
        },
      },
      calls,
    );

    const result = await resolvePaymentReminderRecords(
      "owner-user",
      "invoice-1",
      lookup,
    );

    expect(result).toMatchObject({ ok: true, doc: pendingInvoice, profile });
    expect(calls).toEqual([
      "owner-user:document:invoice-1",
      "owner-user:profile:profile",
    ]);
  });

  it("usa cliente, número y emisor canónicos del mismo snapshot que el PDF", async () => {
    const canonicalSource: Document = {
      ...pendingInvoice,
      number: "F-CANONICA-0001",
      client: { name: "Cliente A", email: "a@example.com" },
    };
    const documentSnapshot = buildDocumentSnapshot(canonicalSource, profile, {
      capturedAt: "2026-07-01T10:00:00.000Z",
    });
    const pdfSnapshot = buildDocumentPdfSnapshot(
      documentSnapshot,
      profile,
      "2026-07-01T10:00:00.000Z",
    );
    const divergentStoredDocument: Document = {
      ...canonicalSource,
      number: "F-TOPLEVEL-B",
      client: { name: "Cliente B", email: "b@example.com" },
      issuer: {
        ...documentSnapshot.issuer,
        name: "Emisor top-level B",
      },
      documentSnapshot,
      pdfSnapshot,
    };
    const lookup = lookupWithRows({
      "owner-user:document:invoice-1": {
        entityId: "invoice-1",
        payload: divergentStoredDocument,
        deleted: false,
      },
      "owner-user:profile:profile": {
        entityId: "profile",
        payload: profile,
        deleted: false,
      },
    });

    const result = await resolvePaymentReminderRecords(
      "owner-user",
      "invoice-1",
      lookup,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.client.email).toBe("a@example.com");
    expect(result.doc.client.email).not.toBe("b@example.com");
    expect(result.doc.number).toBe("F-CANONICA-0001");
    expect(result.doc.issuer?.name).toBe("Emisor legítimo");
    expect(paymentReminderSubject(result.doc)).toContain("F-CANONICA-0001");
    expect(
      paymentReminderRecipientRateLimitSubject(
        result.doc.client.email!,
        "test-salt",
      ),
    ).not.toBe(
      paymentReminderRecipientRateLimitSubject("b@example.com", "test-salt"),
    );
    const pdfView = buildPdfViewModelForDocument(result.doc, profile);
    expect(pdfView.doc.client.email).toBe("a@example.com");
    expect(pdfView.doc.number).toBe("F-CANONICA-0001");
  });

  it("no encuentra una factura ajena y no intenta cargar perfiles cruzados", async () => {
    const calls: string[] = [];
    const lookup = lookupWithRows(
      {
        "owner-user:document:invoice-1": {
          entityId: "invoice-1",
          payload: pendingInvoice,
          deleted: false,
        },
      },
      calls,
    );

    await expect(
      resolvePaymentReminderRecords("other-user", "invoice-1", lookup),
    ).resolves.toEqual({ ok: false, reason: "not_found" });
    expect(calls).toEqual(["other-user:document:invoice-1"]);
  });

  it("rechaza filas borradas y payloads manipulados", async () => {
    const deletedLookup = lookupWithRows({
      "owner-user:document:invoice-1": {
        entityId: "invoice-1",
        payload: pendingInvoice,
        deleted: true,
      },
    });
    await expect(
      resolvePaymentReminderRecords(
        "owner-user",
        "invoice-1",
        deletedLookup,
      ),
    ).resolves.toEqual({ ok: false, reason: "not_found" });

    const invalidDocumentLookup = lookupWithRows({
      "owner-user:document:invoice-1": {
        entityId: "invoice-1",
        payload: { ...pendingInvoice, client: { email: 123 } },
        deleted: false,
      },
    });
    await expect(
      resolvePaymentReminderRecords(
        "owner-user",
        "invoice-1",
        invalidDocumentLookup,
      ),
    ).resolves.toEqual({ ok: false, reason: "invalid_document" });
  });

  it("rechaza perfiles inválidos aunque la factura sea válida", async () => {
    const lookup = lookupWithRows({
      "owner-user:document:invoice-1": {
        entityId: "invoice-1",
        payload: pendingInvoice,
        deleted: false,
      },
      "owner-user:profile:profile": {
        entityId: "profile",
        payload: { name: "Perfil incompleto" },
        deleted: false,
      },
    });

    await expect(
      resolvePaymentReminderRecords("owner-user", "invoice-1", lookup),
    ).resolves.toEqual({ ok: false, reason: "invalid_profile" });
  });

  it("rechaza snapshots almacenados que no pueden alimentar el PDF", async () => {
    const lookup = lookupWithRows({
      "owner-user:document:invoice-1": {
        entityId: "invoice-1",
        payload: { ...pendingInvoice, documentSnapshot: {} },
        deleted: false,
      },
      "owner-user:profile:profile": {
        entityId: "profile",
        payload: profile,
        deleted: false,
      },
    });

    await expect(
      resolvePaymentReminderRecords("owner-user", "invoice-1", lookup),
    ).resolves.toEqual({ ok: false, reason: "invalid_document" });
  });

  it("normaliza y seudonimiza el destinatario del rate limit", () => {
    const upper = paymentReminderRecipientRateLimitSubject(
      " Cliente@Example.COM ",
      "test-salt",
    );
    const lower = paymentReminderRecipientRateLimitSubject(
      "cliente@example.com",
      "test-salt",
    );

    expect(upper).toBe(lower);
    expect(upper).toMatch(/^recipient:[a-f0-9]{64}$/);
    expect(upper).not.toContain("cliente");
    expect(upper).not.toContain("example.com");
    expect(
      paymentReminderRecipientRateLimitSubject("cliente@example.com", ""),
    ).toBeNull();
  });
});
