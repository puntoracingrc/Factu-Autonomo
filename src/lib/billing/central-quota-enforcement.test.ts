import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  releaseDeletedCentralBusinessQuota,
  reserveCentralBusinessBatchQuota,
  reserveCentralBusinessMutationQuota,
  reserveCentralInvoiceQuota,
  reserveCentralNumberedDocumentQuota,
} from "./central-quota-enforcement";

const quotaServer = vi.hoisted(() => ({
  commitBillingQuotaServer: vi.fn(),
  releaseBillingQuotaServer: vi.fn(),
  removeBillingQuotaSubjectServer: vi.fn(),
  reserveBillingQuotaServer: vi.fn(),
  resolveServerBillingPlan: vi.fn(),
}));

vi.mock("./quota-server", () => quotaServer);

const userId = "00000000-0000-4000-8000-000000000901";

function metricSnapshot(metric: "customers" | "suppliers" | "documents") {
  return {
    metric,
    used: 1,
    included: 15,
    effectiveLimit: 15,
    creditBalance: 0,
    capacityBonus: 0,
    remaining: 14,
    resetAt: null,
  };
}

describe("central quota enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    quotaServer.resolveServerBillingPlan.mockResolvedValue("free");
    quotaServer.reserveBillingQuotaServer.mockImplementation(
      async ({ metric }: { metric: "customers" | "suppliers" | "documents" }) => ({
        allowed: true,
        claimId: `claim-${metric}`,
        metric,
        snapshot: metricSnapshot(metric),
      }),
    );
  });

  it("reserva por ID central antes de crear una ficha", async () => {
    const result = await reserveCentralBusinessMutationQuota({
      userId,
      mutation: {
        operationKind: "upsert",
        entityType: "customer",
        entityId: "customer-1",
        expectedVersion: 0,
        payload: { id: "customer-1" },
      },
    });

    expect(result).toMatchObject({
      allowed: true,
      reservations: [{ subjectId: "customer-1", metric: "customers" }],
    });
    expect(quotaServer.reserveBillingQuotaServer).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        metric: "customers",
        operationKey: "customer:customer-1",
        subjectId: "customer-1",
      }),
    );
  });

  it("no añade consultas de consumo a los planes de pago", async () => {
    quotaServer.resolveServerBillingPlan.mockResolvedValue("pro");

    const result = await reserveCentralBusinessMutationQuota({
      userId,
      mutation: {
        operationKind: "upsert",
        entityType: "customer",
        entityId: "customer-paid",
        expectedVersion: 0,
        payload: { id: "customer-paid" },
      },
    });

    expect(result).toEqual({ allowed: true, reservations: [] });
    expect(quotaServer.reserveBillingQuotaServer).not.toHaveBeenCalled();
  });

  it("solo cuenta gastos manuales nuevos", async () => {
    const scanned = await reserveCentralBusinessMutationQuota({
      userId,
      mutation: {
        operationKind: "upsert",
        entityType: "expense",
        entityId: "expense-scan",
        expectedVersion: 0,
        payload: { origin: "scan" },
      },
    });
    const updated = await reserveCentralBusinessMutationQuota({
      userId,
      mutation: {
        operationKind: "upsert",
        entityType: "expense",
        entityId: "expense-existing",
        expectedVersion: 2,
        payload: { origin: "manual" },
      },
    });

    expect(scanned).toEqual({ allowed: true, reservations: [] });
    expect(updated).toEqual({ allowed: true, reservations: [] });
    expect(quotaServer.reserveBillingQuotaServer).not.toHaveBeenCalled();
  });

  it("libera las reservas previas si un lote alcanza el límite", async () => {
    quotaServer.reserveBillingQuotaServer
      .mockResolvedValueOnce({
        allowed: true,
        claimId: "claim-supplier",
        metric: "suppliers",
        snapshot: metricSnapshot("suppliers"),
      })
      .mockResolvedValueOnce({
        allowed: false,
        block: {
          ...metricSnapshot("customers"),
          code: "limit_reached",
          message: "Límite alcanzado",
        },
      });

    const result = await reserveCentralBusinessBatchQuota({
      userId,
      mutations: [
        {
          operationKind: "upsert",
          entityType: "supplier",
          entityId: "supplier-1",
          expectedVersion: 0,
          payload: { id: "supplier-1" },
        },
        {
          operationKind: "upsert",
          entityType: "customer",
          entityId: "customer-2",
          expectedVersion: 0,
          payload: { id: "customer-2" },
        },
      ],
    });

    expect(result).toMatchObject({ allowed: false });
    expect(quotaServer.releaseBillingQuotaServer).toHaveBeenCalledWith({
      userId,
      claimId: "claim-supplier",
    });
  });

  it("excluye rectificativas, borradores y recibos automáticos, pero cuenta presupuestos definitivos", async () => {
    expect(
      await reserveCentralInvoiceQuota({
        userId,
        kind: "rectification",
        localDocumentId: "rectification-1",
      }),
    ).toEqual({ allowed: true, reservations: [] });
    expect(
      await reserveCentralNumberedDocumentQuota({
        userId,
        action: "create",
        entityType: "receipt",
        entityId: "receipt-1",
        payloadWithoutNumber: { sourceDocumentId: "invoice-1" },
      }),
    ).toEqual({ allowed: true, reservations: [] });
    expect(
      await reserveCentralNumberedDocumentQuota({
        userId,
        action: "create",
        entityType: "quote",
        entityId: "quote-draft",
        payloadWithoutNumber: {
          type: "presupuesto",
          status: "borrador",
        },
      }),
    ).toEqual({ allowed: true, reservations: [] });

    const quote = await reserveCentralNumberedDocumentQuota({
      userId,
      action: "create",
      entityType: "quote",
      entityId: "quote-1",
      payloadWithoutNumber: {
        type: "presupuesto",
        status: "enviado",
      },
    });
    expect(quote).toMatchObject({
      allowed: true,
      reservations: [{ subjectId: "quote-1", metric: "documents" }],
    });
    expect(quotaServer.reserveBillingQuotaServer).toHaveBeenCalledTimes(1);
  });

  it("libera capacidad total solo tras borrar fichas centrales", async () => {
    await releaseDeletedCentralBusinessQuota({
      userId,
      mutation: {
        operationKind: "delete",
        entityType: "supplier",
        entityId: "supplier-2",
        payload: null,
      },
    });
    await releaseDeletedCentralBusinessQuota({
      userId,
      mutation: {
        operationKind: "delete",
        entityType: "expense",
        entityId: "expense-2",
        payload: null,
      },
    });

    expect(quotaServer.removeBillingQuotaSubjectServer).toHaveBeenCalledTimes(1);
    expect(quotaServer.removeBillingQuotaSubjectServer).toHaveBeenCalledWith({
      userId,
      metric: "suppliers",
      subjectId: "supplier-2",
    });
  });

  it("libera un producto archivado y vuelve a reservarlo al restaurarlo", async () => {
    await releaseDeletedCentralBusinessQuota({
      userId,
      mutation: {
        operationKind: "upsert",
        entityType: "product",
        entityId: "product-archived",
        payload: { hidden: true },
      },
    });

    const restored = await reserveCentralBusinessMutationQuota({
      userId,
      mutation: {
        operationKind: "upsert",
        entityType: "product",
        entityId: "product-archived",
        expectedVersion: 3,
        payload: { hidden: false },
      },
    });

    expect(quotaServer.removeBillingQuotaSubjectServer).toHaveBeenCalledWith({
      userId,
      metric: "products",
      subjectId: "product-archived",
    });
    expect(restored).toMatchObject({
      allowed: true,
      reservations: [
        { subjectId: "product-archived", metric: "products" },
      ],
    });
  });
});
