import { describe, expect, it } from "vitest";
import {
  collectAppRecommendations,
  INVOICE_DUE_SOON_DAYS,
} from "./recommendations";
import { DEFAULT_PROFILE, EMPTY_DATA, type Document } from "./types";

const baseBilling = {
  billingEnabled: true,
  plan: "free" as const,
  isPro: false,
  documentsThisMonth: 0,
  showUsageWarning: false,
  trialDaysLeft: null,
  quarterlyExport: false,
};

function pendingInvoice(overrides: Partial<Document> = {}): Document {
  return {
    id: "f1",
    type: "factura",
    number: "F-2026-0001",
    date: "2026-06-01",
    dueDate: "2026-06-15",
    client: { name: "Ana García" },
    items: [
      {
        id: "l1",
        description: "Servicio",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "enviado",
    createdAt: "2026-06-01",
    updatedAt: "2026-06-01",
    ...overrides,
  };
}

describe("collectAppRecommendations", () => {
  it("prioriza perfil incompleto", () => {
    const items = collectAppRecommendations({
      data: EMPTY_DATA,
      referenceDate: "2026-06-09",
    });

    expect(items[0]?.id).toBe("profile-incomplete");
    expect(items[0]?.priority).toBe("critical");
  });

  it("avisa de facturas vencidas y próximas a vencer", () => {
    const items = collectAppRecommendations({
      data: {
        ...EMPTY_DATA,
        profile: { ...DEFAULT_PROFILE, name: "Test", nif: "12345678Z" },
        documents: [
          pendingInvoice({ id: "overdue", dueDate: "2026-06-01" }),
          pendingInvoice({
            id: "soon",
            number: "F-2026-0002",
            dueDate: "2026-06-12",
          }),
          pendingInvoice({
            id: "later",
            number: "F-2026-0003",
            dueDate: "2026-06-30",
          }),
        ],
      },
      referenceDate: "2026-06-09",
      billing: baseBilling,
    });

    expect(items.some((item) => item.id === "invoice-overdue-overdue")).toBe(true);
    expect(items.some((item) => item.id === "invoice-due-soon-soon")).toBe(true);
    expect(
      items.some((item) => item.id === "invoice-due-soon-later"),
    ).toBe(false);
    expect(INVOICE_DUE_SOON_DAYS).toBe(7);
  });

  it("incluye aviso de límite de documentos", () => {
    const items = collectAppRecommendations({
      data: {
        ...EMPTY_DATA,
        profile: { ...DEFAULT_PROFILE, name: "Test", nif: "12345678Z" },
      },
      billing: {
        ...baseBilling,
        documentsThisMonth: 10,
      },
    });

    expect(items.some((item) => item.id === "doc-limit-reached")).toBe(true);
  });

  it("incluye gastos fijos próximos", () => {
    const items = collectAppRecommendations({
      data: {
        ...EMPTY_DATA,
        profile: { ...DEFAULT_PROFILE, name: "Test", nif: "12345678Z" },
        recurringExpenses: [
          {
            id: "r1",
            supplierName: "Seguros SL",
            description: "Seguro RC",
            amount: 40,
            ivaPercent: 21,
            category: "Seguros",
            paymentMethod: "Transferencia",
            frequency: "monthly",
            dueTiming: { kind: "day_of_month", day: 10 },
            duration: { kind: "indefinite" },
            startDate: "2026-01-01",
            enabled: true,
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
          },
        ],
      },
      referenceDate: "2026-06-09",
      billing: baseBilling,
    });

    expect(items.some((item) => item.id.startsWith("recurring-r1"))).toBe(true);
  });

  it("avisa de facturas impagadas sin fecha de vencimiento", () => {
    const items = collectAppRecommendations({
      data: {
        ...EMPTY_DATA,
        profile: { ...DEFAULT_PROFILE, name: "Test", nif: "12345678Z" },
        documents: [
          pendingInvoice({
            id: "open",
            dueDate: undefined,
            date: "2026-05-01",
          }),
        ],
      },
      referenceDate: "2026-06-09",
      billing: baseBilling,
    });

    expect(items.some((item) => item.id === "invoice-unpaid-open")).toBe(true);
    expect(
      items.find((item) => item.id === "invoice-unpaid-open")?.actionLabel,
    ).toBe("Recordar cobro");
  });
});
