import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getUserFromBearer } from "@/lib/billing/server-auth";
import { persistAiLearningEvent } from "@/lib/ai-learning-store";
import type { ExpenseScanPayload } from "@/lib/expense-scan/schema";

vi.mock("@/lib/billing/server-auth", () => ({
  getUserFromBearer: vi.fn(),
}));

vi.mock("@/lib/ai-learning-store", () => ({
  persistAiLearningEvent: vi.fn(),
}));

function payload(): ExpenseScanPayload {
  return {
    document: { kind: "expense_invoice", isExpenseDocument: true },
    supplier: { name: "Proveedor", nif: "B12345678" },
    expense: {
      date: "2026-07-03",
      businessKind: "purchase",
      description: "Material",
      amount: 100,
      ivaPercent: 21,
      category: "Material",
      paymentMethod: "Transferencia",
      purchaseLines: [
        {
          description: "Linea",
          quantity: 1,
          unit: "ud",
          unitPrice: 100,
        },
      ],
    },
    confidence: 0.9,
    warnings: [],
  };
}

function request(body: unknown) {
  return new Request("http://localhost/api/admin/ai-learning/feedback", {
    method: "POST",
    headers: { Authorization: "Bearer token" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/ai-learning/feedback", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("rechaza cuentas no autorizadas", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-client",
      email: "cliente@example.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);

    const response = await POST(request({ original: payload(), corrected: payload() }));

    expect(response.status).toBe(403);
    expect(persistAiLearningEvent).not.toHaveBeenCalled();
  });

  it("guarda aprendizaje limpio para cuenta autorizada", async () => {
    vi.mocked(getUserFromBearer).mockResolvedValue({
      id: "user-empresa",
      email: "persianasalmar@gmail.com",
    } as Awaited<ReturnType<typeof getUserFromBearer>>);
    vi.mocked(persistAiLearningEvent).mockResolvedValue(true);

    const response = await POST(request({ original: payload(), corrected: payload() }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, saved: true });
    expect(persistAiLearningEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        accountLabel: "persianas_almar",
        eventType: "expense_scan_feedback",
      }),
    );
  });
});
